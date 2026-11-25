/**
 * `PUT workspace/:workspaceId/teams/:teamId` changes a team, like add-team, delete, add-member and
 * delete-member do. Those only let the workspace admin through; this one used to let any member
 * rename any team. The routes below are the real controller behind the real guards; only the
 * database, the token check and the teams service are replaced.
 */
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { TokenService } from '../../auth/services/tokens';
import { WorkspaceTeamsService } from '../services/teams.service';
import { WorkspaceTeamsController } from './teams.controller';

jest.mock('../../auth/services/tokens', () => ({ TokenService: class {} }));
jest.mock('../services/teams.service', () => ({
  WorkspaceTeamsService: class {},
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

const TEAM_URL = (workspaceId: string, teamId: string) =>
  `/workspace/${workspaceId}/teams/${teamId}`;

describe('WorkspaceTeamsController PUT :teamId', () => {
  let app: INestApplication;
  const updateTeam = jest.fn();

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [WorkspaceTeamsController],
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
        { provide: WorkspaceTeamsService, useValue: { updateTeam } },
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
        members: [{ id: 'uid-admin' }, { id: 'uid-member' }],
      },
    };
    updateTeam.mockReset().mockResolvedValue({ status: true });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const as = (uid: string) => ({ Authorization: `Bearer ${uid}` });
  const rename = (workspaceId: string, uid?: string) => {
    const req = request(app.getHttpServer())
      .put(TEAM_URL(workspaceId, 'team1'))
      .field('name', 'Renamed');
    return uid ? req.set(as(uid)) : req;
  };

  it('lets the workspace admin change the team (200) and saves the change', async () => {
    await rename('ws1', 'uid-admin').expect(200);
    expect(updateTeam).toHaveBeenCalledTimes(1);
    expect(updateTeam).toHaveBeenCalledWith(
      'ws1',
      'team1',
      'Renamed',
      undefined,
      undefined,
    );
  });

  it('refuses a plain member with 403 and changes nothing', async () => {
    const res = await rename('ws1', 'uid-member').expect(403);
    expect(res.body).toMatchObject({ statusCode: 403, error: 'Forbidden' });
    expect(updateTeam).not.toHaveBeenCalled();
  });

  it('refuses a signed-in user who is not a member with 403', async () => {
    await rename('ws1', 'uid-stranger').expect(403);
    expect(updateTeam).not.toHaveBeenCalled();
  });

  it('refuses a workspace that does not exist with 403', async () => {
    await rename('missing', 'uid-admin').expect(403);
    expect(updateTeam).not.toHaveBeenCalled();
  });

  it('refuses an anonymous request with 401', async () => {
    await rename('ws1').expect(401);
    expect(updateTeam).not.toHaveBeenCalled();
  });
});
