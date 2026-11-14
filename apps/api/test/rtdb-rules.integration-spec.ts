/**
 * The Realtime Database rules keep signed-in clients away from the identity and statistics roots
 * (`ever_instance`, `ever_stats`): the Admin SDK of the API bypasses rules, a client must not.
 * The rules file is the repository's `database.rules.json`, unchanged. A control loads a rules file
 * that opens `ever_instance` to signed-in users and must make the check fail.
 */
import type * as admin from 'firebase-admin';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { httpRequest } from './support/http';
import {
  clearEmulators,
  EMULATOR_PROJECT,
  emulatorApp,
} from './setup-emulators';

const RULES = readFileSync(
  join(__dirname, '..', '..', '..', 'database.rules.json'),
  'utf8',
);
const db = () => `http://${process.env.FIREBASE_DATABASE_EMULATOR_HOST}`;
const authHost = () => `http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}`;

async function loadRules(rules: string) {
  const answer = await httpRequest(
    'PUT',
    `${db()}/.settings/rules.json?ns=${EMULATOR_PROJECT}`,
    {
      headers: { Authorization: 'Bearer owner' },
      body: rules,
    },
  );
  expect(answer.status).toBe(200);
}

/** A signed-in client: its ID token and uid from the Authentication emulator. */
async function clientAccount(): Promise<{ token: string; uid: string }> {
  const answer = await httpRequest(
    'POST',
    `${authHost()}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-key`,
    {
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: `client-${Date.now()}@example.test`,
        password: 'Secret-1234',
        returnSecureToken: true,
      }),
    },
  );
  expect(answer.status).toBe(200);
  return { token: answer.json().idToken, uid: answer.json().localId };
}

async function clientToken(): Promise<string> {
  return (await clientAccount()).token;
}

const IDENTITY_AND_STATS_ROOTS = [
  'ever_instance',
  'ever_instance/self',
  'ever_stats',
  'ever_stats/reports',
];

// The API reads and writes the share-link records with admin credentials; a client never does.
const SHARE_LINK_ROOTS = [
  'shared',
  'shared/link1',
  'sharedVideos',
  'sharedVideos/link1',
  'sharedWorkspaceItems',
  'sharedWorkspaceItems/link1',
];

/** The status codes a signed-in client gets when reading and writing each root. */
async function clientAccess(
  token: string,
  roots: string[] = IDENTITY_AND_STATS_ROOTS,
): Promise<number[]> {
  const out: number[] = [];
  for (const root of roots) {
    out.push(
      (
        await httpRequest(
          'GET',
          `${db()}/${root}.json?ns=${EMULATOR_PROJECT}&auth=${token}`,
        )
      ).status,
    );
    out.push(
      (
        await httpRequest(
          'PUT',
          `${db()}/${root}/probe.json?ns=${EMULATOR_PROJECT}&auth=${token}`,
          {
            body: JSON.stringify('client'),
          },
        )
      ).status,
    );
  }
  return out;
}

describe('database rules for the new roots', () => {
  let app: admin.app.App;
  let token: string;

  beforeAll(async () => {
    app = emulatorApp();
    await clearEmulators(app);
    await app
      .database()
      .ref('ever_instance/self')
      .set({ instanceId: 'x', statsPrivateKeyEnc: 'v1:a:b:c' });
    await app.database().ref('ever_stats/reports/r').set({ payload: '{}' });
    for (const root of ['shared', 'sharedVideos', 'sharedWorkspaceItems']) {
      await app
        .database()
        .ref(`${root}/link1`)
        .set({ uid: 'owner', queryField: 'q' });
    }
    token = await clientToken();
  });

  afterAll(async () => {
    await loadRules(RULES);
    await app.delete();
  });

  it('a signed-in client can neither read nor write ever_instance or ever_stats', async () => {
    await loadRules(RULES);
    const statuses = await clientAccess(token);
    expect(statuses.every((status) => status === 401 || status === 403)).toBe(
      true,
    );
  });

  it('a signed-in client can neither list, read nor write the share-link collections', async () => {
    await loadRules(RULES);
    const statuses = await clientAccess(token, SHARE_LINK_ROOTS);
    expect(statuses.every((status) => status === 401 || status === 403)).toBe(
      true,
    );
    // Nothing was forged: the only record is the one the API wrote.
    for (const root of ['shared', 'sharedVideos', 'sharedWorkspaceItems']) {
      expect((await app.database().ref(root).get()).val()).toEqual({
        link1: { uid: 'owner', queryField: 'q' },
      });
    }
  });

  it('a rules file that opens the share-link collections makes the check fail (control)', async () => {
    const open = JSON.parse(RULES);
    for (const root of ['shared', 'sharedVideos', 'sharedWorkspaceItems']) {
      open.rules[root]['.read'] = 'auth != null';
      open.rules[root]['.write'] = 'auth != null';
    }
    await loadRules(JSON.stringify(open));
    const statuses = await clientAccess(token, SHARE_LINK_ROOTS);
    expect(statuses.every((status) => status === 401 || status === 403)).toBe(
      false,
    );
  });

  it('a rules file that opens ever_instance makes the check fail (control)', async () => {
    const open = JSON.parse(RULES);
    open.rules.ever_instance = {
      '.read': 'auth != null',
      '.write': 'auth != null',
    };
    await loadRules(JSON.stringify(open));
    const statuses = await clientAccess(token);
    expect(statuses.every((status) => status === 401 || status === 403)).toBe(
      false,
    );
  });
});

/**
 * A user's items, `uid`, `likes` and `whiteboardIds` are written by the API only. A `.validate` rule
 * does not run when a value is deleted, so the owner could still erase likes; the write grant on the
 * user's record is therefore gone, and only the profile stays client-writable.
 */
describe('database rules for the owner-written item fields', () => {
  let app: admin.app.App;
  let token: string;
  let uid: string;
  const ITEM_PATHS = [
    (owner: string) => `users/${owner}/screenshots/item1`,
    (owner: string) => `users/${owner}/videos/item1`,
  ];

  const clientWrite = (path: string, value: unknown) =>
    httpRequest(
      'PUT',
      `${db()}/${path}.json?ns=${EMULATOR_PROJECT}&auth=${token}`,
      { body: JSON.stringify(value) },
    ).then((answer) => answer.status);
  const refused = (status: number) => status === 401 || status === 403;

  beforeAll(async () => {
    app = emulatorApp();
    await clearEmulators(app);
    ({ token, uid } = await clientAccount());
  });

  beforeEach(async () => {
    await app.database().ref().set(null);
    for (const path of ITEM_PATHS) {
      await app
        .database()
        .ref(path(uid))
        .set({ title: 'Original', uid, likes: [{ uid: 'u1', timestamp: 1 }] });
    }
    await app.database().ref(`users/${uid}/whiteboardIds`).set(['wb1']);
  });

  afterAll(async () => {
    await loadRules(RULES);
    await app.delete();
  });

  it('refuses every write to uid, likes or whiteboardIds, including deleting them, and changes nothing', async () => {
    await loadRules(RULES);
    const statuses: number[] = [];
    for (const path of ITEM_PATHS) {
      statuses.push(await clientWrite(`${path(uid)}/uid`, 'someone-else'));
      statuses.push(await clientWrite(`${path(uid)}/uid`, null));
      statuses.push(
        await clientWrite(`${path(uid)}/likes`, [
          { uid: 'planted', timestamp: 2 },
        ]),
      );
      // Erasing the likes, alone or by rewriting the item without them.
      statuses.push(await clientWrite(`${path(uid)}/likes`, null));
      statuses.push(await clientWrite(path(uid), { title: 'Original', uid }));
      statuses.push(await clientWrite(path(uid), null));
    }
    statuses.push(
      await clientWrite(`users/${uid}/whiteboardIds`, ['wb1', 'wb2']),
    );
    statuses.push(await clientWrite(`users/${uid}/whiteboardIds`, null));
    statuses.push(
      await clientWrite(`users/${uid}`, { whiteboardIds: ['wb1', 'wb2'] }),
    );
    statuses.push(await clientWrite(`users/${uid}`, null));

    expect(statuses.every(refused)).toBe(true);
    for (const path of ITEM_PATHS) {
      expect((await app.database().ref(path(uid)).get()).val()).toEqual({
        title: 'Original',
        uid,
        likes: [{ uid: 'u1', timestamp: 1 }],
      });
    }
    expect(
      (await app.database().ref(`users/${uid}/whiteboardIds`).get()).val(),
    ).toEqual(['wb1']);
  });

  it('refuses writes to the other fields of an item too: items are changed through the API only', async () => {
    await loadRules(RULES);
    for (const path of ITEM_PATHS) {
      expect(refused(await clientWrite(`${path(uid)}/title`, 'Renamed'))).toBe(
        true,
      );
      expect(
        (
          await app
            .database()
            .ref(`${path(uid)}/title`)
            .get()
        ).val(),
      ).toBe('Original');
    }
  });

  it('still lets the owner read their own items and write their profile', async () => {
    await loadRules(RULES);
    const read = await httpRequest(
      'GET',
      `${db()}/${ITEM_PATHS[0](uid)}.json?ns=${EMULATOR_PROJECT}&auth=${token}`,
    );
    expect(read.status).toBe(200);
    expect(await clientWrite(`users/${uid}/profile`, { bio: 'hi' })).toBe(200);
  });

  it('still refuses writes to another user’s items', async () => {
    await loadRules(RULES);
    const status = await clientWrite(
      'users/someone-else/screenshots/item1/title',
      'x',
    );
    expect(refused(status)).toBe(true);
  });

  it('a rules file that lets the owner write their record lets the writes through (control)', async () => {
    const open = JSON.parse(RULES);
    open.rules.users.$userId['.write'] = '$userId === auth.uid';
    await loadRules(JSON.stringify(open));

    expect(await clientWrite(`${ITEM_PATHS[0](uid)}/uid`, 'someone-else')).toBe(
      200,
    );
    expect(await clientWrite(`${ITEM_PATHS[1](uid)}/likes`, null)).toBe(200);
    expect(await clientWrite(`users/${uid}/whiteboardIds`, ['wb2'])).toBe(200);
  });
});
