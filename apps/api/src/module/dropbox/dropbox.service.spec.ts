/**
 * Saving to Dropbox and removing the copy, with the real service. Dropbox and the database are
 * mocked. Dropbox issues short-lived access tokens (sign-in asks for `offline` access), so an upload
 * a few hours after connecting meets `expired_access_token`: the service must refresh the token once,
 * retry once and answer the request either way. A delete must report what Dropbox did, and unlink a
 * copy the user already deleted in Dropbox itself.
 */
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Test } from '@nestjs/testing';
import { Readable } from 'stream';
import { ResStatusEnum } from '../../enums/ResStatusEnum';
import { OAuthStateService } from '../../services/shared/oauth-state.service';
import { createFakeRealtimeDb } from '../../services/shared/fake-realtime-db';
import { ImageService } from '../image/image.service';
import { VideoService } from '../video/video.service';
import { DropboxService } from './dropbox.service';

jest.mock('../image/image.service', () => ({ ImageService: class {} }));
jest.mock('../video/video.service', () => ({ VideoService: class {} }));

/** One call per Dropbox API request: (token, { resource, parameters, readStream }, callback). */
const mockApiCall = jest.fn();
/** One call per token refresh: (refreshToken, callback). */
const mockRefresh = jest.fn();
jest.mock('dropbox-v2-api', () => ({
  __esModule: true,
  default: {
    authenticate: (options: { token?: string }) => {
      // Like the real client: returns the request at once and calls back when Dropbox answers.
      const client: any = (opts: any, cb: (...args: any[]) => void) => {
        mockApiCall(options.token, opts, cb);
        return {};
      };
      client.refreshToken = (refreshToken: string, cb: (...a: any[]) => void) =>
        mockRefresh(refreshToken, cb);
      return client;
    },
  },
}));

const mockDb = createFakeRealtimeDb();
jest.mock('firebase-admin', () => ({
  database: (...args: any[]) => (mockDb.admin.database as any)(...args),
}));

const expiredToken = {
  error_summary: 'expired_access_token/',
  error: { '.tag': 'expired_access_token' },
  code: 401,
};

/** Reads the upload body the way the real client pipes it into the request. */
const readAll = async (stream: Readable) => {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString();
};

/** Fails instead of hanging when the service never answers. */
const answered = <T>(promise: Promise<T>, ms = 1000): Promise<T> => {
  let timer: NodeJS.Timeout;
  const timeout = new Promise<never>((_res, rej) => {
    timer = setTimeout(() => rej(new Error('the request never answered')), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
};

describe('DropboxService', () => {
  let service: DropboxService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        DropboxService,
        { provide: OAuthStateService, useValue: {} },
        {
          provide: ImageService,
          useValue: {
            getImageByIdPrivate: async () => ({
              dbData: { refName: 'shot.png' },
            }),
          },
        },
        { provide: VideoService, useValue: {} },
        { provide: ConfigService, useValue: { get: () => 'https://api.test' } },
        { provide: EventEmitter2, useValue: { emit: jest.fn() } },
      ],
    }).compile();

    service = moduleRef.get(DropboxService);
  });

  beforeEach(() => {
    mockDb.data = {
      users: {
        'uid-a': {
          dropboxAPISCredentials: {
            credentials: {
              access_token: 'old-token',
              refresh_token: 'refresh-a',
            },
            account_id: 'acc-a',
            email: 'a@example.com',
          },
          screenshots: { 'img-1': { title: 'Shot' } },
        },
      },
    };
    mockDb.writes = [];
    mockDb.staleReads = {};
    mockApiCall.mockReset();
    mockRefresh.mockReset();
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const credentials = () =>
    mockDb.data.users['uid-a'].dropboxAPISCredentials.credentials;

  describe('dropboxUploadFile', () => {
    const uploadRequest = () => ({
      user: { id: 'uid-a' },
      body: {
        itemId: 'img-1',
        itemType: 'image',
        name: 'Shot',
        blob: { buffer: Buffer.from('image-bytes') },
      },
    });

    const uploaded = {
      id: 'id:file-1',
      name: 'Shot.png',
      rev: 'rev-1',
      path_lower: '/shot.png',
    };

    it('refreshes an expired access token once, retries the upload and answers with its result', async () => {
      const bodies: string[] = [];
      mockApiCall.mockImplementation(async (token, opts, cb) => {
        bodies.push(await readAll(opts.readStream));
        if (token === 'old-token') {
          return cb(expiredToken, null);
        }
        return cb(null, uploaded);
      });
      mockRefresh.mockImplementation((_refreshToken, cb) =>
        cb(false, { access_token: 'new-token' }),
      );

      const result = await answered(service.dropboxUploadFile(uploadRequest()));

      expect(result).toMatchObject({
        status: ResStatusEnum.success,
        data: 'Shot.png',
      });
      expect(mockRefresh).toHaveBeenCalledTimes(1);
      expect(mockRefresh).toHaveBeenCalledWith(
        'refresh-a',
        expect.any(Function),
      );
      expect(mockApiCall.mock.calls.map(([token]) => token)).toEqual([
        'old-token',
        'new-token',
      ]);
      // The retry sends the whole file again, not a stream the first attempt already read.
      expect(bodies).toEqual(['image-bytes', 'image-bytes']);
      expect(credentials()).toEqual({
        access_token: 'new-token',
        refresh_token: 'refresh-a',
      });
      expect(
        mockDb.data.users['uid-a'].screenshots['img-1'].dropBoxData,
      ).toMatchObject({ id: 'id:file-1', path_lower: '/shot.png' });
    });

    it('answers with an error when the token cannot be refreshed', async () => {
      mockApiCall.mockImplementation(async (_token, opts, cb) => {
        await readAll(opts.readStream);
        return cb(expiredToken, null);
      });
      // The real client calls back twice when Dropbox refuses the refresh token.
      mockRefresh.mockImplementation((_refreshToken, cb) => {
        cb('invalid_grant');
        cb(false, { error: 'invalid_grant' });
      });

      const result = await answered(service.dropboxUploadFile(uploadRequest()));

      expect(result).toMatchObject({ status: ResStatusEnum.error, data: null });
      expect(mockApiCall).toHaveBeenCalledTimes(1);
      expect(credentials().access_token).toBe('old-token');
      expect(
        mockDb.data.users['uid-a'].screenshots['img-1'].dropBoxData,
      ).toBeUndefined();
    });

    it('answers with an error and refreshes only once when the retry fails too', async () => {
      mockApiCall.mockImplementation(async (_token, opts, cb) => {
        await readAll(opts.readStream);
        // Stop answering after a few calls so a retry loop cannot run forever.
        if (mockApiCall.mock.calls.length > 3) {
          return;
        }
        return cb(expiredToken, null);
      });
      mockRefresh.mockImplementation((_refreshToken, cb) =>
        cb(false, { access_token: 'new-token' }),
      );

      const result = await answered(service.dropboxUploadFile(uploadRequest()));

      expect(result).toMatchObject({ status: ResStatusEnum.error, data: null });
      expect(mockRefresh).toHaveBeenCalledTimes(1);
      expect(mockApiCall).toHaveBeenCalledTimes(2);
    });

    it('answers with an error when the file uploads but its link cannot be stored', async () => {
      mockApiCall.mockImplementation(async (_token, opts, cb) => {
        await readAll(opts.readStream);
        return cb(null, uploaded);
      });
      const database = mockDb.admin.database;
      jest.spyOn(mockDb.admin, 'database').mockImplementation(() => {
        const db = database();
        return {
          ref: (path: string) =>
            path.includes('/screenshots/')
              ? {
                  ...db.ref(path),
                  update: async () => {
                    throw new Error('write refused');
                  },
                }
              : db.ref(path),
        };
      });

      const result = await answered(service.dropboxUploadFile(uploadRequest()));

      expect(result).toMatchObject({ status: ResStatusEnum.error, data: null });
    });
  });

  describe('deleteFile', () => {
    const dropBoxData = {
      id: 'id:file-1',
      name: 'Shot.png',
      rev: 'rev-1',
      path_lower: '/shot.png',
      email: 'a@example.com',
    };

    const item = () => mockDb.data.users['uid-a'].screenshots['img-1'];

    beforeEach(() => {
      item().dropBoxData = { ...dropBoxData };
    });

    /** Dropbox's answer to a delete when the path holds no file, or not the revision Rec stored. */
    const deleteNotFound = {
      error_summary: 'path_lookup/not_found/..',
      error: { '.tag': 'path_lookup', path_lookup: { '.tag': 'not_found' } },
      code: 409,
    };

    /** Dropbox's answer to get_metadata when the path holds nothing. */
    const metadataNotFound = {
      error_summary: 'path/not_found/.',
      error: { '.tag': 'path', path: { '.tag': 'not_found' } },
      code: 409,
    };

    const requests = () =>
      mockApiCall.mock.calls.map(([token, opts]) => [token, opts.resource]);

    it.each([
      [
        'a lookup error other than not_found',
        {
          error_summary: 'path_lookup/restricted_content/',
          error: {
            '.tag': 'path_lookup',
            path_lookup: { '.tag': 'restricted_content' },
          },
          code: 409,
        },
        'path_lookup/restricted_content/',
      ],
      [
        'a write error',
        {
          error_summary: 'too_many_write_operations/',
          error: { '.tag': 'too_many_write_operations' },
          code: 409,
        },
        'too_many_write_operations/',
      ],
      ['a server error', { code: 500, text: 'Internal Server Error' }, 500],
      [
        'a network error',
        Object.assign(new Error('socket hang up'), { code: 'ECONNRESET' }),
        'ECONNRESET',
      ],
    ])(
      'reports an error and keeps the link when Dropbox answers %s',
      async (_case, dropboxError, reason) => {
        mockApiCall.mockImplementation((_token, _opts, cb) =>
          cb(dropboxError, null),
        );

        const result = await answered(
          service.deleteFile('uid-a', 'img-1', 'image'),
        );

        // The page shows the message in a toast: words, with Dropbox's reason kept in `error`.
        expect(result).toEqual({
          status: ResStatusEnum.error,
          message: 'Error while trying to delete the Dropbox file.',
          error: reason,
          data: null,
        });
        expect(requests()).toEqual([['old-token', 'files/delete_v2']]);
        expect(item().dropBoxData).toEqual(dropBoxData);
      },
    );

    it('unlinks the item and reports success when the file was already deleted in Dropbox', async () => {
      mockApiCall.mockImplementation((_token, opts, cb) =>
        opts.resource === 'files/delete_v2'
          ? cb(deleteNotFound, null)
          : cb(metadataNotFound, null),
      );

      const result = await answered(
        service.deleteFile('uid-a', 'img-1', 'image'),
      );

      expect(result).toEqual({
        status: ResStatusEnum.success,
        message: 'Dropbox file successfully deleted.',
        error: null,
        data: null,
      });
      expect(mockApiCall.mock.calls[1]).toEqual([
        'old-token',
        { resource: 'files/get_metadata', parameters: { path: '/shot.png' } },
        expect.any(Function),
      ]);
      expect(requests()).toEqual([
        ['old-token', 'files/delete_v2'],
        ['old-token', 'files/get_metadata'],
      ]);
      expect(item().dropBoxData).toBeUndefined();
    });

    it.each([
      [
        'the path still holds the file, in a newer revision',
        (cb: (...args: any[]) => void) =>
          cb(null, {
            '.tag': 'file',
            name: 'Shot.png',
            path_lower: '/shot.png',
            rev: 'rev-2',
          }),
      ],
      [
        'the lookup fails',
        (cb: (...args: any[]) => void) =>
          cb(
            Object.assign(new Error('socket hang up'), { code: 'ECONNRESET' }),
            null,
          ),
      ],
    ])(
      'reports an error and keeps the link when the delete finds nothing but %s',
      async (_case, answerLookup) => {
        mockApiCall.mockImplementation((_token, opts, cb) =>
          opts.resource === 'files/delete_v2'
            ? cb(deleteNotFound, null)
            : answerLookup(cb),
        );

        const result = await answered(
          service.deleteFile('uid-a', 'img-1', 'image'),
        );

        expect(result).toEqual({
          status: ResStatusEnum.error,
          message: 'Error while trying to delete the Dropbox file.',
          error: 'path_lookup/not_found/..',
          data: null,
        });
        expect(mockApiCall.mock.calls[1]?.[1]).toEqual({
          resource: 'files/get_metadata',
          parameters: { path: '/shot.png' },
        });
        expect(item().dropBoxData).toEqual(dropBoxData);
      },
    );

    it('refreshes an expired access token, then unlinks the item when the retry finds the file already deleted', async () => {
      mockApiCall.mockImplementation((token, opts, cb) => {
        if (token === 'old-token') {
          return cb(expiredToken, null);
        }
        return opts.resource === 'files/delete_v2'
          ? cb(deleteNotFound, null)
          : cb(metadataNotFound, null);
      });
      mockRefresh.mockImplementation((_refreshToken, cb) =>
        cb(false, { access_token: 'new-token' }),
      );

      const result = await answered(
        service.deleteFile('uid-a', 'img-1', 'image'),
      );

      expect(result).toMatchObject({
        status: ResStatusEnum.success,
        data: null,
      });
      expect(mockRefresh).toHaveBeenCalledTimes(1);
      expect(requests()).toEqual([
        ['old-token', 'files/delete_v2'],
        ['new-token', 'files/delete_v2'],
        ['new-token', 'files/get_metadata'],
      ]);
      expect(item().dropBoxData).toBeUndefined();
    });

    it('refreshes an expired access token once and deletes with the new one', async () => {
      const deleted = { metadata: { '.tag': 'file', name: 'Shot.png' } };
      mockApiCall.mockImplementation((token, _opts, cb) =>
        token === 'old-token' ? cb(expiredToken, null) : cb(null, deleted),
      );
      mockRefresh.mockImplementation((_refreshToken, cb) =>
        cb(false, { access_token: 'new-token' }),
      );

      const result = await answered(
        service.deleteFile('uid-a', 'img-1', 'image'),
      );

      expect(result).toMatchObject({
        status: ResStatusEnum.success,
        data: deleted,
      });
      expect(mockRefresh).toHaveBeenCalledTimes(1);
      expect(mockRefresh).toHaveBeenCalledWith(
        'refresh-a',
        expect.any(Function),
      );
      expect(mockApiCall.mock.calls.map(([token]) => token)).toEqual([
        'old-token',
        'new-token',
      ]);
      expect(credentials()).toEqual({
        access_token: 'new-token',
        refresh_token: 'refresh-a',
      });
      expect(item().dropBoxData).toBeUndefined();
    });

    it('reports an error and keeps the link when the expired token cannot be refreshed', async () => {
      mockApiCall.mockImplementation((_token, _opts, cb) =>
        cb(expiredToken, null),
      );
      mockRefresh.mockImplementation((_refreshToken, cb) => {
        cb('invalid_grant');
        cb(false, { error: 'invalid_grant' });
      });

      const result = await answered(
        service.deleteFile('uid-a', 'img-1', 'image'),
      );

      expect(result.status).toBe(ResStatusEnum.error);
      expect(mockRefresh).toHaveBeenCalledTimes(1);
      expect(mockApiCall).toHaveBeenCalledTimes(1);
      expect(credentials().access_token).toBe('old-token');
      expect(item().dropBoxData).toEqual(dropBoxData);
    });

    it('reports success with the Dropbox answer and clears the link when the delete succeeds', async () => {
      const deleted = { metadata: { '.tag': 'file', name: 'Shot.png' } };
      mockApiCall.mockImplementation((token, opts, cb) => {
        expect(token).toBe('old-token');
        expect(opts).toMatchObject({
          resource: 'files/delete_v2',
          parameters: { path: '/shot.png', parent_rev: 'rev-1' },
        });
        return cb(null, deleted);
      });

      const result = await service.deleteFile('uid-a', 'img-1', 'image');

      expect(result).toMatchObject({
        status: ResStatusEnum.success,
        data: deleted,
      });
      expect(item().dropBoxData).toBeUndefined();
    });

    it('reports an error when the item has no Dropbox copy', async () => {
      delete item().dropBoxData;

      const result = await service.deleteFile('uid-a', 'img-1', 'image');

      expect(result.status).toBe(ResStatusEnum.error);
      expect(mockApiCall).not.toHaveBeenCalled();
    });

    it('reports an error when the user has no Dropbox credentials', async () => {
      delete mockDb.data.users['uid-a'].dropboxAPISCredentials;

      const result = await service.deleteFile('uid-a', 'img-1', 'image');

      expect(result.status).toBe(ResStatusEnum.error);
      expect(mockApiCall).not.toHaveBeenCalled();
      expect(item().dropBoxData).toEqual(dropBoxData);
    });
  });
});
