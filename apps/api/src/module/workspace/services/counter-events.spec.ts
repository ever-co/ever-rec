/**
 * The neutral counter events of the workspace media paths (see
 * `src/common/events/ever-counters.events.ts`): a copy from personal storage counts as created
 * media, an upload counts the stored image (not its thumbnail), and deleting a workspace
 * subtracts the bytes of its screenshots and videos.
 */
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InMemoryFirebaseApp } from '../../../../test/support/in-memory-firebase';
import {
  EVER_COUNTER_EVENTS,
  EverMediaEvent,
} from '../../../common/events/ever-counters.events';
import { WorkspaceFilesService } from './files.service';
import { WorkspacesService } from './workspace.service';

let mockFirebase: InMemoryFirebaseApp;

jest.mock('firebase-admin', () => ({
  ...jest.requireActual('firebase-admin'),
  database: () => mockFirebase.database(),
  storage: () => mockFirebase.storage(),
}));

// Image resizing is not under test (the uploads below are stand-ins); this keeps the native
// module from loading.
jest.mock('sharp', () => ({ __esModule: true, default: jest.fn() }));

/** Waits until `done()` holds (polls every 2 ms, at most 2 s). */
async function until(done: () => boolean): Promise<void> {
  const deadline = Date.now() + 2_000;
  while (!done()) {
    if (Date.now() > deadline) throw new Error('timed out');
    await new Promise((resolve) => setTimeout(resolve, 2));
  }
}

describe('workspace media counter events', () => {
  let events: EventEmitter2;
  let created: EverMediaEvent[];
  let deleted: EverMediaEvent[];

  const put = (name: string, size: number) =>
    mockFirebase.bucket.objects.set(name, Buffer.alloc(size, 1));

  beforeEach(() => {
    mockFirebase = new InMemoryFirebaseApp();
    events = new EventEmitter2();
    created = [];
    deleted = [];
    events.on(EVER_COUNTER_EVENTS.mediaCreated, (event: EverMediaEvent) =>
      created.push(event),
    );
    events.on(EVER_COUNTER_EVENTS.mediaDeleted, (event: EverMediaEvent) =>
      deleted.push(event),
    );
  });

  const filesService = (utilities: Record<string, unknown>) =>
    new WorkspaceFilesService(
      utilities as any,
      {} as any,
      {} as any,
      {} as any,
      events,
      {} as any,
    );

  it('a screenshot moved from personal storage into a workspace counts as created', async () => {
    await mockFirebase.db
      .ref('users/uid-1/screenshots/item-1')
      .set({ refName: 'shot.png', title: 'Shot' });
    put('users/uid-1/screenshots/shot.png', 1234);
    put('users/uid-1/screenshots/thumbnails/shot.png', 40);
    put('users/uid-1/screenshots/originals/shot.png', 4000);
    const service = filesService({
      addImageToDb: jest.fn(async (props: any) => ({ id: props.id })),
    });

    const result = await service.moveItemFromPersonalToWorkspace(
      'uid-1',
      'ws-1',
      'item-1',
      'image',
      false,
    );

    expect(result.status).toBe('success');
    expect(
      mockFirebase.bucket.objects.has('workspaces/ws-1/screenshots/shot.png'),
    ).toBe(true);
    expect(created).toEqual([{ kind: 'screenshot', bytes: 1234 }]);
  });

  it('a screenshot uploaded to a workspace counts the stored image, not its thumbnail', async () => {
    const service = filesService({
      uploadImageInBucket: jest.fn(
        async (_file: unknown, workspaceId: string, name: string) => {
          const bucket = mockFirebase.bucket;
          const file = bucket.file(
            `workspaces/${workspaceId}/screenshots/${name}`,
          );
          const thumbnail = bucket.file(
            `workspaces/${workspaceId}/screenshots/thumbnails/${name}`,
          );
          await file.save(Buffer.alloc(5000, 1));
          await thumbnail.save(Buffer.alloc(300, 1));
          return { file, thumbnail };
        },
      ),
      addImageToDb: jest.fn(async (props: any) => ({ id: props.id })),
      getWorkspaceById: jest.fn(async () => ({
        workspaceVal: { folders: {} },
        workspaceRef: { update: async () => undefined },
      })),
      changeFolderItemCountRecursive: jest.fn(() => []),
    });

    const result = await service.addImageFromFile(
      'uid-1',
      'ws-1',
      {} as Express.Multer.File,
      'Shot',
      'shot.png',
      false,
    );

    expect(result.status).toBe('success');
    expect(created).toEqual([{ kind: 'screenshot', bytes: 5000 }]);
  });

  it('deleting a workspace subtracts the bytes of its screenshots and videos', async () => {
    await mockFirebase.db.ref('workspaces/ws-1').set({
      name: 'Team space',
      admin: 'uid-1',
      teams: [{ id: 'team-1' }],
    });
    await mockFirebase.db
      .ref('users/uid-1')
      .set({ email: 'one@example.test', workspaceIds: ['ws-1'] });
    put('workspaces/ws-1/screenshots/a.png', 1000);
    put('workspaces/ws-1/screenshots/thumbnails/a.png', 40);
    put('workspaces/ws-1/videos/v.webm', 7000);
    put('workspaces/ws-2/videos/kept.webm', 900);
    const service = new WorkspacesService({} as any, {} as any, events);

    await service.deleteWorkspace('uid-1', 'ws-1');
    await until(() => deleted.length === 2);

    expect(deleted).toEqual([
      { kind: 'screenshot', bytes: 1000 },
      { kind: 'video', bytes: 7000 },
    ]);
    expect([...mockFirebase.bucket.objects.keys()]).toEqual([
      'workspaces/ws-2/videos/kept.webm',
    ]);
  });

  it('lists nothing when no statistics listener exists', async () => {
    const quiet = new EventEmitter2();
    put('workspaces/ws-1/videos/v.webm', 7000);
    const getFiles = jest.spyOn(mockFirebase.bucket, 'getFiles');
    await new WorkspacesService({} as any, {} as any, quiet).deleteWorkspace(
      'uid-1',
      'ws-1',
    );
    await until(() => mockFirebase.bucket.objects.size === 0);
    expect(getFiles).not.toHaveBeenCalled();
  });
});
