/**
 * `POST folders`: creating a workspace folder, at the top level or under another folder.
 *
 * The route used to check only that the user is a member of the workspace, so a member with READ on
 * a folder, or none at all, could create a subfolder inside it (upload, rename and move into the
 * same folder were refused). A subfolder now needs WRITE on its parent and on every folder above
 * it, as a move into that folder does. A top-level folder stays open to every member.
 *
 * The route is the real controller and the real create handler behind the real guards; only the
 * database and the token check are replaced.
 */
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { InMemoryDatabase } from '../../../../test/support/in-memory-firebase';
import { TokenService } from '../../auth/services/tokens';
import { parseCollectionToArray } from '../../../services/utils/helpers';
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

const FOLDERS_URL = '/workspace/ws1/folders';
const storedFolders = () =>
  parseCollectionToArray<any>(mockDb.dump('workspaces/ws1/folders')).filter(
    Boolean,
  );
const storedNamed = (name: string) =>
  storedFolders().filter((x) => x.name === name);
const grant = (...members: [string, string][]) => ({
  members: members.map(([uid, access]) => ({ uid, access })),
});

describe('workspace folder route: create a folder', () => {
  let app: INestApplication;
  let storedBefore: number;

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
      access?: object,
    ) => ({
      id,
      name: id,
      parentId,
      nestLevel,
      items: 0,
      ...(access && { access }),
    });
    const list = [
      // The writer may write here, the reader may only read, the member is not listed.
      folder(
        'team',
        false,
        0,
        grant(['uid-writer', 'WRITE'], ['uid-reader', 'READ']),
      ),
      // Only the writer is listed. The child has no permissions of its own: the folder above decides.
      folder('locked', false, 0, grant(['uid-writer', 'WRITE'])),
      folder('lockedChild', 'locked', 1),
      // No permissions of its own: open to every member.
      folder('open', false, 0),
    ];
    mockDb = new InMemoryDatabase();
    await mockDb.ref('workspaces/ws1').set({
      admin: 'uid-admin',
      members: [
        { id: 'uid-admin' },
        { id: 'uid-writer' },
        { id: 'uid-reader' },
        { id: 'uid-member' },
      ],
      folders: Object.fromEntries(list.map((x) => [x.id, x])),
    });
    storedBefore = storedFolders().length;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const create = (uid: string, body: object) =>
    request(app.getHttpServer())
      .post(FOLDERS_URL)
      .set({ Authorization: `Bearer ${uid}` })
      .send({ name: 'new', color: 'red', nestLevel: 1, ...body });

  describe('refuses a subfolder, and writes nothing,', () => {
    it('under a folder the member can only read', async () => {
      await create('uid-reader', { parentId: 'team' }).expect(403);
      expect(storedNamed('new')).toEqual([]);
      expect(storedFolders()).toHaveLength(storedBefore);
    });

    it('under a restricted folder that does not list the member', async () => {
      await create('uid-member', { parentId: 'team' }).expect(403);
      await create('uid-member', { parentId: 'locked' }).expect(403);
      expect(storedNamed('new')).toEqual([]);
      expect(storedFolders()).toHaveLength(storedBefore);
    });

    it('under a folder whose parent shuts the member out', async () => {
      await create('uid-reader', { parentId: 'lockedChild' }).expect(403);
      await create('uid-member', { parentId: 'lockedChild' }).expect(403);
      expect(storedNamed('new')).toEqual([]);
      expect(storedFolders()).toHaveLength(storedBefore);
    });

    it('under a folder that does not exist', async () => {
      await create('uid-admin', { parentId: 'missing' }).expect(403);
      expect(storedFolders()).toHaveLength(storedBefore);
    });

    it('for someone outside the workspace', async () => {
      await create('uid-stranger', { parentId: 'open' }).expect(403);
      await create('uid-stranger', { parentId: false }).expect(403);
      expect(storedFolders()).toHaveLength(storedBefore);
    });
  });

  it('creates a subfolder for a member with write on the parent and above', async () => {
    const res = await create('uid-writer', { parentId: 'team' }).expect(201);
    expect(res.body.status).toBe('success');
    expect(storedNamed('new')).toEqual([
      expect.objectContaining({
        parentId: 'team',
        nestLevel: 1,
        creator: 'uid-writer',
      }),
    ]);

    await create('uid-writer', {
      name: 'deep',
      parentId: 'lockedChild',
    }).expect(201);
    expect(storedNamed('deep')).toEqual([
      expect.objectContaining({ parentId: 'lockedChild', nestLevel: 2 }),
    ]);
  });

  it('creates a subfolder under a folder open to every member', async () => {
    await create('uid-member', { parentId: 'open' }).expect(201);
    expect(storedNamed('new')).toEqual([
      expect.objectContaining({ parentId: 'open', nestLevel: 1 }),
    ]);
  });

  it('lets the workspace admin create a subfolder anywhere', async () => {
    await create('uid-admin', { parentId: 'locked' }).expect(201);
    await create('uid-admin', { name: 'deep', parentId: 'lockedChild' }).expect(
      201,
    );
    expect(storedNamed('new')).toEqual([
      expect.objectContaining({ parentId: 'locked', nestLevel: 1 }),
    ]);
    expect(storedNamed('deep')).toEqual([
      expect.objectContaining({ parentId: 'lockedChild', nestLevel: 2 }),
    ]);
  });

  it.each([{ parentId: false }, { parentId: 'false' }, {}])(
    'lets a plain member create a top-level folder (%p)',
    async (body) => {
      const res = await create('uid-member', { nestLevel: 0, ...body }).expect(
        201,
      );
      expect(res.body.status).toBe('success');
      expect(storedNamed('new')).toEqual([
        expect.objectContaining({
          parentId: false,
          nestLevel: 0,
          creator: 'uid-member',
        }),
      ]);
    },
  );

  it('still answers with an error when the folder would nest too deep', async () => {
    await create('uid-admin', { name: 'deep', parentId: 'lockedChild' }).expect(
      201,
    );
    const deep = storedNamed('deep')[0];
    const res = await create('uid-admin', { parentId: deep.id }).expect(201);
    expect(res.body).toMatchObject({
      status: 'error',
      message: 'Maximum folder nest level exceeded.',
    });
    expect(storedNamed('new')).toEqual([]);
  });

  it.each([{ parentId: '' }, { parentId: 5 }, { parentId: 'a b' }])(
    'refuses a parentId that is not a folder id (%p)',
    async (body) => {
      const res = await create('uid-admin', body);
      expect([400, 403]).toContain(res.status);
      expect(storedFolders()).toHaveLength(storedBefore);
    },
  );
});
