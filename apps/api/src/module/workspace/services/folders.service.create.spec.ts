/**
 * Creating a workspace folder. The nesting level comes from the stored parent, not from the
 * `nestLevel` a request sends: a wrong one put a folder deeper than the three levels allowed, and a
 * parent that is not stored left a folder that no list shows.
 */
import { InMemoryFirebaseApp } from '../../../../test/support/in-memory-firebase';
import { parseCollectionToArray } from '../../../services/utils/helpers';
import { FoldersSharedService } from '../../../services/shared/folders.shared.service';
import { nestLevelUnder } from './folder-move';
import { WorkspaceFoldersService } from './folders.service';
import { WorkspaceUtilitiesService } from './utilities.service';

let mockFirebase: InMemoryFirebaseApp;

jest.mock('firebase-admin', () => ({
  ...jest.requireActual('firebase-admin'),
  database: () => mockFirebase.database(),
  storage: () => mockFirebase.storage(),
}));

const folderRecord = (id: string, parentId: string | false, nestLevel: number) => ({
  id,
  name: id,
  creator: 'uid-admin',
  parentId,
  nestLevel,
  items: 0,
});

const storedFolders = () =>
  parseCollectionToArray<any>(
    mockFirebase.db.dump('workspaces/ws1/folders'),
  ).filter(Boolean);

describe('nestLevelUnder', () => {
  const folders = [
    folderRecord('top', false, 0),
    folderRecord('mid', 'top', 1),
    folderRecord('low', 'mid', 2),
  ] as any[];

  it('is 0 at the top level and one more under each folder', () => {
    expect(nestLevelUnder(folders, false)).toBe(0);
    expect(nestLevelUnder(folders, 'top')).toBe(1);
    expect(nestLevelUnder(folders, 'mid')).toBe(2);
    expect(nestLevelUnder(folders, 'low')).toBe(3);
  });

  it('counts the stored links, not the stored nestLevel', () => {
    const wrong = [
      folderRecord('top', false, 0),
      folderRecord('mid', 'top', 0),
    ] as any[];
    expect(nestLevelUnder(wrong, 'mid')).toBe(2);
  });

  it('is undefined for a parent that is not stored', () => {
    expect(nestLevelUnder(folders, 'missing')).toBeUndefined();
  });

  it('stops on a parent chain that loops', () => {
    const loop = [folderRecord('a', 'b', 0), folderRecord('b', 'a', 0)] as any[];
    expect(nestLevelUnder(loop, 'a')).toBe(2);
  });
});

describe('WorkspaceFoldersService.createWorkspaceFolder', () => {
  let service: WorkspaceFoldersService;

  beforeEach(async () => {
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    mockFirebase = new InMemoryFirebaseApp();
    service = new WorkspaceFoldersService(
      new WorkspaceUtilitiesService(),
      new FoldersSharedService(),
    );
    await mockFirebase.db.ref('workspaces/ws1').set({
      id: 'ws1',
      name: 'Team space',
      admin: 'uid-admin',
      members: [{ id: 'uid-admin' }],
      folders: {
        top: folderRecord('top', false, 0),
        mid: folderRecord('mid', 'top', 1),
        low: folderRecord('low', 'mid', 2),
      },
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const create = (nestLevel: number, parentId: string | false) =>
    service.createWorkspaceFolder(
      'uid-admin',
      'ws1',
      'New',
      'red',
      nestLevel,
      parentId,
    );
  const created = () => storedFolders().find((x) => x.name === 'New');

  it('creates a top-level folder at level 0', async () => {
    const res = await create(0, false);

    expect(res.status).toBe('success');
    expect(created()).toMatchObject({ parentId: false, nestLevel: 0 });
  });

  it('puts a folder under a stored parent one level below it', async () => {
    const res = await create(0, 'top');

    expect(res.status).toBe('success');
    expect(created()).toMatchObject({ parentId: 'top', nestLevel: 1 });
  });

  it('allows the last level, 2', async () => {
    const res = await create(1, 'mid');

    expect(res.status).toBe('success');
    expect(created()).toMatchObject({ parentId: 'mid', nestLevel: 2 });
  });

  it('refuses a folder under a level-2 folder, whatever level the request sends', async () => {
    const res = await create(0, 'low');

    expect(res.status).toBe('error');
    expect(res.message).toBe('Maximum folder nest level exceeded.');
    expect(created()).toBeUndefined();
  });

  it('does not trust a negative level from the request', async () => {
    await create(-5, 'top');

    expect(created()).toMatchObject({ parentId: 'top', nestLevel: 1 });
  });

  it('refuses a parent that is not stored, and stores nothing', async () => {
    const res = await create(0, 'missing');

    expect(res.status).toBe('error');
    expect(res.message).toBe('Parent folder not found.');
    expect(storedFolders()).toHaveLength(3);
  });
});
