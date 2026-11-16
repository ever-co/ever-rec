/**
 * A markers save of a workspace image used to be sent over the editor websocket to every
 * connected socket. The markers hold comment text and commenter details, so the update now goes
 * only to the workspace admin and its members.
 */
import { InMemoryFirebaseApp } from '../../../../test/support/in-memory-firebase';
import { WorkspaceFilesService } from './files.service';

let mockFirebase: InMemoryFirebaseApp;

jest.mock('firebase-admin', () => ({
  ...jest.requireActual('firebase-admin'),
  database: () => mockFirebase.database(),
  storage: () => mockFirebase.storage(),
}));

// Image resizing is not under test; this keeps the native module from loading.
jest.mock('sharp', () => ({ __esModule: true, default: jest.fn() }));

describe('WorkspaceFilesService.updateItemData marker updates', () => {
  const emitMarkerUpdate = jest.fn();
  let service: WorkspaceFilesService;
  const markers = JSON.stringify([{ id: 'm1', comments: [] }]);

  beforeEach(async () => {
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    mockFirebase = new InMemoryFirebaseApp();
    emitMarkerUpdate.mockReset();
    service = new WorkspaceFilesService(
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      { emit: jest.fn() } as any,
      { emitMarkerUpdate } as any,
    );
    jest
      .spyOn(service, 'getImage')
      .mockResolvedValue({ status: 'success' } as any);

    await mockFirebase.db.ref('workspaces/ws-1').set({
      id: 'ws-1',
      admin: 'uid-admin',
      members: [
        { id: 'uid-admin' },
        { id: 'uid-member' },
        { id: 'uid-editor' },
      ],
      screenshots: { img1: { id: 'img1', uid: 'uid-member', markers: '[]' } },
    });
    await mockFirebase.db.ref('workspaces/ws-2').set({
      id: 'ws-2',
      admin: 'uid-outsider',
      members: [{ id: 'uid-outsider' }],
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const saveMarkers = (workspaceId: string, imageId: string, value = markers) =>
    service.updateItemData(
      'uid-editor',
      workspaceId,
      'image',
      imageId,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      value,
    );

  it('sends the markers save to the workspace admin and members only', async () => {
    await saveMarkers('ws-1', 'img1');

    expect(emitMarkerUpdate).toHaveBeenCalledTimes(1);
    const [recipients, uid, imageId, sent] = emitMarkerUpdate.mock.calls[0];
    expect(Array.isArray(recipients)).toBe(true);
    expect([...new Set(recipients)].sort()).toEqual([
      'uid-admin',
      'uid-editor',
      'uid-member',
    ]);
    expect(recipients).not.toContain('uid-outsider');
    expect(uid).toBe('uid-editor');
    expect(imageId).toBe('img1');
    expect(sent).toBe(markers);
  });

  it('includes the admin even when the members list does not name them', async () => {
    await mockFirebase.db
      .ref('workspaces/ws-1/members')
      .set({ a: { id: 'uid-member' }, b: { id: 'uid-editor' } });

    await saveMarkers('ws-1', 'img1');

    const [recipients] = emitMarkerUpdate.mock.calls[0];
    expect([...new Set(recipients)].sort()).toEqual([
      'uid-admin',
      'uid-editor',
      'uid-member',
    ]);
  });

  it('sends nothing when the save has no markers', async () => {
    await service.updateItemData(
      'uid-editor',
      'ws-1',
      'image',
      'img1',
      undefined,
      undefined,
      'Title',
    );
    expect(emitMarkerUpdate).not.toHaveBeenCalled();
  });

  it('sends nothing for an item that does not exist', async () => {
    const res = await saveMarkers('ws-1', 'missing');
    expect(res.status).toBe('error');
    expect(emitMarkerUpdate).not.toHaveBeenCalled();
  });
});
