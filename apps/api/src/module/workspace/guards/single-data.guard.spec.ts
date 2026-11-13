/**
 * `PUT /workspace/:workspaceId/files/{image,video}/:id/single-data` updates one existing item.
 * It used to let an id that matches no item through (the update then created a record), and it
 * never looked at the folder an item is moved into (`parentId` in the body).
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

const writeAccess = (uid: string) => ({
  members: [{ uid, access: 'WRITE' }],
});

describe('single-data routes', () => {
  let app: INestApplication;
  const updateItemData = jest.fn();

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [WorkspaceFilesController],
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
        { provide: WorkspaceFilesService, useValue: { updateItemData } },
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
        members: [{ id: 'uid-admin' }, { id: 'uid-writer' }],
        folders: [
          { id: 'folderRead', access: { members: [{ uid: 'uid-writer', access: 'READ' }] } },
          { id: 'folderWrite', access: writeAccess('uid-writer') },
          { id: 'folderOpen' },
        ],
        screenshots: { img1: { id: 'img1', access: writeAccess('uid-writer') } },
        videos: { vid1: { id: 'vid1', access: writeAccess('uid-writer') } },
      },
    };
    updateItemData.mockReset().mockResolvedValue({ status: true });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const put = (uid: string, url: string, body: object) =>
    request(app.getHttpServer())
      .put(`/workspace/ws1/files/${url}/single-data`)
      .set({ Authorization: `Bearer ${uid}` })
      .send(body);

  describe.each([
    ['image', 'img1'],
    ['video', 'vid1'],
  ])('%s', (type, id) => {
    it('lets a writer update the title', async () => {
      await put('uid-writer', `${type}/${id}`, { title: 'new' }).expect(200);
      expect(updateItemData).toHaveBeenCalledTimes(1);
      // updateItemData(uid, workspaceId, itemType, id, parentId, trash, likes, title, ...)
      const args = updateItemData.mock.calls[0];
      expect(args[2]).toBe(type);
      expect(args[3]).toBe(id);
      expect(args[7]).toBe('new');
    });

    it('refuses an id that matches no item, and changes nothing', async () => {
      await put('uid-writer', `${type}/unknown`, { title: 'x' }).expect(403);
      await put('uid-writer', `${type}/unknown`, {
        title: 'x',
        parentId: 'folderWrite',
      }).expect(403);
      expect(updateItemData).not.toHaveBeenCalled();
    });

    it('refuses an id that matches no item, for the admin too', async () => {
      await put('uid-admin', `${type}/unknown`, { title: 'x' }).expect(403);
      expect(updateItemData).not.toHaveBeenCalled();
    });

    it('refuses a move into a folder the user can only read', async () => {
      await put('uid-writer', `${type}/${id}`, {
        parentId: 'folderRead',
      }).expect(403);
      expect(updateItemData).not.toHaveBeenCalled();
    });

    it('lets a writer move an item into a folder they can write', async () => {
      await put('uid-writer', `${type}/${id}`, {
        parentId: 'folderWrite',
      }).expect(200);
      expect(updateItemData).toHaveBeenCalledTimes(1);
    });

    it('lets a writer move an item into a folder with no permissions of its own', async () => {
      await put('uid-writer', `${type}/${id}`, {
        parentId: 'folderOpen',
      }).expect(200);
    });

    it('keeps the workspace root allowed as a destination', async () => {
      await put('uid-writer', `${type}/${id}`, { parentId: false }).expect(200);
      await put('uid-writer', `${type}/${id}`, { parentId: 'false' }).expect(200);
      expect(updateItemData).toHaveBeenCalledTimes(2);
    });

    it('refuses a move into a folder that does not exist', async () => {
      await put('uid-writer', `${type}/${id}`, {
        parentId: 'nope',
      }).expect(403);
      expect(updateItemData).not.toHaveBeenCalled();
    });

    it('lets the admin move an item into a read-only folder', async () => {
      await put('uid-admin', `${type}/${id}`, {
        parentId: 'folderRead',
      }).expect(200);
    });
  });
});
