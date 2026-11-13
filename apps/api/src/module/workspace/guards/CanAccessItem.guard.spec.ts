/**
 * `POST /workspace/:workspaceId/files/:workspaceId/save-original` names the image by its stored
 * file name in the body (`fullFileName`), not by an id in the URL. The item guard used to find no
 * item there and fell back to plain workspace membership, so any member could overwrite the
 * original of an image they only have read access to. The guard must now resolve the image from
 * the file name and apply the same WRITE rule as the other image-mutating routes.
 *
 * The routes are the real controller behind the real guards; only the database, the token check
 * and the services behind the handlers are replaced.
 */
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { TokenService } from '../../auth/services/tokens';
import { WorkspaceFilesController } from '../controllers/files.controller';
import { WorkspaceFilesService } from '../services/files.service';
import { WorkspaceSharedService } from '../services/shared.service';

// Only the classes are needed, as injection tokens; their own imports stay out of this test.
jest.mock('../../auth/services/tokens', () => ({ TokenService: class {} }));
jest.mock('../services/files.service', () => ({
  WorkspaceFilesService: class {},
}));
jest.mock('../services/shared.service', () => ({
  WorkspaceSharedService: class {},
}));

const mockDb: { data: Record<string, unknown> } = { data: {} };
jest.mock('firebase-admin', () => ({
  database: () => ({
    ref: (path: string) => ({
      get: async () => {
        // `workspaces/<id>` is stored whole; `workspaces/<id>/<child>` reads one child of it.
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

const SAVE_ORIGINAL_URL = '/workspace/ws1/files/ws1/save-original';

describe('save-original item permission', () => {
  let app: INestApplication;
  const saveOriginalWSImage = jest.fn();
  const updateItemData = jest.fn();
  const getImage = jest.fn();
  const getVideo = jest.fn();

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [WorkspaceFilesController],
      providers: [
        {
          // "Bearer uid-<name>" signs in <name>; anything else is a bad token.
          provide: TokenService,
          useValue: {
            processToken: async (token: string, req: any) => {
              if (!token.startsWith('uid-')) throw new Error('bad token');
              req.user = { id: token };
            },
          },
        },
        {
          provide: WorkspaceFilesService,
          useValue: {
            saveOriginalWSImage,
            updateItemData,
            getImage,
            getVideo,
          },
        },
        { provide: WorkspaceSharedService, useValue: {} },
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
      'workspaces/ws1': {
        admin: 'uid-admin',
        members: [
          { id: 'uid-admin' },
          { id: 'uid-writer' },
          { id: 'uid-reader' },
        ],
        screenshots: {
          img1: {
            id: 'img1',
            refName: 'restricted.png',
            access: {
              members: [
                { uid: 'uid-writer', access: 'WRITE' },
                { uid: 'uid-reader', access: 'READ' },
              ],
            },
          },
          img2: { id: 'img2', refName: 'open.png' },
        },
        videos: {
          vid1: {
            id: 'vid1',
            refName: 'restricted.webm',
            access: {
              members: [
                { uid: 'uid-writer', access: 'WRITE' },
                { uid: 'uid-reader', access: 'READ' },
              ],
            },
          },
          vid2: { id: 'vid2', refName: 'open.webm' },
        },
      },
    };
    saveOriginalWSImage.mockReset().mockResolvedValue('https://example.com/o');
    updateItemData.mockReset().mockResolvedValue({ status: true });
    getImage.mockReset().mockResolvedValue({ status: true });
    getVideo.mockReset().mockResolvedValue({ status: true });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const as = (uid: string) => ({ Authorization: `Bearer ${uid}` });
  const save = (uid: string, fullFileName: string) =>
    request(app.getHttpServer())
      .post(SAVE_ORIGINAL_URL)
      .set(as(uid))
      .send({ fullFileName });

  it('lets a member with write permission on the image save its original', async () => {
    await save('uid-writer', 'restricted.png').expect(201);
    expect(saveOriginalWSImage).toHaveBeenCalledWith('ws1', 'restricted.png');
  });

  it('refuses a member with only read permission on the image, and changes nothing', async () => {
    await save('uid-reader', 'restricted.png').expect(403);
    expect(saveOriginalWSImage).not.toHaveBeenCalled();
  });

  it('lets the workspace admin save the original', async () => {
    await save('uid-admin', 'restricted.png').expect(201);
    expect(saveOriginalWSImage).toHaveBeenCalledTimes(1);
  });

  it('refuses a user who is not a member of the workspace', async () => {
    await save('uid-stranger', 'restricted.png').expect(403);
    expect(saveOriginalWSImage).not.toHaveBeenCalled();
  });

  it('refuses an anonymous request', async () => {
    await request(app.getHttpServer())
      .post(SAVE_ORIGINAL_URL)
      .send({ fullFileName: 'restricted.png' })
      .expect(401);
    expect(saveOriginalWSImage).not.toHaveBeenCalled();
  });

  it('keeps letting a member save the original of an image with no permissions of its own', async () => {
    await save('uid-reader', 'open.png').expect(201);
    expect(saveOriginalWSImage).toHaveBeenCalledWith('ws1', 'open.png');
  });

  it('ignores an image id in the query: it cannot redirect the check to another image', async () => {
    await request(app.getHttpServer())
      .post(`${SAVE_ORIGINAL_URL}?imageId=img2`)
      .set(as('uid-reader'))
      .send({ fullFileName: 'restricted.png' })
      .expect(403);
    expect(saveOriginalWSImage).not.toHaveBeenCalled();
  });

  it('ignores an image id in the query that matches no image', async () => {
    await request(app.getHttpServer())
      .post(`${SAVE_ORIGINAL_URL}?imageId=missing`)
      .set(as('uid-reader'))
      .send({ fullFileName: 'restricted.png' })
      .expect(403);
    expect(saveOriginalWSImage).not.toHaveBeenCalled();
  });

  it('refuses a file name that matches no image of the workspace', async () => {
    await save('uid-reader', 'missing.png').expect(403);
    expect(saveOriginalWSImage).not.toHaveBeenCalled();
  });

  it('refuses a request without a file name', async () => {
    await request(app.getHttpServer())
      .post(SAVE_ORIGINAL_URL)
      .set(as('uid-reader'))
      .send({})
      .expect(403);
    expect(saveOriginalWSImage).not.toHaveBeenCalled();
  });

  it('keeps the id-based image routes checking the same permission', async () => {
    await request(app.getHttpServer())
      .put('/workspace/ws1/files/image/img1/single-data')
      .set(as('uid-reader'))
      .send({ title: 'new title' })
      .expect(403);
    expect(updateItemData).not.toHaveBeenCalled();

    await request(app.getHttpServer())
      .put('/workspace/ws1/files/image/img1/single-data')
      .set(as('uid-writer'))
      .send({ title: 'new title' })
      .expect(200);
    expect(updateItemData).toHaveBeenCalledTimes(1);
  });

  it('does not let a body file name redirect the check of an id-based route', async () => {
    await request(app.getHttpServer())
      .put('/workspace/ws1/files/image/img1/single-data')
      .set(as('uid-reader'))
      .send({ title: 'new title', fullFileName: 'open.png' })
      .expect(403);
    expect(updateItemData).not.toHaveBeenCalled();
  });

  describe('an item id in the query never overrides the id in the path', () => {
    const get = (uid: string, path: string) =>
      request(app.getHttpServer()).get(path).set(as(uid));
    const put = (uid: string, path: string) =>
      request(app.getHttpServer())
        .put(path)
        .set(as(uid))
        .send({ title: 'new title' });

    it('refuses reading a restricted image with an open image id in the query', async () => {
      // A member with no grant on the restricted image.
      mockDb.data['workspaces/ws1'] = {
        ...(mockDb.data['workspaces/ws1'] as object),
        members: [{ id: 'uid-admin' }, { id: 'uid-none' }],
      };
      await get('uid-none', '/workspace/ws1/files/image/img1?imageId=img2').expect(403);
      expect(getImage).not.toHaveBeenCalled();
    });

    it('refuses reading a restricted video with an open video id in the query', async () => {
      mockDb.data['workspaces/ws1'] = {
        ...(mockDb.data['workspaces/ws1'] as object),
        members: [{ id: 'uid-admin' }, { id: 'uid-none' }],
      };
      await get('uid-none', '/workspace/ws1/files/video/vid1?videoId=vid2').expect(403);
      expect(getVideo).not.toHaveBeenCalled();
    });

    it('refuses writing a restricted image or video with an open id in the query', async () => {
      await put('uid-reader', '/workspace/ws1/files/image/img1/single-data?imageId=img2').expect(403);
      await put('uid-reader', '/workspace/ws1/files/video/vid1/single-data?videoId=vid2').expect(403);
      expect(updateItemData).not.toHaveBeenCalled();
    });

    it('still checks the path item when the query id names an item the caller may write', async () => {
      // img2 is open to everyone; the reader may only read img1.
      await put('uid-reader', '/workspace/ws1/files/image/img1/single-data?imageId=img2').expect(403);
      await put('uid-reader', '/workspace/ws1/files/image/img2/single-data?imageId=img1').expect(200);
      expect(updateItemData).toHaveBeenCalledTimes(1);
      expect(updateItemData.mock.calls[0][4]).toBe('img2');
    });

    it('lets a writer and the admin through with the path id, whatever the query holds', async () => {
      await get('uid-writer', '/workspace/ws1/files/image/img1?imageId=img2').expect(200);
      await get('uid-admin', '/workspace/ws1/files/video/vid1?videoId=vid2').expect(200);
      await put('uid-writer', '/workspace/ws1/files/image/img1/single-data').expect(200);
      await put('uid-writer', '/workspace/ws1/files/video/vid1/single-data?videoId=vid2').expect(200);
      await put('uid-admin', '/workspace/ws1/files/video/vid1/single-data?videoId=vid2').expect(200);
      expect(getImage).toHaveBeenCalledWith('ws1', 'img1');
      expect(getVideo).toHaveBeenCalledWith('ws1', 'vid1');
    });

    it('keeps reading the id from the query on routes that have none in the path', async () => {
      const remove = (uid: string, query: string) =>
        request(app.getHttpServer())
          .delete(`/workspace/ws1/files/image/single?${query}`)
          .set(as(uid));
      // No path id: the query id is checked, so the reader is refused on the restricted image.
      await remove('uid-reader', 'imageId=img1').expect(403);
    });
  });
});
