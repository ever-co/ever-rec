/**
 * Workspace records and the stored files they name, through the real Firebase Admin SDK on the
 * Realtime Database and Storage emulators. A personal screenshot or video added to a workspace
 * twice gets two copies under names of their own, so deleting one copy leaves the other whole. Of
 * two stored records that share one file name, the files go with the last of them.
 */
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as admin from 'firebase-admin';
import {
  EVER_COUNTER_EVENTS,
  EverMediaEvent,
} from '../src/common/events/ever-counters.events';
import { parseCollectionToArray } from '../src/services/utils/helpers';
import { WorkspaceFilesService } from '../src/module/workspace/services/files.service';
import { WorkspaceUtilitiesService } from '../src/module/workspace/services/utilities.service';
import { EMULATOR_PROJECT, requireEmulators } from './setup-emulators';

// Image resizing is not under test; this keeps the native module from loading.
jest.mock('sharp', () => ({ __esModule: true, default: jest.fn() }));

const WORKSPACE = 'workspaces/ws1';

describe('workspace records that name stored files, on the emulators', () => {
  // The services use the default app, as in the API.
  let app: admin.app.App;
  let service: WorkspaceFilesService;
  let deleted: EverMediaEvent[];
  // The names of the files the cleanup asked the bucket to delete.
  let deletes: string[];

  const bucket = () => app.storage().bucket();
  const put = (name: string, size: number) =>
    bucket().file(name).save(Buffer.alloc(size, 1), { resumable: false });
  const isStored = async (name: string) =>
    (await bucket().file(name).exists())[0];
  const storedOf = async (names: string[]) =>
    (await Promise.all(names.map(isStored))).filter(Boolean).length;
  const records = async (collection: 'screenshots' | 'videos') =>
    parseCollectionToArray<{ id: string; refName: string }>(
      (await app.database().ref(`${WORKSPACE}/${collection}`).get()).val(),
    );
  const imageFiles = (refName: string) => [
    `${WORKSPACE}/screenshots/${refName}`,
    `${WORKSPACE}/screenshots/thumbnails/${refName}`,
    `${WORKSPACE}/screenshots/originals/${refName}`,
  ];
  const videoFile = (refName: string) => `${WORKSPACE}/videos/${refName}`;
  // The cleanup's deletes, which a delete does not wait for, are done.
  const until = async (done: () => Promise<boolean>) => {
    const deadline = Date.now() + 10_000;
    while (!(await done())) {
      if (Date.now() > deadline) throw new Error('timed out');
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  };

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
    await bucket().deleteFiles({ prefix: 'workspaces/ws1/' });
    await bucket().deleteFiles({ prefix: 'users/uid-member/' });

    const file = Object.getPrototypeOf(bucket().file('any'));
    // Signing a URL needs a service account key, which the emulators do not use; the URL is not
    // under test.
    jest
      .spyOn(file, 'getSignedUrl')
      .mockResolvedValue(['https://signed.example.test']);
    deletes = [];
    const { delete: remove } = file;
    jest.spyOn(file, 'delete').mockImplementation(function (
      this: { name: string },
      ...args: unknown[]
    ) {
      deletes.push(this.name);
      return remove.apply(this, args);
    });

    await app
      .database()
      .ref(WORKSPACE)
      .set({
        id: 'ws1',
        admin: 'uid-admin',
        members: [{ id: 'uid-admin' }, { id: 'uid-member' }],
      });

    const events = new EventEmitter2();
    deleted = [];
    events.on(EVER_COUNTER_EVENTS.mediaDeleted, (event: EverMediaEvent) =>
      deleted.push(event),
    );
    service = new WorkspaceFilesService(
      new WorkspaceUtilitiesService(),
      { deleteAsset: () => Promise.resolve() } as any,
      { deleteLinkById: () => Promise.resolve(true) } as any,
      {} as any,
      events,
      {} as any,
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('keeps the files of one copy of a personal screenshot when the other copy is deleted', async () => {
    await app
      .database()
      .ref('users/uid-member/screenshots/p1')
      .set({ refName: 'shot.png', title: 'Shot' });
    await put('users/uid-member/screenshots/shot.png', 100);
    await put('users/uid-member/screenshots/thumbnails/shot.png', 10);
    await put('users/uid-member/screenshots/originals/shot.png', 100);
    for (let copy = 1; copy <= 2; copy += 1) {
      const added = await service.moveItemFromPersonalToWorkspace(
        'uid-member',
        'ws1',
        'p1',
        'image',
        false,
        'shot.png',
      );
      expect(added.status).toBe('success');
    }
    const [first, second] = await records('screenshots');
    expect([first.refName, second.refName]).toEqual([
      `${first.id}.png`,
      `${second.id}.png`,
    ]);

    const result = await service.deleteImage('ws1', first.id);
    await until(async () => (await storedOf(imageFiles(first.refName))) === 0);

    expect(result.status).toBe('success');
    expect((await records('screenshots')).map((x) => x.id)).toEqual([
      second.id,
    ]);
    expect(await storedOf(imageFiles(second.refName))).toBe(3);
    expect(deleted).toEqual([{ kind: 'screenshot', bytes: 100 }]);
  });

  it('keeps the file of one copy of a personal video when the other copy is deleted', async () => {
    await app
      .database()
      .ref('users/uid-member/videos/v1')
      .set({ refName: 'clip.webm', title: 'Clip', duration: '00:10' });
    await put('users/uid-member/videos/clip.webm', 300);
    for (let copy = 1; copy <= 2; copy += 1) {
      const added = await service.moveItemFromPersonalToWorkspace(
        'uid-member',
        'ws1',
        'v1',
        'video',
        false,
      );
      expect(added.status).toBe('success');
    }
    const [first, second] = await records('videos');
    expect([first.refName, second.refName]).toEqual([
      `${first.id}.webm`,
      `${second.id}.webm`,
    ]);

    const result = await service.deleteVideo('ws1', first.id);
    await until(async () => !(await isStored(videoFile(first.refName))));

    expect(result.status).toBe('success');
    expect((await records('videos')).map((x) => x.id)).toEqual([second.id]);
    expect(await isStored(videoFile(second.refName))).toBe(true);
    expect(deleted).toEqual([{ kind: 'video', bytes: 300 }]);
  });

  it('deletes the files of two records that share a name only with the last of them', async () => {
    await app
      .database()
      .ref(WORKSPACE)
      .update({
        'screenshots/img1': { id: 'img1', refName: 'dup.png', parentId: false },
        'screenshots/img2': { id: 'img2', refName: 'dup.png', parentId: false },
        'videos/vid1': { id: 'vid1', refName: 'dup.webm', parentId: false },
        'videos/vid2': { id: 'vid2', refName: 'dup.webm', parentId: false },
      });
    await put(`${WORKSPACE}/screenshots/dup.png`, 100);
    await put(`${WORKSPACE}/screenshots/thumbnails/dup.png`, 10);
    await put(`${WORKSPACE}/screenshots/originals/dup.png`, 100);
    await put(videoFile('dup.webm'), 300);
    const files = [...imageFiles('dup.png'), videoFile('dup.webm')];

    const first = await Promise.all([
      service.deleteImage('ws1', 'img1'),
      service.deleteVideo('ws1', 'vid1'),
    ]);

    expect(first.map((x) => x.status)).toEqual(['success', 'success']);
    // The deletes are started before a delete answers: none was asked for.
    expect(deletes).toEqual([]);
    expect(await storedOf(files)).toBe(4);

    const last = await Promise.all([
      service.deleteImage('ws1', 'img2'),
      service.deleteVideo('ws1', 'vid2'),
    ]);
    await until(async () => (await storedOf(files)) === 0);

    expect(last.map((x) => x.status)).toEqual(['success', 'success']);
    expect(await records('screenshots')).toEqual([]);
    expect(await records('videos')).toEqual([]);
    expect(deleted).toEqual(
      expect.arrayContaining([
        { kind: 'screenshot', bytes: 0 },
        { kind: 'video', bytes: 0 },
        { kind: 'screenshot', bytes: 100 },
        { kind: 'video', bytes: 300 },
      ]),
    );
    expect(deleted).toHaveLength(4);
  });
});
