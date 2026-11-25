/**
 * Ids taken from the path of the video routes went straight into database paths, so an encoded
 * slash (`a%2Fb`) reached a nested field, and `like-own` on a workspace video only needed
 * membership of the workspace, not access to the video. Now every path id must be a plain id
 * (400), and `like-own` on a workspace video needs READ on the video and on its folder (403).
 * Sharing a personal video needs an existing video of the caller (404).
 *
 * The routes are the real controller behind the real guards and pipes; only the database, the
 * token check and the services are replaced.
 */
import { ConfigService } from '@nestjs/config';
import { INestApplication, NotFoundException } from '@nestjs/common';
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

jest.mock('firebase/compat/auth', () => ({}));
jest.mock('firebase/compat/firestore', () => ({}));
jest.mock('../auth/services/tokens', () => ({ TokenService: class {} }));
jest.mock('../../services/shared/folders.shared.service', () => ({
  FoldersSharedService: class {},
}));
jest.mock('../../services/shared/shared.service', () => ({
  SharedService: class {},
}));
jest.mock('../../services/shared/uniqueViews.shared.service', () => ({
  UniqueViewsSharedService: class {},
}));
jest.mock('./services/uploader/context.uploader', () => ({
  ContextUploader: class {},
}));
jest.mock('./video.service', () => ({ VideoService: class {} }));

const mockDb: { data: Record<string, any>; reads: string[] } = {
  data: {},
  reads: [],
};
jest.mock('firebase-admin', () => ({
  database: () => ({
    ref: (path: string) => ({
      get: async () => {
        mockDb.reads.push(path);
        const value = path
          .split('/')
          .filter(Boolean)
          .reduce((node, key) => node?.[key], mockDb.data as any);
        return { val: () => value ?? null };
      },
    }),
  }),
}));

describe('VideoController path ids', () => {
  let app: INestApplication;
  const likeItem = jest.fn();
  const getItemById = jest.fn();
  const share = jest.fn();
  const assertOwnVideoExists = jest.fn();
  const getVideoByIdPrivate = jest.fn();

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
          useValue: { share, assertOwnVideoExists, getVideoByIdPrivate },
        },
        {
          provide: SharedService,
          useValue: { likeItem, getItemById },
        },
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
    mockDb.reads = [];
    mockDb.data = {
      workspaces: {
        ws1: {
          admin: 'uid-admin',
          members: [
            { id: 'uid-admin' },
            { id: 'uid-member' },
            { id: 'uid-reader' },
            { id: 'uid-writer' },
          ],
          folders: [
            {
              id: 'folderPrivate',
              access: { members: [{ uid: 'uid-writer', access: 'READ' }] },
            },
          ],
          videos: {
            v1: { id: 'v1' },
            vRestricted: {
              id: 'vRestricted',
              access: {
                members: [
                  { uid: 'uid-reader', access: 'READ' },
                  { uid: 'uid-writer', access: 'WRITE' },
                ],
              },
            },
            vInFolder: { id: 'vInFolder', parentId: 'folderPrivate' },
          },
        },
      },
    };
    likeItem.mockReset().mockResolvedValue({ status: true, data: [] });
    getItemById.mockReset().mockResolvedValue({});
    share.mockReset().mockResolvedValue('link');
    assertOwnVideoExists.mockReset().mockResolvedValue(undefined);
    getVideoByIdPrivate.mockReset().mockResolvedValue({});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const as = (uid: string) => ({ Authorization: `Bearer ${uid}` });
  const likeOwn = (uid: string, videoId: string, body?: object) =>
    request(app.getHttpServer())
      .post(`/video/${videoId}/like-own`)
      .set(as(uid))
      .send(body ?? {});

  describe('like-own with a path id that is not a plain id', () => {
    const badIds = [
      'a%2Fb',
      'v1%2Faccess',
      'v1%2F..%2Fother',
      'a.b',
      'v1%00',
      'v1%20',
    ];

    it.each(badIds)('is refused in the personal library: %s', async (id) => {
      await likeOwn('uid-member', id).expect(400);
      expect(likeItem).not.toHaveBeenCalled();
    });

    it.each(badIds)('is refused in a workspace: %s', async (id) => {
      await likeOwn('uid-admin', id, { workspaceId: 'ws1' }).expect(403);
      expect(likeItem).not.toHaveBeenCalled();
    });
  });

  describe('like-own with a workspace id that is not a plain id', () => {
    it.each(['ws1/members', 'ws1/videos/v1', '..', 'ws1.x'])(
      'is refused, without a database read: %s',
      async (workspaceId) => {
        await likeOwn('uid-admin', 'v1', { workspaceId }).expect(403);
        expect(mockDb.reads).toEqual([]);
        expect(likeItem).not.toHaveBeenCalled();
      },
    );

    it.each([[{ a: 1 }], [['ws1']], [5], [true]])(
      'is refused when it is not a string: %j',
      async (workspaceId) => {
        await likeOwn('uid-admin', 'v1', { workspaceId }).expect(403);
        expect(likeItem).not.toHaveBeenCalled();
      },
    );
  });

  describe('like-own on a workspace video', () => {
    it('is refused for someone who is not in the workspace', async () => {
      await likeOwn('uid-stranger', 'v1', { workspaceId: 'ws1' }).expect(403);
      expect(likeItem).not.toHaveBeenCalled();
    });

    it('is refused for a video id that matches no video of the workspace', async () => {
      await likeOwn('uid-admin', 'missing', { workspaceId: 'ws1' }).expect(403);
      expect(likeItem).not.toHaveBeenCalled();
    });

    it('is refused for a member with no access to a restricted video', async () => {
      await likeOwn('uid-member', 'vRestricted', {
        workspaceId: 'ws1',
      }).expect(403);
      expect(likeItem).not.toHaveBeenCalled();
    });

    it('is refused for a member who may read the video but not its folder', async () => {
      await likeOwn('uid-member', 'vInFolder', { workspaceId: 'ws1' }).expect(
        403,
      );
      expect(likeItem).not.toHaveBeenCalled();
    });

    it('works for a member of a video without its own permissions', async () => {
      await likeOwn('uid-member', 'v1', { workspaceId: 'ws1' }).expect(201);
      expect(likeItem).toHaveBeenCalledWith(
        'video',
        'v1',
        'uid-member',
        'uid-member',
        'ws1',
      );
    });

    it('works for a reader and for a writer of a restricted video', async () => {
      await likeOwn('uid-reader', 'vRestricted', { workspaceId: 'ws1' }).expect(
        201,
      );
      await likeOwn('uid-writer', 'vRestricted', { workspaceId: 'ws1' }).expect(
        201,
      );
      expect(likeItem).toHaveBeenCalledTimes(2);
    });

    it('works for a member who may read the folder of the video', async () => {
      await likeOwn('uid-writer', 'vInFolder', { workspaceId: 'ws1' }).expect(
        201,
      );
      expect(likeItem).toHaveBeenCalledTimes(1);
    });

    it('works for the workspace admin on any video', async () => {
      await likeOwn('uid-admin', 'vRestricted', { workspaceId: 'ws1' }).expect(
        201,
      );
      await likeOwn('uid-admin', 'vInFolder', { workspaceId: 'ws1' }).expect(
        201,
      );
      expect(likeItem).toHaveBeenCalledTimes(2);
    });
  });

  describe('like-own in the personal library', () => {
    it.each([undefined, '', null])(
      'still works with workspace id %j and reads nothing from a workspace',
      async (workspaceId) => {
        await likeOwn('uid-stranger', 'v1', { workspaceId }).expect(201);
        expect(likeItem).toHaveBeenCalledWith(
          'video',
          'v1',
          'uid-stranger',
          'uid-stranger',
          undefined,
        );
        expect(mockDb.reads).toEqual([]);
      },
    );

    it('gives an anonymous request 401', async () => {
      await request(app.getHttpServer())
        .post('/video/v1/like-own')
        .send({})
        .expect(401);
      expect(likeItem).not.toHaveBeenCalled();
    });
  });

  describe('other routes with an id in the path', () => {
    it.each([
      ['get', '/video/single/a%2Fb'],
      ['get', '/video/api/a%2Fb'],
      ['get', '/video/getPosterRef/a.b'],
      ['get', '/video/folder/a%2Fb'],
      ['delete', '/video/deleteLink/a%2Fb'],
      ['delete', '/video/deleteLinkById/a%2Fb'],
      ['delete', '/video/user/own%2Fer/v1/comments/c1'],
      ['delete', '/video/user/uid-member/a%2Fb/comments/c1'],
      ['delete', '/video/user/uid-member/v1/comments/a%2Fb'],
      ['put', '/video/user/uid-member/v1/comment/a%2Fb'],
      ['post', '/video/own%2Fer/comment'],
      ['post', '/video/a%2Fb/like'],
      ['post', '/video/folders/a%2Fb/favorite'],
    ])('%s %s is refused with 400', async (method, url) => {
      await (request(app.getHttpServer()) as any)
        [method](url)
        .set(as('uid-member'))
        .send({})
        .expect(400);
      expect(getVideoByIdPrivate).not.toHaveBeenCalled();
      expect(getItemById).not.toHaveBeenCalled();
      expect(likeItem).not.toHaveBeenCalled();
    });

    it('still serves a plain id', async () => {
      await request(app.getHttpServer())
        .get('/video/single/Ab_c-123')
        .set(as('uid-member'))
        .expect(200);
      expect(getVideoByIdPrivate).toHaveBeenCalledWith(
        'uid-member',
        'Ab_c-123',
        'get',
      );
    });
  });

  describe('sharing a personal video', () => {
    it('creates the link when the video exists', async () => {
      await request(app.getHttpServer())
        .get('/video/share/v1')
        .set(as('uid-member'))
        .expect(200);
      expect(assertOwnVideoExists).toHaveBeenCalledWith('uid-member', 'v1');
      expect(share).toHaveBeenCalledWith('uid-member', 'v1');
    });

    it('is refused, and no link is created, when the video does not exist', async () => {
      assertOwnVideoExists.mockRejectedValue(new NotFoundException());
      await request(app.getHttpServer())
        .get('/video/share/missing')
        .set(as('uid-member'))
        .expect(404);
      expect(share).not.toHaveBeenCalled();
    });

    it('is refused for an id that is not a plain id, before any lookup', async () => {
      await request(app.getHttpServer())
        .get('/video/share/a%2Fb')
        .set(as('uid-member'))
        .expect(400);
      expect(assertOwnVideoExists).not.toHaveBeenCalled();
      expect(share).not.toHaveBeenCalled();
    });
  });
});
