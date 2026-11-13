/**
 * The chapter routes take the workspace from `?workspaceId=`. They used to trust it, so any
 * signed-in user could read, rewrite or switch off the chapters of a video in a workspace they do
 * not belong to. Now a workspace id must belong to a workspace the user administers or is a member
 * of; no id (the personal library) is unchanged.
 *
 * The routes are the real controller behind the real `AuthGuard`; only the database, the token
 * check and the chapter service are replaced.
 */
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { TokenService } from '../../auth/services/tokens';
import { VideoChapterService } from '../services/chapter.service';
import { VideoChapterController } from './chapter.controller';

jest.mock('../../auth/services/tokens', () => ({ TokenService: class {} }));
jest.mock('../services/chapter.service', () => ({
  VideoChapterService: class {},
}));

const mockDb: { data: Record<string, unknown>; reads: string[] } = {
  data: {},
  reads: [],
};
jest.mock('firebase-admin', () => ({
  database: () => ({
    ref: (path: string) => ({
      get: async () => {
        mockDb.reads.push(path);
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

describe('VideoChapterController workspace access', () => {
  let app: INestApplication;
  const getChapters = jest.fn();
  const saveChapters = jest.fn();
  const enableChapters = jest.fn();

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [VideoChapterController],
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
        {
          provide: VideoChapterService,
          useValue: { getChapters, saveChapters, enableChapters },
        },
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
      'workspaces/ws1': {
        admin: 'uid-admin',
        members: [
          { id: 'uid-admin' },
          { id: 'uid-member' },
          { id: 'uid-reader' },
          { id: 'uid-teamer' },
        ],
        teams: [{ id: 'team1', members: [{ id: 'uid-teamer' }] }],
        folders: [
          {
            id: 'folderRead',
            access: { members: [{ uid: 'uid-member', access: 'READ' }] },
          },
        ],
        videos: {
          v1: { id: 'v1' },
          // The reader may only read it.
          vRead: {
            id: 'vRead',
            access: {
              members: [
                { uid: 'uid-reader', access: 'READ' },
                { uid: 'uid-member', access: 'WRITE' },
              ],
            },
          },
          // Restricted to a team the member is not in.
          vTeam: {
            id: 'vTeam',
            access: { teams: [{ teamId: 'team1', access: 'WRITE' }] },
          },
          // In a folder the member may only read.
          vInFolder: { id: 'vInFolder', parentId: 'folderRead' },
        },
      },
    };
    getChapters.mockReset().mockResolvedValue({ status: true, data: [] });
    saveChapters.mockReset().mockResolvedValue({ status: true, data: [] });
    enableChapters.mockReset().mockResolvedValue({ status: true });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const as = (uid: string) => ({ Authorization: `Bearer ${uid}` });
  const get = (uid: string, query: string, videoId = 'v1') =>
    request(app.getHttpServer())
      .get(`/video/chapter/${videoId}${query}`)
      .set(as(uid));
  const save = (uid: string, query: string, videoId = 'v1') =>
    request(app.getHttpServer())
      .post(`/video/chapter/save-changes/${videoId}${query}`)
      .set(as(uid))
      .field('chapters', '[]')
      .field('chaptersBlobs', '[]');
  const enable = (uid: string, query: string, videoId = 'v1') =>
    request(app.getHttpServer())
      .post(`/video/chapter/enable-chapters/${videoId}${query}`)
      .set(as(uid))
      .send({ chaptersEnabled: false });

  describe('a signed-in user who is not in the workspace', () => {
    it('cannot read the chapters', async () => {
      await get('uid-stranger', '?workspaceId=ws1').expect(403);
      expect(getChapters).not.toHaveBeenCalled();
    });

    it('cannot save chapters', async () => {
      await save('uid-stranger', '?workspaceId=ws1').expect(403);
      expect(saveChapters).not.toHaveBeenCalled();
    });

    it('cannot switch chapters on or off', async () => {
      await enable('uid-stranger', '?workspaceId=ws1').expect(403);
      expect(enableChapters).not.toHaveBeenCalled();
    });

    it('gets 403 for a workspace that does not exist', async () => {
      await get('uid-member', '?workspaceId=missing').expect(403);
      expect(getChapters).not.toHaveBeenCalled();
    });

    it('gets 403, without a database read, for an id that is not a plain id', async () => {
      await get('uid-member', '?workspaceId=ws1%2Fmembers').expect(403);
      expect(mockDb.reads).toEqual([]);
    });

    it('gets 403 when the workspace id is repeated', async () => {
      await get('uid-member', '?workspaceId=ws1&workspaceId=ws1').expect(403);
      expect(getChapters).not.toHaveBeenCalled();
    });
  });

  describe('a workspace member and the admin', () => {
    it('can read the chapters', async () => {
      await get('uid-member', '?workspaceId=ws1').expect(200);
      expect(getChapters).toHaveBeenCalledWith('uid-member', 'v1', 'ws1');
    });

    it('can save chapters', async () => {
      await save('uid-member', '?workspaceId=ws1').expect(201);
      expect(saveChapters).toHaveBeenCalledTimes(1);
    });

    it('the admin can switch chapters off', async () => {
      await enable('uid-admin', '?workspaceId=ws1').expect(201);
      expect(enableChapters).toHaveBeenCalledWith(
        'uid-admin',
        'v1',
        false,
        'ws1',
      );
    });
  });

  describe('the permissions of the video itself', () => {
    it('let a member who may only read the video read its chapters', async () => {
      await get('uid-reader', '?workspaceId=ws1', 'vRead').expect(200);
      expect(getChapters).toHaveBeenCalledTimes(1);
    });

    it('refuse to save or switch chapters for a member who may only read the video', async () => {
      await save('uid-reader', '?workspaceId=ws1', 'vRead').expect(403);
      await enable('uid-reader', '?workspaceId=ws1', 'vRead').expect(403);
      expect(saveChapters).not.toHaveBeenCalled();
      expect(enableChapters).not.toHaveBeenCalled();
    });

    it('let a member who may write the video save its chapters', async () => {
      await save('uid-member', '?workspaceId=ws1', 'vRead').expect(201);
      expect(saveChapters).toHaveBeenCalledTimes(1);
    });

    it('refuse a member who is in none of the teams the video lists', async () => {
      await get('uid-member', '?workspaceId=ws1', 'vTeam').expect(403);
      await save('uid-member', '?workspaceId=ws1', 'vTeam').expect(403);
      expect(getChapters).not.toHaveBeenCalled();
      expect(saveChapters).not.toHaveBeenCalled();
    });

    it('let a member of a listed team with WRITE save its chapters', async () => {
      await save('uid-teamer', '?workspaceId=ws1', 'vTeam').expect(201);
      expect(saveChapters).toHaveBeenCalledTimes(1);
    });

    it('refuse to save chapters of a video in a folder the member may only read', async () => {
      await save('uid-member', '?workspaceId=ws1', 'vInFolder').expect(403);
      expect(saveChapters).not.toHaveBeenCalled();
    });

    it('refuse a video id that matches no video of the workspace, for the admin too', async () => {
      await get('uid-admin', '?workspaceId=ws1', 'missing').expect(403);
      await enable('uid-admin', '?workspaceId=ws1', 'missing').expect(403);
      expect(getChapters).not.toHaveBeenCalled();
      expect(enableChapters).not.toHaveBeenCalled();
    });

    it('let the workspace admin save chapters of any video', async () => {
      await save('uid-admin', '?workspaceId=ws1', 'vTeam').expect(201);
      expect(saveChapters).toHaveBeenCalledTimes(1);
    });
  });

  describe('the personal library (no workspace id)', () => {
    it.each(['', '?workspaceId='])(
      'still works for any signed-in user with query "%s"',
      async (query) => {
        await get('uid-stranger', query).expect(200);
        await save('uid-stranger', query).expect(201);
        await enable('uid-stranger', query).expect(201);
        expect(mockDb.reads).toEqual([]);
      },
    );
  });

  it('gives an anonymous request 401', async () => {
    await request(app.getHttpServer())
      .get('/video/chapter/v1?workspaceId=ws1')
      .expect(401);
    expect(getChapters).not.toHaveBeenCalled();
  });
});
