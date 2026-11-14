/**
 * `get-status/:videoId/:assetId` of both streaming providers, with the real guards. The route
 * writes the playback status under the video's `streamData`, so a caller may only reach a video
 * of their own, or one of a workspace they belong to with READ on it; ids that are not plain ids
 * and videos that do not exist are refused before anything is written.
 */
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { TokenService } from '../../auth/services/tokens';
import { MuxController } from '../mux/mux.controller';
import { MuxService } from '../mux/mux.service';
import { ApiVideoController } from '../api-video/api-video.controller';
import { ApiVideoService } from '../api-video/api-video.service';

jest.mock('../../auth/services/tokens', () => ({ TokenService: class {} }));
jest.mock('../mux/mux.service', () => ({ MuxService: class {} }));
jest.mock('../api-video/api-video.service', () => ({
  ApiVideoService: class {},
}));

const mockDb: { data: Record<string, any> } = { data: {} };
jest.mock('firebase-admin', () => ({
  database: () => ({
    ref: (path: string) => ({
      get: async () => {
        let value: any = mockDb.data;
        for (const segment of path.split('/').filter(Boolean)) {
          value = value?.[segment];
        }
        return { val: () => value ?? null };
      },
    }),
  }),
}));

describe.each([
  ['mux', '/mux', MuxController, MuxService],
  ['api.video', '/api.video', ApiVideoController, ApiVideoService],
] as const)('%s get-status route', (_name, prefix, controller, service) => {
  let app: INestApplication;
  const getPlaybackStatus = jest.fn();

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [controller],
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
        { provide: service, useValue: { getPlaybackStatus } },
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
    mockDb.data = {
      users: {
        'uid-owner': { videos: { vid1: { id: 'vid1' } } },
      },
      workspaces: {
        ws1: {
          admin: 'uid-admin',
          members: [
            { id: 'uid-admin' },
            { id: 'uid-writer' },
            { id: 'uid-reader' },
          ],
          videos: {
            open: { id: 'open' },
            restricted: {
              id: 'restricted',
              access: {
                members: [
                  { uid: 'uid-writer', access: 'WRITE' },
                  { uid: 'uid-reader', access: 'READ' },
                ],
              },
            },
          },
        },
        ws2: {
          admin: 'uid-other',
          members: [{ id: 'uid-other' }],
          videos: { theirs: { id: 'theirs' } },
        },
      },
    };
    getPlaybackStatus.mockReset().mockResolvedValue({ data: 'ready' });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const status = (uid: string, videoId: string, query = '', assetId = 'a1') =>
    request(app.getHttpServer())
      .get(`${prefix}/get-status/${videoId}/${assetId}${query}`)
      .set({ Authorization: `Bearer ${uid}` });

  it('lets a user check the status of their own video', async () => {
    await status('uid-owner', 'vid1').expect(200);
    expect(getPlaybackStatus).toHaveBeenCalledWith(
      'uid-owner',
      'vid1',
      'a1',
      undefined,
    );
    await status('uid-owner', 'vid1', '?workspaceId=').expect(200);
  });

  it("refuses another user's video and a video that does not exist", async () => {
    await status('uid-stranger', 'vid1').expect(403);
    await status('uid-owner', 'nope').expect(403);
    expect(getPlaybackStatus).not.toHaveBeenCalled();
  });

  it('refuses ids that are not plain ids', async () => {
    await status('uid-owner', 'vid1%2Fstreams', '', 'a1').expect(400);
    await status('uid-owner', 'vid1', '', 'a1.b').expect(400);
    await status('uid-owner', 'vid1', '', 'a1%24x').expect(400);
    await status('uid-owner', 'vid1', '?workspaceId=ws1%2Fvideos').expect(403);
    await status('uid-owner', 'vid1', '?workspaceId=a&workspaceId=b').expect(
      403,
    );
    expect(getPlaybackStatus).not.toHaveBeenCalled();
  });

  it('refuses a workspace the caller does not belong to', async () => {
    await status('uid-stranger', 'open', '?workspaceId=ws1').expect(403);
    await status('uid-writer', 'theirs', '?workspaceId=ws2').expect(403);
    expect(getPlaybackStatus).not.toHaveBeenCalled();
  });

  it('refuses a video that is not in the workspace, so no record is created', async () => {
    await status('uid-writer', 'missing', '?workspaceId=ws1').expect(403);
    await status('uid-writer', 'theirs', '?workspaceId=ws1').expect(403);
    await status('uid-writer', 'vid1', '?workspaceId=ws1').expect(403);
    expect(getPlaybackStatus).not.toHaveBeenCalled();
  });

  it('refuses a member who has no access to the video', async () => {
    await status('uid-reader', 'open', '?workspaceId=missing').expect(403);
    mockDb.data.workspaces.ws1.videos.restricted.access.members = [
      { uid: 'uid-writer', access: 'WRITE' },
    ];
    await status('uid-reader', 'restricted', '?workspaceId=ws1').expect(403);
    expect(getPlaybackStatus).not.toHaveBeenCalled();
  });

  it('lets members with READ and the admin through in the workspace', async () => {
    await status('uid-reader', 'restricted', '?workspaceId=ws1').expect(200);
    await status('uid-writer', 'open', '?workspaceId=ws1').expect(200);
    await status('uid-admin', 'restricted', '?workspaceId=ws1').expect(200);
    expect(getPlaybackStatus).toHaveBeenCalledTimes(3);
    expect(getPlaybackStatus).toHaveBeenCalledWith(
      'uid-reader',
      'restricted',
      'a1',
      'ws1',
    );
  });
});
