/**
 * `PUT folders/:folderId/move`: moving a folder under another folder or to the top level.
 *
 * The route is the real controller and the real move handler behind the real guards; only the
 * database and the token check are replaced. The user needs WRITE on the folder being moved and on
 * the destination; a move that would loop or nest too deep is refused and changes nothing.
 */
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { InMemoryDatabase } from '../../../../test/support/in-memory-firebase';
import { TokenService } from '../../auth/services/tokens';
import { FoldersSharedService } from '../../../services/shared/folders.shared.service';
import { WorkspaceFoldersController } from './folders.controller';
import { WorkspaceFoldersService } from '../services/folders.service';
import { WorkspaceSharedService } from '../services/shared.service';
import { WorkspaceUtilitiesService } from '../services/utilities.service';

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

// The folder list is changed in a transaction, so the database is the in-memory one.
let mockDb: InMemoryDatabase;
jest.mock('firebase-admin', () => ({ database: () => mockDb }));

const stored = (id: string) => mockDb.dump(`workspaces/ws1/folders/${id}`);
const folderUrl = (id: string) => `/workspace/ws1/folders/${id}/move`;
const grant = (uid: string, access: string) => ({
  members: [{ uid, access }],
});

describe('workspace folder route: move a folder', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const utilities = {
      getWorkspaceById: async (id: string) => {
        const workspaceRef = mockDb.ref(`workspaces/${id}`);
        return {
          workspaceVal: (await workspaceRef.get()).val(),
          workspaceRef,
        };
      },
    };
    const service = new WorkspaceFoldersService(utilities as any, {} as any);

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

  beforeEach(async () => {
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    const folder = (
      id: string,
      parentId: string | false,
      nestLevel: number,
      items: number,
      access?: object,
    ) => ({
      id,
      name: id,
      parentId,
      nestLevel,
      items,
      ...(access && { access }),
    });
    const list = [
      // The writer may write here.
      folder('src', false, 0, 2, grant('uid-writer', 'WRITE')),
      folder('srcChild', 'src', 1, 1),
      // The writer may only read here.
      folder('readOnly', false, 0, 0, grant('uid-writer', 'READ')),
      // No permissions of its own: open to every member.
      folder('open', false, 0, 0),
      folder('openChild', 'open', 1, 0),
    ];
    mockDb = new InMemoryDatabase();
    await mockDb.ref('workspaces/ws1').set({
      admin: 'uid-admin',
      members: [{ id: 'uid-admin' }, { id: 'uid-writer' }],
      folders: Object.fromEntries(list.map((x) => [x.id, x])),
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const move = (uid: string, id: string, body: object) =>
    request(app.getHttpServer())
      .put(folderUrl(id))
      .set({ Authorization: `Bearer ${uid}` })
      .send(body);

  it('moves a folder with write on it into a folder open to the member', async () => {
    const res = await move('uid-writer', 'src', { parentId: 'open' }).expect(
      200,
    );
    expect(res.body.status).toBe('success');
    expect(stored('src')).toMatchObject({ parentId: 'open', nestLevel: 1 });
    expect(stored('srcChild')).toMatchObject({ parentId: 'src', nestLevel: 2 });
    expect(stored('open').items).toBe(2);
  });

  it('moves a nested folder to the top level, with false or "false"', async () => {
    await move('uid-writer', 'srcChild', { parentId: false }).expect(200);
    expect(stored('srcChild')).toMatchObject({ parentId: false, nestLevel: 0 });
    expect(stored('src').items).toBe(1);

    await move('uid-writer', 'srcChild', { parentId: 'src' }).expect(200);
    await move('uid-writer', 'srcChild', { parentId: 'false' }).expect(200);
    expect(stored('srcChild').parentId).toBe(false);
  });

  it('refuses a destination the member can only read', async () => {
    await move('uid-writer', 'src', { parentId: 'readOnly' }).expect(403);
    expect(stored('src').parentId).toBe(false);
  });

  it('refuses a folder the member can only read', async () => {
    await move('uid-writer', 'readOnly', { parentId: 'open' }).expect(403);
    expect(stored('readOnly').parentId).toBe(false);
  });

  it('refuses a destination that does not exist', async () => {
    await move('uid-writer', 'src', { parentId: 'missing' }).expect(403);
    expect(stored('src').parentId).toBe(false);
  });

  it('refuses someone outside the workspace', async () => {
    await move('uid-stranger', 'src', { parentId: 'open' }).expect(403);
    expect(stored('src').parentId).toBe(false);
  });

  it('lets the workspace admin move any folder anywhere', async () => {
    await move('uid-admin', 'readOnly', { parentId: 'src' }).expect(200);
    expect(stored('readOnly')).toMatchObject({
      parentId: 'src',
      nestLevel: 1,
    });
  });

  it('refuses a body without parentId rather than moving to the top level', async () => {
    await move('uid-admin', 'srcChild', {}).expect(400);
    expect(stored('srcChild').parentId).toBe('src');
  });

  it.each([{ parentId: '' }, { parentId: 5 }, { parentId: 'a b' }])(
    'refuses a parentId that is not a folder id (%p)',
    async (body) => {
      const res = await move('uid-admin', 'srcChild', body);
      expect([400, 403]).toContain(res.status);
      expect(stored('srcChild').parentId).toBe('src');
    },
  );

  it('answers with an error and changes nothing when the move would loop', async () => {
    const res = await move('uid-admin', 'src', { parentId: 'srcChild' }).expect(
      200,
    );
    expect(res.body.status).toBe('error');
    expect(stored('src').parentId).toBe(false);
    expect(stored('srcChild').parentId).toBe('src');
  });

  it('answers with an error and changes nothing when the move would nest too deep', async () => {
    // src has a subfolder; under openChild (level 1) it would be level 2 and srcChild level 3.
    const res = await move('uid-admin', 'src', {
      parentId: 'openChild',
    }).expect(200);
    expect(res.body.status).toBe('error');
    expect(stored('src')).toMatchObject({ parentId: false, nestLevel: 0 });
    expect(stored('srcChild').nestLevel).toBe(1);
  });
});
