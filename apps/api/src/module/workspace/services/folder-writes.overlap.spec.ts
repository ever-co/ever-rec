/**
 * Overlapping writes to a workspace. Each writer used to read the workspace, change a copy and
 * write the whole folder list (or the whole workspace) back, so of two requests that overlap the
 * later write undid the earlier one: an upload's item count dropped a folder created meanwhile, and
 * a move of items or a team change put back a member the admin had just removed or a folder access
 * the admin had just taken away. The folder list is now changed in one transaction on
 * `workspaces/<id>/folders`, and the other writers write only the children they change. The member
 * list and the team list are changed the same way, in transactions on `workspaces/<id>/members` and
 * `workspaces/<id>/teams`, so a member who left or was taken out of a team is not put back. A move
 * of items changes each item's folder in a transaction of its own and counts only the items whose
 * folder changed, from the folder each one was in, so a move sent twice or two moves of one item
 * keep every count exact.
 *
 * `overlap(first, second)` runs `second` from start to end right after `first` reads anything of
 * the workspace for the first time: `second` lands between that read and the writes `first` makes.
 */
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  FakeQuery,
  FakeReference,
  InMemoryFirebaseApp,
} from '../../../../test/support/in-memory-firebase';
import { FoldersSharedService } from '../../../services/shared/folders.shared.service';
import { parseCollectionToArray } from '../../../services/utils/helpers';
import { WorkspaceFoldersController } from '../controllers/folders.controller';
import { WorkspaceFilesService } from './files.service';
import { WorkspaceFoldersService } from './folders.service';
import { WorkspaceInvitesService } from './invites.service';
import { WorkspaceMembersService } from './members.service';
import { WorkspaceShareService } from './share.service';
import { WorkspaceSharedService } from './shared.service';
import { WorkspaceTeamsService } from './teams.service';
import { WorkspaceUtilitiesService } from './utilities.service';
import { WorkspacesService } from './workspace.service';

let mockFirebase: InMemoryFirebaseApp;

jest.mock('firebase-admin', () => ({
  ...jest.requireActual('firebase-admin'),
  database: () => mockFirebase.database(),
  storage: () => mockFirebase.storage(),
}));

// Image resizing is not under test (uploads are stand-ins); this keeps the native module from
// loading.
jest.mock('sharp', () => ({ __esModule: true, default: jest.fn() }));

const WORKSPACE = 'workspaces/ws1';
const admin = { id: 'uid-admin' };

const pathOf = (query: FakeQuery): string =>
  (query as unknown as { parts: string[] }).parts.join('/');

async function overlap<A, B>(
  first: () => Promise<A>,
  second: () => Promise<B>,
): Promise<[A, B]> {
  let secondRun: Promise<B> | undefined;
  const runSecond = () => (secondRun ??= second());
  const { get } = FakeQuery.prototype;
  jest.spyOn(FakeQuery.prototype, 'get').mockImplementation(async function (
    this: FakeQuery,
  ) {
    const snapshot = await get.call(this);
    const path = pathOf(this);
    if (
      !secondRun &&
      (path === WORKSPACE || path.startsWith(`${WORKSPACE}/`))
    ) {
      await runSecond();
    }
    return snapshot;
  });
  const firstResult = await first();
  // A `first` that read nothing of the workspace: `second` runs after it.
  const secondResult = await runSecond();
  return [firstResult, secondResult];
}

const stored = (path: string) => mockFirebase.db.dump(`${WORKSPACE}/${path}`);
const folders = () =>
  parseCollectionToArray<any>(stored('folders')).filter(Boolean);
const folder = (id: string) => folders().find((x) => x.id === id);
const accessOf = (folderId: string, uid: string) =>
  parseCollectionToArray<any>(folder(folderId)?.access?.members).find(
    (x) => x?.uid === uid,
  )?.access;
const memberIds = () =>
  parseCollectionToArray<any>(stored('members')).map((x) => x?.id);
const team = (id: string) =>
  parseCollectionToArray<any>(stored('teams')).find((x) => x?.id === id);
const screenshotTitles = () =>
  parseCollectionToArray<any>(stored('screenshots')).map((x) => x?.title);

describe('overlapping writes to a workspace', () => {
  let utilities: WorkspaceUtilitiesService;
  let foldersService: WorkspaceFoldersService;
  let filesService: WorkspaceFilesService;
  let membersService: WorkspaceMembersService;
  let sharedService: WorkspaceSharedService;
  let teamsService: WorkspaceTeamsService;
  let invitesService: WorkspaceInvitesService;
  let favoritesService: FoldersSharedService;
  let workspacesService: WorkspacesService;

  beforeEach(async () => {
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    mockFirebase = new InMemoryFirebaseApp();
    utilities = new WorkspaceUtilitiesService();
    // Stores the image and its thumbnail, without resizing anything.
    jest
      .spyOn(utilities, 'uploadImageInBucket')
      .mockImplementation(
        async (_file: unknown, workspaceId: string, name: string) => {
          const bucket = mockFirebase.bucket;
          const file = bucket.file(
            `workspaces/${workspaceId}/screenshots/${name}`,
          );
          const thumbnail = bucket.file(
            `workspaces/${workspaceId}/screenshots/thumbnails/${name}`,
          );
          await file.save(Buffer.alloc(100, 1));
          await thumbnail.save(Buffer.alloc(10, 1));
          return { file, thumbnail };
        },
      );
    favoritesService = new FoldersSharedService();
    foldersService = new WorkspaceFoldersService(utilities, favoritesService);
    filesService = new WorkspaceFilesService(
      utilities,
      {} as any,
      // A deleted image's share links go with it.
      new WorkspaceShareService(utilities, new EventEmitter2()),
      {} as any,
      new EventEmitter2(),
      {} as any,
    );
    membersService = new WorkspaceMembersService(utilities);
    sharedService = new WorkspaceSharedService();
    teamsService = new WorkspaceTeamsService(utilities);
    invitesService = new WorkspaceInvitesService(utilities);
    workspacesService = new WorkspacesService(utilities, membersService);

    await mockFirebase.db.ref('users/uid-member').set({
      email: 'member@example.test',
      workspaceIds: ['ws1'],
    });
    await mockFirebase.db.ref(WORKSPACE).set({
      id: 'ws1',
      name: 'Team space',
      admin: 'uid-admin',
      members: [
        { id: 'uid-admin' },
        { id: 'uid-member' },
        { id: 'uid-joiner' },
        { id: 'uid-leaving' },
      ],
      teams: [
        {
          id: 'team1',
          admin: 'uid-admin',
          name: 'Team',
          workspaceId: 'ws1',
          members: [{ id: 'uid-admin' }, { id: 'uid-member' }],
        },
      ],
      folders: {
        // The upload target; the member may write here.
        fold1: {
          id: 'fold1',
          name: 'Shots',
          creator: 'uid-admin',
          parentId: false,
          nestLevel: 0,
          items: 1,
          access: { members: [{ uid: 'uid-member', access: 'WRITE' }] },
        },
        fold2: {
          id: 'fold2',
          name: 'Other',
          creator: 'uid-admin',
          parentId: false,
          nestLevel: 0,
          items: 0,
        },
        fold3: {
          id: 'fold3',
          name: 'Old',
          creator: 'uid-admin',
          parentId: false,
          nestLevel: 0,
          items: 0,
        },
      },
      screenshots: {
        shot1: {
          id: 'shot1',
          uid: 'uid-admin',
          title: 'Earlier',
          refName: 'earlier.png',
          parentId: false,
        },
      },
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // The member uploads a screenshot into fold1: one more item there.
  const upload = () =>
    filesService.addImageFromFile(
      'uid-member',
      'ws1',
      {} as Express.Multer.File,
      'Uploaded',
      'uploaded.png',
      'fold1',
    );
  const uploadSurvived = () => {
    expect(folder('fold1')?.items).toBe(2);
    expect(screenshotTitles()).toContain('Uploaded');
  };

  // Each writer of the folder list, with the change it makes.
  const folderWriters: Array<
    [string, () => Promise<{ status: string }>, () => void]
  > = [
    [
      'creating a folder',
      () =>
        foldersService.createWorkspaceFolder(
          'uid-admin',
          'ws1',
          'New',
          'red',
          0,
          false,
        ),
      () => expect(folders().map((x) => x.name)).toContain('New'),
    ],
    [
      'renaming a folder',
      () =>
        foldersService.updateFolderData('uid-admin', 'ws1', 'fold2', {
          name: 'Renamed',
        }),
      () => expect(folder('fold2')?.name).toBe('Renamed'),
    ],
    [
      'moving a folder',
      () => foldersService.moveFolder('ws1', 'fold3', 'fold2'),
      () =>
        expect(folder('fold3')).toMatchObject({
          parentId: 'fold2',
          nestLevel: 1,
        }),
    ],
    [
      'deleting a folder',
      () => foldersService.deleteFolder('uid-admin', 'ws1', 'fold3', false),
      () => expect(folder('fold3')).toBeUndefined(),
    ],
    [
      'moving items into a folder',
      () => foldersService.moveItemsToFolder(admin, 'ws1', ['shot1'], 'fold2'),
      () => {
        expect(stored('screenshots/shot1/parentId')).toBe('fold2');
        expect(folder('fold2')?.items).toBe(1);
      },
    ],
    [
      'taking a folder away from a member',
      () =>
        sharedService.updatePermissions(
          'uid-member',
          'ws1',
          'fold1',
          'folders',
          false,
          false,
          'member',
        ),
      () => expect(accessOf('fold1', 'uid-member')).toBe('NONE'),
    ],
    [
      'adding a folder to favourites',
      async () =>
        (await favoritesService.addRemoveFavFolder(
          'uid-member',
          'fold1',
          undefined,
          'ws1',
        )) ?? { status: 'none' },
      () => expect(folder('fold1')?.isFavoredBy).toEqual(['uid-member']),
    ],
  ];

  describe.each(folderWriters)(
    '%s and an upload into a folder at the same time',
    (_name, write, wrote) => {
      it('keeps both when the upload lands between the read and the write', async () => {
        const [written, uploaded] = await overlap(write, upload);

        expect(written.status).toBe('success');
        expect(uploaded.status).toBe('success');
        wrote();
        uploadSurvived();
      });

      it('keeps both when the change lands while the upload is counted', async () => {
        const [uploaded, written] = await overlap(upload, write);

        expect(written.status).toBe('success');
        expect(uploaded.status).toBe('success');
        wrote();
        uploadSurvived();
      });
    },
  );

  // The admin removes a member and takes fold1 away from another one.
  const restrict = async () => {
    const removed = await membersService.removeMemberFromWorkspace(
      'uid-leaving',
      'ws1',
    );
    const restricted = await sharedService.updatePermissions(
      'uid-member',
      'ws1',
      'fold1',
      'folders',
      false,
      false,
      'member',
    );
    return [removed.status, restricted.status];
  };
  const restrictionSurvived = () => {
    expect(memberIds()).toEqual(['uid-admin', 'uid-member', 'uid-joiner']);
    expect(accessOf('fold1', 'uid-member')).toBe('NONE');
  };

  const workspaceWriters: Array<
    [string, () => Promise<{ status: string }>, () => void]
  > = [
    [
      'moving items',
      () => foldersService.moveItemsToFolder(admin, 'ws1', ['shot1'], 'fold2'),
      () => expect(stored('screenshots/shot1/parentId')).toBe('fold2'),
    ],
    [
      'adding a team',
      () => teamsService.addTeam('uid-admin', 'ws1', 'Design'),
      () =>
        expect(
          parseCollectionToArray<any>(stored('teams')).map((x) => x.name),
        ).toEqual(['Team', 'Design']),
    ],
    [
      'renaming a team',
      () => teamsService.updateTeam('ws1', 'team1', 'Renamed team'),
      () => expect(team('team1')?.name).toBe('Renamed team'),
    ],
    [
      'deleting a team',
      () => teamsService.deleteTeam('ws1', 'team1'),
      () => expect(team('team1')).toBeUndefined(),
    ],
    [
      'leaving a team',
      () => teamsService.leaveTeam('ws1', 'uid-member', 'team1'),
      () => expect(team('team1')?.members).toEqual([{ id: 'uid-admin' }]),
    ],
    [
      'adding a team member',
      () => teamsService.addMember('ws1', 'team1', 'uid-joiner'),
      () =>
        expect(team('team1')?.members).toEqual([
          { id: 'uid-admin' },
          { id: 'uid-member' },
          { id: 'uid-joiner' },
        ]),
    ],
    [
      'removing a team member',
      () => teamsService.deleteMember('ws1', 'team1', 'uid-member'),
      () => expect(team('team1')?.members).toEqual([{ id: 'uid-admin' }]),
    ],
  ];

  describe.each(workspaceWriters)(
    '%s while the admin removes a member and restricts a folder',
    (_name, write, wrote) => {
      it('keeps the removal, the restriction and the change', async () => {
        const [written, restricted] = await overlap(write, restrict);

        expect(written.status).toBe('success');
        expect(restricted).toEqual(['success', 'success']);
        wrote();
        restrictionSurvived();
      });
    },
  );

  describe('a member leaving the workspace', () => {
    const leave = () => workspacesService.leaveWorkspace('uid-joiner', 'ws1');
    const restrictFold1 = () =>
      sharedService.updatePermissions(
        'uid-member',
        'ws1',
        'fold1',
        'folders',
        false,
        false,
        'member',
      );
    const left = () => {
      expect(memberIds()).not.toContain('uid-joiner');
      // The leaving member's own folder permission goes, the others stay.
      expect(
        parseCollectionToArray<any>(folder('fold2')?.access?.members),
      ).toEqual([]);
      // Stored by id, as every reader of `folders/<id>` expects.
      expect(Object.keys(stored('folders')).sort()).toEqual([
        'fold1',
        'fold2',
        'fold3',
      ]);
    };

    beforeEach(async () => {
      await mockFirebase.db.ref('users/uid-joiner').set({
        email: 'joiner@example.test',
        workspaceIds: ['ws1'],
      });
      await mockFirebase.db
        .ref(`${WORKSPACE}/folders/fold2/access`)
        .set({ members: [{ uid: 'uid-joiner', access: 'READ' }] });
    });

    it('keeps an upload counted meanwhile', async () => {
      const [leaving, uploaded] = await overlap(leave, upload);

      expect(leaving.status).toBe('success');
      expect(uploaded.status).toBe('success');
      uploadSurvived();
      left();
    });

    it('keeps a folder taken away from another member meanwhile', async () => {
      const [leaving, restricted] = await overlap(leave, restrictFold1);

      expect(leaving.status).toBe('success');
      expect(restricted.status).toBe('success');
      expect(accessOf('fold1', 'uid-member')).toBe('NONE');
      left();
    });
  });

  describe('members and teams changed at the same time', () => {
    const leave = (uid: string) => () =>
      workspacesService.leaveWorkspace(uid, 'ws1');
    const removeFromTeam = () =>
      teamsService.deleteMember('ws1', 'team1', 'uid-member');
    const add = (uid: string) => () =>
      membersService.addWorkspaceMember(uid, 'Name', 'new@example.test', 'ws1');
    const workspaceIdsOf = (uid: string) =>
      parseCollectionToArray<string>(
        mockFirebase.db.dump(`users/${uid}/workspaceIds`),
      );
    const teamMemberIds = () =>
      parseCollectionToArray<any>(team('team1')?.members).map((x) => x?.id);
    const teamNames = () =>
      parseCollectionToArray<any>(stored('teams')).map((x) => x?.name);

    beforeEach(async () => {
      for (const uid of ['uid-joiner', 'uid-leaving']) {
        await mockFirebase.db
          .ref(`users/${uid}`)
          .set({ email: `${uid}@example.test`, workspaceIds: ['ws1'] });
      }
      await mockFirebase.db
        .ref('users/uid-new')
        .set({ email: 'new@example.test', workspaceIds: ['ws-other'] });
      await mockFirebase.db
        .ref('workspaceInvites/invite1')
        .set({ id: 'invite1', workspaceId: 'ws1', inviterId: 'uid-admin' });
      // The leaving member is in the team too.
      await mockFirebase.db
        .ref(`${WORKSPACE}/teams/0/members`)
        .set([
          { id: 'uid-admin' },
          { id: 'uid-member' },
          { id: 'uid-leaving' },
        ]);
    });

    it('keeps both members out when two leave at once', async () => {
      const [first, second] = await overlap(
        leave('uid-joiner'),
        leave('uid-leaving'),
      );

      expect(first.status).toBe('success');
      expect(second.status).toBe('success');
      expect(memberIds()).toEqual(['uid-admin', 'uid-member']);
      expect(teamMemberIds()).toEqual(['uid-admin', 'uid-member']);
      expect(workspaceIdsOf('uid-joiner')).toEqual([]);
      expect(workspaceIdsOf('uid-leaving')).toEqual([]);
    });

    it('keeps a join by invite that lands during a leave', async () => {
      const [left, joined] = await overlap(leave('uid-joiner'), () =>
        invitesService.joinWorkspace('uid-new', 'invite1'),
      );

      expect(left.status).toBe('success');
      expect(joined).toMatchObject({
        status: 'success',
        data: { workspaceId: 'ws1', hasAlreadyJoined: false },
      });
      expect(memberIds()).toEqual([
        'uid-admin',
        'uid-member',
        'uid-leaving',
        'uid-new',
      ]);
      expect(workspaceIdsOf('uid-new')).toEqual(['ws-other', 'ws1']);
      expect(workspaceIdsOf('uid-joiner')).toEqual([]);
    });

    it('keeps the workspace listed when the member who leaves joins again meanwhile', async () => {
      // The join lands after the leave took the member out of the list of members, and before it
      // takes the workspace out of the member's list.
      const { transaction } = FakeReference.prototype;
      let joined: Promise<unknown> | undefined;
      jest
        .spyOn(FakeReference.prototype, 'transaction')
        .mockImplementation(async function (
          this: FakeReference,
          ...args: Parameters<FakeReference['transaction']>
        ) {
          if (!joined && pathOf(this) === 'users/uid-joiner/workspaceIds') {
            joined = invitesService.joinWorkspace('uid-joiner', 'invite1');
            await joined;
          }
          return transaction.apply(this, args);
        });

      const left = await workspacesService.leaveWorkspace('uid-joiner', 'ws1');

      expect(left.status).toBe('success');
      expect(await joined).toMatchObject({
        status: 'success',
        data: { workspaceId: 'ws1', hasAlreadyJoined: false },
      });
      // A member again, and the workspace in the member's list.
      expect(memberIds()).toContain('uid-joiner');
      expect(workspaceIdsOf('uid-joiner')).toEqual(['ws1']);
    });

    // Each writer of the team list, with the change it makes.
    const teamWriters: Array<
      [string, () => Promise<{ status: string }>, () => void]
    > = [
      [
        'adding a team',
        () => teamsService.addTeam('uid-admin', 'ws1', 'Design'),
        () => expect(teamNames()).toEqual(['Team', 'Design']),
      ],
      [
        'renaming the team',
        () => teamsService.updateTeam('ws1', 'team1', 'Renamed team'),
        () => expect(team('team1')?.name).toBe('Renamed team'),
      ],
      [
        'adding a member to the team',
        () => teamsService.addMember('ws1', 'team1', 'uid-joiner'),
        () => expect(teamMemberIds()).toContain('uid-joiner'),
      ],
      [
        'a team member leaving the workspace',
        leave('uid-leaving'),
        () => {
          expect(memberIds()).not.toContain('uid-leaving');
          expect(teamMemberIds()).not.toContain('uid-leaving');
        },
      ],
    ];

    describe.each(teamWriters)(
      '%s while the admin removes a member from the team',
      (_name, write, wrote) => {
        it('keeps the removal when it lands between the read and the write', async () => {
          const [written, removed] = await overlap(write, removeFromTeam);

          expect(written.status).toBe('success');
          expect(removed.status).toBe('success');
          wrote();
          expect(teamMemberIds()).not.toContain('uid-member');
        });

        it('keeps the change when it lands while the removal is made', async () => {
          const [removed, written] = await overlap(removeFromTeam, write);

          expect(written.status).toBe('success');
          expect(removed.status).toBe('success');
          wrote();
          expect(teamMemberIds()).not.toContain('uid-member');
        });
      },
    );

    it('stores a member once, however often the member is added', async () => {
      const first = await add('uid-new')();
      const second = await add('uid-new')();
      const again = await add('uid-admin')();

      expect([first.status, second.status, again.status]).toEqual([
        'success',
        'success',
        'success',
      ]);
      expect(memberIds()).toEqual([
        'uid-admin',
        'uid-member',
        'uid-joiner',
        'uid-leaving',
        'uid-new',
      ]);
    });

    it('keeps two members added at the same time', async () => {
      const [first, second] = await overlap(add('uid-new'), add('uid-other'));

      expect(first.status).toBe('success');
      expect(second.status).toBe('success');
      // The second add lands while the first one reads, so it is stored first.
      expect(memberIds()).toEqual([
        'uid-admin',
        'uid-member',
        'uid-joiner',
        'uid-leaving',
        'uid-other',
        'uid-new',
      ]);
    });
  });

  it('moves an item uploaded into a folder being deleted to the top level', async () => {
    const [deleted, uploaded] = await overlap(
      () => foldersService.deleteFolder('uid-admin', 'ws1', 'fold1', false),
      upload,
    );

    expect(deleted.status).toBe('success');
    expect(uploaded.status).toBe('success');
    expect(folder('fold1')).toBeUndefined();
    const shot = parseCollectionToArray<any>(stored('screenshots')).find(
      (x) => x?.title === 'Uploaded',
    );
    expect(shot?.parentId).toBe(false);
  });

  it('lowers the counts above a deleted folder where it is now, after a move meanwhile', async () => {
    // fold3 holds one item and is at the top level when the delete reads the workspace.
    await mockFirebase.db
      .ref(`${WORKSPACE}/screenshots/shot1/parentId`)
      .set('fold3');
    await mockFirebase.db.ref(`${WORKSPACE}/folders/fold3/items`).set(1);

    const [deleted, moved] = await overlap(
      () => foldersService.deleteFolder('uid-admin', 'ws1', 'fold3', false),
      () => foldersService.moveFolder('ws1', 'fold3', 'fold2'),
    );

    expect(deleted.status).toBe('success');
    expect(moved.status).toBe('success');
    expect(folder('fold3')).toBeUndefined();
    // The move counted the item in fold2; the delete takes it out of fold2 again.
    expect(folder('fold2')?.items).toBe(0);
    expect(stored('screenshots/shot1/parentId')).toBe(false);
  });

  describe('moving items counts each item once, from the folder it is stored in', () => {
    let controller: WorkspaceFoldersController;
    // The move as the route gets it: `fromFolderId` is what the client sends.
    const move =
      (itemIds: string[], to: string | false, fromFolderId: string | false) =>
      () =>
        controller.moveItemsToFolder(
          'ws1',
          to,
          { itemIds, fromFolderId },
          admin as any,
        );
    const counts = () =>
      Object.fromEntries(folders().map((x) => [x.id, x.items]));
    // fold1 counts one item from the start (see the workspace above); shot1 is at the top level.
    const movedIntoFold2 = () => {
      expect(stored('screenshots/shot1')).toMatchObject({
        id: 'shot1',
        parentId: 'fold2',
      });
      expect(counts()).toEqual({ fold1: 1, fold2: 1, fold3: 0 });
    };

    beforeEach(() => {
      controller = new WorkspaceFoldersController(
        foldersService,
        favoritesService,
        sharedService,
      );
    });

    it('counts a move sent again (a retry) once', async () => {
      const first = await move(['shot1'], 'fold2', false)();
      const again = await move(['shot1'], 'fold2', false)();

      expect([first.status, again.status]).toEqual(['success', 'success']);
      movedIntoFold2();
    });

    it('counts a move sent twice at the same time (a double submit) once', async () => {
      const [first, second] = await overlap(
        move(['shot1'], 'fold2', false),
        move(['shot1'], 'fold2', false),
      );

      expect([first.status, second.status]).toEqual(['success', 'success']);
      movedIntoFold2();
    });

    it('counts an id named twice in one move once', async () => {
      const moved = await move(['shot1', 'shot1'], 'fold2', false)();

      expect(moved.status).toBe('success');
      movedIntoFold2();
    });

    it('counts the item out of the folder it is in, not the fromFolderId in the body', async () => {
      await mockFirebase.db
        .ref(`${WORKSPACE}/screenshots/shot1/parentId`)
        .set('fold3');
      await mockFirebase.db.ref(`${WORKSPACE}/folders/fold3/items`).set(1);

      const moved = await move(['shot1'], 'fold2', 'fold1')();

      expect(moved.status).toBe('success');
      movedIntoFold2();
    });

    it('counts two moves of one item at the same time from where each found it', async () => {
      // The move into fold3 lands while the move into fold2 reads: the item is in fold3 when the
      // move into fold2 changes its folder.
      const [intoFold2, intoFold3] = await overlap(
        move(['shot1'], 'fold2', false),
        move(['shot1'], 'fold3', false),
      );

      expect([intoFold2.status, intoFold3.status]).toEqual([
        'success',
        'success',
      ]);
      movedIntoFold2();
    });

    it('does not bring back an item deleted before its move is written', async () => {
      const [moved, deleted] = await overlap(
        move(['shot1'], 'fold2', false),
        () => filesService.deleteImage('ws1', 'shot1', false),
      );

      expect(moved.status).toBe('success');
      expect(deleted.status).toBe('success');
      // Not an item that holds only a `parentId`, and not counted.
      expect(stored('screenshots/shot1')).toBeNull();
      expect(counts()).toEqual({ fold1: 1, fold2: 0, fold3: 0 });
    });
  });

  it('answers an error when the folder permission cannot be stored', async () => {
    // Every write of the folder list fails, as when the database refuses it.
    const refuse = <A extends unknown[], R>(
      original: (...args: A) => Promise<R>,
    ) =>
      function (this: FakeReference, ...args: A): Promise<R> {
        if (pathOf(this) === `${WORKSPACE}/folders`) {
          const refused = Promise.reject(new Error('write refused'));
          // Nobody may be waiting for it (the permission write used not to be awaited).
          refused.catch(() => undefined);
          return refused as Promise<R>;
        }
        return original.apply(this, args);
      };
    const { set, transaction } = FakeReference.prototype;
    jest.spyOn(FakeReference.prototype, 'set').mockImplementation(refuse(set));
    jest
      .spyOn(FakeReference.prototype, 'transaction')
      .mockImplementation(refuse(transaction));

    const result = await sharedService.updatePermissions(
      'uid-member',
      'ws1',
      'fold1',
      'folders',
      false,
      false,
      'member',
    );

    expect(result.status).toBe('error');
    expect(accessOf('fold1', 'uid-member')).toBe('WRITE');
  });

  it('answers an error when a favourite cannot be stored', async () => {
    const { transaction } = FakeReference.prototype;
    jest
      .spyOn(FakeReference.prototype, 'transaction')
      .mockImplementation(function (this: FakeReference, ...args) {
        if (pathOf(this) === `${WORKSPACE}/folders`) {
          return Promise.reject(new Error('write refused'));
        }
        return transaction.apply(this, args);
      });

    const result = await favoritesService.addRemoveFavFolder(
      'uid-member',
      'fold1',
      undefined,
      'ws1',
    );

    expect(result?.status).toBe('error');
    expect(folder('fold1')?.isFavoredBy).toBeUndefined();
  });
});
