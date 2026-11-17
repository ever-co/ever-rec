/**
 * Joining a workspace with an invite link (`WorkspaceInvitesService.joinWorkspace`). Deleting a
 * workspace removes its invite without waiting for it, so an invite can outlive its workspace, and
 * an invite page left open can be used after the workspace is deleted. Such a join must be refused
 * without writing anything: before, it recreated `workspaces/<id>` holding only `members` (no name,
 * no admin, so nobody could delete it) and added it to the user's list.
 */
import {
  FakeReference,
  FakeSnapshot,
  InMemoryDatabase,
  InMemoryFirebaseApp,
} from '../../../../test/support/in-memory-firebase';
import { ResStatusEnum } from '../../../enums/ResStatusEnum';
import { WorkspaceInvitesService } from './invites.service';
import { WorkspaceUtilitiesService } from './utilities.service';

let mockDb: InMemoryDatabase;
jest.mock('firebase-admin', () => ({ database: () => mockDb }));

// Image resizing is not under test; this keeps the native module from loading.
jest.mock('sharp', () => ({ __esModule: true, default: jest.fn() }));

const notFound = {
  status: ResStatusEnum.error,
  message: "Couldn't find the workspace for this invite",
  error: null,
  data: null,
};

const pathOf = (ref: FakeReference): string =>
  (ref as unknown as { parts: string[] }).parts.join('/');

describe('joining a workspace with an invite', () => {
  const service = new WorkspaceInvitesService(new WorkspaceUtilitiesService());

  beforeEach(async () => {
    mockDb = new InMemoryFirebaseApp().db;
    await mockDb.ref('users/uid-admin').set({
      email: 'admin@example.test',
      workspaceIds: ['ws-1'],
    });
    await mockDb.ref('users/uid-joiner').set({
      email: 'joiner@example.test',
      workspaceIds: ['ws-own'],
    });
    await mockDb.ref('workspaces/ws-1').set({
      id: 'ws-1',
      name: 'Team',
      admin: 'uid-admin',
      members: [{ id: 'uid-admin' }],
      inviteLinkId: 'inv-1',
      created: 1,
    });
    await mockDb.ref('workspaceInvites/inv-1').set({
      id: 'inv-1',
      workspaceId: 'ws-1',
      inviterId: 'uid-admin',
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('refuses an invite that does not exist and writes nothing', async () => {
    const before = mockDb.dump();

    const result = await service.joinWorkspace('uid-joiner', 'inv-missing');

    expect(result).toEqual(notFound);
    expect(mockDb.dump()).toEqual(before);
    expect(mockDb.dump('users/uid-joiner/workspaceIds')).toEqual(['ws-own']);
  });

  it('refuses an invite whose workspace was deleted and creates no stub workspace', async () => {
    // The invite was left behind when its workspace was deleted.
    await mockDb.ref('workspaceInvites/inv-left').set({
      id: 'inv-left',
      workspaceId: 'ws-deleted',
      inviterId: 'uid-admin',
    });
    const before = mockDb.dump();

    const result = await service.joinWorkspace('uid-joiner', 'inv-left');

    expect(result).toEqual(notFound);
    expect(mockDb.dump('workspaces/ws-deleted')).toBeNull();
    expect(mockDb.dump('users/uid-joiner/workspaceIds')).toEqual(['ws-own']);
    expect(mockDb.dump()).toEqual(before);
  });

  it('creates no stub when the workspace is deleted between the reads and the write', async () => {
    // The admin deletes the workspace while the join is under way: every write the join makes to
    // `workspaces/ws-1` lands after the delete.
    const deleteWorkspaceFirst = <A extends unknown[], R>(
      original: (...args: A) => Promise<R>,
    ) =>
      async function (this: FakeReference, ...args: A): Promise<R> {
        if (pathOf(this) === 'workspaces/ws-1') {
          await mockDb.ref('workspaces/ws-1').remove();
        }
        return original.apply(this, args);
      };
    const { update, set, transaction } = FakeReference.prototype;
    jest
      .spyOn(FakeReference.prototype, 'update')
      .mockImplementation(deleteWorkspaceFirst(update));
    jest
      .spyOn(FakeReference.prototype, 'set')
      .mockImplementation(deleteWorkspaceFirst(set));
    jest
      .spyOn(FakeReference.prototype, 'transaction')
      .mockImplementation(deleteWorkspaceFirst(transaction));

    const result = await service.joinWorkspace('uid-joiner', 'inv-1');

    expect(result).toEqual(notFound);
    expect(mockDb.dump('workspaces/ws-1')).toBeNull();
    expect(mockDb.dump('users/uid-joiner/workspaceIds')).toEqual(['ws-own']);
  });

  it('joins with a valid invite and keeps the rest of the workspace', async () => {
    const result = await service.joinWorkspace('uid-joiner', 'inv-1');

    expect(result.status).toBe(ResStatusEnum.success);
    expect(result.data).toEqual({
      workspaceId: 'ws-1',
      hasAlreadyJoined: false,
    });
    expect(mockDb.dump('workspaces/ws-1')).toEqual({
      id: 'ws-1',
      name: 'Team',
      admin: 'uid-admin',
      members: [{ id: 'uid-admin' }, { id: 'uid-joiner' }],
      inviteLinkId: 'inv-1',
      created: 1,
    });
    expect(mockDb.dump('users/uid-joiner/workspaceIds')).toEqual([
      'ws-own',
      'ws-1',
    ]);
  });

  it('answers hasAlreadyJoined for a second join and writes nothing more', async () => {
    await service.joinWorkspace('uid-joiner', 'inv-1');
    const afterFirstJoin = mockDb.dump();

    const result = await service.joinWorkspace('uid-joiner', 'inv-1');

    expect(result.status).toBe(ResStatusEnum.success);
    expect(result.data).toEqual({
      workspaceId: 'ws-1',
      hasAlreadyJoined: true,
    });
    expect(mockDb.dump()).toEqual(afterFirstJoin);
  });

  it('joins when the first run of the transaction sees no cached value', async () => {
    // As in the SDK: the first run sees the local cache (empty here, so `null`), and returning
    // `undefined` there aborts at once, without asking the server. Only a non-abort result is
    // checked against the stored value and run again with it.
    const { transaction } = FakeReference.prototype;
    jest
      .spyOn(FakeReference.prototype, 'transaction')
      .mockImplementation(async function (
        this: FakeReference,
        updateFn: (current: unknown) => unknown,
      ) {
        if (updateFn(null) === undefined) {
          return {
            committed: false,
            snapshot: new FakeSnapshot(this.key, null),
          };
        }
        return transaction.call(this, updateFn);
      });

    const result = await service.joinWorkspace('uid-joiner', 'inv-1');

    expect(result.data).toEqual({
      workspaceId: 'ws-1',
      hasAlreadyJoined: false,
    });
    expect(mockDb.dump('workspaces/ws-1/members')).toEqual([
      { id: 'uid-admin' },
      { id: 'uid-joiner' },
    ]);
  });
});
