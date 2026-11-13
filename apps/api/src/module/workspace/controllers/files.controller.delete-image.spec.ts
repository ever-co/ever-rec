/**
 * `DELETE /workspace/:workspaceId/files/image/single` is guarded on the `imageId` in the query,
 * but the handler used to delete the stored files named by the `refName` in the query. A member
 * who may delete one image could delete another image's file by sending that file name with the
 * allowed id. The files to delete must be the ones recorded for the image the guard checked.
 *
 * The routes are the real controller behind the real guards and the real service; only the
 * database, the storage bucket and the token check are in-memory stand-ins.
 */
import { INestApplication } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { InMemoryFirebaseApp } from '../../../../test/support/in-memory-firebase';
import { TokenService } from '../../auth/services/tokens';
import { WorkspaceFilesService } from '../services/files.service';
import { WorkspaceSharedService } from '../services/shared.service';
import { WorkspaceFilesController } from './files.controller';

let mockFirebase: InMemoryFirebaseApp;

jest.mock('firebase-admin', () => ({
  ...jest.requireActual('firebase-admin'),
  database: () => mockFirebase.database(),
  storage: () => mockFirebase.storage(),
}));
jest.mock('sharp', () => ({ __esModule: true, default: jest.fn() }));
jest.mock('../../auth/services/tokens', () => ({ TokenService: class {} }));
jest.mock('../services/shared.service', () => ({
  WorkspaceSharedService: class {},
}));

const DELETE_URL = '/workspace/ws1/files/image/single';
const PREFIX = 'workspaces/ws1/screenshots';

describe('DELETE workspace image/single', () => {
  let app: INestApplication;
  const deleteLinkById = jest.fn();

  beforeAll(async () => {
    mockFirebase = new InMemoryFirebaseApp();
    const utilities = {
      getWorkspaceById: async (id: string) => {
        const workspaceRef = mockFirebase.db.ref(`workspaces/${id}`);
        return { workspaceVal: (await workspaceRef.get()).val(), workspaceRef };
      },
      changeFolderItemCountRecursive: (folders: unknown[]) => folders,
    };
    const filesService = new WorkspaceFilesService(
      utilities as any,
      {} as any,
      { deleteLinkById } as any,
      {} as any,
      new EventEmitter2(),
      {} as any,
    );

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

  const files = (name: string) => [
    `${PREFIX}/${name}`,
    `${PREFIX}/thumbnails/${name}`,
    `${PREFIX}/originals/${name}`,
  ];

  beforeEach(async () => {
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    deleteLinkById.mockReset();
    mockFirebase.bucket.objects.clear();
    await mockFirebase.db.ref().set({});
    await mockFirebase.db.ref('workspaces/ws1').set({
      admin: 'uid-admin',
      members: [
        { id: 'uid-admin' },
        { id: 'uid-writer' },
        { id: 'uid-reader' },
      ],
      screenshots: {
        // The writer may delete img1 and only read img2.
        img1: {
          id: 'img1',
          refName: 'one.png',
          access: {
            members: [
              { uid: 'uid-writer', access: 'WRITE' },
              { uid: 'uid-reader', access: 'READ' },
            ],
          },
        },
        img2: {
          id: 'img2',
          refName: 'two.png',
          access: {
            members: [
              { uid: 'uid-writer', access: 'READ' },
              { uid: 'uid-reader', access: 'READ' },
            ],
          },
        },
        // An image with no permissions of its own.
        img3: { id: 'img3', refName: 'three.png' },
      },
    });
    for (const name of ['one.png', 'two.png', 'three.png']) {
      for (const path of files(name)) {
        mockFirebase.bucket.objects.set(path, Buffer.from(name));
      }
    }
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const stored = () => [...mockFirebase.bucket.objects.keys()].sort();
  const recorded = async (id: string) =>
    (await mockFirebase.db.ref(`workspaces/ws1/screenshots/${id}`).get()).val();

  const remove = (uid: string | undefined, query: string) => {
    const req = request(app.getHttpServer()).delete(`${DELETE_URL}?${query}`);
    return uid ? req.set({ Authorization: `Bearer ${uid}` }) : req;
  };

  it('deletes the image and its own files for a member who may write it', async () => {
    const res = await remove('uid-writer', 'imageId=img1&refName=one.png');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');

    expect(await recorded('img1')).toBeNull();
    expect(stored()).toEqual(
      [...files('two.png'), ...files('three.png')].sort(),
    );
    expect(deleteLinkById).toHaveBeenCalledWith('ws1', 'img1');
  });

  it('lets the workspace admin delete any image', async () => {
    await remove('uid-admin', 'imageId=img2&refName=two.png').expect(200);
    expect(await recorded('img2')).toBeNull();
    expect(stored()).not.toEqual(expect.arrayContaining(files('two.png')));
  });

  it("ignores a file name that is not the image's: the other image's files are untouched", async () => {
    // img1 is allowed; two.png is img2's file, which the writer may not delete.
    await remove('uid-writer', 'imageId=img1&refName=two.png').expect(200);

    expect(await recorded('img1')).toBeNull();
    expect(await recorded('img2')).not.toBeNull();
    expect(stored()).toEqual(
      [...files('two.png'), ...files('three.png')].sort(),
    );
  });

  it('deletes nothing when the id names no image, whatever file name is sent', async () => {
    const res = await remove('uid-writer', 'imageId=missing&refName=two.png');
    expect(res.body.status).toBe('error');

    expect(stored()).toHaveLength(9);
    expect(await recorded('img2')).not.toBeNull();
    expect(deleteLinkById).not.toHaveBeenCalled();
  });

  it('deletes nothing when the id names a record without a file name', async () => {
    await mockFirebase.db
      .ref('workspaces/ws1/screenshots/img4')
      .set({ id: 'img4' });

    await remove('uid-writer', 'imageId=img4&refName=two.png');

    expect(stored()).toHaveLength(9);
    expect(await recorded('img4')).not.toBeNull();
  });

  it('refuses a member with only read permission, and changes nothing', async () => {
    await remove('uid-reader', 'imageId=img1&refName=one.png').expect(403);
    await remove('uid-writer', 'imageId=img2&refName=two.png').expect(403);

    expect(stored()).toHaveLength(9);
    expect(await recorded('img1')).not.toBeNull();
    expect(await recorded('img2')).not.toBeNull();
  });

  it('refuses a user who is not a member of the workspace', async () => {
    await remove('uid-stranger', 'imageId=img3&refName=three.png').expect(403);
    expect(stored()).toHaveLength(9);
    expect(await recorded('img3')).not.toBeNull();
  });

  it('refuses an anonymous request', async () => {
    await remove(undefined, 'imageId=img3&refName=three.png').expect(401);
    expect(stored()).toHaveLength(9);
  });

  it('keeps letting a member delete an image with no permissions of its own', async () => {
    await remove('uid-reader', 'imageId=img3&refName=three.png').expect(200);
    expect(await recorded('img3')).toBeNull();
    expect(stored()).toEqual([...files('one.png'), ...files('two.png')].sort());
  });

  it('still refuses a file name that is not a plain image file name, before the handler', async () => {
    await remove('uid-writer', 'imageId=img1&refName=../two.png').expect(400);
    expect(stored()).toHaveLength(9);
  });
});
