/**
 * The email of a video link shows the video's poster as its thumbnail, and the poster comes only
 * from `posterRef`. Clients capture a frame and post it to `setPosterRef` as the form fields
 * `templateBase64`, `fullFileName` and `videoId`, but `setPoster` read `fullFilename`, so it always
 * returned false and no video ever got a poster (and its upload path read the in-memory file as a
 * path on disk). Now the frame is saved under the caller's `videoPosters`, `posterRef` is set and
 * the signed URL is returned. Only an image is taken, the name must be one plain file name and
 * the video must be a video of the caller; anything else writes nothing.
 */
import { ConfigService } from '@nestjs/config';
import {
  BadRequestException,
  INestApplication,
  NotFoundException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { HttpService } from 'nestjs-http-promise';
import request from 'supertest';
import { FoldersSharedService } from '../../services/shared/folders.shared.service';
import { SharedService } from '../../services/shared/shared.service';
import { UniqueViewsSharedService } from '../../services/shared/uniqueViews.shared.service';
import { TokenService } from '../auth/services/tokens';
import { ContextUploader } from './services/uploader/context.uploader';
import { VideoController } from './video.controller';
import { VideoService } from './video.service';

jest.mock('sharp', () => ({}), { virtual: true });
jest.mock('firebase/compat/auth', () => ({}));
jest.mock('firebase/compat/firestore', () => ({}));
jest.mock('../auth/services/tokens', () => ({ TokenService: class {} }));
jest.mock('src/services/utils/uploadVideoToBucket', () => ({
  uploadVideoToBucket: jest.fn(),
}));
jest.mock('../../services/utils/fixVideoWithFFMPEG', () => ({
  fixVideoWithFFMPEG: jest.fn(),
}));
jest.mock('../video-services/streamService.service', () => ({
  StreamServiceService: class {},
}));
jest.mock('../../services/shared/shared.service', () => ({
  SharedService: class {},
}));
jest.mock('../../services/shared/folders.shared.service', () => ({
  FoldersSharedService: class {},
}));
jest.mock('../../services/shared/uniqueViews.shared.service', () => ({
  UniqueViewsSharedService: class {},
}));
jest.mock('./services/uploader/context.uploader', () => ({
  ContextUploader: class {},
}));

const mockDb: {
  data: Record<string, any>;
  updates: [string, any][];
  saves: [string, Buffer, any][];
} = { data: {}, updates: [], saves: [] };
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
        get: async () => ({
          val: () => read(path),
          exists: () => read(path) !== null,
        }),
        update: async (value: any) => {
          mockDb.updates.push([path, value]);
        },
      }),
    }),
    storage: () => ({
      bucket: () => ({
        file: (path: string) => ({
          save: async (data: Buffer, options: any) => {
            mockDb.saves.push([path, data, options]);
          },
          getSignedUrl: async () => [`https://signed.example/${path}`],
        }),
      }),
    }),
  };
});

const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1]);
const posterFile = (overrides: Record<string, any> = {}) =>
  ({
    fieldname: 'templateBase64',
    originalname: 'blob',
    mimetype: 'image/png',
    size: png.length,
    buffer: png,
    ...overrides,
  }) as any;

const resetDb = () => {
  mockDb.updates = [];
  mockDb.saves = [];
  mockDb.data = {
    users: {
      'uid-owner': { videos: { vid1: { id: 'vid1', refName: 'v.webm' } } },
    },
  };
};

describe('VideoService.setPoster', () => {
  let service: VideoService;

  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    service = new VideoService(
      {} as any,
      { emit: jest.fn() } as any,
      {} as any,
      {} as any,
    );
    resetDb();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('saves the frame, sets posterRef and returns the signed URL', async () => {
    await expect(
      service.setPoster('uid-owner', posterFile(), {
        fullFileName: 'poster-1.png',
        videoId: 'vid1',
      } as any),
    ).resolves.toBe(
      'https://signed.example/users/uid-owner/videoPosters/poster-1.png',
    );

    expect(mockDb.saves).toEqual([
      [
        'users/uid-owner/videoPosters/poster-1.png',
        png,
        { contentType: 'image/png' },
      ],
    ]);
    expect(mockDb.updates).toEqual([
      ['users/uid-owner/videos/vid1', { posterRef: 'poster-1.png' }],
    ]);
  });

  it('also takes the name as fullFilename', async () => {
    await expect(
      service.setPoster('uid-owner', posterFile(), {
        fullFilename: 'poster-2.png',
        videoId: 'vid1',
      } as any),
    ).resolves.toBe(
      'https://signed.example/users/uid-owner/videoPosters/poster-2.png',
    );
    expect(mockDb.updates).toEqual([
      ['users/uid-owner/videos/vid1', { posterRef: 'poster-2.png' }],
    ]);
  });

  it.each([
    ['a video that does not exist', 'uid-owner', 'gone'],
    ['a video of someone else', 'uid-other', 'vid1'],
  ])('writes nothing for %s (404)', async (_label, uid, videoId) => {
    await expect(
      service.setPoster(uid, posterFile(), {
        fullFileName: 'poster.png',
        videoId,
      } as any),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(mockDb.saves).toEqual([]);
    expect(mockDb.updates).toEqual([]);
  });

  it.each(['../x.png', 'a/b.png', '..', '.', 'a\\b.png', '', undefined, 5])(
    'refuses a name that is not one plain file name: %p',
    async (fullFileName) => {
      await expect(
        service.setPoster('uid-owner', posterFile(), {
          fullFileName,
          videoId: 'vid1',
        } as any),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(mockDb.saves).toEqual([]);
      expect(mockDb.updates).toEqual([]);
    },
  );

  it.each(['vid1/likes', '../vid1', 'vid1.x', '', undefined])(
    'refuses a video id that is not a plain id: %p',
    async (videoId) => {
      await expect(
        service.setPoster('uid-owner', posterFile(), {
          fullFileName: 'poster.png',
          videoId,
        } as any),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(mockDb.saves).toEqual([]);
      expect(mockDb.updates).toEqual([]);
    },
  );

  it('refuses a request without a file', async () => {
    await expect(
      service.setPoster(
        'uid-owner',
        undefined as any,
        {
          fullFileName: 'poster.png',
          videoId: 'vid1',
        } as any,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(mockDb.saves).toEqual([]);
    expect(mockDb.updates).toEqual([]);
  });
});

describe('POST /video/setPosterRef', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [VideoController],
      providers: [
        {
          provide: TokenService,
          useValue: {
            processToken: async (token: string, req: any) => {
              if (!token.startsWith('uid-')) throw new Error('bad token');
              req.user = { id: token };
            },
          },
        },
        { provide: HttpService, useValue: {} },
        { provide: ConfigService, useValue: {} },
        {
          provide: VideoService,
          useFactory: () =>
            new VideoService(
              {} as any,
              { emit: jest.fn() } as any,
              {} as any,
              {} as any,
            ),
        },
        { provide: SharedService, useValue: {} },
        { provide: FoldersSharedService, useValue: {} },
        { provide: UniqueViewsSharedService, useValue: {} },
        { provide: ContextUploader, useValue: {} },
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
    resetDb();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // The form the portal and the extension send.
  const post = (contentType: string) =>
    request(app.getHttpServer())
      .post('/video/setPosterRef')
      .set({ Authorization: 'Bearer uid-owner' })
      .attach('templateBase64', png, { filename: 'blob', contentType })
      .field('fullFileName', 'frame.png')
      .field('videoId', 'vid1');

  it('saves the poster the clients send and answers its URL', async () => {
    const res = await post('image/png').expect(201);

    expect(res.text).toBe(
      'https://signed.example/users/uid-owner/videoPosters/frame.png',
    );
    expect(mockDb.saves).toEqual([
      [
        'users/uid-owner/videoPosters/frame.png',
        png,
        { contentType: 'image/png' },
      ],
    ]);
    expect(mockDb.updates).toEqual([
      ['users/uid-owner/videos/vid1', { posterRef: 'frame.png' }],
    ]);
  });

  it.each(['text/html', 'application/octet-stream', 'video/webm'])(
    'refuses an upload that is not an image (%s), with nothing written',
    async (contentType) => {
      await post(contentType).expect(415);
      expect(mockDb.saves).toEqual([]);
      expect(mockDb.updates).toEqual([]);
    },
  );

  it('refuses a request without a file, with nothing written', async () => {
    await request(app.getHttpServer())
      .post('/video/setPosterRef')
      .set({ Authorization: 'Bearer uid-owner' })
      .field('fullFileName', 'frame.png')
      .field('videoId', 'vid1')
      .expect(400);
    expect(mockDb.saves).toEqual([]);
    expect(mockDb.updates).toEqual([]);
  });
});
