/**
 * The comments of an item are written by the API (Admin SDK, which bypasses the rules) and nobody
 * else: the owner of an item may not rewrite, delete or plant comments under it with their own
 * client credentials, or the API would show a planted comment under another user's name. The rest
 * of the owner's item stays writable and readable for them.
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
    { headers: { Authorization: 'Bearer owner' }, body: rules },
  );
  expect(answer.status).toBe(200);
}

/** A signed-in client of the Authentication emulator: its id token and its uid. */
async function signUp(): Promise<{ token: string; uid: string }> {
  const answer = await httpRequest(
    'POST',
    `${authHost()}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-key`,
    {
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: `client-${Date.now()}-${Math.random()}@example.test`,
        password: 'Secret-1234',
        returnSecureToken: true,
      }),
    },
  );
  expect(answer.status).toBe(200);
  const { idToken, localId } = answer.json();
  return { token: idToken, uid: localId };
}

const denied = (status: number) => status === 401 || status === 403;

describe('database rules for the comments of an item', () => {
  let app: admin.app.App;
  let owner: { token: string; uid: string };
  let guest: { token: string; uid: string };

  const url = (path: string, token: string) =>
    `${db()}/${path}.json?ns=${EMULATOR_PROJECT}&auth=${token}`;
  const send = (
    method: string,
    path: string,
    token: string,
    body?: unknown,
  ) =>
    httpRequest(method, url(path, token), {
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  const storedComments = async (collection: string) =>
    (
      await app
        .database()
        .ref(`users/${owner.uid}/${collection}/item1/comments`)
        .get()
    ).val();

  beforeAll(async () => {
    app = emulatorApp();
    await clearEmulators(app);
    owner = await signUp();
    guest = await signUp();
    await loadRules(RULES);
  });

  beforeEach(async () => {
    for (const collection of ['videos', 'screenshots']) {
      await app
        .database()
        .ref(`users/${owner.uid}/${collection}/item1`)
        .set({
          id: 'item1',
          title: 'first',
          comments: {
            c1: { id: 'c1', content: 'hi', uid: guest.uid, timestamp: 1 },
          },
        });
    }
  });

  afterAll(async () => {
    await app.delete();
  });

  it.each(['videos', 'screenshots'])(
    'the owner cannot rewrite, delete or plant comments under their %s',
    async (collection) => {
      const base = `users/${owner.uid}/${collection}/item1`;
      const planted = { id: 'c9', content: 'x', uid: guest.uid, timestamp: 2 };

      const answers = [
        await send('PUT', `${base}/comments/c1`, owner.token, planted),
        await send('PUT', `${base}/comments/c9`, owner.token, planted),
        await send('PUT', `${base}/comments`, owner.token, { c9: planted }),
        await send('DELETE', `${base}/comments/c1`, owner.token),
        await send('DELETE', `${base}/comments`, owner.token),
        await send('PATCH', base, owner.token, { comments: { c9: planted } }),
        await send('PUT', base, owner.token, { id: 'item1', comments: {} }),
      ];

      expect(answers.map((answer) => denied(answer.status))).toEqual(
        answers.map(() => true),
      );
      expect(await storedComments(collection)).toEqual({
        c1: { id: 'c1', content: 'hi', uid: guest.uid, timestamp: 1 },
      });
    },
  );

  it('the owner can still read and edit the other fields of their item', async () => {
    for (const collection of ['videos', 'screenshots']) {
      const base = `users/${owner.uid}/${collection}/item1`;

      expect((await send('GET', base, owner.token)).status).toBe(200);
      expect(
        (await send('PUT', `${base}/title`, owner.token, 'second')).status,
      ).toBe(200);
      expect(
        (await app.database().ref(`${base}/title`).get()).val(),
      ).toBe('second');
    }
  });

  it('the owner can still write the rest of their own user node', async () => {
    const answer = await send(
      'PUT',
      `users/${owner.uid}/profile/note`,
      owner.token,
      'hello',
    );

    expect(answer.status).toBe(200);
  });

  it('another user can neither read nor write the item or its comments', async () => {
    const base = `users/${owner.uid}/videos/item1`;
    const answers = [
      await send('GET', `${base}/comments`, guest.token),
      await send('PUT', `${base}/comments/c9`, guest.token, { id: 'c9' }),
      await send('PUT', `${base}/title`, guest.token, 'taken'),
    ];

    expect(answers.map((answer) => denied(answer.status))).toEqual([
      true,
      true,
      true,
    ]);
  });
});
