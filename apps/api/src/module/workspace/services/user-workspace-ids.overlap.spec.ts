/**
 * The list of the workspaces a user sees, `users/<uid>/workspaceIds`, while workspaces are created,
 * joined and deleted at the same time. Creating and deleting a workspace used to read the user,
 * change a copy of the list and write it back, so an id another request added in between (a join
 * by invite, a second create) was dropped: the user was then a member, or the admin, of a workspace
 * missing from the list, and joining again with the invite did not repair it. Every writer of the
 * list now changes it in one transaction on the list itself.
 *
 * `overlapAt(path, first, second)` runs `second` from start to end right after `first` reads
 * anything under `path` for the first time, or right before it changes anything there in a
 * transaction: `second` lands between the read and the write `first` makes.
 */
import {
  FakeQuery,
  FakeReference,
  InMemoryFirebaseApp,
} from '../../../../test/support/in-memory-firebase';
import { ResStatusEnum } from '../../../enums/ResStatusEnum';
import { parseCollectionToArray } from '../../../services/utils/helpers';
import { WorkspaceInvitesService } from './invites.service';
import { WorkspaceMembersService } from './members.service';
import { WorkspaceUtilitiesService } from './utilities.service';
import { WorkspacesService } from './workspace.service';

let mockFirebase: InMemoryFirebaseApp;

jest.mock('firebase-admin', () => ({
  ...jest.requireActual('firebase-admin'),
  database: () => mockFirebase.database(),
  storage: () => mockFirebase.storage(),
}));

// Image resizing is not under test; this keeps the native module from loading.
jest.mock('sharp', () => ({ __esModule: true, default: jest.fn() }));

const pathOf = (query: FakeQuery): string =>
  (query as unknown as { parts: string[] }).parts.join('/');

async function overlapAt<A, B>(
  path: string,
  first: () => Promise<A>,
  second: () => Promise<B>,
): Promise<[A, B]> {
  let started = false;
  let secondRun: Promise<B>;
  const runSecond = () => {
    if (!started) {
      started = true;
      secondRun = second();
    }
    return secondRun;
  };
  const under = (query: FakeQuery) => {
    const at = pathOf(query);
    return at === path || at.startsWith(`${path}/`);
  };

  const { get } = FakeQuery.prototype;
  jest.spyOn(FakeQuery.prototype, 'get').mockImplementation(async function (
    this: FakeQuery,
  ) {
    const snapshot = await get.call(this);
    if (!started && under(this)) {
      await runSecond();
    }
    return snapshot;
  });
  const { transaction } = FakeReference.prototype;
  jest
    .spyOn(FakeReference.prototype, 'transaction')
    .mockImplementation(async function (
      this: FakeReference,
      ...args: Parameters<FakeReference['transaction']>
    ) {
      if (!started && under(this)) {
        await runSecond();
      }
      return transaction.apply(this, args);
    });

  const firstResult = await first();
  // A `first` that touched nothing under `path`: `second` runs after it.
  const secondResult = await runSecond();
  return [firstResult, secondResult];
}

const workspaceIdsOf = (uid: string) =>
  parseCollectionToArray<string>(
    mockFirebase.db.dump(`users/${uid}/workspaceIds`),
  );

describe("a user's list of workspaces while workspaces are created, joined and deleted", () => {
  let invitesService: WorkspaceInvitesService;
  let workspacesService: WorkspacesService;

  const create = (uid: string, name: string) => () =>
    workspacesService.createNewWorkspace(
      uid,
      'Name',
      `${uid}@example.test`,
      name,
    );
  const join = (uid: string, inviteId: string) => () =>
    invitesService.joinWorkspace(uid, inviteId);
  const listed = async (uid: string) =>
    (await workspacesService.getUserWorkspaces(uid)).data?.map((x) => x.id);

  beforeEach(async () => {
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    mockFirebase = new InMemoryFirebaseApp();
    const utilities = new WorkspaceUtilitiesService();
    invitesService = new WorkspaceInvitesService(utilities);
    workspacesService = new WorkspacesService(
      utilities,
      new WorkspaceMembersService(utilities),
    );

    await mockFirebase.db.ref().update({
      'users/uid-admin': {
        email: 'admin@example.test',
        workspaceIds: ['ws1'],
      },
      'users/uid-member': {
        email: 'member@example.test',
        workspaceIds: ['ws1'],
      },
      'users/uid-other': {
        email: 'other@example.test',
        workspaceIds: ['ws2'],
      },
      'workspaces/ws1': {
        id: 'ws1',
        name: 'Team space',
        admin: 'uid-admin',
        members: [{ id: 'uid-admin' }, { id: 'uid-member' }],
        created: 1,
      },
      // The workspace the member joins with an invite.
      'workspaces/ws2': {
        id: 'ws2',
        name: 'Other space',
        admin: 'uid-other',
        members: [{ id: 'uid-other' }],
        inviteLinkId: 'inv2',
        created: 2,
      },
      'workspaceInvites/inv2': {
        id: 'inv2',
        workspaceId: 'ws2',
        inviterId: 'uid-other',
      },
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('keeps both ids when the user joins a workspace while creating one', async () => {
    const [created, joined] = await overlapAt(
      'users/uid-member',
      create('uid-member', 'Mine'),
      join('uid-member', 'inv2'),
    );

    expect(created.status).toBe(ResStatusEnum.success);
    expect(joined).toMatchObject({
      status: ResStatusEnum.success,
      data: { workspaceId: 'ws2', hasAlreadyJoined: false },
    });
    const mine = created.data?.id;
    expect(mine).toEqual(expect.any(String));
    expect(workspaceIdsOf('uid-member')).toEqual(['ws1', 'ws2', mine]);
    expect(await listed('uid-member')).toEqual(['ws1', 'ws2', mine]);
  });

  it('keeps both ids when two creates arrive at once (a double submit)', async () => {
    const [first, second] = await overlapAt(
      'users/uid-admin',
      create('uid-admin', 'First'),
      create('uid-admin', 'Second'),
    );

    expect(first.status).toBe(ResStatusEnum.success);
    expect(second.status).toBe(ResStatusEnum.success);
    // The second create lands while the first one reads the user, so it is listed first.
    expect(workspaceIdsOf('uid-admin')).toEqual([
      'ws1',
      second.data?.id,
      first.data?.id,
    ]);
    expect(await listed('uid-admin')).toHaveLength(3);
  });

  it('drops the deleted workspace and keeps one a member joins meanwhile', async () => {
    const [deleted, joined] = await overlapAt(
      'users/uid-member',
      () => workspacesService.deleteWorkspace('uid-admin', 'ws1'),
      join('uid-member', 'inv2'),
    );

    expect(deleted.status).toBe(ResStatusEnum.success);
    expect(joined).toMatchObject({
      status: ResStatusEnum.success,
      data: { workspaceId: 'ws2', hasAlreadyJoined: false },
    });
    expect(mockFirebase.db.dump('workspaces/ws1')).toBeNull();
    expect(workspaceIdsOf('uid-member')).toEqual(['ws2']);
    expect(workspaceIdsOf('uid-admin')).toEqual([]);
    expect(await listed('uid-member')).toEqual(['ws2']);
  });

  describe('a list stored as an object, or not stored', () => {
    // A list with a hole (an id taken out by hand) comes back as an object.
    const objectList = { 0: 'ws1', 2: 'ws2' };

    it('adds a created workspace to a list stored as an object', async () => {
      await mockFirebase.db
        .ref('users/uid-member/workspaceIds')
        .set(objectList);

      const created = await create('uid-member', 'Mine')();

      expect(created.status).toBe(ResStatusEnum.success);
      expect(workspaceIdsOf('uid-member')).toEqual([
        'ws1',
        'ws2',
        created.data?.id,
      ]);
    });

    it('starts the list of a user who has none', async () => {
      await mockFirebase.db.ref('users/uid-member/workspaceIds').remove();

      const created = await create('uid-member', 'Mine')();

      expect(created.status).toBe(ResStatusEnum.success);
      expect(mockFirebase.db.dump('users/uid-member/workspaceIds')).toEqual([
        created.data?.id,
      ]);
    });

    it('takes a deleted workspace out of a member list stored as an object', async () => {
      await mockFirebase.db
        .ref('users/uid-member/workspaceIds')
        .set(objectList);

      const deleted = await workspacesService.deleteWorkspace(
        'uid-admin',
        'ws1',
      );

      expect(deleted.status).toBe(ResStatusEnum.success);
      expect(workspaceIdsOf('uid-member')).toEqual(['ws2']);
    });

    it('leaves a member without a list, or without a record, as it is', async () => {
      await mockFirebase.db.ref('users/uid-member/workspaceIds').remove();
      await mockFirebase.db
        .ref('workspaces/ws1/members')
        .set([{ id: 'uid-admin' }, { id: 'uid-member' }, { id: 'uid-gone' }]);

      const deleted = await workspacesService.deleteWorkspace(
        'uid-admin',
        'ws1',
      );

      expect(deleted.status).toBe(ResStatusEnum.success);
      expect(mockFirebase.db.dump('users/uid-member')).toEqual({
        email: 'member@example.test',
      });
      // No record is made up for an account that has none.
      expect(mockFirebase.db.dump('users/uid-gone')).toBeNull();
      expect(workspaceIdsOf('uid-admin')).toEqual([]);
    });
  });
});
