/**
 * `stream/save-data` and `stream/save-data/:videoId`, with the real guard and service. The asset
 * ids of shared videos are public, and saving a record (or replacing its asset) later deletes the
 * previously stored asset with the server's own provider credentials. So a caller may only store
 * an asset that was created for them: a foreign asset is refused (403) before anything is written
 * or deleted, an unknown service type or a malformed id is a 400, and their own asset still saves.
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
jest.mock('src/services/utils/uploadVideoToBucket', () => ({
  // Never settles: the bucket upload runs in the background and is not under test.
  fixVideoAndUploadToBucket: () => new Promise(() => undefined),
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
  return {
    database: () => ({
      ref: (path: string) => ({
        get: async () => ({ val: () => read(path) }),
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
        push: () => ({
          key: 'newVideoId',
          set: async () => {
            mockDb.writes.push({ op: 'set', path: `${path}/newVideoId` });
          },
        }),
      }),
    }),
  };
});

describe('stream save-data routes', () => {
  let app: INestApplication;
  const mux = { getAssetOwner: jest.fn(), deleteAsset: jest.fn() };
  const apiVideo = { getAssetOwner: jest.fn(), deleteAsset: jest.fn() };

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
    const owners: Record<string, string> = {
      mine: 'uid-me',
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
  });
});
