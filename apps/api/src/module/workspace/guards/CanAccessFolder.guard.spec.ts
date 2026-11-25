/**
 * Item routes with the real guards, against an in-memory workspace.
 *
 * - The folder check used to read the folder from `?folderId=` first, so `?folderId=false` skipped
 *   it and a member with only READ on the item's folder could still change the item. The item's own
 *   folder decides now.
 * - An item whose permissions list teams only was open to every member of a workspace that has
 *   teams; only members of the listed teams (and the admin) may use it.
 * - Only the folder itself was checked, never the folders above it: a member shut out of a folder
 *   could still open a subfolder with no permissions of its own, and the items in it. Every folder
 *   above counts now, on the folder routes, the item routes and the folder an item is moved into.
 *
 * Only the database, the token check and the services behind the handlers are replaced.
 */
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { TokenService } from '../../auth/services/tokens';
import { WorkspaceFilesController } from '../controllers/files.controller';
import { WorkspacesController } from '../controllers/workspaces.controller';
import { WorkspaceFilesService } from '../services/files.service';
import { WorkspaceSharedService } from '../services/shared.service';
import { WorkspacesService } from '../services/workspace.service';

jest.mock('../../auth/services/tokens', () => ({ TokenService: class {} }));
jest.mock('../services/files.service', () => ({
  WorkspaceFilesService: class {},
}));
jest.mock('../services/shared.service', () => ({
  WorkspaceSharedService: class {},
}));
jest.mock('../services/workspace.service', () => ({
  WorkspacesService: class {},
}));

const mockDb: { data: Record<string, unknown> } = { data: {} };
jest.mock('firebase-admin', () => ({
  database: () => ({
    ref: (path: string) => ({
      get: async () => {
        const [root, id, child] = path.split('/');
        const workspace = mockDb.data[`${root}/${id}`] as
          Record<string, unknown> | undefined;
        const value = child ? workspace?.[child] : workspace;
        return { val: () => value ?? null };
      },
    }),
  }),
}));

const IMAGE_URL = '/workspace/ws1/files/image';
const SAVE_ORIGINAL_URL = '/workspace/ws1/files/ws1/save-original';

describe('item routes: folder and team permissions', () => {
  let app: INestApplication;
  const saveOriginalWSImage = jest.fn();
  const updateItemData = jest.fn();
  const getImage = jest.fn();
  const moveItemFromPersonalToWorkspace = jest.fn();
  const getSingleWorkspace = jest.fn();

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [WorkspaceFilesController, WorkspacesController],
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
          provide: WorkspaceFilesService,
          useValue: {
            saveOriginalWSImage,
            updateItemData,
            getImage,
            moveItemFromPersonalToWorkspace,
          },
        },
        { provide: WorkspaceSharedService, useValue: {} },
        { provide: WorkspacesService, useValue: { getSingleWorkspace } },
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
        teams: [{ id: 't1' }, { id: 't2' }],
        members: [
          { id: 'uid-admin' },
          { id: 'uid-reader', teams: [{ id: 't2' }] },
          { id: 'uid-writer', teams: [{ id: 't2' }] },
          { id: 'uid-teamer', teams: [{ id: 't1' }] },
          { id: 'uid-outsider', teams: [{ id: 't2' }] },
        ],
        folders: {
          fold1: {
            id: 'fold1',
            access: {
              members: [
                { uid: 'uid-reader', access: 'READ' },
                { uid: 'uid-writer', access: 'WRITE' },
              ],
            },
          },
        },
        screenshots: {
          // No permissions of its own; sits in a folder the reader can only read.
          inFolder: {
            id: 'inFolder',
            refName: 'in-folder.png',
            parentId: 'fold1',
          },
          // Permissions list one team only.
          teamOnly: {
            id: 'teamOnly',
            refName: 'team.png',
            access: { teams: [{ teamId: 't1', access: 'WRITE' }] },
          },
          // At the root, no permissions.
          open: { id: 'open', refName: 'open.png' },
        },
      },
    };
    saveOriginalWSImage.mockReset().mockResolvedValue('https://example.com/o');
    updateItemData.mockReset().mockResolvedValue({ status: true });
    getImage.mockReset().mockResolvedValue({ status: 'success' });
    moveItemFromPersonalToWorkspace
      .mockReset()
      .mockResolvedValue({ status: 'success' });
    getSingleWorkspace.mockReset().mockResolvedValue({ status: 'success' });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const as = (uid: string) => ({ Authorization: `Bearer ${uid}` });
  const putData = (uid: string, id: string, query = '') =>
    request(app.getHttpServer())
      .put(`${IMAGE_URL}/${id}/single-data${query}`)
      .set(as(uid))
      .send({ title: 'new title' });

  describe('the folder of the item decides', () => {
    it.each(['', '?folderId=false', '?folderId=', '?folderId=other'])(
      'refuses a member with only read on the folder (query %p)',
      async (query) => {
        await putData('uid-reader', 'inFolder', query).expect(403);
        expect(updateItemData).not.toHaveBeenCalled();
      },
    );

    it.each(['', '?folderId=false'])(
      'lets a member with write on the folder in (query %p)',
      async (query) => {
        await putData('uid-writer', 'inFolder', query).expect(200);
        expect(updateItemData).toHaveBeenCalledTimes(1);
      },
    );

    it('lets the workspace admin in', async () => {
      await putData('uid-admin', 'inFolder', '?folderId=false').expect(200);
    });

    it('keeps letting a member change an item at the root with no permissions', async () => {
      await putData('uid-reader', 'open', '?folderId=false').expect(200);
      await putData('uid-reader', 'open').expect(200);
    });

    it('refuses a read-only folder member on the delete route too', async () => {
      await request(app.getHttpServer())
        .delete(
          `${IMAGE_URL}/single?imageId=inFolder&refName=in-folder.png&folderId=false`,
        )
        .set(as('uid-reader'))
        .expect(403);
    });
  });

  describe('an item whose permissions list one team', () => {
    it('refuses a member outside that team on single-data', async () => {
      await putData('uid-outsider', 'teamOnly').expect(403);
      await putData('uid-outsider', 'teamOnly', '?folderId=false').expect(403);
      expect(updateItemData).not.toHaveBeenCalled();
    });

    it('refuses a member outside that team on save-original', async () => {
      await request(app.getHttpServer())
        .post(SAVE_ORIGINAL_URL)
        .set(as('uid-outsider'))
        .send({ fullFileName: 'team.png' })
        .expect(403);
      expect(saveOriginalWSImage).not.toHaveBeenCalled();
    });

    it('lets a member of the listed team in', async () => {
      await putData('uid-teamer', 'teamOnly').expect(200);
      await request(app.getHttpServer())
        .post(SAVE_ORIGINAL_URL)
        .set(as('uid-teamer'))
        .send({ fullFileName: 'team.png' })
        .expect(201);
    });

    it('lets the workspace admin in', async () => {
      await putData('uid-admin', 'teamOnly').expect(200);
    });

    it('lets in a member of the listed team when the membership is stored on the team', async () => {
      const ws: any = mockDb.data['workspaces/ws1'];
      ws.members.push({ id: 'uid-onteam' });
      ws.teams = [
        { id: 't1', members: [{ id: 'uid-onteam' }] },
        { id: 't2', members: [] },
      ];
      await putData('uid-onteam', 'teamOnly').expect(200);
      await putData('uid-outsider', 'teamOnly').expect(403);
    });
  });

  describe('a subfolder of a folder the member is shut out of', () => {
    // `A` is shut to `uid-reader` (no access) and open to `uid-writer`. `B` sits in `A` with no
    // permissions of its own, so only `A` can refuse anyone in it. `loop1` and `loop2` are each
    // the parent of the other.
    beforeEach(() => {
      const ws: any = mockDb.data['workspaces/ws1'];
      ws.folders = {
        ...ws.folders,
        A: {
          id: 'A',
          parentId: false,
          access: {
            teams: [],
            members: [
              { uid: 'uid-reader', access: 'NONE' },
              { uid: 'uid-writer', access: 'WRITE' },
            ],
          },
        },
        B: { id: 'B', parentId: 'A' },
        loop1: { id: 'loop1', parentId: 'loop2' },
        loop2: { id: 'loop2', parentId: 'loop1' },
      };
      ws.screenshots = {
        ...ws.screenshots,
        inB: { id: 'inB', refName: 'in-b.png', parentId: 'B' },
        inLoop: { id: 'inLoop', refName: 'in-loop.png', parentId: 'loop1' },
      };
    });

    const readFolder = (uid: string, folderId: string) =>
      request(app.getHttpServer())
        .get(`/workspace/single/ws1?folderId=${folderId}`)
        .set(as(uid));
    const readImage = (uid: string, id: string) =>
      request(app.getHttpServer()).get(`${IMAGE_URL}/${id}`).set(as(uid));
    const addToFolder = (uid: string, folderId: string) =>
      request(app.getHttpServer())
        .post(
          `/workspace/ws1/files/video/add-from-personal?itemId=v1&folderId=${folderId}`,
        )
        .set(as(uid));
    const moveInto = (uid: string, id: string, parentId: string) =>
      request(app.getHttpServer())
        .put(`${IMAGE_URL}/${id}/single-data`)
        .set(as(uid))
        .send({ parentId });

    describe('a member shut out of the parent folder', () => {
      it('cannot read the subfolder', async () => {
        await readFolder('uid-reader', 'B').expect(403);
        expect(getSingleWorkspace).not.toHaveBeenCalled();
      });

      it('cannot read an item in the subfolder', async () => {
        await readImage('uid-reader', 'inB').expect(403);
        expect(getImage).not.toHaveBeenCalled();
      });

      it('cannot add to the subfolder', async () => {
        await addToFolder('uid-reader', 'B').expect(403);
        expect(moveItemFromPersonalToWorkspace).not.toHaveBeenCalled();
      });

      it('cannot change an item in the subfolder', async () => {
        await putData('uid-reader', 'inB').expect(403);
        expect(updateItemData).not.toHaveBeenCalled();
      });

      it('cannot move an item into the subfolder', async () => {
        await moveInto('uid-reader', 'open', 'B').expect(403);
        expect(updateItemData).not.toHaveBeenCalled();
      });
    });

    describe('a member allowed on the parent folder', () => {
      it('reads the subfolder and the item in it', async () => {
        await readFolder('uid-writer', 'B').expect(200);
        await readImage('uid-writer', 'inB').expect(200);
      });

      it('adds to the subfolder, changes the item in it and moves items into it', async () => {
        await addToFolder('uid-writer', 'B').expect(201);
        await putData('uid-writer', 'inB').expect(200);
        await moveInto('uid-writer', 'open', 'B').expect(200);
      });
    });

    it('lets the workspace admin in everywhere', async () => {
      await readFolder('uid-admin', 'B').expect(200);
      await readImage('uid-admin', 'inB').expect(200);
      await addToFolder('uid-admin', 'B').expect(201);
      await putData('uid-admin', 'inB').expect(200);
      await moveInto('uid-admin', 'open', 'B').expect(200);
    });

    it('refuses a loop of parent folders to members, for reading and writing', async () => {
      await readFolder('uid-writer', 'loop1').expect(403);
      await readImage('uid-writer', 'inLoop').expect(403);
      await addToFolder('uid-writer', 'loop1').expect(403);
      await putData('uid-writer', 'inLoop').expect(403);
      await moveInto('uid-writer', 'open', 'loop1').expect(403);
    });
  });
});
