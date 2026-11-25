/**
 * Two records of a workspace must not share one set of stored files, because deleting a record
 * deletes the files it names. A personal screenshot or video added to a workspace twice (Add to
 * workspace in My Images or My Videos) used to be copied under the personal file name both times:
 * the two records named the same files, and deleting either one left the other without them. Each
 * copy is now stored under a name of its own. Records stored before that can still share a name,
 * so a delete keeps the files while another record of the workspace names them.
 */
import { Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  FakeQuery,
  InMemoryFirebaseApp,
} from '../../../../test/support/in-memory-firebase';
import {
  EVER_COUNTER_EVENTS,
  EverMediaEvent,
} from '../../../common/events/ever-counters.events';
import { parseCollectionToArray } from '../../../services/utils/helpers';
import { WorkspaceFilesService } from './files.service';
import { WorkspaceUtilitiesService } from './utilities.service';

let mockFirebase: InMemoryFirebaseApp;

jest.mock('firebase-admin', () => ({
  ...jest.requireActual('firebase-admin'),
  database: () => mockFirebase.database(),
  storage: () => mockFirebase.storage(),
}));

// Image resizing is not under test; this keeps the native module from loading.
jest.mock('sharp', () => ({ __esModule: true, default: jest.fn() }));

const WORKSPACE = 'workspaces/ws1';

describe('workspace records and the stored files they name', () => {
  let service: WorkspaceFilesService;
  let created: EverMediaEvent[];
  let deleted: EverMediaEvent[];

  const put = (name: string, size: number) =>
    mockFirebase.bucket.objects.set(name, Buffer.alloc(size, 1));
  const isStored = (name: string) => mockFirebase.bucket.objects.has(name);
  const records = async (collection: 'screenshots' | 'videos') =>
    parseCollectionToArray<{ id: string; refName: string }>(
      (await mockFirebase.db.ref(`${WORKSPACE}/${collection}`).get()).val(),
    );
  // An image's file, thumbnail and original.
  const imageFiles = (refName: string) => [
    `${WORKSPACE}/screenshots/${refName}`,
    `${WORKSPACE}/screenshots/thumbnails/${refName}`,
    `${WORKSPACE}/screenshots/originals/${refName}`,
  ];
  const videoFile = (refName: string) => `${WORKSPACE}/videos/${refName}`;
  // The cleanup's deletes, which a delete does not wait for, settle.
  const settled = () => new Promise((resolve) => setImmediate(resolve));

  beforeEach(async () => {
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'debug').mockImplementation(() => undefined);
    mockFirebase = new InMemoryFirebaseApp();
    const events = new EventEmitter2();
    created = [];
    deleted = [];
    events.on(EVER_COUNTER_EVENTS.mediaCreated, (event: EverMediaEvent) =>
      created.push(event),
    );
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
    await mockFirebase.db.ref(WORKSPACE).set({
      id: 'ws1',
      admin: 'uid-admin',
      members: [{ id: 'uid-admin' }, { id: 'uid-member' }],
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('a personal screenshot added to a workspace twice', () => {
    beforeEach(async () => {
      await mockFirebase.db
        .ref('users/uid-member/screenshots/p1')
        .set({ refName: 'shot.png', title: 'Shot' });
      put('users/uid-member/screenshots/shot.png', 100);
      put('users/uid-member/screenshots/thumbnails/shot.png', 10);
      put('users/uid-member/screenshots/originals/shot.png', 100);
    });

    const addTwice = async () => {
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
      return records('screenshots');
    };

    it('stores each copy under a name of its own: the record id and the extension', async () => {
      const copies = await addTwice();

      expect(copies).toHaveLength(2);
      const [first, second] = copies;
      expect(first.refName).toBe(`${first.id}.png`);
      expect(second.refName).toBe(`${second.id}.png`);
      for (const copy of copies) {
        expect(imageFiles(copy.refName).filter(isStored)).toEqual(
          imageFiles(copy.refName),
        );
      }
      // Nothing of the workspace is stored under the personal file name.
      expect(imageFiles('shot.png').filter(isStored)).toEqual([]);
      expect(created).toEqual([
        { kind: 'screenshot', bytes: 100 },
        { kind: 'screenshot', bytes: 100 },
      ]);
    });

    it('keeps the files of the other copy when one copy is deleted', async () => {
      const [first, second] = await addTwice();

      const result = await service.deleteImage('ws1', first.id);
      await settled();

      expect(result.status).toBe('success');
      expect((await records('screenshots')).map((x) => x.id)).toEqual([
        second.id,
      ]);
      expect(imageFiles(second.refName).filter(isStored)).toEqual(
        imageFiles(second.refName),
      );
      expect(imageFiles(first.refName).filter(isStored)).toEqual([]);
      expect(deleted).toEqual([{ kind: 'screenshot', bytes: 100 }]);
    });
  });

  describe('a personal video added to a workspace twice', () => {
    beforeEach(async () => {
      await mockFirebase.db
        .ref('users/uid-member/videos/v1')
        .set({ refName: 'clip.webm', title: 'Clip', duration: '00:10' });
      put('users/uid-member/videos/clip.webm', 300);
    });

    const addTwice = async () => {
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
      return records('videos');
    };

    it('stores each copy under a name of its own: the record id and the extension', async () => {
      const copies = await addTwice();

      expect(copies).toHaveLength(2);
      const [first, second] = copies;
      expect(first.refName).toBe(`${first.id}.webm`);
      expect(second.refName).toBe(`${second.id}.webm`);
      expect(copies.map((x) => isStored(videoFile(x.refName)))).toEqual([
        true,
        true,
      ]);
      expect(isStored(videoFile('clip.webm'))).toBe(false);
      expect(created).toEqual([
        { kind: 'video', bytes: 300 },
        { kind: 'video', bytes: 300 },
      ]);
    });

    it('keeps the file of the other copy when one copy is deleted', async () => {
      const [first, second] = await addTwice();

      const result = await service.deleteVideo('ws1', first.id);
      await settled();

      expect(result.status).toBe('success');
      expect((await records('videos')).map((x) => x.id)).toEqual([second.id]);
      expect(isStored(videoFile(second.refName))).toBe(true);
      expect(isStored(videoFile(first.refName))).toBe(false);
      expect(deleted).toEqual([{ kind: 'video', bytes: 300 }]);
    });
  });

  describe('two stored records that already share one file name', () => {
    beforeEach(async () => {
      await mockFirebase.db.ref(WORKSPACE).update({
        'screenshots/img1': { id: 'img1', refName: 'dup.png', parentId: false },
        'screenshots/img2': { id: 'img2', refName: 'dup.png', parentId: false },
        'videos/vid1': { id: 'vid1', refName: 'dup.webm', parentId: false },
        'videos/vid2': { id: 'vid2', refName: 'dup.webm', parentId: false },
      });
      put(`${WORKSPACE}/screenshots/dup.png`, 100);
      put(`${WORKSPACE}/screenshots/thumbnails/dup.png`, 10);
      put(`${WORKSPACE}/screenshots/originals/dup.png`, 100);
      put(videoFile('dup.webm'), 300);
    });

    it('keeps the image files while the other record names them, and reports 0 bytes', async () => {
      const result = await service.deleteImage('ws1', 'img1');
      await settled();

      expect(result.status).toBe('success');
      expect((await records('screenshots')).map((x) => x.id)).toEqual(['img2']);
      expect(imageFiles('dup.png').filter(isStored)).toEqual(
        imageFiles('dup.png'),
      );
      expect(deleted).toEqual([{ kind: 'screenshot', bytes: 0 }]);
    });

    it('deletes the image files with the last record that names them', async () => {
      await service.deleteImage('ws1', 'img1');
      const result = await service.deleteImage('ws1', 'img2');
      await settled();

      expect(result.status).toBe('success');
      expect(await records('screenshots')).toEqual([]);
      expect(imageFiles('dup.png').filter(isStored)).toEqual([]);
      expect(deleted).toEqual([
        { kind: 'screenshot', bytes: 0 },
        { kind: 'screenshot', bytes: 100 },
      ]);
    });

    it('keeps the video file while the other record names it, and reports 0 bytes', async () => {
      const result = await service.deleteVideo('ws1', 'vid1');
      await settled();

      expect(result.status).toBe('success');
      expect((await records('videos')).map((x) => x.id)).toEqual(['vid2']);
      expect(isStored(videoFile('dup.webm'))).toBe(true);
      expect(deleted).toEqual([{ kind: 'video', bytes: 0 }]);
    });

    it('deletes the video file with the last record that names it', async () => {
      await service.deleteVideo('ws1', 'vid1');
      const result = await service.deleteVideo('ws1', 'vid2');
      await settled();

      expect(result.status).toBe('success');
      expect(await records('videos')).toEqual([]);
      expect(isStored(videoFile('dup.webm'))).toBe(false);
      expect(deleted).toEqual([
        { kind: 'video', bytes: 0 },
        { kind: 'video', bytes: 300 },
      ]);
    });

    it.each([
      ['an image', 'screenshots', () => service.deleteImage('ws1', 'img1')],
      ['a video', 'videos', () => service.deleteVideo('ws1', 'vid1')],
    ])(
      'keeps the files of %s when the other records cannot be read',
      async (_name, collection, remove) => {
        await mockFirebase.db.ref(`${WORKSPACE}/${collection}/img2`).remove();
        await mockFirebase.db.ref(`${WORKSPACE}/${collection}/vid2`).remove();
        const { get } = FakeQuery.prototype;
        jest.spyOn(FakeQuery.prototype, 'get').mockImplementation(function (
          this: FakeQuery,
        ) {
          const path = (this as unknown as { parts: string[] }).parts.join('/');
          return path === `${WORKSPACE}/${collection}`
            ? Promise.reject(new Error('unavailable'))
            : get.call(this);
        });

        const result = await remove();
        await settled();

        expect(result.status).toBe('success');
        expect(
          [...imageFiles('dup.png'), videoFile('dup.webm')].filter(isStored),
        ).toHaveLength(4);
        expect(deleted).toEqual([
          { kind: collection === 'videos' ? 'video' : 'screenshot', bytes: 0 },
        ]);
      },
    );
  });
});
