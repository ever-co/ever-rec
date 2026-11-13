/**
 * `PUT files/image`, `POST files/image` and `POST files/image/add-from-personal` write an image
 * file under a name taken from the request (`refName` / `location`, `fullFileName`, or the file
 * name of the personal image), not under an image id. The id-based permission check never saw that
 * image, so any workspace member could replace the file of an image they only have read access to,
 * or overwrite it (and its original) by uploading under the same name. These routes must apply the
 * same WRITE rule to the image the name belongs to.
 *
 * The routes are the real controller behind the real guards and interceptor; only the database,
 * the token check and the storage behind the handlers are replaced. The fake storage records every
 * file written, so "the stored file is unchanged" is checked on the file itself.
 */
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { TokenService } from '../../auth/services/tokens';
import { WorkspaceFilesController } from '../controllers/files.controller';
import { WorkspaceFilesService } from '../services/files.service';
import { WorkspaceSharedService } from '../services/shared.service';

// Only the classes are needed, as injection tokens; their own imports stay out of this test.
jest.mock('../../auth/services/tokens', () => ({ TokenService: class {} }));
jest.mock('../services/files.service', () => ({
  WorkspaceFilesService: class {},
}));
jest.mock('../services/shared.service', () => ({
  WorkspaceSharedService: class {},
}));

const mockDb: { data: Record<string, any> } = { data: {} };
jest.mock('firebase-admin', () => ({
  database: () => ({
    ref: (path: string) => ({
      get: async () => {
        const value = path
          .split('/')
          .reduce(
            (node, key) => (node == null ? node : node[key]),
            mockDb.data as any,
          );
        return { val: () => value ?? null };
      },
    }),
  }),
}));

const BASE = '/workspace/ws1/files';
const OLD = 'old content';
const NEW = 'new content';

describe('writing an image by name', () => {
  let app: INestApplication;
  // Every stored file, by `<workspaceId>/<name>`.
  let files: Record<string, string>;

  const filesService = {
    updateImage: jest.fn(
      async (ws: string, blob: any, refName?: string, location?: string) => {
        files[`${ws}/${refName ? refName : location}`] = blob.buffer.toString();
        return 'https://example.com/url';
      },
    ),
    addImageFromFile: jest.fn(
      async (_uid: string, ws: string, file: any, _t: string, name: string) => {
        files[`${ws}/${name}`] = file.buffer.toString();
        files[`${ws}/originals/${name}`] = file.buffer.toString();
        return { status: true };
      },
    ),
    moveItemFromPersonalToWorkspace: jest.fn(
      async (uid: string, ws: string, itemId: string) => {
        const refName = mockDb.data.users?.[uid]?.screenshots?.[itemId]?.refName;
        if (!refName) return { status: false };
        files[`${ws}/${refName}`] = 'personal copy';
        files[`${ws}/originals/${refName}`] = 'personal copy';
        return { status: true };
      },
    ),
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [WorkspaceFilesController],
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
        { provide: WorkspaceFilesService, useValue: filesService },
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
    const restricted = {
      members: [
        { uid: 'uid-writer', access: 'WRITE' },
        { uid: 'uid-reader', access: 'READ' },
      ],
    };
    const personal = {
      p1: { id: 'p1', refName: 'restricted.png' },
      p2: { id: 'p2', refName: 'fresh.png' },
    };
    mockDb.data = {
      workspaces: {
        ws1: {
          admin: 'uid-admin',
          members: [
            { id: 'uid-admin' },
            { id: 'uid-writer' },
            { id: 'uid-reader' },
          ],
          folders: {
            f1: { id: 'f1', access: restricted },
            f2: { id: 'f2' },
          },
          screenshots: {
            img1: { id: 'img1', refName: 'restricted.png', access: restricted },
            img2: { id: 'img2', refName: 'open.png' },
            img3: { id: 'img3', refName: 'infolder.png', parentId: 'f1' },
          },
        },
        ws2: {
          admin: 'uid-other',
          members: [{ id: 'uid-other' }, { id: 'uid-writer' }],
          screenshots: {
            img9: {
              id: 'img9',
              refName: 'other.png',
              access: { members: [{ uid: 'uid-other', access: 'WRITE' }] },
            },
          },
        },
      },
      users: {
        'uid-writer': { screenshots: personal },
        'uid-reader': { screenshots: personal },
        'uid-stranger': { screenshots: personal },
      },
    };
    files = {
      'ws1/restricted.png': OLD,
      'ws1/originals/restricted.png': OLD,
      'ws1/open.png': OLD,
      'ws1/infolder.png': OLD,
      'ws2/other.png': OLD,
    };
    Object.values(filesService).forEach((fn) => fn.mockClear());
  });

  const as = (uid: string) => ({ Authorization: `Bearer ${uid}` });

  const put = (uid: string | null, fields: Record<string, string>, url = BASE + '/image') => {
    let req = request(app.getHttpServer()).put(url);
    if (uid) req = req.set(as(uid));
    for (const [k, v] of Object.entries(fields)) req = req.field(k, v);
    return req.attach('blob', Buffer.from(NEW), 'blob.png');
  };

  const upload = (uid: string | null, fields: Record<string, string>) => {
    let req = request(app.getHttpServer()).post(BASE + '/image');
    if (uid) req = req.set(as(uid));
    for (const [k, v] of Object.entries({ title: 't', ...fields })) {
      req = req.field(k, v);
    }
    return req.attach('file', Buffer.from(NEW), 'file.png');
  };

  const addFromPersonal = (uid: string | null, query: string) => {
    const req = request(app.getHttpServer()).post(
      `${BASE}/image/add-from-personal?${query}`,
    );
    return uid ? req.set(as(uid)) : req;
  };

  describe('PUT image', () => {
    it('lets a member with write permission on the image replace its file', async () => {
      await put('uid-writer', { refName: 'restricted.png' }).expect(200);
      expect(files['ws1/restricted.png']).toBe(NEW);
    });

    it('refuses a member with only read permission, and the stored file is unchanged', async () => {
      await put('uid-reader', { refName: 'restricted.png' }).expect(403);
      expect(files['ws1/restricted.png']).toBe(OLD);
      expect(filesService.updateImage).not.toHaveBeenCalled();
    });

    it('applies the same rule to the name given as `location`', async () => {
      await put('uid-reader', { location: 'restricted.png' }).expect(403);
      expect(files['ws1/restricted.png']).toBe(OLD);
      await put('uid-writer', { location: 'restricted.png' }).expect(200);
      expect(files['ws1/restricted.png']).toBe(NEW);
    });

    it('lets the workspace admin replace the file', async () => {
      await put('uid-admin', { refName: 'restricted.png' }).expect(200);
      expect(files['ws1/restricted.png']).toBe(NEW);
    });

    it('refuses a user who is not a member of the workspace', async () => {
      await put('uid-stranger', { refName: 'restricted.png' }).expect(403);
      expect(files['ws1/restricted.png']).toBe(OLD);
    });

    it('refuses an anonymous request', async () => {
      await put(null, { refName: 'restricted.png' }).expect(401);
      expect(files['ws1/restricted.png']).toBe(OLD);
    });

    it('refuses the name of an image that belongs to another workspace', async () => {
      await put('uid-writer', { refName: 'other.png' }).expect(403);
      expect(files['ws1/other.png']).toBeUndefined();
      expect(files['ws2/other.png']).toBe(OLD);
    });

    it('refuses a name that matches no image of the workspace', async () => {
      await put('uid-writer', { refName: 'missing.png' }).expect(403);
      expect(filesService.updateImage).not.toHaveBeenCalled();
    });

    it('refuses a request that names no image', async () => {
      await put('uid-writer', {}).expect(403);
      expect(filesService.updateImage).not.toHaveBeenCalled();
    });

    it('ignores an image id in the query: it cannot redirect the check to another image', async () => {
      await put(
        'uid-reader',
        { refName: 'restricted.png' },
        `${BASE}/image?imageId=img2`,
      ).expect(403);
      expect(files['ws1/restricted.png']).toBe(OLD);
    });

    it('keeps letting a member replace an image that has no permissions of its own', async () => {
      await put('uid-reader', { refName: 'open.png' }).expect(200);
      expect(files['ws1/open.png']).toBe(NEW);
    });

    it('also requires write permission on the folder the image is in', async () => {
      await put('uid-reader', { refName: 'infolder.png' }).expect(403);
      expect(files['ws1/infolder.png']).toBe(OLD);
      await put('uid-writer', { refName: 'infolder.png' }).expect(200);
      expect(files['ws1/infolder.png']).toBe(NEW);
    });
  });

  describe('POST image (upload)', () => {
    it('lets a member with write permission overwrite the image under its name', async () => {
      await upload('uid-writer', { fullFileName: 'restricted.png' }).expect(201);
      expect(files['ws1/restricted.png']).toBe(NEW);
    });

    it('refuses a member with only read permission, and the file and its original are unchanged', async () => {
      await upload('uid-reader', { fullFileName: 'restricted.png' }).expect(403);
      expect(files['ws1/restricted.png']).toBe(OLD);
      expect(files['ws1/originals/restricted.png']).toBe(OLD);
      expect(filesService.addImageFromFile).not.toHaveBeenCalled();
    });

    it('lets the workspace admin upload under that name', async () => {
      await upload('uid-admin', { fullFileName: 'restricted.png' }).expect(201);
    });

    it('refuses a user who is not a member of the workspace', async () => {
      await upload('uid-stranger', { fullFileName: 'fresh.png' }).expect(403);
      expect(filesService.addImageFromFile).not.toHaveBeenCalled();
    });

    it('refuses an anonymous request', async () => {
      await upload(null, { fullFileName: 'fresh.png' }).expect(401);
      expect(filesService.addImageFromFile).not.toHaveBeenCalled();
    });

    it('keeps letting a member upload under a new name', async () => {
      await upload('uid-reader', { fullFileName: 'fresh.png' }).expect(201);
      expect(files['ws1/fresh.png']).toBe(NEW);
    });

    it('keeps letting a member upload over an image that has no permissions of its own', async () => {
      await upload('uid-reader', { fullFileName: 'open.png' }).expect(201);
      expect(files['ws1/open.png']).toBe(NEW);
    });

    it('treats the name of another workspace as a new name, and leaves that workspace alone', async () => {
      await upload('uid-writer', { fullFileName: 'other.png' }).expect(201);
      expect(files['ws1/other.png']).toBe(NEW);
      expect(files['ws2/other.png']).toBe(OLD);
    });

    it('reads the folder id the upload actually uses: no write access to that folder is a 403', async () => {
      await upload('uid-reader', {
        fullFileName: 'fresh.png',
        folderId: 'f1',
      }).expect(403);
      expect(filesService.addImageFromFile).not.toHaveBeenCalled();

      await upload('uid-writer', {
        fullFileName: 'fresh.png',
        folderId: 'f1',
      }).expect(201);
    });

    it('keeps letting a member upload into a folder with no permissions of its own', async () => {
      await upload('uid-reader', {
        fullFileName: 'fresh.png',
        folderId: 'f2',
      }).expect(201);
    });

    it('refuses a folder id that matches no folder', async () => {
      await upload('uid-reader', {
        fullFileName: 'fresh.png',
        folderId: 'nope',
      }).expect(403);
    });

    it('does not let a folder id in the query stand in for the one in the body', async () => {
      await request(app.getHttpServer())
        .post(`${BASE}/image?folderId=f2`)
        .set(as('uid-reader'))
        .field('title', 't')
        .field('fullFileName', 'fresh.png')
        .field('folderId', 'f1')
        .attach('file', Buffer.from(NEW), 'file.png')
        .expect(403);
      expect(filesService.addImageFromFile).not.toHaveBeenCalled();
    });
  });

  describe('POST image/add-from-personal', () => {
    it('lets a member with write permission copy a personal image over the one with that name', async () => {
      await addFromPersonal('uid-writer', 'itemId=p1').expect(201);
      expect(files['ws1/restricted.png']).toBe('personal copy');
    });

    it('refuses a member with only read permission, and the file and its original are unchanged', async () => {
      await addFromPersonal('uid-reader', 'itemId=p1').expect(403);
      expect(files['ws1/restricted.png']).toBe(OLD);
      expect(files['ws1/originals/restricted.png']).toBe(OLD);
      expect(filesService.moveItemFromPersonalToWorkspace).not.toHaveBeenCalled();
    });

    it('lets the workspace admin copy it', async () => {
      await addFromPersonal('uid-admin', 'itemId=p1').expect(201);
    });

    it('refuses a user who is not a member of the workspace', async () => {
      await addFromPersonal('uid-stranger', 'itemId=p1').expect(403);
      expect(filesService.moveItemFromPersonalToWorkspace).not.toHaveBeenCalled();
    });

    it('refuses an anonymous request', async () => {
      await addFromPersonal(null, 'itemId=p1').expect(401);
      expect(filesService.moveItemFromPersonalToWorkspace).not.toHaveBeenCalled();
    });

    it('keeps letting a member copy a personal image under a new name', async () => {
      await addFromPersonal('uid-reader', 'itemId=p2').expect(201);
      expect(files['ws1/fresh.png']).toBe('personal copy');
    });

    it('leaves a personal image that does not exist to the handler, which writes nothing', async () => {
      await addFromPersonal('uid-reader', 'itemId=missing').expect(201);
      expect(Object.keys(files)).toHaveLength(5);
    });

    it('still checks the folder id in the query', async () => {
      await addFromPersonal('uid-reader', 'itemId=p2&folderId=f1').expect(403);
      expect(filesService.moveItemFromPersonalToWorkspace).not.toHaveBeenCalled();
    });
  });
});
