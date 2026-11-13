/**
 * `PUT folders/:folderId`, `DELETE folders/:folderId` and `PUT folders/:folderId/move-items`.
 *
 * - The folder guard used to prefer a `?folderId=` query value over the `:folderId` in the path, and
 *   `?folderId=false` skipped the check, so a member with only READ on a folder could rename it,
 *   delete it or move items into it. Only the folder in the path decides now.
 * - The update route replaced the whole stored folder with the body, `access` included, so any
 *   member could rewrite who may use a folder. It now writes only name, colour and item count.
 *
 * The routes are the real controller and the real update handler behind the real guards; only the
 * database, the token check and the delete and move handlers are replaced.
 */
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { TokenService } from '../../auth/services/tokens';
import { FoldersSharedService } from '../../../services/shared/folders.shared.service';
import { WorkspaceFoldersController } from './folders.controller';
import { WorkspaceFoldersService } from '../services/folders.service';
import { WorkspaceSharedService } from '../services/shared.service';
import { WorkspaceUtilitiesService } from '../services/utilities.service';

// Only the classes are needed, as injection tokens; their own imports stay out of this test.
jest.mock('../../auth/services/tokens', () => ({ TokenService: class {} }));
jest.mock('../services/shared.service', () => ({
  WorkspaceSharedService: class {},
}));
jest.mock('../services/utilities.service', () => ({
  WorkspaceUtilitiesService: class {},
}));
jest.mock('../services/workspace.service', () => ({
  WorkspacesService: class {},
}));
jest.mock('../../../services/shared/shared.service', () => ({
  SharedService: class {},
}));
jest.mock('../../../services/shared/folders.shared.service', () => ({
  FoldersSharedService: class {},
}));

const mockDb: { data: Record<string, any> } = { data: {} };
jest.mock('firebase-admin', () => ({
  database: () => ({
    ref: (path: string) => ({
      get: async () => {
        // `workspaces/<id>` is stored whole; `workspaces/<id>/<child>` reads one child of it.
        const [root, id, child] = path.split('/');
        const workspace = mockDb.data[`${root}/${id}`];
        const value = child ? workspace?.[child] : workspace;
        return { val: () => value ?? null };
      },
    }),
  }),
}));

const FOLDER_URL = '/workspace/ws1/folders/fold1';
const storedFolder = () => mockDb.data['workspaces/ws1'].folders.fold1;
const ORIGINAL_ACCESS = {
  members: [
    { uid: 'uid-reader', access: 'READ' },
    { uid: 'uid-writer', access: 'WRITE' },
  ],
};

describe('workspace folder routes: update, delete and move-items', () => {
  let app: INestApplication;
  const deleteFolder = jest.fn();
  const moveItemsToFolder = jest.fn();

  beforeAll(async () => {
    // The real service for the update route; its database access goes to `mockDb`.
    const utilities = {
      getWorkspaceById: async (id: string) => {
        const workspaceVal = mockDb.data[`workspaces/${id}`];
        return {
          workspaceVal,
          workspaceRef: {
            update: async (patch: Record<string, unknown>) => {
              Object.assign(workspaceVal, patch);
            },
          },
          db: {
            ref: () => ({
              get: async () => ({ val: () => null }),
              set: async () => undefined,
            }),
          },
        };
      },
    };
    const service = new WorkspaceFoldersService(utilities as any, {} as any);
    (service as any).deleteFolder = deleteFolder;
    (service as any).moveItemsToFolder = moveItemsToFolder;

    const moduleRef = await Test.createTestingModule({
      controllers: [WorkspaceFoldersController],
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
        { provide: WorkspaceFoldersService, useValue: service },
        { provide: WorkspaceUtilitiesService, useValue: utilities },
        { provide: FoldersSharedService, useValue: {} },
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
          { id: 'uid-reader' },
          { id: 'uid-writer' },
          { id: 'uid-ungranted' },
        ],
        folders: {
          fold1: {
            id: 'fold1',
            name: 'Original',
            color: 'red',
            items: 2,
            parentId: false,
            creator: 'uid-admin',
            access: JSON.parse(JSON.stringify(ORIGINAL_ACCESS)),
          },
          fold2: { id: 'fold2', name: 'Other', color: 'blue', items: 0 },
        },
      },
    };
    deleteFolder.mockReset().mockResolvedValue({ status: 'success' });
    moveItemsToFolder.mockReset().mockResolvedValue({ status: 'success' });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const as = (uid: string) => ({ Authorization: `Bearer ${uid}` });
  const queries = ['', '?folderId=false', '?folderId=fold2', '?folderId='];
  const rename = (uid: string, query = '', folder: object = {}) =>
    request(app.getHttpServer())
      .put(`${FOLDER_URL}${query}`)
      .set(as(uid))
      .send({ folder: { name: 'Renamed', ...folder } });
  const remove = (uid: string, query = '') =>
    request(app.getHttpServer()).delete(`${FOLDER_URL}${query}`).set(as(uid));
  const move = (uid: string, query = '') =>
    request(app.getHttpServer())
      .put(`${FOLDER_URL}/move-items${query}`)
      .set(as(uid))
      .send({ fromFolderId: false, itemIds: ['item1'] });

  describe('a member with only read on the folder', () => {
    it.each(queries)('cannot rename it (query %p)', async (query) => {
      await rename('uid-reader', query).expect(403);
      expect(storedFolder().name).toBe('Original');
    });

    it.each(queries)('cannot delete it (query %p)', async (query) => {
      await remove('uid-reader', query).expect(403);
      expect(deleteFolder).not.toHaveBeenCalled();
    });

    it.each(queries)('cannot move items into it (query %p)', async (query) => {
      await move('uid-reader', query).expect(403);
      expect(moveItemsToFolder).not.toHaveBeenCalled();
    });
  });

  describe('a member with a grant on another folder only', () => {
    it.each(queries)('is refused on all three routes (query %p)', async (query) => {
      await rename('uid-ungranted', query).expect(403);
      await remove('uid-ungranted', query).expect(403);
      await move('uid-ungranted', query).expect(403);
      expect(storedFolder().name).toBe('Original');
    });
  });

  describe('someone outside the workspace', () => {
    it.each(queries)('is refused on all three routes (query %p)', async (query) => {
      await rename('uid-stranger', query).expect(403);
      await remove('uid-stranger', query).expect(403);
      await move('uid-stranger', query).expect(403);
      expect(storedFolder().name).toBe('Original');
      expect(deleteFolder).not.toHaveBeenCalled();
      expect(moveItemsToFolder).not.toHaveBeenCalled();
    });
  });

  describe('a member with write on the folder', () => {
    it.each(['', '?folderId=false'])('can rename it (query %p)', async (query) => {
      await rename('uid-writer', query, { color: 'green', items: 3 }).expect(
        200,
      );
      expect(storedFolder()).toMatchObject({
        id: 'fold1',
        name: 'Renamed',
        color: 'green',
        items: 3,
      });
    });

    it('can delete it', async () => {
      await remove('uid-writer').expect(200);
      expect(deleteFolder).toHaveBeenCalledTimes(1);
      expect(deleteFolder.mock.calls[0][2]).toBe('fold1');
    });

    it('can move items into it, and the destination is the folder in the path', async () => {
      await move('uid-writer', '?folderId=false').expect(200);
      expect(moveItemsToFolder).toHaveBeenCalledTimes(1);
      expect(moveItemsToFolder.mock.calls[0][3]).toBe('fold1');
    });
  });

  describe('the workspace admin', () => {
    it.each(['', '?folderId=false'])('can use all three routes (query %p)', async (query) => {
      await rename('uid-admin', query).expect(200);
      await remove('uid-admin', query).expect(200);
      await move('uid-admin', query).expect(200);
      expect(storedFolder().name).toBe('Renamed');
    });
  });

  describe('the update body', () => {
    it('cannot change the folder permissions', async () => {
      await rename('uid-writer', '', {
        access: {
          members: [{ uid: 'uid-ungranted', access: 'ADMIN' }],
          teams: [],
        },
      }).expect(200);
      expect(storedFolder().access).toEqual(ORIGINAL_ACCESS);
      expect(storedFolder().name).toBe('Renamed');
    });

    it('cannot change other stored fields', async () => {
      await rename('uid-writer', '', {
        id: 'fold2',
        creator: 'uid-writer',
        parentId: 'fold2',
        isPublic: true,
      }).expect(200);
      expect(storedFolder()).toMatchObject({
        id: 'fold1',
        creator: 'uid-admin',
        parentId: false,
      });
      expect(storedFolder().isPublic).toBeUndefined();
      expect(mockDb.data['workspaces/ws1'].folders.fold2.name).toBe('Other');
    });

    it('keeps the stored values of fields the body leaves out', async () => {
      await request(app.getHttpServer())
        .put(FOLDER_URL)
        .set(as('uid-writer'))
        .send({ folder: { color: 'green' } })
        .expect(200);
      expect(storedFolder()).toMatchObject({
        name: 'Original',
        color: 'green',
        items: 2,
      });
    });

    it('accepts the whole folder a client sends back', async () => {
      await request(app.getHttpServer())
        .put(FOLDER_URL)
        .set(as('uid-writer'))
        .send({ folder: { ...storedFolder(), name: 'Renamed' } })
        .expect(200);
      expect(storedFolder()).toMatchObject({ name: 'Renamed', items: 2 });
      expect(storedFolder().access).toEqual(ORIGINAL_ACCESS);
    });

    it.each([
      { name: 'x'.repeat(257) },
      { name: 5 },
      { color: 'c'.repeat(65) },
      { items: -1 },
      { items: 1_000_001 },
      { items: 1.5 },
      { items: '3' },
    ])('refuses an invalid value %p', async (folder) => {
      await rename('uid-writer', '', folder).expect(400);
      expect(storedFolder().name).toBe('Original');
    });

    it('refuses a body without a folder object', async () => {
      await request(app.getHttpServer())
        .put(FOLDER_URL)
        .set(as('uid-writer'))
        .send({ folder: 'Renamed' })
        .expect(400);
    });
  });
});
