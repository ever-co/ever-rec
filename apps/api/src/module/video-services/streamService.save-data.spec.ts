/**
 * `stream/save-data` and `stream/save-data/:videoId`, with the real guard and service. The asset
 * ids of shared videos are public, and saving a record (or replacing its asset) later deletes the
 * previously stored asset with the server's own provider credentials. So a caller may only store
 * an asset that was created for them: a foreign asset is refused (403) before anything is written
 * or deleted, an unknown service type or a malformed id is a 400, and their own asset still saves.
 * A request without the video file (no `blob` part, or JSON) is a 400 too, before anything is
 * written, deleted or uploaded: it used to read `blob.mimetype` of nothing and answer 500.
 * The download link is the streaming provider's, never the `downloadUrl` the client sends: the
 * Jira and Trello export used to fetch that URL from the server.
 *
 * Replacing the asset (a trim or a reset) replaces the master file in the bucket in the background.
 * Until that upload is done, the bucket holds the previous cut, so the record is marked
 * (`streamData.masterStale`) and the Jira and Trello export attaches nothing. Only the upload of
 * the asset the record still has clears the mark: not a failed upload, and not a late one for an
 * asset that was replaced again meanwhile, which marks the master file stale again (even when the
 * link of that late upload cannot be signed). That includes the first upload of a recording that
 * is trimmed at once: it writes the same file.
 */
import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { TokenService } from '../auth/services/tokens';
import { MuxService } from './mux/mux.service';
import { ApiVideoService } from './api-video/api-video.service';
import { StreamServiceController } from './streamService.controller';
import { StreamServiceService } from './streamService.service';

jest.mock('../auth/services/tokens', () => ({ TokenService: class {} }));
jest.mock('./mux/mux.service', () => ({ MuxService: class {} }));
jest.mock('./api-video/api-video.service', () => ({
  ApiVideoService: class {},
}));
// By default it never settles: the bucket upload runs in the background. The tests of the master
// file settle it themselves.
const mockUpload = jest.fn<Promise<unknown>, unknown[]>(
  () => new Promise(() => undefined),
);
jest.mock('src/services/utils/uploadVideoToBucket', () => ({
  fixVideoAndUploadToBucket: (...args: unknown[]) => mockUpload(...args),
}));
// Keep the uploaded file in memory instead of writing it to the tmp folder.
jest.mock('multer', () => {
  const actual = jest.requireActual('multer');
  return Object.assign(actual, { diskStorage: () => actual.memoryStorage() });
});

const mockDb: {
  data: Record<string, any>;
  writes: Array<{ op: string; path: string }>;
  payloads: Array<{ path: string; payload: Record<string, any> }>;
} = { data: {}, writes: [], payloads: [] };
jest.mock('firebase-admin', () => {
  const read = (path: string) => {
    let value: any = mockDb.data;
    for (const segment of path.split('/').filter(Boolean)) {
      value = value?.[segment];
    }
    return value ?? null;
  };
  const write = (path: string, value: any) => {
    const parts = path.split('/').filter(Boolean);
    let node: any = mockDb.data;
    for (const part of parts.slice(0, -1)) {
      if (node[part] === null || typeof node[part] !== 'object')
        node[part] = {};
      node = node[part];
    }
    if (value === null) delete node[parts[parts.length - 1]];
    else node[parts[parts.length - 1]] = value;
  };
  const copy = (value: any) =>
    value === null ? null : JSON.parse(JSON.stringify(value));
  return {
    database: () => ({
      ref: (path: string) => ({
        // A copy, like a real snapshot: a later update must not change a value already read.
        get: async () => ({
          val: () => {
            const value = read(path);
            return value === null ? null : JSON.parse(JSON.stringify(value));
          },
        }),
        update: async (payload: Record<string, any>) => {
          mockDb.writes.push({ op: 'update', path });
          mockDb.payloads.push({ path, payload });
          // Apply it to the fixture, so a later read sees what was written.
          const target = read(path);
          if (target) Object.assign(target, payload);
        },
        set: async () => {
          mockDb.writes.push({ op: 'set', path });
        },
        transaction: async (update: (current: any) => any) => {
          // Like the real database, the update function is first called with its local guess
          // (null here), and that attempt is thrown away when the stored value is something else.
          update(null);
          const current = read(path);
          const next = update(copy(current));
          if (next === undefined || (next === null && current === null)) {
            return { committed: false };
          }
          mockDb.writes.push({ op: 'transaction', path });
          mockDb.payloads.push({ path, payload: next });
          write(path, copy(next));
          return { committed: true };
        },
        push: () => ({
          key: 'newVideoId',
          set: async (payload: Record<string, any>) => {
            mockDb.writes.push({ op: 'set', path: `${path}/newVideoId` });
            mockDb.payloads.push({ path: `${path}/newVideoId`, payload });
            write(`${path}/newVideoId`, copy(payload));
          },
        }),
      }),
    }),
  };
});

describe('stream save-data routes', () => {
  let app: INestApplication;
  const mux = {
    getAssetOwner: jest.fn(),
    deleteAsset: jest.fn(),
    getDownloadUrl: jest.fn(),
  };
  const apiVideo = {
    getAssetOwner: jest.fn(),
    deleteAsset: jest.fn(),
    getDownloadUrl: jest.fn(),
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [StreamServiceController],
      providers: [
        StreamServiceService,
        { provide: ConfigService, useValue: { get: () => 'mux' } },
        {
          provide: TokenService,
          useValue: {
            processToken: async (token: string, req: any) => {
              if (!token.startsWith('uid-')) throw new Error('bad token');
              req.user = { id: token };
            },
          },
        },
        { provide: MuxService, useValue: mux },
        { provide: ApiVideoService, useValue: apiVideo },
      ],
    }).compile();

    app = moduleRef.createNestApplication({ logger: false });
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    mockDb.writes = [];
    mockDb.payloads = [];
    mockDb.data = {
      users: {
        'uid-me': {
          videos: {
            vid1: {
              id: 'vid1',
              refName: 'vid1.webm',
              streamData: { serviceType: 'mux', assetId: 'old-asset' },
            },
          },
        },
      },
    };
    mockUpload
      .mockReset()
      .mockImplementation(() => new Promise(() => undefined));
    const owners: Record<string, string> = {
      mine: 'uid-me',
      mine2: 'uid-me',
      victim: 'uid-victim',
    };
    mux.getAssetOwner
      .mockReset()
      .mockImplementation(async (id: string) => owners[id] ?? null);
    apiVideo.getAssetOwner
      .mockReset()
      .mockImplementation(async (id: string) => owners[id] ?? null);
    mux.deleteAsset.mockReset().mockResolvedValue(undefined);
    apiVideo.deleteAsset.mockReset().mockResolvedValue(undefined);
    mux.getDownloadUrl
      .mockReset()
      .mockImplementation(async (id: string) =>
        id === 'mine' ? 'https://stream.mux.com/pb-mine/high.mp4' : null,
      );
    apiVideo.getDownloadUrl
      .mockReset()
      .mockImplementation(async (id: string) =>
        id === 'mine' ? 'https://vod.api.video/vod/mine/mp4/source.mp4' : null,
      );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const save = (
    path: string,
    fields: Record<string, string>,
    uid = 'uid-me',
  ) => {
    let req = request(app.getHttpServer())
      .post(`/stream/save-data${path}`)
      .set({ Authorization: `Bearer ${uid}` });
    for (const [key, value] of Object.entries(fields)) {
      req = req.field(key, value);
    }
    return req.attach('blob', Buffer.from('video'), {
      filename: 'rec.webm',
      contentType: 'video/webm',
    });
  };

  /** The same form without its `blob` part, or the fields sent as JSON. */
  const saveWithoutFile = (
    path: string,
    fields: Record<string, string>,
    as: 'form' | 'json' = 'form',
  ) => {
    let req = request(app.getHttpServer())
      .post(`/stream/save-data${path}`)
      .set({ Authorization: 'Bearer uid-me' });
    if (as === 'json') return req.send(fields);
    for (const [key, value] of Object.entries(fields)) {
      req = req.field(key, value);
    }
    return req;
  };

  const fields = (assetId: string, serviceType = 'mux') => ({
    videoTitle: 'Title',
    videoDuration: '3',
    serviceType,
    assetId,
    thumbnailUrl: 'https://example.com/t.png',
    playbackUrl: 'https://example.com/p.m3u8',
    downloadUrl: '',
  });

  describe('POST stream/save-data', () => {
    it('saves a video of an asset created for the caller', async () => {
      const res = await save('', fields('mine')).expect(201);
      expect(res.body.dbData).toMatchObject({
        uid: 'uid-me',
        streamData: { assetId: 'mine', serviceType: 'mux' },
      });
      expect(mockDb.writes).toEqual([
        { op: 'set', path: 'users/uid-me/videos/newVideoId' },
      ]);
    });

    it('checks the asset at the provider the caller named', async () => {
      await save('', fields('mine', 'api.video')).expect(201);
      expect(apiVideo.getAssetOwner).toHaveBeenCalledWith('mine');
      expect(mux.getAssetOwner).not.toHaveBeenCalled();
    });

    it('refuses an asset created for someone else and writes nothing', async () => {
      await save('', fields('victim')).expect(403);
      await save('', fields('victim', 'api.video')).expect(403);
      expect(mockDb.writes).toEqual([]);
    });

    it('refuses an asset that has no owner or that the provider does not know', async () => {
      await save('', fields('legacy')).expect(403);
      mux.getAssetOwner.mockRejectedValueOnce(new Error('not found'));
      await save('', fields('mine')).expect(403);
      expect(mockDb.writes).toEqual([]);
    });

    it('refuses an unknown service type', async () => {
      await save('', fields('mine', 'cloudinary')).expect(400);
      await save('', fields('mine', 'nope')).expect(400);
      expect(mux.getAssetOwner).not.toHaveBeenCalled();
      expect(mockDb.writes).toEqual([]);
    });

    it('refuses an assetId that is not a plain id', async () => {
      await save('', fields('a/b')).expect(400);
      await save('', fields('a.b')).expect(400);
      expect(mux.getAssetOwner).not.toHaveBeenCalled();
      expect(mockDb.writes).toEqual([]);
    });

    it.each(['form', 'json'] as const)(
      'refuses a request without a video file (%s), writing nothing and uploading nothing',
      async (as) => {
        const res = await saveWithoutFile('', fields('mine'), as).expect(400);
        expect(res.body.message).toBe('A video file is required');
        expect(mux.getAssetOwner).not.toHaveBeenCalled();
        expect(mockDb.writes).toEqual([]);
        expect(mockUpload).not.toHaveBeenCalled();
      },
    );
  });

  describe('POST stream/save-data/:videoId', () => {
    it('replaces the asset with one created for the caller and deletes the old one', async () => {
      const res = await save('/vid1', fields('mine')).expect(201);
      expect(mockDb.writes).toContainEqual({
        op: 'update',
        path: 'users/uid-me/videos/vid1',
      });
      const written = mockDb.payloads.find(
        (p) => p.path === 'users/uid-me/videos/vid1',
      );
      expect(written?.payload.streamData).toMatchObject({
        assetId: 'mine',
        serviceType: 'mux',
      });
      expect(res.body.dbData.streamData.assetId).toBe('mine');
      expect(mux.deleteAsset).toHaveBeenCalledWith('old-asset');
    });

    it('refuses an asset created for someone else, without writing or deleting', async () => {
      await save('/vid1', fields('victim')).expect(403);
      expect(mockDb.writes).toEqual([]);
      expect(mux.deleteAsset).not.toHaveBeenCalled();
      expect(apiVideo.deleteAsset).not.toHaveBeenCalled();
    });

    it('refuses an unknown service type', async () => {
      await save('/vid1', fields('mine', 'nope')).expect(400);
      expect(mockDb.writes).toEqual([]);
      expect(mux.deleteAsset).not.toHaveBeenCalled();
    });

    it('refuses a videoId that is not a plain id', async () => {
      await save('/vid1%2FstreamData', fields('mine')).expect(400);
      await save('/vid1.x', fields('mine')).expect(400);
      expect(mockDb.writes).toEqual([]);
      expect(mux.deleteAsset).not.toHaveBeenCalled();
    });

    it.each(['form', 'json'] as const)(
      'refuses a request without a video file (%s), without writing, deleting or uploading',
      async (as) => {
        const res = await saveWithoutFile('/vid1', fields('mine'), as).expect(
          400,
        );
        expect(res.body.message).toBe('A video file is required');
        expect(mux.getAssetOwner).not.toHaveBeenCalled();
        expect(mockDb.writes).toEqual([]);
        expect(mux.deleteAsset).not.toHaveBeenCalled();
        expect(mockUpload).not.toHaveBeenCalled();
        expect(mockDb.data.users['uid-me'].videos.vid1.streamData).toEqual({
          serviceType: 'mux',
          assetId: 'old-asset',
        });
      },
    );
  });

  describe('the stored download link', () => {
    const metadata = 'http://169.254.169.254/x';
    const withDownloadUrl = (assetId: string, serviceType = 'mux') => ({
      ...fields(assetId, serviceType),
      downloadUrl: metadata,
    });
    const stored = (path: string) =>
      mockDb.payloads.find((p) => p.path === path)?.payload.streamData;

    it('save-data stores the Mux link, never the downloadUrl the client sent', async () => {
      const res = await save('', withDownloadUrl('mine')).expect(201);
      expect(stored('users/uid-me/videos/newVideoId')).toMatchObject({
        downloadUrl: 'https://stream.mux.com/pb-mine/high.mp4',
      });
      expect(mux.getDownloadUrl).toHaveBeenCalledWith('mine');
      expect(JSON.stringify(mockDb.payloads)).not.toContain(metadata);
      expect(JSON.stringify(res.body)).not.toContain(metadata);
    });

    it('save-data stores the api.video link, never the downloadUrl the client sent', async () => {
      await save('', withDownloadUrl('mine', 'api.video')).expect(201);
      expect(stored('users/uid-me/videos/newVideoId')).toMatchObject({
        downloadUrl: 'https://vod.api.video/vod/mine/mp4/source.mp4',
      });
      expect(apiVideo.getDownloadUrl).toHaveBeenCalledWith('mine');
      expect(JSON.stringify(mockDb.payloads)).not.toContain(metadata);
    });

    it('save-data stores no link while the provider does not know one', async () => {
      mux.getDownloadUrl.mockResolvedValueOnce(null);
      const res = await save('', withDownloadUrl('mine')).expect(201);
      expect(stored('users/uid-me/videos/newVideoId')).toMatchObject({
        downloadUrl: '',
      });
      expect(JSON.stringify(res.body)).not.toContain(metadata);
    });

    it('save-data/:videoId stores the provider link, never the downloadUrl the client sent', async () => {
      const res = await save('/vid1', withDownloadUrl('mine')).expect(201);
      expect(stored('users/uid-me/videos/vid1')).toMatchObject({
        downloadUrl: 'https://stream.mux.com/pb-mine/high.mp4',
      });
      expect(JSON.stringify(mockDb.payloads)).not.toContain(metadata);
      expect(JSON.stringify(res.body)).not.toContain(metadata);
    });

    it('save-data/:videoId stores no link while the provider does not know one', async () => {
      apiVideo.getDownloadUrl.mockResolvedValueOnce(null);
      await save('/vid1', withDownloadUrl('mine', 'api.video')).expect(201);
      expect(stored('users/uid-me/videos/vid1')).toMatchObject({
        downloadUrl: '',
      });
      expect(JSON.stringify(mockDb.payloads)).not.toContain(metadata);
    });
  });

  describe('the master file after save-data/:videoId', () => {
    const providerLink = 'https://stream.mux.com/pb-mine/high.mp4';
    const streamData = () => mockDb.data.users['uid-me'].videos.vid1.streamData;

    /** The next bucket upload, settled by the test. */
    const nextUpload = () => {
      const upload: {
        done: (fileRef: unknown) => void;
        fail: (error: Error) => void;
      } = { done: () => undefined, fail: () => undefined };
      mockUpload.mockImplementationOnce(
        () =>
          new Promise((resolve, reject) => {
            upload.done = resolve;
            upload.fail = reject;
          }),
      );
      return upload;
    };
    /** The bucket file the upload wrote. */
    const uploadedFile = (name: string) => ({
      getSignedUrl: async () => [`https://bucket.test/${name}`],
    });
    /** Lets the background upload callback run to its end. */
    const settled = async () => {
      for (let i = 0; i < 5; i++) {
        await new Promise((resolve) => setImmediate(resolve));
      }
    };

    it('marks the master file stale until the upload of the new cut is done', async () => {
      const upload = nextUpload();

      await save('/vid1', fields('mine')).expect(201);

      expect(mockUpload).toHaveBeenCalledWith(
        expect.anything(),
        expect.any(String),
        'uid-me',
        'vid1.webm',
      );
      expect(streamData()).toMatchObject({
        assetId: 'mine',
        masterStale: true,
        downloadStatus: 'preparing',
        downloadUrl: providerLink,
      });

      upload.done(uploadedFile('trimmed'));
      await settled();

      expect(streamData()).toMatchObject({
        assetId: 'mine',
        masterStale: false,
        downloadStatus: 'ready',
        downloadUrl: 'https://bucket.test/trimmed',
      });
    });

    it.each([
      [
        'the uploader swallowed the error',
        (upload: ReturnType<typeof nextUpload>) => upload.done(undefined),
      ],
      [
        'the upload was rejected',
        (upload: ReturnType<typeof nextUpload>) =>
          upload.fail(new Error('ffmpeg failed')),
      ],
    ])('keeps the mark when the upload failed (%s)', async (_, failUpload) => {
      const upload = nextUpload();
      await save('/vid1', fields('mine')).expect(201);

      failUpload(upload);
      await settled();

      expect(streamData()).toMatchObject({
        assetId: 'mine',
        masterStale: true,
        downloadStatus: 'preparing',
        downloadUrl: providerLink,
      });
    });

    it('a late upload of an older asset does not clear the mark of the newer one', async () => {
      const first = nextUpload();
      await save('/vid1', fields('mine')).expect(201);
      const second = nextUpload();
      await save('/vid1', fields('mine2')).expect(201);

      first.done(uploadedFile('first-cut'));
      await settled();

      expect(streamData()).toMatchObject({
        assetId: 'mine2',
        masterStale: true,
        downloadStatus: 'preparing',
      });
      expect(streamData().downloadUrl).not.toBe(
        'https://bucket.test/first-cut',
      );

      second.done(uploadedFile('second-cut'));
      await settled();

      expect(streamData()).toMatchObject({
        assetId: 'mine2',
        masterStale: false,
        downloadStatus: 'ready',
        downloadUrl: 'https://bucket.test/second-cut',
      });
    });

    it('a late upload of an older asset marks the master stale again', async () => {
      const first = nextUpload();
      await save('/vid1', fields('mine')).expect(201);
      const second = nextUpload();
      await save('/vid1', fields('mine2')).expect(201);

      second.done(uploadedFile('second-cut'));
      await settled();
      expect(streamData()).toMatchObject({ masterStale: false });

      // The older cut was written over the newer one.
      first.done(uploadedFile('first-cut'));
      await settled();

      expect(streamData()).toMatchObject({
        assetId: 'mine2',
        masterStale: true,
      });
    });

    it('does not recreate a video deleted before its upload was done', async () => {
      const upload = nextUpload();
      await save('/vid1', fields('mine')).expect(201);
      delete mockDb.data.users['uid-me'].videos.vid1;
      mockDb.writes = [];

      upload.done(uploadedFile('trimmed'));
      await settled();

      expect(mockDb.writes).toEqual([]);
      expect(mockDb.data.users['uid-me'].videos.vid1).toBeUndefined();
    });

    it('the first upload of a recording makes it ready with the bucket link', async () => {
      const first = nextUpload();
      await save('', fields('mine')).expect(201);

      first.done(uploadedFile('recording'));
      await settled();

      expect(
        mockDb.data.users['uid-me'].videos.newVideoId.streamData,
      ).toMatchObject({
        assetId: 'mine',
        downloadStatus: 'ready',
        downloadUrl: 'https://bucket.test/recording',
      });
      expect(
        mockDb.data.users['uid-me'].videos.newVideoId.streamData.masterStale,
      ).not.toBe(true);
    });

    it('a first upload of the recording that lands after a trim marks the master stale', async () => {
      // Record, then trim at once: the first upload (the whole recording) is still running.
      const first = nextUpload();
      await save('', fields('mine')).expect(201);
      const trim = nextUpload();
      await save('/newVideoId', fields('mine2')).expect(201);
      const stored = () =>
        mockDb.data.users['uid-me'].videos.newVideoId.streamData;

      trim.done(uploadedFile('trimmed'));
      await settled();
      expect(stored()).toMatchObject({ assetId: 'mine2', masterStale: false });

      // The whole recording was written over the trimmed cut.
      first.done(uploadedFile('whole-recording'));
      await settled();

      expect(stored()).toMatchObject({ assetId: 'mine2', masterStale: true });
      expect(stored().downloadUrl).toBe('https://bucket.test/trimmed');
    });

    /** A bucket file the upload wrote, whose link cannot be signed. */
    const unsignableFile = () => ({
      getSignedUrl: async () => {
        throw new Error('signing failed');
      },
    });

    it('a late upload of an older asset marks the master stale even when its link cannot be signed', async () => {
      const first = nextUpload();
      await save('', fields('mine')).expect(201);
      const trim = nextUpload();
      await save('/newVideoId', fields('mine2')).expect(201);
      const stored = () =>
        mockDb.data.users['uid-me'].videos.newVideoId.streamData;

      trim.done(uploadedFile('trimmed'));
      await settled();
      expect(stored()).toMatchObject({ assetId: 'mine2', masterStale: false });

      // The whole recording was written over the trimmed cut, then signing its link failed.
      first.done(unsignableFile());
      await settled();

      expect(stored()).toMatchObject({ assetId: 'mine2', masterStale: true });
      expect(stored().downloadUrl).toBe('https://bucket.test/trimmed');
      expect(console.error).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'signing failed' }),
      );
    });

    it('keeps the mark when the link of the new cut cannot be signed', async () => {
      const upload = nextUpload();
      await save('/vid1', fields('mine')).expect(201);
      mockDb.writes = [];

      upload.done(unsignableFile());
      await settled();

      expect(mockDb.writes).toEqual([]);
      expect(streamData()).toMatchObject({
        assetId: 'mine',
        masterStale: true,
        downloadStatus: 'preparing',
        downloadUrl: providerLink,
      });
    });
  });
});
