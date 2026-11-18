/**
 * Listing a user's workspaces (`WorkspacesService.getUserWorkspaces`). A user's `workspaceIds` can
 * keep the id of a deleted workspace: a join through an invite link that lands after
 * `deleteWorkspace` read the members, or a member update there that failed. One such id must not
 * fail the whole list (before, the user saw no workspace at all until the record was fixed by
 * hand), and an id listed twice must show its workspace once.
 */
import { InMemoryFirebaseApp } from '../../../../test/support/in-memory-firebase';
import { ResStatusEnum } from '../../../enums/ResStatusEnum';
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

describe("listing a user's workspaces", () => {
  const service = () =>
    new WorkspacesService(new WorkspaceUtilitiesService(), {} as any);

  const live = {
    id: 'ws-live',
    name: 'Team',
    admin: 'uid-1',
    members: [{ id: 'uid-1' }],
    folders: { f1: { name: 'Docs', parentId: false } },
    screenshots: { s1: { uid: 'uid-1', refName: 'a.png' } },
    created: 1,
  };

  const listedLive = {
    id: 'ws-live',
    name: 'Team',
    admin: 'uid-1',
    members: [{ id: 'uid-1' }],
    folders: [{ id: 'f1', name: 'Docs', parentId: false }],
    screenshots: [],
    videos: [],
    created: 1,
  };

  const setUser = (workspaceIds: string[]) =>
    mockFirebase.db
      .ref('users/uid-1')
      .set({ email: 'one@example.test', workspaceIds });

  beforeEach(async () => {
    mockFirebase = new InMemoryFirebaseApp();
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('lists the live workspace when another id belongs to a deleted workspace', async () => {
    await mockFirebase.db.ref('workspaces/ws-live').set(live);
    await setUser(['ws-deleted', 'ws-live']);

    const result = await service().getUserWorkspaces('uid-1');

    expect(result.status).toBe(ResStatusEnum.success);
    expect(result.data).toEqual([listedLive]);
  });

  it('answers an empty list when no workspace exists at all', async () => {
    // The `workspaces` root itself is gone: its last workspace was deleted.
    await setUser(['ws-deleted']);

    const result = await service().getUserWorkspaces('uid-1');

    expect(result.status).toBe(ResStatusEnum.success);
    expect(result.data).toEqual([]);
  });

  it('lists a workspace whose id appears twice only once', async () => {
    await mockFirebase.db.ref('workspaces/ws-live').set(live);
    await mockFirebase.db
      .ref('workspaces/ws-other')
      .set({ ...live, id: 'ws-other', name: 'Other', folders: null });
    await setUser(['ws-live', 'ws-other', 'ws-live']);

    const result = await service().getUserWorkspaces('uid-1');

    expect(result.status).toBe(ResStatusEnum.success);
    expect(result.data?.map((workspace) => workspace.id)).toEqual([
      'ws-live',
      'ws-other',
    ]);
    expect(result.data?.[0]).toEqual(listedLive);
  });
});
