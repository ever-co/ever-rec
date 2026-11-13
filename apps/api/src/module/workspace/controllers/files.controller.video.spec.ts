/**
 * The workspace video routes keep the holes closed that the image routes keep closed:
 *
 * - `POST video` stores a file under a name taken from the body. A name owned by a video the caller
 *   may not write, a name with a path separator, or a folder in the body the caller may not write
 *   to, must be refused (the guards only see the query).
 * - `POST video/add-from-personal` copies a personal video under the personal record's name; it
 *   must not replace a restricted video's file, and must not touch the image originals.
 * - `DELETE video/single` is guarded on `videoId` and must delete only that video's own files.
 *
 * The routes are the real controller behind the real guards, interceptor and service; only the
 * database, the storage bucket, the token check and the video conversion are stand-ins.
 */
import { INestApplication } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Test } from '@nestjs/testing';
import { readdirSync, rmSync } from 'fs';
import { join } from 'path';
import request from 'supertest';
import { InMemoryFirebaseApp } from '../../../../test/support/in-memory-firebase';
import { TMP_PATH } from '../../../enums/tmpPathsEnums';
import { TokenService } from '../../auth/services/tokens';
import { WorkspaceFilesService } from '../services/files.service';
import { WorkspaceSharedService } from '../services/shared.service';
import { WorkspaceFilesController } from './files.controller';

let mockFirebase: InMemoryFirebaseApp;

jest.mock('firebase-admin', () => ({
  ...jest.requireActual('firebase-admin'),
  database: () => mockFirebase.database(),
  storage: () => mockFirebase.storage(),
}));
jest.mock('sharp', () => ({ __esModule: true, default: jest.fn() }));
jest.mock('../../auth/services/tokens', () => ({ TokenService: class {} }));
jest.mock('../services/shared.service', () => ({
  WorkspaceSharedService: class {},
}));
// Uploads are written to a directory of their own, so a test can see what is left behind.
jest.mock('../../../enums/tmpPathsEnums', () => {
  const { mkdtempSync } = require('fs');
  const { tmpdir } = require('os');
  const { join } = require('path');
  const dir = mkdtempSync(join(tmpdir(), 'ever-video-spec-')) + '/';
  return { TMP_PATH: dir, TMP_PATH_FIXED: dir };
});

const BASE = '/workspace/ws1/files/video';
const PREFIX = 'workspaces/ws1/videos';

describe('workspace video routes', () => {
  let app: INestApplication;
  let filesService: WorkspaceFilesService;
  let addVideoFromFile: jest.SpyInstance;
  const deleteLinkById = jest.fn();

  beforeAll(async () => {
    mockFirebase = new InMemoryFirebaseApp();
    const utilities = {
      getWorkspaceById: async (id: string) => {
        const workspaceRef = mockFirebase.db.ref(`workspaces/${id}`);
        return { workspaceVal: (await workspaceRef.get()).val(), workspaceRef };
      },
      changeFolderItemCountRecursive: (folders: unknown[]) => folders,
      addVideoToDb: async (props: any) => {
        const record = {
          id: props.id,
          uid: props.uid,
          title: props.title,
          refName: props.refName,
          parentId: props.folderId || false,
        };
        await mockFirebase.db
          .ref(`workspaces/${props.workspaceId}/videos/${props.id}`)
          .set(record);
        return record;
      },
    };
    filesService = new WorkspaceFilesService(
      utilities as any,
      { deleteAsset: async () => undefined } as any,
      { deleteLinkById } as any,
      {} as any,
      new EventEmitter2(),
      {} as any,
    );

    const moduleRef = await Test.createTestingModule({
      controllers: [WorkspaceFilesController],
      providers: [
        {
          // "Bearer uid-<name>" signs in <name>; anything else is a bad token.
          provide: TokenService,
          useValue: {
            processToken: async (token: string, req: any) => {
              if (!token.startsWith('uid-')) throw new Error('bad token');
              req.user = { id: token };
            },
          },
        },
        { provide: WorkspaceFilesService, useValue: filesService },
        { provide: WorkspaceSharedService, useValue: {} },
      ],
    }).compile();

    app = moduleRef.createNestApplication({ logger: false });
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    // The upload itself (conversion and storage) is not under test.
    addVideoFromFile = jest
      .spyOn(filesService, 'addVideoFromFile')
      .mockResolvedValue({ status: 'success', data: null } as any);
    deleteLinkById.mockReset();
    // The upload stand-in does not take over the temporary files the way the service does.
    for (const name of readdirSync(TMP_PATH)) {
      rmSync(join(TMP_PATH, name), { force: true });
    }
    mockFirebase.bucket.objects.clear();
    await mockFirebase.db.ref().set({});
    await mockFirebase.db.ref('workspaces/ws1').set({
      admin: 'uid-admin',
      members: [
        { id: 'uid-admin' },
        { id: 'uid-writer' },
        { id: 'uid-reader' },
      ],
      folders: [
        {
          id: 'fRW',
          access: {
            members: [
              { uid: 'uid-writer', access: 'WRITE' },
              { uid: 'uid-reader', access: 'READ' },
            ],
          },
        },
        {
          id: 'fRO',
          access: {
            members: [
              { uid: 'uid-writer', access: 'READ' },
              { uid: 'uid-reader', access: 'READ' },
            ],
          },
        },
        { id: 'fOpen' },
      ],
      videos: {
        // The writer may write vid1 and only read vid2.
        vid1: {
          id: 'vid1',
          refName: 'one.webm',
          access: {
            members: [
              { uid: 'uid-writer', access: 'WRITE' },
              { uid: 'uid-reader', access: 'READ' },
            ],
          },
        },
        vid2: {
          id: 'vid2',
          refName: 'two.webm',
          access: {
            members: [
              { uid: 'uid-writer', access: 'READ' },
              { uid: 'uid-reader', access: 'READ' },
            ],
          },
        },
        // A video with no permissions of its own, at the root.
        vid3: { id: 'vid3', refName: 'three.webm' },
        // A video with no permissions of its own, in a folder the writer can only read.
        vid4: { id: 'vid4', refName: 'four.webm', parentId: 'fRO' },
      },
      screenshots: {
        img1: { id: 'img1', refName: 'shot.png' },
      },
    });
    for (const name of ['one', 'two', 'three', 'four']) {
      mockFirebase.bucket.objects.set(
        `${PREFIX}/${name}.webm`,
        Buffer.from(`${name}-bytes`),
      );
    }
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const auth = (req: request.Test, uid: string | undefined) =>
    uid ? req.set({ Authorization: `Bearer ${uid}` }) : req;
  const stored = () => [...mockFirebase.bucket.objects.keys()].sort();
  const content = (path: string) =>
    mockFirebase.bucket.objects.get(path)?.toString();
  const recorded = async (id: string) =>
    (await mockFirebase.db.ref(`workspaces/ws1/videos/${id}`).get()).val();
  const leftoverUploads = () => readdirSync(TMP_PATH);

  describe('POST video', () => {
    const upload = (
      uid: string | undefined,
      fields: { fullFileName: string; folderId?: string },
      query = '',
    ) => {
      const req = request(app.getHttpServer())
        .post(`${BASE}${query}`)
        .field('title', 'A video')
        .field('fullFileName', fields.fullFileName);
      if (fields.folderId !== undefined) {
        req.field('folderId', fields.folderId);
      }
      return auth(
        req.attach('file', Buffer.from('video-bytes'), 'upload.webm'),
        uid,
      );
    };

    it('stores a new name at the root for a member', async () => {
      await upload('uid-reader', { fullFileName: 'fresh.webm' }).expect(201);
      expect(addVideoFromFile).toHaveBeenCalledTimes(1);
      expect(addVideoFromFile.mock.calls[0].slice(0, 1)).toEqual(['uid-reader']);
      expect(addVideoFromFile.mock.calls[0][4]).toBe('fresh.webm');
      expect(addVideoFromFile.mock.calls[0][5]).toBe(false);
    });

    it('stores into a folder the member may write, using the folder of the body', async () => {
      await upload('uid-writer', {
        fullFileName: 'fresh.webm',
        folderId: 'fRW',
      }).expect(201);
      expect(addVideoFromFile.mock.calls[0][5]).toBe('fRW');
    });

    it('refuses a folder in the body that the member may only read, even when the query names a free folder', async () => {
      await upload(
        'uid-writer',
        { fullFileName: 'fresh.webm', folderId: 'fRO' },
        '?folderId=fOpen',
      ).expect(403);
      await upload('uid-writer', {
        fullFileName: 'fresh.webm',
        folderId: 'fRO',
      }).expect(403);
      expect(addVideoFromFile).not.toHaveBeenCalled();
    });

    it('refuses a folder that does not exist', async () => {
      await upload('uid-writer', {
        fullFileName: 'fresh.webm',
        folderId: 'nope',
      }).expect(403);
      expect(addVideoFromFile).not.toHaveBeenCalled();
    });

    it('refuses a folder id that is not a plain id', async () => {
      await upload('uid-writer', {
        fullFileName: 'fresh.webm',
        folderId: '../x',
      }).expect(400);
      expect(addVideoFromFile).not.toHaveBeenCalled();
    });

    it('refuses a name owned by a video the member may only read, and removes the temporary file', async () => {
      const res = await upload('uid-writer', { fullFileName: 'two.webm' });
      expect(res.status).toBe(403);
      await upload('uid-reader', { fullFileName: 'one.webm' }).expect(403);

      expect(addVideoFromFile).not.toHaveBeenCalled();
      expect(leftoverUploads()).toEqual([]);
      expect(content(`${PREFIX}/two.webm`)).toBe('two-bytes');
    });

    it('refuses a name owned by a video in a folder the member may only read', async () => {
      await upload('uid-writer', { fullFileName: 'four.webm' }).expect(403);
      expect(addVideoFromFile).not.toHaveBeenCalled();
    });

    it('lets a member write over the name of a video they may write', async () => {
      await upload('uid-writer', { fullFileName: 'one.webm' }).expect(201);
      expect(addVideoFromFile).toHaveBeenCalledTimes(1);
    });

    it('keeps letting a member reuse the name of a video with no permissions of its own', async () => {
      await upload('uid-reader', { fullFileName: 'three.webm' }).expect(201);
      expect(addVideoFromFile).toHaveBeenCalledTimes(1);
    });

    it('lets the workspace admin write any name and folder', async () => {
      await upload('uid-admin', {
        fullFileName: 'two.webm',
        folderId: 'fRO',
      }).expect(201);
      expect(addVideoFromFile).toHaveBeenCalledTimes(1);
    });

    it.each([
      ['a path separator before the extension', 'a/mp4'],
      ['a path with a folder', 'a/b.webm'],
      ['a parent folder', '../two.webm'],
      ['a name with a backslash', 'a\\b.webm'],
      ['a name without an extension', 'plain'],
      ['an empty name', ''],
    ])('refuses %s', async (_label, fullFileName) => {
      await upload('uid-writer', { fullFileName }).expect(400);
      expect(addVideoFromFile).not.toHaveBeenCalled();
      expect(leftoverUploads()).toEqual([]);
    });

    it('refuses a request without a name', async () => {
      await auth(
        request(app.getHttpServer())
          .post(BASE)
          .field('title', 'A video')
          .attach('file', Buffer.from('video-bytes'), 'upload.webm'),
        'uid-writer',
      ).expect(400);
      expect(addVideoFromFile).not.toHaveBeenCalled();
    });

    it('refuses a user who is not a member of the workspace', async () => {
      await upload('uid-stranger', { fullFileName: 'fresh.webm' }).expect(403);
      expect(addVideoFromFile).not.toHaveBeenCalled();
    });

    it('refuses an anonymous request', async () => {
      await upload(undefined, { fullFileName: 'fresh.webm' }).expect(401);
      expect(addVideoFromFile).not.toHaveBeenCalled();
    });
  });

  describe('POST video/add-from-personal', () => {
    const personal = (name: string, refName = `${name}.webm`) =>
      mockFirebase.db
        .ref(`users/uid-writer/videos/${name}`)
        .set({ refName, title: `Mine ${name}` });
    const move = (uid: string | undefined, itemId: string, query = '') =>
      auth(
        request(app.getHttpServer()).post(
          `${BASE}/add-from-personal?itemId=${itemId}${query}`,
        ),
        uid,
      );

    beforeEach(() => {
      mockFirebase.bucket.objects.set(
        'users/uid-writer/videos/mine.webm',
        Buffer.from('mine-bytes'),
      );
    });

    it('copies a personal video under a new name into the workspace', async () => {
      await personal('p1', 'mine.webm');
      const res = await move('uid-writer', 'p1').expect(201);

      expect(res.body.status).toBe('success');
      expect(content(`${PREFIX}/mine.webm`)).toBe('mine-bytes');
    });

    it("does not copy anything into the workspace's image originals", async () => {
      // Whatever the personal side holds under the video's name, it must not reach the image
      // originals, where it would replace the original of an image with that file name.
      await personal('p1', 'mine.webm');
      mockFirebase.bucket.objects.set(
        'users/uid-writer/screenshots/originals/mine.webm',
        Buffer.from('from-personal'),
      );
      mockFirebase.bucket.objects.set(
        'workspaces/ws1/screenshots/originals/mine.webm',
        Buffer.from('kept'),
      );

      await move('uid-writer', 'p1').expect(201);

      expect(content('workspaces/ws1/screenshots/originals/mine.webm')).toBe(
        'kept',
      );
      expect(
        stored().filter((name) => name.startsWith('workspaces/ws1/screenshots/')),
      ).toEqual(['workspaces/ws1/screenshots/originals/mine.webm']);
    });

    it('refuses a name owned by a video the member may only read, and changes nothing', async () => {
      mockFirebase.bucket.objects.set(
        'users/uid-writer/videos/two.webm',
        Buffer.from('replacement'),
      );
      await personal('p2', 'two.webm');

      await move('uid-writer', 'p2').expect(403);

      expect(content(`${PREFIX}/two.webm`)).toBe('two-bytes');
      const videos = (
        await mockFirebase.db.ref('workspaces/ws1/videos').get()
      ).val();
      expect(Object.keys(videos)).toEqual(['vid1', 'vid2', 'vid3', 'vid4']);
    });

    it('lets a member copy over the name of a video they may write', async () => {
      mockFirebase.bucket.objects.set(
        'users/uid-writer/videos/one.webm',
        Buffer.from('replacement'),
      );
      await personal('p3', 'one.webm');

      await move('uid-writer', 'p3').expect(201);
      expect(content(`${PREFIX}/one.webm`)).toBe('replacement');
    });

    it('refuses a personal record whose file name is not a plain video file name', async () => {
      await personal('p4', '../../escape.webm');
      await personal('p5', 'a/mp4');
      await mockFirebase.db.ref('users/uid-writer/videos/p6').set({ title: 'x' });

      await move('uid-writer', 'p4').expect(400);
      await move('uid-writer', 'p5').expect(400);
      await move('uid-writer', 'p6').expect(400);
      expect(stored()).toHaveLength(5);
    });

    it('refuses a destination folder the member may only read', async () => {
      await personal('p1', 'mine.webm');
      await move('uid-writer', 'p1', '&folderId=fRO').expect(403);
      expect(stored()).not.toContain(`${PREFIX}/mine.webm`);
    });

    it('refuses a user who is not a member of the workspace', async () => {
      await move('uid-stranger', 'p1').expect(403);
    });

    it('refuses an anonymous request', async () => {
      await move(undefined, 'p1').expect(401);
    });
  });

  describe('DELETE video/single', () => {
    const remove = (uid: string | undefined, query: string) =>
      auth(request(app.getHttpServer()).delete(`${BASE}/single?${query}`), uid);

    it('deletes the video and its own file for a member who may write it', async () => {
      const res = await remove('uid-writer', 'videoId=vid1&refName=one.webm');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');

      expect(await recorded('vid1')).toBeNull();
      expect(stored()).toEqual(
        ['two', 'three', 'four'].map((n) => `${PREFIX}/${n}.webm`).sort(),
      );
      expect(deleteLinkById).toHaveBeenCalledWith('ws1', 'vid1');
    });

    it('lets the workspace admin delete any video', async () => {
      await remove('uid-admin', 'videoId=vid2&refName=two.webm').expect(200);
      expect(await recorded('vid2')).toBeNull();
      expect(stored()).not.toContain(`${PREFIX}/two.webm`);
    });

    it("ignores a file name that is not the video's: the other video's file is untouched", async () => {
      // vid1 is allowed; two.webm is vid2's file, which the writer may not delete.
      await remove('uid-writer', 'videoId=vid1&refName=two.webm').expect(200);

      expect(await recorded('vid1')).toBeNull();
      expect(await recorded('vid2')).not.toBeNull();
      expect(stored()).toEqual(
        ['two', 'three', 'four'].map((n) => `${PREFIX}/${n}.webm`).sort(),
      );
    });

    it('deletes nothing when the id names no video, whatever file name is sent', async () => {
      const res = await remove('uid-writer', 'videoId=missing&refName=two.webm');
      expect(res.body.status).toBe('error');

      expect(stored()).toHaveLength(4);
      expect(await recorded('vid2')).not.toBeNull();
      expect(deleteLinkById).not.toHaveBeenCalled();
    });

    it('removes a record without a file name but touches no file', async () => {
      await mockFirebase.db
        .ref('workspaces/ws1/videos/vid5')
        .set({ id: 'vid5' });

      await remove('uid-writer', 'videoId=vid5&refName=two.webm').expect(200);

      expect(await recorded('vid5')).toBeNull();
      expect(stored()).toHaveLength(4);
    });

    it('refuses a member with only read permission, and changes nothing', async () => {
      await remove('uid-reader', 'videoId=vid1&refName=one.webm').expect(403);
      await remove('uid-writer', 'videoId=vid2&refName=two.webm').expect(403);

      expect(stored()).toHaveLength(4);
      expect(await recorded('vid1')).not.toBeNull();
      expect(await recorded('vid2')).not.toBeNull();
    });

    it('refuses a user who is not a member of the workspace', async () => {
      await remove('uid-stranger', 'videoId=vid3&refName=three.webm').expect(
        403,
      );
      expect(stored()).toHaveLength(4);
      expect(await recorded('vid3')).not.toBeNull();
    });

    it('refuses an anonymous request', async () => {
      await remove(undefined, 'videoId=vid3&refName=three.webm').expect(401);
      expect(stored()).toHaveLength(4);
    });

    it('keeps letting a member delete a video with no permissions of its own', async () => {
      await remove('uid-reader', 'videoId=vid3&refName=three.webm').expect(200);
      expect(await recorded('vid3')).toBeNull();
      expect(stored()).not.toContain(`${PREFIX}/three.webm`);
      expect(stored()).toHaveLength(3);
    });

    it.each(['../two.webm', 'a/mp4', 'a/b.webm'])(
      'still refuses the file name %s, before the handler',
      async (refName) => {
        await remove(
          'uid-writer',
          `videoId=vid1&refName=${encodeURIComponent(refName)}`,
        ).expect(400);
        expect(stored()).toHaveLength(4);
        expect(await recorded('vid1')).not.toBeNull();
      },
    );
  });
});
