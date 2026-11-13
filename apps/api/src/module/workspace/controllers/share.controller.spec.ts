/**
 * Share-link routes with the real guards. A user who was removed from the workspace, but still has
 * a grant left on an item, must not be able to create or delete its share link; neither must a
 * user who was never a member when the item has no permissions of its own.
 */
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { TokenService } from '../../auth/services/tokens';
import { WorkspaceShareController } from './share.controller';
import { WorkspaceShareService } from '../services/share.service';

jest.mock('../../auth/services/tokens', () => ({ TokenService: class {} }));
jest.mock('../services/share.service', () => ({
  WorkspaceShareService: class {},
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

describe('share link routes', () => {
  let app: INestApplication;
  const getShareLink = jest.fn();
  const deleteShareLink = jest.fn();

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [WorkspaceShareController],
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
          provide: WorkspaceShareService,
          useValue: { getShareLink, deleteShareLink },
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
    mockDb.data = {
      'workspaces/ws1': {
        admin: 'uid-admin',
        members: [{ id: 'uid-admin' }, { id: 'uid-writer' }],
        screenshots: {
          // `uid-removed` was a member once; its grant is still on the item.
          restricted: {
            id: 'restricted',
            access: {
              members: [
                { uid: 'uid-writer', access: 'WRITE' },
                { uid: 'uid-removed', access: 'WRITE' },
              ],
            },
          },
          open: { id: 'open' },
        },
      },
    };
    getShareLink.mockReset().mockResolvedValue({ status: true });
    deleteShareLink.mockReset().mockResolvedValue({ status: true });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const as = (uid: string) => ({ Authorization: `Bearer ${uid}` });
  const share = (uid: string, id: string) =>
    request(app.getHttpServer()).get(`/workspace/share/ws1/${id}`).set(as(uid));
  const unshare = (uid: string, id: string) =>
    request(app.getHttpServer())
      .delete(`/workspace/share/deleteLink/ws1/${id}`)
      .set(as(uid));

  it('refuses a removed member with a leftover grant, on create and on delete', async () => {
    await share('uid-removed', 'restricted').expect(403);
    await unshare('uid-removed', 'restricted').expect(403);
    expect(getShareLink).not.toHaveBeenCalled();
    expect(deleteShareLink).not.toHaveBeenCalled();
  });

  it('refuses a user who was never a member, even for an item with no permissions', async () => {
    await share('uid-stranger', 'open').expect(403);
    await unshare('uid-stranger', 'open').expect(403);
    expect(getShareLink).not.toHaveBeenCalled();
    expect(deleteShareLink).not.toHaveBeenCalled();
  });

  it('keeps letting a member with write permission share', async () => {
    await share('uid-writer', 'restricted').expect(200);
    await unshare('uid-writer', 'restricted').expect(200);
  });

  it('keeps letting the workspace admin share', async () => {
    await share('uid-admin', 'restricted').expect(200);
  });
});
