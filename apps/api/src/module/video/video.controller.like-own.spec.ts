/**
 * `POST video/:videoId/like-own` takes the workspace from the body. Only a member of that
 * workspace may like a video in it; anything else is refused before the like is written, and
 * without a workspace the like goes to the caller's own video as before.
 */
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { UserGuard } from '../auth/guards/user.guard';
import { TokenService } from '../auth/services/tokens';
import { SharedService } from '../../services/shared/shared.service';
import { FoldersSharedService } from '../../services/shared/folders.shared.service';
import { UniqueViewsSharedService } from '../../services/shared/uniqueViews.shared.service';
import { ContextUploader } from './services/uploader/context.uploader';
import { VideoService } from './video.service';
import { VideoController } from './video.controller';

jest.mock('../auth/services/tokens', () => ({ TokenService: class {} }));
jest.mock('./video.service', () => ({ VideoService: class {} }));
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

const mockDb: { data: Record<string, unknown> } = { data: {} };
jest.mock('firebase-admin', () => ({
  database: () => ({
    ref: (path: string) => ({
      get: async () => {
        const [root, id, child] = path.split('/');
        const workspace = mockDb.data[`${root}/${id}`] as
          | Record<string, unknown>
          | undefined;
        const value = child ? workspace?.[child] : workspace;
        return { val: () => value ?? null };
      },
    }),
  }),
}));

describe('POST video/:videoId/like-own', () => {
  let app: INestApplication;
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
        { provide: SharedService, useValue: { likeItem } },
        { provide: VideoService, useValue: {} },
        { provide: FoldersSharedService, useValue: {} },
        { provide: UniqueViewsSharedService, useValue: {} },
        { provide: ContextUploader, useValue: {} },
      ],
    })
      // Another route of this controller uses UserGuard, whose own dependencies are not needed here.
      .overrideGuard(UserGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleRef.createNestApplication({ logger: false });
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    mockDb.data = {
      'workspaces/ws1': {
        admin: 'uid-admin',
        members: [{ id: 'uid-admin' }, { id: 'uid-member' }],
        // The route also needs READ on the video (see video.controller.path-ids.spec.ts).
        videos: { vid1: { id: 'vid1' } },
      },
    };
    likeItem.mockReset().mockResolvedValue({ status: 'success', data: [] });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const like = (uid: string, body: unknown) =>
    request(app.getHttpServer())
      .post('/video/vid1/like-own')
      .set({ Authorization: `Bearer ${uid}` })
      .send(body as object);

  it('refuses a user who is not a member of the workspace in the body', async () => {
    await like('uid-stranger', { workspaceId: 'ws1' }).expect(403);
    expect(likeItem).not.toHaveBeenCalled();
  });

  it('refuses a workspace that does not exist and an id that is not a plain id', async () => {
    await like('uid-member', { workspaceId: 'missing' }).expect(403);
    await like('uid-member', { workspaceId: 'ws1/members' }).expect(403);
    await like('uid-member', { workspaceId: { a: 1 } }).expect(403);
    expect(likeItem).not.toHaveBeenCalled();
  });

  it('keeps letting a member and the admin like in their workspace', async () => {
    await like('uid-member', { workspaceId: 'ws1' }).expect(201);
    await like('uid-admin', { workspaceId: 'ws1' }).expect(201);
    expect(likeItem).toHaveBeenCalledWith(
      'video',
      'vid1',
      'uid-member',
      'uid-member',
      'ws1',
    );
  });

  it("keeps liking the caller's own video when no workspace is sent", async () => {
    await like('uid-stranger', {}).expect(201);
    await like('uid-stranger', { workspaceId: '' }).expect(201);
    expect(likeItem).toHaveBeenNthCalledWith(
      1,
      'video',
      'vid1',
      'uid-stranger',
      'uid-stranger',
      undefined,
    );
    expect(likeItem).toHaveBeenNthCalledWith(
      2,
      'video',
      'vid1',
      'uid-stranger',
      'uid-stranger',
      undefined,
    );
  });
});
