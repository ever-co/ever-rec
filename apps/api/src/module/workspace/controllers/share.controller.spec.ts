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
        members: [
          { id: 'uid-admin' },
          { id: 'uid-writer' },
          { id: 'uid-reader' },
        ],
        screenshots: {
          // `uid-removed` was a member once; its grant is still on the item.
          restricted: {
            id: 'restricted',
            access: {
              members: [
                { uid: 'uid-writer', access: 'WRITE' },
                { uid: 'uid-reader', access: 'READ' },
                { uid: 'uid-removed', access: 'WRITE' },
              ],
            },
          },
          open: { id: 'open' },
        },
      },
      'workspaces/ws2': {
        admin: 'uid-other',
        members: [{ id: 'uid-other' }],
        screenshots: { theirs: { id: 'theirs' } },
      },
      // The link ids are what the clients send in the `:itemId` slot of the delete route.
      'sharedWorkspaceItems/linkRestricted': {
        id: 'linkRestricted',
        workspaceId: 'ws1',
        itemId: 'restricted',
      },
      'sharedWorkspaceItems/linkOpen': {
        id: 'linkOpen',
        workspaceId: 'ws1',
        itemId: 'open',
      },
      'sharedWorkspaceItems/linkDangling': {
        id: 'linkDangling',
        workspaceId: 'ws1',
        itemId: 'gone',
      },
      'sharedWorkspaceItems/linkTheirs': {
        id: 'linkTheirs',
        workspaceId: 'ws2',
        itemId: 'theirs',
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
    await unshare('uid-removed', 'linkRestricted').expect(403);
    expect(getShareLink).not.toHaveBeenCalled();
    expect(deleteShareLink).not.toHaveBeenCalled();
  });

  it('refuses a user who was never a member, even for an item with no permissions', async () => {
    await share('uid-stranger', 'open').expect(403);
    await unshare('uid-stranger', 'linkOpen').expect(403);
    expect(getShareLink).not.toHaveBeenCalled();
    expect(deleteShareLink).not.toHaveBeenCalled();
  });

  it('keeps letting a member with write permission share and unshare', async () => {
    await share('uid-writer', 'restricted').expect(200);
    await unshare('uid-writer', 'linkRestricted').expect(200);
    expect(deleteShareLink).toHaveBeenCalledWith(
      'uid-writer',
      'linkRestricted',
      'ws1',
    );
  });

  it('keeps letting the workspace admin share and unshare', async () => {
    await share('uid-admin', 'restricted').expect(200);
    await unshare('uid-admin', 'linkRestricted').expect(200);
    expect(deleteShareLink).toHaveBeenCalledWith(
      'uid-admin',
      'linkRestricted',
      'ws1',
    );
  });

  it('lets a member unshare a link whose item has no permissions of its own', async () => {
    await unshare('uid-reader', 'linkOpen').expect(200);
  });

  it('refuses a member with READ only, on create and on delete', async () => {
    await share('uid-reader', 'restricted').expect(403);
    await unshare('uid-reader', 'linkRestricted').expect(403);
    expect(getShareLink).not.toHaveBeenCalled();
    expect(deleteShareLink).not.toHaveBeenCalled();
  });

  it('refuses a member of another workspace deleting a link of this one', async () => {
    // A member of ws2 on the path of ws2, with the id of a ws1 link.
    await request(app.getHttpServer())
      .delete('/workspace/share/deleteLink/ws2/linkRestricted')
      .set(as('uid-other'))
      .expect(403);
    // A ws1 member naming a ws2 link on the ws1 path.
    await unshare('uid-writer', 'linkTheirs').expect(403);
    await unshare('uid-admin', 'linkTheirs').expect(403);
    // A member of ws2 on the ws1 path.
    await unshare('uid-other', 'linkRestricted').expect(403);
    expect(deleteShareLink).not.toHaveBeenCalled();
  });

  it('refuses an unknown link id and a malformed one', async () => {
    await unshare('uid-admin', 'nope').expect(403);
    await unshare('uid-writer', 'nope').expect(403);
    await unshare('uid-admin', 'a.b').expect(403);
    expect(deleteShareLink).not.toHaveBeenCalled();
  });

  it('lets only the admin delete a link whose item no longer exists', async () => {
    await unshare('uid-writer', 'linkDangling').expect(403);
    expect(deleteShareLink).not.toHaveBeenCalled();
    await unshare('uid-admin', 'linkDangling').expect(200);
  });

  it('refuses to create a link for an item that is in no workspace, admin included', async () => {
    await share('uid-admin', 'nope').expect(403);
    await share('uid-writer', 'nope').expect(403);
    // An item of another workspace is no item of this one.
    await share('uid-admin', 'theirs').expect(403);
    expect(getShareLink).not.toHaveBeenCalled();
  });

  it('checks the item in the path, not a same-named value in the query', async () => {
    // An unknown path id must not be rescued by an existing id in the query...
    await request(app.getHttpServer())
      .get('/workspace/share/ws1/nope?itemId=open')
      .set(as('uid-admin'))
      .expect(403);
    await request(app.getHttpServer())
      .get('/workspace/share/ws1/nope?itemId=open')
      .set(as('uid-writer'))
      .expect(403);
    // ...and a restricted path item is not checked as the open item named in the query.
    await request(app.getHttpServer())
      .get('/workspace/share/ws1/restricted?itemId=open')
      .set(as('uid-reader'))
      .expect(403);
    expect(getShareLink).not.toHaveBeenCalled();
    // A valid path item is still shared when the query names something else.
    await request(app.getHttpServer())
      .get('/workspace/share/ws1/restricted?itemId=nope')
      .set(as('uid-writer'))
      .expect(200);
    expect(getShareLink).toHaveBeenCalledWith('ws1', 'restricted', 'uid-writer');
  });
});
