/**
 * The view-info routes of shared videos used to trust the whole body (viewer, address, item path).
 * Now the body only names the share link or the item, and the viewer and the address come from
 * the request itself: anything else a caller puts in the body changes nothing. The workspace flag
 * is a real boolean (`'false'` is false) on every route that takes it.
 *
 * The routes are the real controller behind the real pipes; only the sign-in check and the
 * services are replaced.
 */
import { ConfigService } from '@nestjs/config';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { HttpService } from 'nestjs-http-promise';
import request from 'supertest';
import { FoldersSharedService } from '../../services/shared/folders.shared.service';
import { SharedService } from '../../services/shared/shared.service';
import { UniqueViewsSharedService } from '../../services/shared/uniqueViews.shared.service';
import { UserGuard } from '../auth/guards/user.guard';
import { TokenService } from '../auth/services/tokens';
import { ContextUploader } from './services/uploader/context.uploader';
import { VideoController } from './video.controller';
import { VideoService } from './video.service';

jest.mock('firebase/compat/auth', () => ({}));
jest.mock('firebase/compat/firestore', () => ({}));
jest.mock('firebase-admin', () => ({ database: () => ({}) }));
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

describe('VideoController view-info routes', () => {
  let app: INestApplication;
  const addUniqueView = jest.fn();
  const getUniqueView = jest.fn();
  const getVideoBySharedId = jest.fn();
  const getSharedItemBySharedId = jest.fn();
  const likeItem = jest.fn();

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
        { provide: VideoService, useValue: { getVideoBySharedId } },
        {
          provide: SharedService,
          useValue: { getSharedItemBySharedId, likeItem },
        },
        { provide: FoldersSharedService, useValue: {} },
        {
          provide: UniqueViewsSharedService,
          useValue: { addUniqueView, getUniqueView },
        },
        { provide: ContextUploader, useValue: {} },
      ],
    })
      // The optional sign-in: the test says who is calling with the `x-user` header.
      .overrideGuard(UserGuard)
      .useValue({
        canActivate: (context: any) => {
          const req = context.switchToHttp().getRequest();
          const id = req.headers['x-user'];
          req.user = id ? { id, email: `${id}@example.com` } : null;
          return true;
        },
      })
      .compile();

    app = moduleRef.createNestApplication({ logger: false });
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    addUniqueView.mockReset().mockResolvedValue({ data: { views: 1 } });
    getUniqueView.mockReset().mockResolvedValue({ data: { views: 1 } });
    getVideoBySharedId.mockReset().mockResolvedValue({});
    getSharedItemBySharedId.mockReset().mockResolvedValue({
      uid: 'uid-owner',
      videoId: 'vid1',
      itemId: 'wvid1',
      workspaceId: 'ws1',
    });
    likeItem.mockReset().mockResolvedValue({});
  });

  // Everything a caller might try to smuggle in through the body.
  const spoof = {
    user: { id: 'uid-victim', email: 'victim@example.com' },
    ip: '6.6.6.6',
    itemData: { uid: 'uid-victim', id: 'vid9', workspaceIds: ['ws-victim'] },
    itemType: 'image',
    uid: 'uid-victim',
    workspaceIds: ['ws-victim'],
  };

  describe('POST shared/view-info', () => {
    it('uses the share link from the body and the viewer and address of the request', async () => {
      await request(app.getHttpServer())
        .post('/video/shared/view-info')
        .set('x-user', 'uid-guest')
        .set('x-forwarded-for', '10.0.0.1, 10.0.0.2')
        .send({ ...spoof, sharedId: 'link1', isWorkspace: false })
        .expect(201);

      expect(addUniqueView).toHaveBeenCalledTimes(1);
      expect(addUniqueView).toHaveBeenCalledWith({
        sharedId: 'link1',
        itemType: 'video',
        isWorkspace: false,
        viewer: { id: 'uid-guest', email: 'uid-guest@example.com' },
        ip: '10.0.0.1',
      });
    });

    it('records an anonymous viewer as anonymous, whatever user the body names', async () => {
      await request(app.getHttpServer())
        .post('/video/shared/view-info')
        .send({ ...spoof, sharedId: 'link1' })
        .expect(201);

      const call = addUniqueView.mock.calls[0][0];
      expect(call.viewer).toBeNull();
      expect(call.ip).not.toBe('6.6.6.6');
      expect(JSON.stringify(call)).not.toContain('victim');
    });

    it.each([
      [true, true],
      ['true', true],
      [false, false],
      ['false', false],
      ['0', false],
      [1, false],
      [undefined, false],
    ])('reads the workspace flag %p as %p', async (sent, expected) => {
      await request(app.getHttpServer())
        .post('/video/shared/view-info')
        .send({ sharedId: 'link1', isWorkspace: sent })
        .expect(201);

      expect(addUniqueView.mock.calls[0][0].isWorkspace).toBe(expected);
    });
  });

  describe('POST shared/get-view-info', () => {
    it('asks as the caller of the request, never as the user the body names', async () => {
      await request(app.getHttpServer())
        .post('/video/shared/get-view-info')
        .set('x-user', 'uid-stranger')
        .send({
          ...spoof,
          itemId: 'vid1',
          workspaceId: 'ws1',
          isWorkspace: 'false',
        })
        .expect(201);

      expect(getUniqueView).toHaveBeenCalledWith({
        itemType: 'video',
        sharedId: undefined,
        itemId: 'vid1',
        workspaceId: 'ws1',
        isWorkspace: false,
        userId: 'uid-stranger',
      });
    });

    it('asks as nobody without a sign-in', async () => {
      await request(app.getHttpServer())
        .post('/video/shared/get-view-info')
        .send({ ...spoof, sharedId: 'link1' })
        .expect(201);

      expect(getUniqueView.mock.calls[0][0].userId).toBeNull();
    });
  });

  describe('the workspace flag of the query routes', () => {
    it.each([
      ['true', true],
      ['false', false],
      ['', false],
      ['1', false],
    ])('GET shared/single: ?isWorkspace=%p is %p', async (sent, expected) => {
      await request(app.getHttpServer())
        .get(`/video/shared/single/link1?isWorkspace=${sent}`)
        .expect(200);

      expect(getVideoBySharedId).toHaveBeenCalledWith('link1', expected);
    });

    it('GET shared/single: no flag is false', async () => {
      await request(app.getHttpServer())
        .get('/video/shared/single/link1')
        .expect(200);

      expect(getVideoBySharedId).toHaveBeenCalledWith('link1', false);
    });

    it('POST :sharedId/like: ?isWorkspace=false likes the personal video, not the workspace one', async () => {
      await request(app.getHttpServer())
        .post('/video/link1/like?isWorkspace=false')
        .set('Authorization', 'Bearer uid-member')
        .expect(201);

      expect(getSharedItemBySharedId).toHaveBeenCalledWith(
        'video',
        'link1',
        false,
      );
      expect(likeItem.mock.calls[0][1]).toBe('vid1');
    });

    it('POST :sharedId/like: ?isWorkspace=true likes the workspace item', async () => {
      await request(app.getHttpServer())
        .post('/video/link1/like?isWorkspace=true')
        .set('Authorization', 'Bearer uid-member')
        .expect(201);

      expect(getSharedItemBySharedId).toHaveBeenCalledWith(
        'video',
        'link1',
        true,
      );
      expect(likeItem.mock.calls[0][1]).toBe('wvid1');
    });
  });
});
