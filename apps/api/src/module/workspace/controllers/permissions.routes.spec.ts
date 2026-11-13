/**
 * `POST workspace/:workspaceId/files/:itemId/permissions` and
 * `POST workspace/:workspaceId/folders/:folderId/permissions` rewrite who may read or write an
 * item or folder. They used to be guarded by a folder check that passed whenever no folder was
 * named, so any workspace member could grant themselves WRITE. They now need ADMIN on the item or
 * folder itself: the workspace admin always, anyone else only with an explicit ADMIN grant.
 *
 * The routes are the real controllers behind the real guards; only the database, the token check
 * and the services behind the handlers are replaced.
 */
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { TokenService } from '../../auth/services/tokens';
import { FoldersSharedService } from '../../../services/shared/folders.shared.service';
import { WorkspaceFilesController } from './files.controller';
import { WorkspaceFoldersController } from './folders.controller';
import { WorkspaceFilesService } from '../services/files.service';
import { WorkspaceFoldersService } from '../services/folders.service';
import { WorkspaceSharedService } from '../services/shared.service';

// Only the classes are needed, as injection tokens; their own imports stay out of this test.
jest.mock('../../auth/services/tokens', () => ({ TokenService: class {} }));
jest.mock('../services/files.service', () => ({
  WorkspaceFilesService: class {},
}));
jest.mock('../services/folders.service', () => ({
  WorkspaceFoldersService: class {},
}));
jest.mock('../services/shared.service', () => ({
  WorkspaceSharedService: class {},
}));
jest.mock('../../../services/shared/folders.shared.service', () => ({
  FoldersSharedService: class {},
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

const grant = (id = 'uid-reader') => ({
  permissionType: 'member',
  id,
  permissionItemType: 'screenshots',
  write: true,
  read: true,
});
const folderGrant = (id = 'uid-reader') => ({
  ...grant(id),
  permissionItemType: 'folders',
});

describe('permissions routes', () => {
  let app: INestApplication;
  const updatePermissions = jest.fn();

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [WorkspaceFilesController, WorkspaceFoldersController],
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
        { provide: WorkspaceFilesService, useValue: {} },
        { provide: WorkspaceFoldersService, useValue: {} },
        { provide: FoldersSharedService, useValue: {} },
        { provide: WorkspaceSharedService, useValue: { updatePermissions } },
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
          { id: 'uid-owner' },
          { id: 'uid-writer' },
          { id: 'uid-reader' },
          { id: 'uid-teamer', teams: [{ id: 'team1' }] },
        ],
        teams: [{ id: 'team1' }],
        screenshots: {
          img1: {
            id: 'img1',
            refName: 'restricted.png',
            access: {
              members: [
                { uid: 'uid-owner', access: 'ADMIN' },
                { uid: 'uid-writer', access: 'WRITE' },
                { uid: 'uid-reader', access: 'READ' },
              ],
            },
          },
          // Restricted to a team only: the item names no members at all.
          img2: {
            id: 'img2',
            access: { teams: [{ teamId: 'team1', access: 'READ' }] },
          },
          // No permissions of its own.
          img3: { id: 'img3' },
        },
        videos: {
          vid1: {
            id: 'vid1',
            access: { members: [{ uid: 'uid-owner', access: 'ADMIN' }] },
          },
        },
        folders: {
          fold1: {
            id: 'fold1',
            access: {
              members: [
                { uid: 'uid-owner', access: 'ADMIN' },
                { uid: 'uid-writer', access: 'WRITE' },
                { uid: 'uid-reader', access: 'READ' },
              ],
            },
          },
          // No permissions of its own.
          fold2: { id: 'fold2' },
        },
      },
    };
    updatePermissions.mockReset().mockResolvedValue({ status: true });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const as = (uid: string) => ({ Authorization: `Bearer ${uid}` });
  const postItem = (uid: string, itemId: string, body: object = grant()) =>
    request(app.getHttpServer())
      .post(`/workspace/ws1/files/${itemId}/permissions`)
      .set(as(uid))
      .send(body);
  const postFolder = (uid: string, folderId: string, body: object = folderGrant()) =>
    request(app.getHttpServer())
      .post(`/workspace/ws1/folders/${folderId}/permissions`)
      .set(as(uid))
      .send(body);

  describe('items', () => {
    it('lets the workspace admin change the permissions', async () => {
      await postItem('uid-admin', 'img1').expect(201);
      expect(updatePermissions).toHaveBeenCalledWith(
        'uid-reader',
        'ws1',
        'img1',
        'screenshots',
        true,
        true,
        'member',
      );
    });

    it('lets the workspace admin change an item with no permissions of its own', async () => {
      await postItem('uid-admin', 'img3').expect(201);
      expect(updatePermissions).toHaveBeenCalledTimes(1);
    });

    it('lets a member with ADMIN on the item change its permissions', async () => {
      await postItem('uid-owner', 'img1').expect(201);
      expect(updatePermissions).toHaveBeenCalledTimes(1);
    });

    it('lets a member with ADMIN on a video change its permissions', async () => {
      await postItem('uid-owner', 'vid1', {
        ...grant(),
        permissionItemType: 'videos',
      }).expect(201);
      expect(updatePermissions).toHaveBeenCalledTimes(1);
    });

    it('refuses a member with only WRITE on the item, and changes nothing', async () => {
      await postItem('uid-writer', 'img1', grant('uid-writer')).expect(403);
      expect(updatePermissions).not.toHaveBeenCalled();
    });

    it('refuses a member with only READ on the item, and changes nothing', async () => {
      await postItem('uid-reader', 'img1', grant('uid-reader')).expect(403);
      expect(updatePermissions).not.toHaveBeenCalled();
    });

    it('refuses a member with no permission entry on the item', async () => {
      await postItem('uid-teamer', 'img1', grant('uid-teamer')).expect(403);
      expect(updatePermissions).not.toHaveBeenCalled();
    });

    it('refuses a plain member on an item with no permissions of its own', async () => {
      await postItem('uid-reader', 'img3', grant('uid-reader')).expect(403);
      expect(updatePermissions).not.toHaveBeenCalled();
    });

    it('refuses a member on an item restricted to a team only', async () => {
      await postItem('uid-reader', 'img2', grant('uid-reader')).expect(403);
      await postItem('uid-teamer', 'img2', grant('uid-teamer')).expect(403);
      expect(updatePermissions).not.toHaveBeenCalled();
    });

    it('is not redirected by a folder id in the query', async () => {
      await request(app.getHttpServer())
        .post('/workspace/ws1/files/img1/permissions?folderId=fold2')
        .set(as('uid-reader'))
        .send(grant('uid-reader'))
        .expect(403);
      expect(updatePermissions).not.toHaveBeenCalled();
    });

    it('checks the collection the body names: a video id is not an image', async () => {
      // `vid1` is only administered by uid-owner, and only as a video.
      await postItem('uid-owner', 'vid1').expect(403);
      expect(updatePermissions).not.toHaveBeenCalled();
    });

    it('refuses an unknown item id, even for the workspace admin', async () => {
      await postItem('uid-admin', 'missing').expect(403);
      await postItem('uid-owner', 'missing').expect(403);
      expect(updatePermissions).not.toHaveBeenCalled();
    });

    it('refuses a body without a valid item type', async () => {
      await postItem('uid-admin', 'img1', {
        ...grant(),
        permissionItemType: 'folders',
      }).expect(403);
      expect(updatePermissions).not.toHaveBeenCalled();
    });

    it('refuses a user who is not a member of the workspace', async () => {
      await postItem('uid-stranger', 'img1', grant('uid-stranger')).expect(403);
      expect(updatePermissions).not.toHaveBeenCalled();
    });

    it('refuses an anonymous request', async () => {
      await request(app.getHttpServer())
        .post('/workspace/ws1/files/img1/permissions')
        .send(grant())
        .expect(401);
      expect(updatePermissions).not.toHaveBeenCalled();
    });
  });

  describe('folders', () => {
    it('lets the workspace admin change the permissions', async () => {
      await postFolder('uid-admin', 'fold1').expect(201);
      expect(updatePermissions).toHaveBeenCalledWith(
        'uid-reader',
        'ws1',
        'fold1',
        'folders',
        true,
        true,
        'member',
      );
    });

    it('lets the workspace admin change a folder with no permissions of its own', async () => {
      await postFolder('uid-admin', 'fold2').expect(201);
      expect(updatePermissions).toHaveBeenCalledTimes(1);
    });

    it('lets a member with ADMIN on the folder change its permissions', async () => {
      await postFolder('uid-owner', 'fold1').expect(201);
      expect(updatePermissions).toHaveBeenCalledTimes(1);
    });

    it('refuses a member with only WRITE on the folder, and changes nothing', async () => {
      await postFolder('uid-writer', 'fold1', folderGrant('uid-writer')).expect(403);
      expect(updatePermissions).not.toHaveBeenCalled();
    });

    it('refuses a member with only READ on the folder, and changes nothing', async () => {
      await postFolder('uid-reader', 'fold1', folderGrant('uid-reader')).expect(403);
      expect(updatePermissions).not.toHaveBeenCalled();
    });

    it('refuses a plain member on a folder with no permissions of its own', async () => {
      await postFolder('uid-reader', 'fold2', folderGrant('uid-reader')).expect(403);
      expect(updatePermissions).not.toHaveBeenCalled();
    });

    it('refuses an unknown folder id, even for the workspace admin', async () => {
      await postFolder('uid-admin', 'missing').expect(403);
      expect(updatePermissions).not.toHaveBeenCalled();
    });

    it('refuses a user who is not a member of the workspace', async () => {
      await postFolder('uid-stranger', 'fold1', folderGrant('uid-stranger')).expect(403);
      expect(updatePermissions).not.toHaveBeenCalled();
    });

    it('refuses an anonymous request', async () => {
      await request(app.getHttpServer())
        .post('/workspace/ws1/folders/fold1/permissions')
        .send(folderGrant())
        .expect(401);
      expect(updatePermissions).not.toHaveBeenCalled();
    });
  });
});
