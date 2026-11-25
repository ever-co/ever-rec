/**
 * Writers of a workspace's folder list that run at the same time, through the real Firebase Admin
 * SDK on the Realtime Database emulator. Each one changes the list in a transaction, so none of
 * them undoes another: every item count, new folder and permission change is kept, and a move of
 * items keeps a member removal made meanwhile. A moved or deleted item is counted once, out of the
 * folder it is stored in.
 */
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as admin from 'firebase-admin';
import { FoldersSharedService } from '../src/services/shared/folders.shared.service';
import { parseCollectionToArray } from '../src/services/utils/helpers';
import { WorkspaceFilesController } from '../src/module/workspace/controllers/files.controller';
import { changeWorkspaceFolders } from '../src/module/workspace/services/change-workspace-collection';
import { WorkspaceFilesService } from '../src/module/workspace/services/files.service';
import { WorkspaceFoldersService } from '../src/module/workspace/services/folders.service';
import { WorkspaceMembersService } from '../src/module/workspace/services/members.service';
import { WorkspaceSharedService } from '../src/module/workspace/services/shared.service';
import { WorkspaceUtilitiesService } from '../src/module/workspace/services/utilities.service';
import { EMULATOR_PROJECT, requireEmulators } from './setup-emulators';

// Image resizing is not under test; this keeps the native module from loading.
jest.mock('sharp', () => ({ __esModule: true, default: jest.fn() }));

describe('folder writers at the same time, on the emulators', () => {
  // The services use the default app, as in the API.
  let app: admin.app.App;
  const utilities = new WorkspaceUtilitiesService();
  const folders = new WorkspaceFoldersService(
    utilities,
    new FoldersSharedService(),
  );
  const shared = new WorkspaceSharedService();
  const members = new WorkspaceMembersService(utilities);

  const stored = async (path: string) =>
    (await app.database().ref(`workspaces/ws1/${path}`).get()).val();
  const storedFolders = async () =>
    parseCollectionToArray<any>(await stored('folders')).filter(Boolean);
  const byText = (a: string, b: string) => a.localeCompare(b);

  beforeAll(() => {
    requireEmulators();
    app = admin.initializeApp({
      projectId: EMULATOR_PROJECT,
      databaseURL: `http://${process.env.FIREBASE_DATABASE_EMULATOR_HOST}?ns=${EMULATOR_PROJECT}`,
      storageBucket: `${EMULATOR_PROJECT}.appspot.com`,
    });
  });

  afterAll(async () => {
    await app.delete();
  });

  beforeEach(async () => {
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    await app.database().ref().set(null);
    await app
      .database()
      .ref('workspaces/ws1')
      .set({
        id: 'ws1',
        name: 'Team space',
        admin: 'uid-admin',
        members: [
          { id: 'uid-admin' },
          { id: 'uid-member' },
          { id: 'uid-leaving' },
        ],
        folders: {
          fold1: {
            id: 'fold1',
            name: 'Shots',
            parentId: false,
            nestLevel: 0,
            items: 1,
            access: { members: [{ uid: 'uid-member', access: 'WRITE' }] },
          },
          fold2: {
            id: 'fold2',
            name: 'Other',
            parentId: false,
            nestLevel: 0,
            items: 0,
          },
        },
        screenshots: {
          shot1: { id: 'shot1', uid: 'uid-admin', parentId: false },
          shot2: { id: 'shot2', uid: 'uid-admin', parentId: false },
        },
      });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('keeps every count, new folder, rename and permission change', async () => {
    const countOne = () =>
      changeWorkspaceFolders('ws1', (list) => ({
        items: utilities.changeFolderItemCountRecursive(list, 'fold1', 1),
      }));
    const [counts, created, renamed, restricted] = await Promise.all([
      Promise.all(Array.from({ length: 8 }, countOne)),
      Promise.all(
        ['A', 'B', 'C'].map((name) =>
          folders.createWorkspaceFolder('uid-admin', 'ws1', name, 'red', 0),
        ),
      ),
      folders.updateFolderData('uid-admin', 'ws1', 'fold2', {
        name: 'Renamed',
      }),
      shared.updatePermissions(
        'uid-member',
        'ws1',
        'fold1',
        'folders',
        false,
        false,
        'member',
      ),
    ]);

    expect(counts.map((x) => x.ok)).toEqual(new Array(8).fill(true));
    expect(created.map((x) => x.status)).toEqual([
      'success',
      'success',
      'success',
    ]);
    expect(renamed.status).toBe('success');
    expect(restricted.status).toBe('success');
    const list = await storedFolders();
    const fold1 = list.find((x) => x.id === 'fold1');
    expect(fold1.items).toBe(9);
    expect(fold1.access.members).toEqual([
      { uid: 'uid-member', access: 'NONE' },
    ]);
    expect(list.find((x) => x.id === 'fold2').name).toBe('Renamed');
    expect(list.map((x) => x.name).sort(byText)).toEqual([
      'A',
      'B',
      'C',
      'Renamed',
      'Shots',
    ]);
    // Stored by id, as every reader of `folders/<id>` expects.
    expect(Object.keys(await stored('folders')).sort(byText)).toEqual(
      list.map((x) => x.id).sort(byText),
    );
  });

  it('refuses a change to a folder that is not stored, and writes nothing', async () => {
    const before = await stored('folders');

    const renamed = await folders.updateFolderData(
      'uid-admin',
      'ws1',
      'missing',
      { name: 'Renamed' },
    );
    const moved = await folders.moveFolder('ws1', 'fold1', 'missing');

    expect(renamed).toMatchObject({
      status: 'error',
      message: 'Folder not found.',
    });
    expect(moved).toMatchObject({
      status: 'error',
      message: 'Destination folder not found.',
    });
    expect(await stored('folders')).toEqual(before);
  });

  it('keeps a member removal made while items are moved', async () => {
    const [moved, removed] = await Promise.all([
      folders.moveItemsToFolder(
        { id: 'uid-admin' },
        'ws1',
        ['shot1', 'shot2'],
        'fold2',
      ),
      members.removeMemberFromWorkspace('uid-leaving', 'ws1'),
    ]);

    expect(moved.status).toBe('success');
    expect(removed.status).toBe('success');
    expect(
      parseCollectionToArray<any>(await stored('members')).map((x) => x.id),
    ).toEqual(['uid-admin', 'uid-member']);
    expect(await stored('screenshots/shot1/parentId')).toBe('fold2');
    expect(await stored('screenshots/shot2/parentId')).toBe('fold2');
    expect((await storedFolders()).find((x) => x.id === 'fold2').items).toBe(2);
  });

  it('counts each moved item once, from the folder it is stored in', async () => {
    // shot1 is the item fold1 counts; shot2 stays at the top level.
    await app
      .database()
      .ref('workspaces/ws1/screenshots/shot1/parentId')
      .set('fold1');

    // The same move twice at once (a double submit), one of them naming shot1 twice.
    const moves = await Promise.all([
      folders.moveItemsToFolder(
        { id: 'uid-admin' },
        'ws1',
        ['shot1', 'shot1', 'shot2'],
        'fold2',
      ),
      folders.moveItemsToFolder(
        { id: 'uid-admin' },
        'ws1',
        ['shot1', 'shot2'],
        'fold2',
      ),
    ]);

    expect(moves.map((x) => x.status)).toEqual(['success', 'success']);
    expect(await stored('screenshots/shot1/parentId')).toBe('fold2');
    expect(await stored('screenshots/shot2/parentId')).toBe('fold2');
    const counts = Object.fromEntries(
      (await storedFolders()).map((x) => [x.id, x.items]),
    );
    expect(counts).toEqual({ fold1: 0, fold2: 2 });
  });

  it('does not bring back an item deleted before its move is written', async () => {
    // shot1 is deleted right after the move reads the workspace.
    const { getWorkspaceById } = utilities;
    jest
      .spyOn(utilities, 'getWorkspaceById')
      .mockImplementation(async (workspaceId: string) => {
        const read = await getWorkspaceById.call(utilities, workspaceId);
        await app.database().ref('workspaces/ws1/screenshots/shot1').remove();
        return read;
      });

    const moved = await folders.moveItemsToFolder(
      { id: 'uid-admin' },
      'ws1',
      ['shot1', 'shot2'],
      'fold2',
    );

    expect(moved.status).toBe('success');
    expect(await stored('screenshots/shot1')).toBeNull();
    expect(await stored('screenshots/shot2/parentId')).toBe('fold2');
    expect((await storedFolders()).find((x) => x.id === 'fold2').items).toBe(1);
  });

  it('counts each deleted item once, out of the folder it is stored in', async () => {
    // shot1 is the item fold1 counts; vid1 is in fold3, which is in fold2: both count it.
    await app
      .database()
      .ref('workspaces/ws1')
      .update({
        'screenshots/shot1': {
          id: 'shot1',
          uid: 'uid-admin',
          refName: 'shot1.png',
          parentId: 'fold1',
        },
        'videos/vid1': {
          id: 'vid1',
          uid: 'uid-admin',
          refName: 'vid1.mp4',
          parentId: 'fold3',
        },
        'folders/fold2/items': 1,
        'folders/fold3': {
          id: 'fold3',
          name: 'Inner',
          parentId: 'fold2',
          nestLevel: 1,
          items: 1,
        },
      });
    const files = new WorkspaceFilesController(
      new WorkspaceFilesService(
        utilities,
        { deleteAsset: async () => undefined } as any,
        { deleteLinkById: async () => undefined } as any,
        {} as any,
        new EventEmitter2(),
        {} as any,
      ),
      shared,
    );

    // Each delete sent twice at once (a double submit); the image's from a view that shows it in
    // fold2.
    const deletes = await Promise.all([
      files.deleteImage('ws1', { imageId: 'shot1', folderId: 'fold2' }),
      files.deleteImage('ws1', { imageId: 'shot1', folderId: 'fold2' }),
      files.deleteVideo('ws1', { videoId: 'vid1' }),
      files.deleteVideo('ws1', { videoId: 'vid1' }),
    ]);

    expect(deletes.map((x) => x.status)).toEqual([
      'success',
      'success',
      'success',
      'success',
    ]);
    expect(await stored('screenshots/shot1')).toBeNull();
    expect(await stored('videos/vid1')).toBeNull();
    const counts = Object.fromEntries(
      (await storedFolders()).map((x) => [x.id, x.items]),
    );
    expect(counts).toEqual({ fold1: 0, fold2: 0, fold3: 0 });
  });
});
