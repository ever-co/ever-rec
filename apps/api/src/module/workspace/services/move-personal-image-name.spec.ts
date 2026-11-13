/**
 * `image/add-from-personal` checks the write permission for the file name of the personal image
 * when the request arrives, then the service reads that image again to copy it. If the caller
 * renamed the personal image in between, the copy would land under a name the check never saw (for
 * instance the name of a restricted workspace image). The service must therefore refuse a copy
 * whose personal image no longer has the checked name.
 */
import { EventEmitter2 } from '@nestjs/event-emitter';
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

describe('moving a personal image into a workspace under the checked name', () => {
  let service: WorkspaceFilesService;

  const stored = (name: string) =>
    mockFirebase.bucket.objects.has(`workspaces/ws-1/screenshots/${name}`);

  const move = (checkedRefName?: string | null) =>
    service.moveItemFromPersonalToWorkspace(
      'uid-1',
      'ws-1',
      'item-1',
      'image',
      false,
      checkedRefName,
    );

  beforeEach(async () => {
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    mockFirebase = new InMemoryFirebaseApp();
    await mockFirebase.db
      .ref('users/uid-1/screenshots/item-1')
      .set({ refName: 'shot.png', title: 'Shot' });
    mockFirebase.bucket.objects.set(
      'users/uid-1/screenshots/shot.png',
      Buffer.alloc(10, 1),
    );
    mockFirebase.bucket.objects.set(
      'users/uid-1/screenshots/thumbnails/shot.png',
      Buffer.alloc(10, 1),
    );
    mockFirebase.bucket.objects.set(
      'users/uid-1/screenshots/originals/shot.png',
      Buffer.alloc(10, 1),
    );
    service = new WorkspaceFilesService(
      { addImageToDb: jest.fn(async (props: any) => ({ id: props.id })) } as any,
      {} as any,
      {} as any,
      {} as any,
      new EventEmitter2(),
      {} as any,
    );
  });

  it('copies the image when it still has the checked name', async () => {
    const result = await move('shot.png');

    expect(result.status).toBe('success');
    expect(stored('shot.png')).toBe(true);
  });

  it('refuses the copy when the personal image has another name than the checked one', async () => {
    const result = await move('other.png');

    expect(result.status).not.toBe('success');
    expect(stored('shot.png')).toBe(false);
  });

  it('refuses the copy when no name was checked but the image has one by now', async () => {
    const result = await move(null);

    expect(result.status).not.toBe('success');
    expect(stored('shot.png')).toBe(false);
  });

  it('does not check the name when the caller passes none (videos)', async () => {
    const result = await move(undefined);

    expect(result.status).toBe('success');
  });
});
