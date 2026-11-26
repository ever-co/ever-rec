/**
 * `POST video/upload` took a file of any size and refused a bad one only after it was on disk, and
 * left it there (as `POST video/upload/file` does); when the conversion or the bucket write failed,
 * the client got an empty 201. Now the upload is capped at 1 GB like `POST video/upload/file`, a
 * refused upload is removed on both routes, and a failed upload answers 500.
 *
 * The route is the real controller behind the real guard and multer, with the real service; only
 * the token check, the video conversion and the bucket upload are stand-ins.
 */
import { ConfigService } from '@nestjs/config';
import { INestApplication } from '@nestjs/common';
import { INTERCEPTORS_METADATA } from '@nestjs/common/constants';
import { Test } from '@nestjs/testing';
import { readdirSync, readFileSync, rmSync } from 'fs';
import { HttpService } from 'nestjs-http-promise';
import { dirname, join, resolve } from 'path';
import request from 'supertest';
import { TMP_PATH } from '../../enums/tmpPathsEnums';
import { FoldersSharedService } from '../../services/shared/folders.shared.service';
import { SharedService } from '../../services/shared/shared.service';
import { UniqueViewsSharedService } from '../../services/shared/uniqueViews.shared.service';
import { fixVideoWithFFMPEG } from '../../services/utils/fixVideoWithFFMPEG';
import { uploadVideoToBucket } from '../../services/utils/uploadVideoToBucket';
import { TokenService } from '../auth/services/tokens';
import { ContextUploader } from './services/uploader/context.uploader';
import { VideoController } from './video.controller';
import { VideoService } from './video.service';

jest.mock('sharp', () => ({}), { virtual: true });
jest.mock('firebase/compat/auth', () => ({}));
jest.mock('firebase/compat/firestore', () => ({}));
// The bucket of `PUT video/single`: it records what is written, and where from.
const mockBucket = { file: jest.fn(), upload: jest.fn() };
jest.mock('firebase-admin', () => ({
  storage: () => ({ bucket: () => mockBucket }),
}));
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
// Uploads are written to a directory of their own, so a test can see what is left behind.
jest.mock('../../enums/tmpPathsEnums', () => {
  const { mkdtempSync } = jest.requireActual('fs');
  const { tmpdir } = jest.requireActual('os');
  const { join } = jest.requireActual('path');
  const dir = mkdtempSync(join(tmpdir(), 'ever-video-upload-spec-')) + '/';
  return { TMP_PATH: dir, TMP_PATH_FIXED: dir };
});

const mockFix = fixVideoWithFFMPEG as jest.MockedFunction<
  typeof fixVideoWithFFMPEG
>;
const mockUpload = uploadVideoToBucket as jest.MockedFunction<
  typeof uploadVideoToBucket
>;
const mockContextUpload = jest.fn();

describe('POST video/upload', () => {
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
        {
          provide: ContextUploader,
          useValue: { upload: (...args: any[]) => mockContextUpload(...args) },
        },
      ],
    }).compile();

    app = moduleRef.createNestApplication({ logger: false });
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    rmSync(TMP_PATH, { recursive: true, force: true });
  });

  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    mockFix.mockReset();
    mockUpload.mockReset();
    mockContextUpload.mockReset();
    // The conversion stand-in does not remove the upload the way the real one does.
    for (const name of readdirSync(TMP_PATH)) {
      rmSync(join(TMP_PATH, name), { force: true });
    }
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const upload = (contentType: string) =>
    request(app.getHttpServer())
      .post('/video/upload')
      .set({ Authorization: 'Bearer uid-owner' })
      .field('title', 'A video')
      .attach('blob', Buffer.from('not-a-video'), {
        filename: 'blob',
        contentType,
      });

  it('caps the upload at 1 GB, like POST video/upload/file', () => {
    const [Interceptor] = Reflect.getMetadata(
      INTERCEPTORS_METADATA,
      VideoController.prototype.uploadVideo,
    );
    expect(new Interceptor().multer.limits).toEqual({
      fileSize: 1024 * 1024 * 1024,
      files: 1,
      fields: 20,
      fieldSize: 64 * 1024,
      parts: 22,
    });
  });

  it('removes an upload of a media type it refuses (415)', async () => {
    await upload('application/x-not-a-video').expect(415);

    expect(mockFix).not.toHaveBeenCalled();
    expect(readdirSync(TMP_PATH)).toEqual([]);
  });

  it('removes an upload of a media type it refuses on POST video/upload/file too (415)', async () => {
    await request(app.getHttpServer())
      .post('/video/upload/file')
      .set({ Authorization: 'Bearer uid-owner', 'x-refresh-token': 'rt' })
      .field('title', 'A video')
      .attach('file', Buffer.from('not-a-video'), {
        filename: 'file',
        contentType: 'application/x-not-a-video',
      })
      .expect(415);

    expect(readdirSync(TMP_PATH)).toEqual([]);
  });

  const uploadFile = (headers: Record<string, string>) =>
    request(app.getHttpServer())
      .post('/video/upload/file')
      .set(headers)
      .field('title', 'A video')
      .attach('file', Buffer.from('not-a-video'), {
        filename: 'file',
        contentType: 'video/webm',
      });

  it('removes an upload on POST video/upload/file without a refresh token (401)', async () => {
    await uploadFile({ Authorization: 'Bearer uid-owner' }).expect(401);

    expect(mockContextUpload).not.toHaveBeenCalled();
    expect(readdirSync(TMP_PATH)).toEqual([]);
  });

  it('removes an upload on POST video/upload/file that no uploader took', async () => {
    // No uploader accepts the refresh token, so the pipeline answers nothing.
    mockContextUpload.mockResolvedValue(undefined);

    await uploadFile({
      Authorization: 'Bearer uid-owner',
      'x-refresh-token': 'rt',
    }).expect(201);

    expect(mockContextUpload).toHaveBeenCalledTimes(1);
    expect(readdirSync(TMP_PATH)).toEqual([]);
  });

  it('answers 500, not an empty 201, when the video cannot be converted', async () => {
    mockFix.mockRejectedValue(new Error('Invalid data found'));

    await upload('video/webm').expect(500);

    expect(mockFix).toHaveBeenCalledTimes(1);
    expect(mockUpload).not.toHaveBeenCalled();
    expect(readdirSync(TMP_PATH)).toEqual([]);
  });

  it('answers 500, not an empty 201, when the bucket was not written', async () => {
    mockFix.mockResolvedValue({ outputPath: join(TMP_PATH, 'x.webm') });
    mockUpload.mockResolvedValue(undefined);

    await upload('video/webm').expect(500);

    expect(mockUpload).toHaveBeenCalledTimes(1);
  });

  // The video editors send the trimmed video here. It was kept in API memory with no cap, so one
  // request could hold gigabytes; now it is written to disk like the other video uploads, capped
  // at 1 GB, streamed to the bucket and removed.
  describe('PUT video/single', () => {
    const replace = () =>
      request(app.getHttpServer())
        .put('/video/single')
        .set({ Authorization: 'Bearer uid-owner' })
        .field('refName', 'clip.webm')
        .attach('blob', Buffer.from('trimmed-video'), {
          filename: 'blob',
          contentType: 'video/webm',
        });

    beforeEach(() => {
      mockBucket.file.mockReset().mockImplementation((name: string) => ({
        name,
        getSignedUrl: async () => [`https://storage.example/${name}`],
      }));
      mockBucket.upload.mockReset().mockResolvedValue(undefined);
    });

    it('caps the upload at 1 GB and writes it to disk, like POST video/upload', () => {
      const [Interceptor, ...after] = Reflect.getMetadata(
        INTERCEPTORS_METADATA,
        VideoController.prototype.updateVideo,
      );
      const interceptor = new Interceptor();
      expect(interceptor.multer.limits).toEqual({
        fileSize: 1024 * 1024 * 1024,
        files: 1,
        fields: 20,
        fieldSize: 64 * 1024,
        parts: 22,
      });
      expect(interceptor.multer.storage.constructor.name).toBe('DiskStorage');
      expect(after.map((item) => item.name)).toEqual([
        'RemoveUploadInterceptor',
      ]);
    });

    it('streams the video from the API disk to the bucket and removes it', async () => {
      let written = '';
      mockBucket.upload.mockImplementation(async (path: string) => {
        written = readFileSync(path, 'utf8');
      });

      const response = await replace().expect(200);

      expect(response.text).toBe(
        'https://storage.example/users/uid-owner/videos/clip.webm',
      );
      expect(mockBucket.upload).toHaveBeenCalledTimes(1);
      const [path, options] = mockBucket.upload.mock.calls[0];
      expect(resolve(dirname(path))).toBe(resolve(TMP_PATH));
      expect(written).toBe('trimmed-video');
      expect(options.destination.name).toBe('users/uid-owner/videos/clip.webm');
      expect(readdirSync(TMP_PATH)).toEqual([]);
    });

    it('removes the upload when the bucket write fails', async () => {
      mockBucket.upload.mockRejectedValue(new Error('bucket down'));

      await replace().expect(500);

      expect(readdirSync(TMP_PATH)).toEqual([]);
    });

    it('answers 400 without a video', async () => {
      await request(app.getHttpServer())
        .put('/video/single')
        .set({ Authorization: 'Bearer uid-owner' })
        .field('refName', 'clip.webm')
        .expect(400);

      expect(mockBucket.upload).not.toHaveBeenCalled();
    });
  });

  // The web app and the extension send JSON here, never a form: the route has no upload to keep.
  describe('PUT video/single-data', () => {
    it('reads no upload', () => {
      expect(
        Reflect.getMetadata(
          INTERCEPTORS_METADATA,
          VideoController.prototype.updateVideoData,
        ),
      ).toBeUndefined();
    });

    it('still takes the JSON the clients send', async () => {
      const updateVideoData = jest
        .spyOn(VideoService.prototype, 'updateVideoData')
        .mockResolvedValue({ status: 'success' } as any);

      await request(app.getHttpServer())
        .put('/video/single-data')
        .set({ Authorization: 'Bearer uid-owner' })
        .send({ id: 'v1', title: 'New title', trash: false })
        .expect(200);

      expect(updateVideoData).toHaveBeenCalledWith(
        'uid-owner',
        'v1',
        undefined,
        false,
        undefined,
        'New title',
      );
    });
  });
});
