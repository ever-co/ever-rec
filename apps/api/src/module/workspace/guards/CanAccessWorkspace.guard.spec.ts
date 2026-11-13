/**
 * `CanAccessWorkspaceGuard` must let only the admin and the members of the workspace in the route
 * through. It used to return `true` for every signed-in user, so anyone could list the members
 * (names and emails) of any workspace.
 *
 * The routes below are the real controllers behind the real `AuthGuard`; only the database, the
 * token check and the services behind the handlers are replaced.
 */
import { ExecutionContext, INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { TokenService } from '../../auth/services/tokens';
import { WorkspaceFoldersController } from '../controllers/folders.controller';
import { WorkspaceMembersController } from '../controllers/members.controller';
import { WorkspacesController } from '../controllers/workspaces.controller';
import { WorkspaceTeamsController } from '../controllers/teams.controller';
import { WorkspacesService } from '../services/workspace.service';
import { WorkspaceTeamsService } from '../services/teams.service';
import { FoldersSharedService } from '../../../services/shared/folders.shared.service';
import { WorkspaceFoldersService } from '../services/folders.service';
import { WorkspaceMembersService } from '../services/members.service';
import { WorkspaceSharedService } from '../services/shared.service';
import { CanAccessWorkspaceGuard } from './CanAccessWorkspace.guard';

// Only the classes are needed, as injection tokens; their own imports stay out of this test.
jest.mock('../../auth/services/tokens', () => ({ TokenService: class {} }));
jest.mock('../services/folders.service', () => ({
  WorkspaceFoldersService: class {},
}));
jest.mock('../services/members.service', () => ({
  WorkspaceMembersService: class {},
}));
jest.mock('../services/shared.service', () => ({
  WorkspaceSharedService: class {},
}));
jest.mock('../services/workspace.service', () => ({
  WorkspacesService: class {},
}));
jest.mock('../services/teams.service', () => ({
  WorkspaceTeamsService: class {},
}));
jest.mock('../../../services/shared/folders.shared.service', () => ({
  FoldersSharedService: class {},
}));

// The guard reads `workspaces/<id>` from the realtime database.
const mockDb: {
  data: Record<string, unknown>;
  reads: string[];
  fail: boolean;
} = { data: {}, reads: [], fail: false };
jest.mock('firebase-admin', () => ({
  database: () => ({
    ref: (path: string) => ({
      get: async () => {
        mockDb.reads.push(path);
        if (mockDb.fail) throw new Error('database unavailable');
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

const MEMBERS_URL = (workspaceId: string) =>
  `/workspace/${workspaceId}/members`;
const FOLDERS_URL = (workspaceId: string) =>
  `/workspace/${workspaceId}/folders`;
const NEW_FOLDER = { name: 'Designs', color: 'red', nestLevel: 0 };

describe('CanAccessWorkspaceGuard', () => {
  let app: INestApplication;
  const getPopulatedMembers = jest.fn();
  const createWorkspaceFolder = jest.fn();
  const getSingleWorkspace = jest.fn();
  const getTeamsMembers = jest.fn();

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [
        WorkspaceMembersController,
        WorkspaceFoldersController,
        WorkspacesController,
        WorkspaceTeamsController,
      ],
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
          provide: WorkspaceMembersService,
          useValue: { getPopulatedMembers },
        },
        {
          provide: WorkspaceFoldersService,
          useValue: { createWorkspaceFolder },
        },
        { provide: WorkspacesService, useValue: { getSingleWorkspace } },
        { provide: WorkspaceTeamsService, useValue: { getTeamsMembers } },
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
    mockDb.reads = [];
    mockDb.fail = false;
    mockDb.data = {
      'workspaces/ws1': {
        admin: 'uid-admin',
        members: [{ id: 'uid-admin' }, { id: 'uid-member' }],
      },
      // Firebase can hand back an array as an object keyed by index.
      'workspaces/ws2': {
        admin: 'uid-other-admin',
        members: { 0: { id: 'uid-keyed-member' } },
      },
      // A workspace stored without members.
      'workspaces/ws3': { admin: 'uid-solo-admin' },
    };
    getPopulatedMembers.mockReset().mockResolvedValue({ data: [] });
    createWorkspaceFolder.mockReset().mockResolvedValue({ status: true });
    getSingleWorkspace.mockReset().mockResolvedValue({ data: {} });
    getTeamsMembers.mockReset().mockResolvedValue({ data: {} });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const as = (uid: string) => ({ Authorization: `Bearer ${uid}` });

  describe('a member', () => {
    it('gets 200 on the members list', async () => {
      await request(app.getHttpServer())
        .get(MEMBERS_URL('ws1'))
        .set(as('uid-member'))
        .expect(200);
      expect(getPopulatedMembers).toHaveBeenCalledTimes(1);
    });

    it('gets 201 on another guarded route (create a folder)', async () => {
      await request(app.getHttpServer())
        .post(FOLDERS_URL('ws1'))
        .set(as('uid-member'))
        .send(NEW_FOLDER)
        .expect(201);
      expect(createWorkspaceFolder).toHaveBeenCalledTimes(1);
    });

    it('is found when the stored members are a keyed object', async () => {
      await request(app.getHttpServer())
        .get(MEMBERS_URL('ws2'))
        .set(as('uid-keyed-member'))
        .expect(200);
    });
  });

  describe('the workspace admin', () => {
    it('gets 200 even when not listed in the members', async () => {
      await request(app.getHttpServer())
        .get(MEMBERS_URL('ws3'))
        .set(as('uid-solo-admin'))
        .expect(200);
    });
  });

  describe('a signed-in user who is not a member', () => {
    it('gets 403 on the members list, and nothing is read', async () => {
      await request(app.getHttpServer())
        .get(MEMBERS_URL('ws1'))
        .set(as('uid-stranger'))
        .expect(403);
      expect(getPopulatedMembers).not.toHaveBeenCalled();
    });

    it('gets 403 on another guarded route (create a folder)', async () => {
      await request(app.getHttpServer())
        .post(FOLDERS_URL('ws1'))
        .set(as('uid-stranger'))
        .send(NEW_FOLDER)
        .expect(403);
      expect(createWorkspaceFolder).not.toHaveBeenCalled();
    });

    it('is not let in by being a member of a different workspace', async () => {
      await request(app.getHttpServer())
        .get(MEMBERS_URL('ws1'))
        .set(as('uid-keyed-member'))
        .expect(403);
    });

    it('gets 403 for a workspace that does not exist', async () => {
      await request(app.getHttpServer())
        .get(MEMBERS_URL('missing'))
        .set(as('uid-member'))
        .expect(403);
    });

    it('gets 403 when the workspace cannot be loaded', async () => {
      mockDb.fail = true;
      await request(app.getHttpServer())
        .get(MEMBERS_URL('ws1'))
        .set(as('uid-member'))
        .expect(403);
    });

    it('gets 403, without a database read, for an id that is not a plain id', async () => {
      await request(app.getHttpServer())
        .get(MEMBERS_URL('ws1%2Fmembers'))
        .set(as('uid-member'))
        .expect(403);
      expect(mockDb.reads).toEqual([]);
    });
  });

  describe('the workspace data and team members routes', () => {
    it('give a member 200 on the full workspace data', async () => {
      await request(app.getHttpServer())
        .get('/workspace/single/ws1')
        .set(as('uid-member'))
        .expect(200);
      expect(getSingleWorkspace).toHaveBeenCalledTimes(1);
    });

    it('give a non-member 403 on the full workspace data', async () => {
      await request(app.getHttpServer())
        .get('/workspace/single/ws1')
        .set(as('uid-stranger'))
        .expect(403);
      expect(getSingleWorkspace).not.toHaveBeenCalled();
    });

    it('give a member 200 on the team members list', async () => {
      await request(app.getHttpServer())
        .get('/workspace/ws1/teams/teams-members')
        .set(as('uid-member'))
        .expect(200);
      expect(getTeamsMembers).toHaveBeenCalledTimes(1);
    });

    it('give a non-member 403 on the team members list', async () => {
      await request(app.getHttpServer())
        .get('/workspace/ws1/teams/teams-members')
        .set(as('uid-stranger'))
        .expect(403);
      expect(getTeamsMembers).not.toHaveBeenCalled();
    });

    it('give an anonymous request 401 on both', async () => {
      await request(app.getHttpServer())
        .get('/workspace/single/ws1')
        .expect(401);
      await request(app.getHttpServer())
        .get('/workspace/ws1/teams/teams-members')
        .expect(401);
    });
  });

  it('reads only the admin and the members of the workspace', async () => {
    await request(app.getHttpServer())
      .get(MEMBERS_URL('ws1'))
      .set(as('uid-member'))
      .expect(200);
    expect([...mockDb.reads].sort()).toEqual([
      'workspaces/ws1/admin',
      'workspaces/ws1/members',
    ]);
  });

  describe('an anonymous request', () => {
    it('gets 401 on the members list', async () => {
      await request(app.getHttpServer()).get(MEMBERS_URL('ws1')).expect(401);
      expect(mockDb.reads).toEqual([]);
    });

    it('gets 401 on another guarded route (create a folder)', async () => {
      await request(app.getHttpServer())
        .post(FOLDERS_URL('ws1'))
        .send(NEW_FOLDER)
        .expect(401);
    });

    it('gets 401 for a token that is not valid', async () => {
      await request(app.getHttpServer())
        .get(MEMBERS_URL('ws1'))
        .set({ Authorization: 'Bearer nonsense' })
        .expect(401);
    });
  });

  it('refuses a request that reaches the guard without a user', async () => {
    const guard = new CanAccessWorkspaceGuard(null as never);
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({ params: { workspaceId: 'ws1' } }),
      }),
    } as unknown as ExecutionContext;

    await expect(guard.canActivate(context)).rejects.toMatchObject({
      status: 403,
    });
    expect(mockDb.reads).toEqual([]);
  });
});
