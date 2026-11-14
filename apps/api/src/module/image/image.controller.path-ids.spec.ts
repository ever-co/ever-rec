/**
 * Ids taken from the path of the image routes went straight into database paths. Now every path id
 * must be a plain id (400), and sharing a personal image needs an existing image of the caller (404).
 *
 * The routes are the real controller behind the real guards and pipes; only the token check and
 * the services are replaced.
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
import { ImageController } from './image.controller';
import { ImageService } from './image.service';
import { ContextUploader } from './uploader/context.uploader';

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
jest.mock('./uploader/context.uploader', () => ({
  ContextUploader: class {},
}));
jest.mock('./image.service', () => ({ ImageService: class {} }));

describe('ImageController path ids', () => {
  let app: INestApplication;
  const share = jest.fn();
  const assertOwnImageExists = jest.fn();
  const getImageByIdPrivate = jest.fn();
  const getItemById = jest.fn();
  const likeItem = jest.fn();
  const getSharedItemBySharedId = jest.fn();

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [ImageController],
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
          provide: ImageService,
          useValue: { share, assertOwnImageExists, getImageByIdPrivate },
        },
        {
          provide: SharedService,
          useValue: { getItemById, likeItem, getSharedItemBySharedId },
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
    share.mockReset().mockResolvedValue('link');
    assertOwnImageExists.mockReset().mockResolvedValue(undefined);
    getImageByIdPrivate.mockReset().mockResolvedValue({});
    getItemById.mockReset().mockResolvedValue({});
    likeItem.mockReset();
    getSharedItemBySharedId.mockReset();
  });

  const as = (uid: string) => ({ Authorization: `Bearer ${uid}` });

  it.each([
    ['get', '/image/single/a%2Fb'],
    ['get', '/image/editor/a.b'],
    ['get', '/image/api/a%2Fb'],
    ['get', '/image/folder/a%2Fb'],
    ['get', '/image/share/a%2Fb'],
    ['delete', '/image/deleteLink/a%2Fb'],
    ['delete', '/image/deleteLinkById/a%2Fb'],
    ['delete', '/image/user/own%2Fer/i1/comments/c1'],
    ['delete', '/image/user/uid-member/a%2Fb/comments/c1'],
    ['delete', '/image/user/uid-member/i1/comments/a%2Fb'],
    ['put', '/image/user/uid-member/i1/comment/a%2Fb'],
    ['post', '/image/own%2Fer/comment'],
    ['post', '/image/a%2Fb/like'],
    ['post', '/image/folders/a%2Fb/favorite'],
  ])('%s %s is refused with 400', async (method, url) => {
    await (request(app.getHttpServer()) as any)
      [method](url)
      .set(as('uid-member'))
      .send({})
      .expect(400);
    expect(getImageByIdPrivate).not.toHaveBeenCalled();
    expect(getItemById).not.toHaveBeenCalled();
    expect(assertOwnImageExists).not.toHaveBeenCalled();
    expect(share).not.toHaveBeenCalled();
    expect(likeItem).not.toHaveBeenCalled();
  });

  it('still serves a plain id', async () => {
    await request(app.getHttpServer())
      .get('/image/single/Ab_c-123')
      .set(as('uid-member'))
      .expect(200);
    expect(getImageByIdPrivate).toHaveBeenCalledWith(
      'uid-member',
      'Ab_c-123',
      'get',
    );
  });

  describe('sharing a personal image', () => {
    it('creates the link when the image exists', async () => {
      await request(app.getHttpServer())
        .get('/image/share/i1')
        .set(as('uid-member'))
        .expect(200);
      expect(assertOwnImageExists).toHaveBeenCalledWith('uid-member', 'i1');
      expect(share).toHaveBeenCalledWith('uid-member', 'i1');
    });

    it('is refused, and no link is created, when the image does not exist', async () => {
      assertOwnImageExists.mockRejectedValue(new NotFoundException());
      await request(app.getHttpServer())
        .get('/image/share/missing')
        .set(as('uid-member'))
        .expect(404);
      expect(share).not.toHaveBeenCalled();
    });
  });
});
