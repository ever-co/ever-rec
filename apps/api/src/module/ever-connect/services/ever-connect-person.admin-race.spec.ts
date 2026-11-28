/**
 * A deletion Ever Platform asked for, while the same account creates a workspace (the only way Rec
 * makes an account a workspace's admin). The deletion marks the account before its last check of
 * what holds it, and the creation checks the mark once it wrote the workspace: whatever the order,
 * the account is kept with its new workspace, or the workspace is undone and the account goes. It
 * never goes while it administers a workspace, except in the cases left to an operator (tested
 * below: an undo that fails after the last check is logged).
 */
import { Logger } from '@nestjs/common';
import { createHash } from 'node:crypto';
import {
  FakeReference,
  InMemoryFirebaseApp,
} from '../../../../test/support/in-memory-firebase';
import { ResStatusEnum } from '../../../enums/ResStatusEnum';
import { WorkspaceMembersService } from '../../workspace/services/members.service';
import { WorkspaceUtilitiesService } from '../../workspace/services/utilities.service';
import { WorkspacesService } from '../../workspace/services/workspace.service';
import { readEverConnectConfig } from '../ever-connect.config';
import {
  ACCOUNT_DELETION_MARK_BEAT_MS,
  ACCOUNT_DELETION_MARK_KEPT_MS,
  EVER_CONNECT_PATHS,
} from '../ever-connect.types';
import { EverConnectPersonService } from './ever-connect-person.service';
import { EverConnectStoreService } from './ever-connect-store.service';

let mockFirebase: InMemoryFirebaseApp;

jest.mock('firebase-admin', () => ({
  ...jest.requireActual('firebase-admin'),
  database: () => mockFirebase.database(),
  storage: () => mockFirebase.storage(),
}));

// Image resizing is not under test; this keeps the native module from loading.
jest.mock('sharp', () => ({ __esModule: true, default: jest.fn() }));

const ISSUER = 'https://auth.ever.co';
const NOW = Date.UTC(2026, 10, 27, 9, 0, 0);
const UID = 'uid-person';

function setup() {
  mockFirebase = new InMemoryFirebaseApp();
  const db = mockFirebase.db;
  const acks: any[] = [];
  const client = {
    run: async (call: (client: any) => Promise<unknown>) =>
      call({
        instances: {
          ack: async (body: unknown) => {
            acks.push(body);
          },
          personLinks: { remove: async () => undefined },
        },
      }),
  };
  const store = {
    db: () => db,
    workspace: async (id: string) =>
      (await db.ref(`workspaces/${id}`).get()).val(),
  };
  const hooks: { beforeDelete?: () => Promise<void> } = {};
  const time = { now: NOW };
  const deleter = {
    delete: jest.fn(async (uid: string) => {
      if (hooks.beforeDelete) await hooks.beforeDelete();
      await db.ref(`users/${uid}`).remove();
      return true;
    }),
  };
  const person = new EverConnectPersonService(
    store as any,
    client as any,
    { write: jest.fn(async () => undefined) } as any,
    () => time.now,
    {
      installSource: 'self-hosted',
      operatorUids: new Set(['uid-operator']),
      recJwtSecret: 'test-only-secret-of-this-installation-0001',
    } as any,
    readEverConnectConfig(
      {
        WEBSITE_URL: 'https://rec.example.test',
        EVER_CONNECT_PERSON_DELETION_ENABLED: 'true',
      },
      () => undefined,
    ),
    deleter,
  );
  const utilities = new WorkspaceUtilitiesService();
  const workspaces = new WorkspacesService(
    utilities,
    new WorkspaceMembersService(utilities),
    undefined,
    undefined,
    person,
  );

  // A member (not the admin) of someone else's workspace, with one Ever ID.
  db.write(['users', UID], {
    displayName: 'Person',
    email: 'person@example.test',
    workspaceIds: ['ws-1'],
  });
  db.write(['workspaces', 'ws-1'], {
    id: 'ws-1',
    admin: 'uid-owner',
    name: 'Acme recordings',
    members: [{ id: 'uid-owner' }, { id: UID }],
  });
  db.write(['ever_identities', 'k1'], {
    issuer: ISSUER,
    subject: 'subject-1',
    uid: UID,
    linkMethod: 'explicit',
    linkedAt: 1,
  });
  db.write(['ever_identities_by_uid', UID, 'k1'], true);

  const requestDeletion = () =>
    person.onDeletionRequested({
      job_id: 'job-d1',
      subject_hashes: [
        createHash('sha256').update(`${ISSUER}#subject-1`).digest('hex'),
      ],
    });
  const createWorkspace = () =>
    workspaces.createNewWorkspace(UID, 'Person', 'person@example.test', 'Mine');
  const administered = () =>
    Object.values((db.dump('workspaces') ?? {}) as Record<string, any>)
      .filter((workspace) => workspace?.admin === UID)
      .map((workspace) => workspace.name);
  const marks = () => db.dump(`${EVER_CONNECT_PATHS.accountDeletions}/${UID}`);

  return {
    db,
    acks,
    deleter,
    hooks,
    time,
    person,
    requestDeletion,
    createWorkspace,
    administered,
    marks,
  };
}

/** The deletion's beat, run by hand instead of on its hourly timer. */
function captureBeats(): Array<() => void> {
  const beats: Array<() => void> = [];
  jest.spyOn(global, 'setInterval').mockImplementation(((
    beat: () => void,
    every: number,
  ) => {
    expect(every).toBe(ACCOUNT_DELETION_MARK_BEAT_MS);
    beats.push(beat);
    return { unref: () => undefined } as unknown as NodeJS.Timeout;
  }) as typeof setInterval);
  return beats;
}

const settle = () => new Promise((resolve) => setImmediate(resolve));

const pathOf = (ref: FakeReference) =>
  (ref as unknown as { parts: string[] }).parts.join('/');

/** Every removal of a workspace fails; other removals go through. */
function failWorkspaceRemovals() {
  const { remove } = FakeReference.prototype;
  jest
    .spyOn(FakeReference.prototype, 'remove')
    .mockImplementation(async function (this: FakeReference) {
      if (pathOf(this).startsWith('workspaces/')) {
        throw new Error('database unavailable');
      }
      return remove.call(this);
    });
}

/** Runs `then` once, right before or right after the deletion writes its first mark. */
function onFirstMark(when: 'before' | 'after', then: () => Promise<unknown>) {
  const { set } = FakeReference.prototype;
  let ran = false;
  jest.spyOn(FakeReference.prototype, 'set').mockImplementation(async function (
    this: FakeReference,
    value: any,
  ) {
    const first =
      !ran &&
      pathOf(this).startsWith(`${EVER_CONNECT_PATHS.accountDeletions}/`);
    ran ||= first;
    if (first && when === 'before') await then();
    await set.call(this, value);
    if (first && when === 'after') await then();
  });
}

/** The error the creation logs for a workspace it could not undo. */
function expectUndoLogged(
  error: jest.SpyInstance,
  t: ReturnType<typeof setup>,
) {
  const workspaceId = Object.keys(t.db.dump('workspaces') ?? {}).find(
    (id) => id !== 'ws-1',
  );
  expect(error).toHaveBeenCalledWith(
    `A workspace whose account is or may be being deleted could not be undone (workspace ${workspaceId}).`,
  );
}

describe('a deletion for Ever Platform while the account creates a workspace', () => {
  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('created after the last check, before the account goes: the workspace is undone, the account goes', async () => {
    const t = setup();
    let created!: Awaited<ReturnType<typeof t.createWorkspace>>;
    t.hooks.beforeDelete = async () => {
      created = await t.createWorkspace();
    };

    await t.requestDeletion();

    expect(created.status).toBe(ResStatusEnum.error);
    expect(t.administered()).toEqual([]);
    expect(t.db.dump(`users/${UID}`)).toBeNull();
    expect(t.acks).toEqual([{ job_id: 'job-d1', result: 'deleted' }]);
  });

  it('created right after the deletion marked the account: the workspace is undone, the account goes', async () => {
    const t = setup();
    let created!: Awaited<ReturnType<typeof t.createWorkspace>>;
    onFirstMark('after', async () => {
      created = await t.createWorkspace();
    });

    await t.requestDeletion();

    expect(created.status).toBe(ResStatusEnum.error);
    expect(t.administered()).toEqual([]);
    expect(t.deleter.delete).toHaveBeenCalledWith(UID);
    expect(t.acks).toEqual([{ job_id: 'job-d1', result: 'deleted' }]);
  });

  it('created before the deletion ran its checks: the account is kept with its workspace', async () => {
    const t = setup();
    // The whole deletion runs after the creation wrote the workspace, before it reads the marks
    const { deletionStarted } = EverConnectPersonService.prototype;
    let deletion: Promise<void>;
    jest.spyOn(t.person, 'deletionStarted').mockImplementation(async function (
      this: EverConnectPersonService,
      uid,
    ) {
      deletion ??= t.requestDeletion();
      await deletion;
      return deletionStarted.call(this, uid);
    });

    const created = await t.createWorkspace();

    expect(created.status).toBe(ResStatusEnum.success);
    expect(t.administered()).toEqual(['Mine']);
    expect(t.deleter.delete).not.toHaveBeenCalled();
    expect(t.acks).toEqual([
      {
        job_id: 'job-d1',
        result: 'failed',
        detail: { reason_code: 'account_deletion_pending' },
      },
    ]);
  });

  it('created between the first check and the mark: the account is kept, and its mark removed', async () => {
    const t = setup();
    const holdFor = jest.spyOn(t.person, 'holdFor');
    let created!: Awaited<ReturnType<typeof t.createWorkspace>>;
    onFirstMark('before', async () => {
      created = await t.createWorkspace();
    });

    await t.requestDeletion();

    expect(created.status).toBe(ResStatusEnum.success);
    expect(t.administered()).toEqual(['Mine']);
    expect(holdFor).toHaveBeenLastCalledWith(UID);
    expect(
      await holdFor.mock.results[holdFor.mock.results.length - 1].value,
    ).toBe('workspace_admin');
    expect(t.deleter.delete).not.toHaveBeenCalled();
    expect(t.marks()).toBeNull();
    // Nothing stops the account from creating another one.
    expect(await t.person.deletionStarted(UID)).toBe(false);
  });

  it('a last check that fails leaves no mark, and the account can still create workspaces', async () => {
    const t = setup();
    const holdFor = jest.spyOn(t.person, 'holdFor');
    holdFor
      .mockImplementationOnce(async () => null)
      .mockImplementationOnce(async () => {
        throw new Error('database unavailable');
      });

    await expect(t.requestDeletion()).rejects.toThrow('database unavailable');

    expect(t.deleter.delete).not.toHaveBeenCalled();
    expect(t.marks()).toBeNull();
    expect((await t.createWorkspace()).status).toBe(ResStatusEnum.success);
  });

  it('created while a slow deletion runs past a day: the mark is still there, the workspace is undone', async () => {
    const t = setup();
    const beats = captureBeats();
    const store = new EverConnectStoreService(mockFirebase as any);
    let created!: Awaited<ReturnType<typeof t.createWorkspace>>;
    let swept = -1;
    t.hooks.beforeDelete = async () => {
      // Rec's account deletion still runs, five hours past a day after it started.
      for (let hour = 1; hour <= 29; hour++) {
        t.time.now = NOW + hour * ACCOUNT_DELETION_MARK_BEAT_MS;
        beats.forEach((beat) => beat());
        await settle();
      }
      swept = await store.sweepAccountDeletions(t.time.now);
      created = await t.createWorkspace();
    };

    await t.requestDeletion();

    expect(beats).toHaveLength(1);
    expect(swept).toBe(0);
    expect(created.status).toBe(ResStatusEnum.error);
    expect(t.administered()).toEqual([]);
    expect(t.acks).toEqual([{ job_id: 'job-d1', result: 'deleted' }]);
  });

  it('a mark renewed between the sweep reading it and removing it stays', async () => {
    const t = setup();
    const beats = captureBeats();
    const store = new EverConnectStoreService(mockFirebase as any);
    const { get } = FakeReference.prototype;
    let swept = -1;
    let created!: Awaited<ReturnType<typeof t.createWorkspace>>;
    t.hooks.beforeDelete = async () => {
      // No renewal for a day; the next one lands right after the sweep read the marks.
      t.time.now = NOW + ACCOUNT_DELETION_MARK_KEPT_MS + 1;
      jest
        .spyOn(FakeReference.prototype, 'get')
        .mockImplementation(async function (this: FakeReference) {
          const read = await get.call(this);
          if (pathOf(this) === EVER_CONNECT_PATHS.accountDeletions) {
            beats.forEach((beat) => beat());
            await settle();
          }
          return read;
        });
      swept = await store.sweepAccountDeletions(t.time.now);
      (FakeReference.prototype.get as jest.Mock).mockRestore();
      created = await t.createWorkspace();
    };

    await t.requestDeletion();

    expect(swept).toBe(0);
    expect(created.status).toBe(ResStatusEnum.error);
    expect(t.administered()).toEqual([]);
    expect(t.acks).toEqual([{ job_id: 'job-d1', result: 'deleted' }]);
  });

  it('renewals that fail for a day: the sweep takes the mark, the next renewal puts it back whole', async () => {
    const t = setup();
    const beats = captureBeats();
    const store = new EverConnectStoreService(mockFirebase as any);
    const warn = jest.spyOn((t.person as any).logger, 'warn');
    let restored: unknown;
    let swept = -1;
    let kept = -1;
    t.hooks.beforeDelete = async () => {
      const { update } = FakeReference.prototype;
      const renewal = jest
        .spyOn(FakeReference.prototype, 'update')
        .mockRejectedValue(new Error('database unavailable'));
      for (let hour = 1; hour <= 25; hour++) {
        t.time.now = NOW + hour * ACCOUNT_DELETION_MARK_BEAT_MS;
        beats.forEach((beat) => beat());
        await settle();
      }
      swept = await store.sweepAccountDeletions(t.time.now);
      renewal.mockImplementation(update);
      t.time.now += ACCOUNT_DELETION_MARK_BEAT_MS;
      beats.forEach((beat) => beat());
      await settle();
      restored = Object.values(t.marks());
      kept = await store.sweepAccountDeletions(t.time.now);
    };

    await t.requestDeletion();

    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('could not be renewed'),
    );
    expect(swept).toBe(1);
    expect(restored).toEqual([
      { startedAt: NOW, aliveAt: NOW + 26 * ACCOUNT_DELETION_MARK_BEAT_MS },
    ]);
    expect(kept).toBe(0);
    expect(t.acks).toEqual([{ job_id: 'job-d1', result: 'deleted' }]);
  });

  it('an undo that cannot remove the workspace leaves it listed: the deletion sees it and keeps the account', async () => {
    const t = setup();
    failWorkspaceRemovals();
    let created!: Awaited<ReturnType<typeof t.createWorkspace>>;
    onFirstMark('after', async () => {
      created = await t.createWorkspace();
    });

    await t.requestDeletion();

    expect(created.status).toBe(ResStatusEnum.error);
    expect(t.administered()).toEqual(['Mine']);
    expect(t.deleter.delete).not.toHaveBeenCalled();
    expect(t.acks).toEqual([
      {
        job_id: 'job-d1',
        result: 'failed',
        detail: { reason_code: 'account_deletion_pending' },
      },
    ]);
  });

  it('created after the last check, and its undo fails: an error names the workspace for an operator', async () => {
    const t = setup();
    failWorkspaceRemovals();
    const error = jest.spyOn(Logger.prototype, 'error').mockImplementation();
    let created!: Awaited<ReturnType<typeof t.createWorkspace>>;
    t.hooks.beforeDelete = async () => {
      created = await t.createWorkspace();
    };

    await t.requestDeletion();

    // Rec's own account deletion leaves the workspaces of the account it deletes, as the product's
    // own "Delete account" does: the one left here is reported instead of undone.
    expect(created.status).toBe(ResStatusEnum.error);
    expect(t.administered()).toEqual(['Mine']);
    expectUndoLogged(error, t);
    expect(t.acks).toEqual([{ job_id: 'job-d1', result: 'deleted' }]);
  });

  it('a mark that cannot be read and an undo that fails: an error names the workspace', async () => {
    const t = setup();
    failWorkspaceRemovals();
    jest
      .spyOn(t.person, 'deletionStarted')
      .mockRejectedValue(new Error('database unavailable'));
    const error = jest.spyOn(Logger.prototype, 'error').mockImplementation();

    const created = await t.createWorkspace();

    expect(created.status).toBe(ResStatusEnum.error);
    expectUndoLogged(error, t);
  });

  it('marks a finished deletion until the sweep removes it, a day later', async () => {
    const t = setup();
    await t.requestDeletion();

    expect(await t.person.deletionStarted(UID)).toBe(true);
    expect(Object.values(t.marks())).toEqual([
      { startedAt: NOW, deletedAt: NOW },
    ]);

    const store = new EverConnectStoreService(mockFirebase as any);
    expect(
      await store.sweepAccountDeletions(NOW + ACCOUNT_DELETION_MARK_KEPT_MS),
    ).toBe(0);
    expect(
      await store.sweepAccountDeletions(
        NOW + ACCOUNT_DELETION_MARK_KEPT_MS + 1,
      ),
    ).toBe(1);
    expect(t.marks()).toBeNull();
    expect(await t.person.deletionStarted(UID)).toBe(false);
  });
});
