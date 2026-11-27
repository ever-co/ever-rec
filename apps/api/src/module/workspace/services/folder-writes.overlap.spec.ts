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
 * keep every count exact. A folder delete lowers the folders above it by the item count stored in
 * the folder when the delete is made, so an item uploaded into it or moved out of it meanwhile is
 * taken off once. Its items then move to the top level each in a transaction of its own, and only
 * while they are still in a deleted folder, so an item deleted meanwhile is not brought back and an
 * item moved meanwhile stays in the folder that counts it. A deleted image or video loses its files
 * only while they have the generation read before its record was removed, so an upload under the
 * same name once the record is gone keeps the files it wrote.
 *
 * `overlap(first, second)` runs `second` from start to end right after `first` reads anything of
 * the workspace for the first time: `second` lands between that read and the writes `first` makes.
 */
import { Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  FakeQuery,
  FakeReference,
  FakeStorageFile,
  InMemoryFirebaseApp,
} from '../../../../test/support/in-memory-firebase';
import { EVER_COUNTER_EVENTS } from '../../../common/events/ever-counters.events';
import { FoldersSharedService } from '../../../services/shared/folders.shared.service';
import { parseCollectionToArray } from '../../../services/utils/helpers';
import { WorkspaceFilesController } from '../controllers/files.controller';
import { WorkspaceFoldersController } from '../controllers/folders.controller';
import { findImagesByFileName, findVideosByFileName } from '../guards/utils';
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

  describe('deleting a folder lowers the folders above it by the items stored in it', () => {
    // fold1 is under a parent folder and holds shot1, which the parent counts too.
    beforeEach(async () => {
      await mockFirebase.db.ref(`${WORKSPACE}/folders/parent`).set({
        id: 'parent',
        name: 'Parent',
        creator: 'uid-admin',
        parentId: false,
        nestLevel: 0,
        items: 1,
      });
      await mockFirebase.db
        .ref(`${WORKSPACE}/folders/fold1`)
        .update({ parentId: 'parent', nestLevel: 1 });
      await mockFirebase.db
        .ref(`${WORKSPACE}/screenshots/shot1/parentId`)
        .set('fold1');
    });

    const deleteFold1 = () =>
      foldersService.deleteFolder('uid-admin', 'ws1', 'fold1', 'parent');

    it('takes an item uploaded into the folder meanwhile out of the parent', async () => {
      const [deleted, uploaded] = await overlap(deleteFold1, upload);

      expect(deleted.status).toBe('success');
      expect(uploaded.status).toBe('success');
      expect(folder('fold1')).toBeUndefined();
      // Both items moved to the top level; the parent holds none of them.
      expect(
        parseCollectionToArray<any>(stored('screenshots')).map(
          (x) => x?.parentId,
        ),
      ).toEqual([false, false]);
      expect(folder('parent')?.items).toBe(0);
    });

    it('takes an item moved out of the folder meanwhile out of the parent once', async () => {
      const [deleted, moved] = await overlap(deleteFold1, () =>
        foldersService.moveItemsToFolder(admin, 'ws1', ['shot1'], 'fold3'),
      );

      expect(deleted.status).toBe('success');
      expect(moved.status).toBe('success');
      expect(folder('fold1')).toBeUndefined();
      expect(stored('screenshots/shot1/parentId')).toBe('fold3');
      expect(folder('fold3')?.items).toBe(1);
      // The move took the item out of the parent; the delete must not take it out again.
      expect(folder('parent')?.items).toBe(0);
    });
  });

  describe('deleting a folder moves its items to the top level only while they are still in it', () => {
    let files: WorkspaceFilesService;

    // fold1 is under a parent folder and holds shot1 and vid1, which the parent counts too; fold3
    // is under fold2.
    beforeEach(async () => {
      files = new WorkspaceFilesService(
        utilities,
        // A deleted video's streaming asset goes with it.
        { deleteAsset: () => Promise.resolve() } as any,
        new WorkspaceShareService(utilities, new EventEmitter2()),
        {} as any,
        new EventEmitter2(),
        {} as any,
      );
      await mockFirebase.db
        .ref(`${WORKSPACE}/screenshots/shot1/parentId`)
        .set('fold1');
      await mockFirebase.db.ref(`${WORKSPACE}/videos/vid1`).set({
        id: 'vid1',
        uid: 'uid-admin',
        title: 'Clip',
        refName: 'clip.mp4',
        parentId: 'fold1',
      });
      await mockFirebase.db.ref(`${WORKSPACE}/folders/parent`).set({
        id: 'parent',
        name: 'Parent',
        creator: 'uid-admin',
        parentId: false,
        nestLevel: 0,
        items: 2,
      });
      await mockFirebase.db
        .ref(`${WORKSPACE}/folders/fold1`)
        .update({ parentId: 'parent', nestLevel: 1, items: 2 });
      await mockFirebase.db
        .ref(`${WORKSPACE}/folders/fold3`)
        .update({ parentId: 'fold2', nestLevel: 1 });
    });

    const deleteFold1 = () =>
      foldersService.deleteFolder('uid-admin', 'ws1', 'fold1', 'parent');
    const counts = () =>
      Object.fromEntries(folders().map((x) => [x.id, x.items]));
    // What each folder should count: the items stored in it and in the folders under it.
    const itemsUnder = () => {
      const all = folders();
      const parentOf = new Map<string, string | false>(
        all.map((x) => [x.id, x.parentId]),
      );
      const items = [
        ...parseCollectionToArray<any>(stored('screenshots')),
        ...parseCollectionToArray<any>(stored('videos')),
      ].filter(Boolean);
      const isUnder = (id: string | false, ancestorId: string) => {
        for (
          let at: string | false | undefined = id;
          at;
          at = parentOf.get(at)
        ) {
          if (at === ancestorId) {
            return true;
          }
        }
        return false;
      };
      return Object.fromEntries(
        all.map((x) => [
          x.id,
          items.filter((item) => isUnder(item.parentId, x.id)).length,
        ]),
      );
    };

    // Runs `second` from start to end right after the delete has read the items of `collection`
    // to move them out of the deleted folders, before it moves any of them.
    async function afterItemsRead<A, B>(
      collection: string,
      first: () => Promise<A>,
      second: () => Promise<B>,
    ): Promise<[A, B]> {
      let secondRun: Promise<B> | undefined;
      const { get } = FakeQuery.prototype;
      jest.spyOn(FakeQuery.prototype, 'get').mockImplementation(async function (
        this: FakeQuery,
      ) {
        const snapshot = await get.call(this);
        if (!secondRun && pathOf(this) === `${WORKSPACE}/${collection}`) {
          await (secondRun = second());
        }
        return snapshot;
      });
      const firstResult = await first();
      if (!secondRun) {
        throw new Error(`${collection} was not read`);
      }
      return [firstResult, await secondRun];
    }

    const items: Array<[string, string, string, () => Promise<any>]> = [
      [
        'an image',
        'screenshots/shot1',
        'videos/vid1',
        () => files.deleteImage('ws1', 'shot1'),
      ],
      [
        'a video',
        'videos/vid1',
        'screenshots/shot1',
        () => files.deleteVideo('ws1', 'vid1'),
      ],
    ];

    it('moves every item of the folder to the top level', async () => {
      const deleted = await deleteFold1();

      expect(deleted.status).toBe('success');
      expect(folder('fold1')).toBeUndefined();
      expect(stored('screenshots/shot1/parentId')).toBe(false);
      expect(stored('videos/vid1/parentId')).toBe(false);
      expect(counts()).toEqual({ parent: 0, fold2: 0, fold3: 0 });
      expect(counts()).toEqual(itemsUnder());
    });

    it.each(items)(
      'does not bring back %s deleted after the delete read it',
      async (_name, item, other, remove) => {
        const [deleted, removed] = await afterItemsRead(
          item.split('/')[0],
          deleteFold1,
          remove,
        );

        expect([deleted.status, removed.status]).toEqual([
          'success',
          'success',
        ]);
        expect(folder('fold1')).toBeUndefined();
        // Not an item that holds only a `parentId`.
        expect(stored(item)).toBeNull();
        expect(stored(`${other}/parentId`)).toBe(false);
        // The delete took both items out of the parent; the item's own delete takes nothing more.
        expect(counts()).toEqual({ parent: 0, fold2: 0, fold3: 0 });
        expect(counts()).toEqual(itemsUnder());
      },
    );

    it.each(items)(
      'keeps %s moved into another folder after the delete read it, counted there',
      async (_name, item, other) => {
        const [collection, itemId] = item.split('/');
        const [deleted, moved] = await afterItemsRead(
          collection,
          deleteFold1,
          () =>
            foldersService.moveItemsToFolder(admin, 'ws1', [itemId], 'fold3'),
        );

        expect([deleted.status, moved.status]).toEqual(['success', 'success']);
        expect(folder('fold1')).toBeUndefined();
        expect(stored(`${item}/parentId`)).toBe('fold3');
        expect(stored(`${other}/parentId`)).toBe(false);
        // fold3 and fold2 above it count the item, and hold it; the parent holds neither item.
        expect(counts()).toEqual({ parent: 0, fold2: 1, fold3: 1 });
        expect(counts()).toEqual(itemsUnder());
      },
    );

    it('answers an error when an item cannot be moved to the top level', async () => {
      // The move of shot1 is refused, as when an overlapping write of the item cancels it.
      const { transaction } = FakeReference.prototype;
      jest
        .spyOn(FakeReference.prototype, 'transaction')
        .mockImplementation(function (this: FakeReference, ...args) {
          if (pathOf(this) === `${WORKSPACE}/screenshots/shot1`) {
            return Promise.reject(new Error('set'));
          }
          return transaction.apply(this, args);
        });

      const deleted = await deleteFold1();

      expect(deleted.status).toBe('error');
      expect(folder('fold1')).toBeUndefined();
      // The other item still moves.
      expect(stored('videos/vid1/parentId')).toBe(false);
    });
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
        () => filesService.deleteImage('ws1', 'shot1'),
      );

      expect(moved.status).toBe('success');
      expect(deleted.status).toBe('success');
      // Not an item that holds only a `parentId`, and not counted.
      expect(stored('screenshots/shot1')).toBeNull();
      expect(counts()).toEqual({ fold1: 1, fold2: 0, fold3: 0 });
    });
  });

  describe('deleting an item counts it once, out of the folder it is stored in', () => {
    let controller: WorkspaceFilesController;
    let deletions: number;
    // The size each `media.deleted` reports.
    let sizes: number[];
    // The deletes as the routes get them: `folderId` is what the client sends.
    const deleteImage = (imageId: string, folderId: string | false) => () =>
      controller.deleteImage('ws1', { imageId, folderId });
    const deleteVideo = (videoId: string) => () =>
      controller.deleteVideo('ws1', { videoId });
    const counts = () =>
      Object.fromEntries(folders().map((x) => [x.id, x.items]));
    // fold1 counts shot1; fold3 is in fold2 and holds vid1, which both of them count.
    const imageDeleted = { fold1: 0, fold2: 1, fold3: 1 };
    const videoDeleted = { fold1: 1, fold2: 0, fold3: 0 };
    // The stored files of shot1 (100 bytes) and vid1 (300 bytes).
    const imageFile = `${WORKSPACE}/screenshots/earlier.png`;
    const videoFile = `${WORKSPACE}/videos/clip.mp4`;
    const isStored = (file: string) => mockFirebase.bucket.objects.has(file);

    // Runs `second` from start to end when `first` starts the transaction that removes the item at
    // `path`: after `first` has read the item, before it removes it.
    async function whenRemoving<A, B>(
      path: string,
      first: () => Promise<A>,
      second: () => Promise<B>,
    ): Promise<[A, B]> {
      let secondRun: Promise<B> | undefined;
      const { transaction } = FakeReference.prototype;
      jest
        .spyOn(FakeReference.prototype, 'transaction')
        .mockImplementation(async function (this: FakeReference, ...args) {
          if (!secondRun && pathOf(this) === `${WORKSPACE}/${path}`) {
            await (secondRun = second());
          }
          return transaction.apply(this, args);
        });
      const firstResult = await first();
      return [firstResult, await (secondRun ?? second())];
    }

    beforeEach(async () => {
      const events = new EventEmitter2();
      deletions = 0;
      sizes = [];
      events.on(
        EVER_COUNTER_EVENTS.mediaDeleted,
        (event: { bytes: number }) => {
          deletions += 1;
          sizes.push(event.bytes);
        },
      );
      await mockFirebase.bucket.file(imageFile).save(Buffer.alloc(100, 1));
      await mockFirebase.bucket.file(videoFile).save(Buffer.alloc(300, 1));
      controller = new WorkspaceFilesController(
        new WorkspaceFilesService(
          utilities,
          // A deleted video's streaming asset goes with it.
          { deleteAsset: () => Promise.resolve() } as any,
          new WorkspaceShareService(utilities, new EventEmitter2()),
          {} as any,
          events,
          {} as any,
        ),
        sharedService,
      );
      await mockFirebase.db
        .ref(`${WORKSPACE}/screenshots/shot1/parentId`)
        .set('fold1');
      await mockFirebase.db
        .ref(`${WORKSPACE}/folders/fold3`)
        .update({ parentId: 'fold2', nestLevel: 1, items: 1 });
      await mockFirebase.db.ref(`${WORKSPACE}/folders/fold2/items`).set(1);
      await mockFirebase.db.ref(`${WORKSPACE}/videos/vid1`).set({
        id: 'vid1',
        uid: 'uid-admin',
        title: 'Clip',
        refName: 'clip.mp4',
        parentId: 'fold3',
      });
    });

    it('counts an image out of the folder it is stored in, not the folderId in the query', async () => {
      const deleted = await deleteImage('shot1', 'fold2')();

      expect(deleted.status).toBe('success');
      expect(stored('screenshots/shot1')).toBeNull();
      expect(counts()).toEqual(imageDeleted);
    });

    it('changes no count for an image at the top level, whatever folderId the query names', async () => {
      await mockFirebase.db
        .ref(`${WORKSPACE}/screenshots/shot1/parentId`)
        .set(false);

      const deleted = await deleteImage('shot1', 'fold1')();

      expect(deleted.status).toBe('success');
      expect(stored('screenshots/shot1')).toBeNull();
      expect(counts()).toEqual({ fold1: 1, fold2: 1, fold3: 1 });
    });

    it('counts a video out of its folder and the folders above it', async () => {
      const deleted = await deleteVideo('vid1')();

      expect(deleted.status).toBe('success');
      expect(stored('videos/vid1')).toBeNull();
      expect(counts()).toEqual(videoDeleted);
    });

    it.each([
      ['an image', deleteImage('shot1', 'fold1'), imageDeleted],
      ['a video', deleteVideo('vid1'), videoDeleted],
    ])(
      'counts %s deleted twice at the same time (a double submit) once',
      async (_name, remove, after) => {
        const [first, second] = await overlap(remove, remove);

        expect([first.status, second.status]).toEqual(['success', 'success']);
        expect(counts()).toEqual(after);
        expect(deletions).toBe(1);
      },
    );

    it.each([
      [
        'an image',
        'screenshots/shot1',
        deleteImage('shot1', 'fold1'),
        imageFile,
        100,
      ],
      ['a video', 'videos/vid1', deleteVideo('vid1'), videoFile, 300],
    ])(
      'reports the size of %s deleted twice at the same time once, read before its file goes',
      async (_name, item, remove, file, size) => {
        // The second delete runs while the first one has read the item and not removed it yet.
        const [first, second] = await whenRemoving(item, remove, remove);

        expect([first.status, second.status]).toEqual(['success', 'success']);
        expect(sizes).toEqual([size]);
        expect(isStored(file)).toBe(false);
      },
    );

    it.each([
      [
        'an image',
        'screenshots/shot1',
        deleteImage('shot1', 'fold1'),
        imageFile,
      ],
      ['a video', 'videos/vid1', deleteVideo('vid1'), videoFile],
    ])(
      'keeps %s whole when its removal does not commit',
      async (_name, item, remove, file) => {
        // The removal is refused, as when an overlapping write of the item cancels it.
        const { transaction } = FakeReference.prototype;
        jest
          .spyOn(FakeReference.prototype, 'transaction')
          .mockImplementation(function (this: FakeReference, ...args) {
            if (pathOf(this) === `${WORKSPACE}/${item}`) {
              return Promise.reject(new Error('set'));
            }
            return transaction.apply(this, args);
          });

        const deleted = await remove();

        expect(deleted.status).toBe('error');
        expect(stored(item)).not.toBeNull();
        expect(isStored(file)).toBe(true);
        expect(counts()).toEqual({ fold1: 1, fold2: 1, fold3: 1 });
        expect(sizes).toEqual([]);
      },
    );

    describe('deletes the files of the removed item, not those of an upload under its name', () => {
      const thumbnailFile = `${WORKSPACE}/screenshots/thumbnails/earlier.png`;
      const originalFile = `${WORKSPACE}/screenshots/originals/earlier.png`;
      // A chapter image of vid1: named by the video's id, not by its file name.
      const chapterFile = `${WORKSPACE}/videosThumbnails/vid1/chapter.png`;
      const imageFiles = [imageFile, thumbnailFile, originalFile];
      const generationOf = (file: string) =>
        mockFirebase.bucket.file(file).metadata?.generation;
      const workspace = async () =>
        (await mockFirebase.db.ref(WORKSPACE).get()).val();
      // The cleanup's deletes, which the delete does not wait for, settle.
      const settled = () => new Promise((resolve) => setImmediate(resolve));
      // What the delete logged as a failure, or as a file it kept.
      const failures = () =>
        jest
          .mocked(console.log)
          .mock.calls.map((call) => String(call[0]))
          .filter((message) => /Error|kept/.test(message));
      let debug: jest.SpyInstance;

      beforeEach(async () => {
        await mockFirebase.bucket.file(thumbnailFile).save(Buffer.alloc(10, 1));
        await mockFirebase.bucket.file(originalFile).save(Buffer.alloc(100, 1));
        await mockFirebase.bucket.file(chapterFile).save(Buffer.alloc(5, 1));
        debug = jest
          .spyOn(Logger.prototype, 'debug')
          .mockImplementation(() => undefined);
      });

      // Runs `between` from start to end right after the transaction that removes the item at
      // `path` commits: no record holds the item's file name, and its files are not deleted yet.
      async function afterRemoval<A, B>(
        path: string,
        first: () => Promise<A>,
        between: () => Promise<B>,
      ): Promise<[A, B]> {
        let betweenRun: Promise<B> | undefined;
        const { transaction } = FakeReference.prototype;
        jest
          .spyOn(FakeReference.prototype, 'transaction')
          .mockImplementation(async function (this: FakeReference, ...args) {
            const result = await transaction.apply(this, args);
            if (
              !betweenRun &&
              result.committed &&
              pathOf(this) === `${WORKSPACE}/${path}`
            ) {
              await (betweenRun = between());
            }
            return result;
          });
        const firstResult = await first();
        await settled();
        if (!betweenRun) {
          throw new Error(`${path} was not removed`);
        }
        return [firstResult, await betweenRun];
      }

      // Runs `between` from start to end right after the delete has read the records of
      // `collection` to see whether another one still holds the removed item's file name: no
      // record holds it, and the files are not deleted yet.
      async function afterNameCheck<A, B>(
        collection: string,
        first: () => Promise<A>,
        between: () => Promise<B>,
      ): Promise<[A, B]> {
        let betweenRun: Promise<B> | undefined;
        const { get } = FakeQuery.prototype;
        jest
          .spyOn(FakeQuery.prototype, 'get')
          .mockImplementation(async function (this: FakeQuery) {
            const snapshot = await get.call(this);
            if (!betweenRun && pathOf(this) === `${WORKSPACE}/${collection}`) {
              await (betweenRun = between());
            }
            return snapshot;
          });
        const firstResult = await first();
        await settled();
        if (!betweenRun) {
          throw new Error(`${collection} was not read`);
        }
        return [firstResult, await betweenRun];
      }

      it('keeps the files of an image uploaded under the same name once the record is removed', async () => {
        const before = imageFiles.map(generationOf);

        const [deleted, uploaded] = await afterNameCheck(
          'screenshots',
          deleteImage('shot1', 'fold1'),
          async () => {
            // No record holds the name now, so the upload's name check lets it through.
            expect(
              findImagesByFileName(await workspace(), 'earlier.png'),
            ).toEqual([]);
            return filesService.addImageFromFile(
              'uid-member',
              'ws1',
              {} as Express.Multer.File,
              'Replacement',
              'earlier.png',
              'fold1',
            );
          },
        );

        expect([deleted.status, uploaded.status]).toEqual([
          'success',
          'success',
        ]);
        expect(screenshotTitles()).toEqual(['Replacement']);
        // The files the upload wrote, after the generations the delete read.
        expect(imageFiles.filter(isStored)).toEqual(imageFiles);
        expect(
          imageFiles.map(generationOf).filter((x) => before.includes(x)),
        ).toEqual([]);
        expect(failures()).toEqual([]);
        expect(debug).toHaveBeenCalledTimes(3);
        expect(debug).toHaveBeenCalledWith(
          `${originalFile} was stored again after its record was removed; it is kept.`,
        );
      });

      it('keeps the file of a video uploaded under the same name once the record is removed', async () => {
        const replacement = Buffer.alloc(400, 2);

        const [deleted] = await afterNameCheck(
          'videos',
          deleteVideo('vid1'),
          async () => {
            // No record holds the name now, so the upload's name check lets it through.
            expect(findVideosByFileName(await workspace(), 'clip.mp4')).toEqual(
              [],
            );
            // What the upload stores: its file, then its record.
            await mockFirebase.bucket.file(videoFile).save(replacement);
            await mockFirebase.db.ref(`${WORKSPACE}/videos/vid2`).set({
              id: 'vid2',
              uid: 'uid-member',
              title: 'Replacement',
              refName: 'clip.mp4',
              parentId: false,
            });
          },
        );

        expect(deleted.status).toBe('success');
        expect(stored('videos/vid2/refName')).toBe('clip.mp4');
        expect(mockFirebase.bucket.objects.get(videoFile)).toEqual(replacement);
        expect(debug).toHaveBeenCalledWith(
          `${videoFile} was stored again after its record was removed; it is kept.`,
        );
        // The removed video's own chapter images go.
        expect(isStored(chapterFile)).toBe(false);
        expect(failures()).toEqual([]);
      });

      it.each([
        ['an image', deleteImage('shot1', 'fold1'), imageFiles],
        ['a video', deleteVideo('vid1'), [videoFile, chapterFile]],
      ])(
        'deletes every stored file of %s that nothing replaced',
        async (_name, remove, files) => {
          const deleted = await remove();
          await settled();

          expect(deleted.status).toBe('success');
          expect(files.filter(isStored)).toEqual([]);
          expect(failures()).toEqual([]);
        },
      );

      it('skips a file of the image that is not stored', async () => {
        await mockFirebase.bucket.file(originalFile).delete();
        const deletes = jest.spyOn(FakeStorageFile.prototype, 'delete');

        const deleted = await deleteImage('shot1', 'fold1')();
        await settled();

        expect(deleted.status).toBe('success');
        expect(
          deletes.mock.contexts.map((file) => (file as FakeStorageFile).name),
        ).toEqual([imageFile, thumbnailFile]);
        expect(imageFiles.filter(isStored)).toEqual([]);
        expect(failures()).toEqual([]);
      });

      it('leaves a file that is gone by the time it would be deleted', async () => {
        const [deleted] = await afterRemoval(
          'screenshots/shot1',
          deleteImage('shot1', 'fold1'),
          () => mockFirebase.bucket.file(thumbnailFile).delete(),
        );

        expect(deleted.status).toBe('success');
        expect(imageFiles.filter(isStored)).toEqual([]);
        expect(failures()).toEqual([]);
        expect(debug).toHaveBeenCalledWith(`${thumbnailFile} is gone already.`);
      });

      it('logs any other failure of a delete, as before', async () => {
        jest
          .spyOn(FakeStorageFile.prototype, 'delete')
          .mockRejectedValue(
            Object.assign(new Error('Unavailable'), { code: 503 }),
          );

        const deleted = await deleteImage('shot1', 'fold1')();
        await settled();

        expect(deleted.status).toBe('success');
        expect(failures()).toEqual([
          'Error deleting image from reference: earlier.png',
          'Error deleting image thumbnail from reference: earlier.png',
          'Error deleting video from reference: earlier.png',
        ]);
      });
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
