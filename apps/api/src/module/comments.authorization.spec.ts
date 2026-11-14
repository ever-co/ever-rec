/**
 * Who may read, add, edit and delete the comments of an image or a video.
 *
 * Before: any signed-in user could edit or delete any comment (even on an unshared item), and a
 * body `ownerId` made the read route return the comments of anyone's unshared item. Now only the
 * author edits or deletes a comment, and comments are read, added, edited or deleted only on an
 * item the caller owns or that is shared. A refusal changes nothing.
 *
 * The routes are the real controllers behind the real guards, pipes and the real SharedService;
 * only the token check, the other services and the database (an in-memory tree) are replaced.
 */
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { HttpService } from 'nestjs-http-promise';
import request from 'supertest';
import { FoldersSharedService } from '../services/shared/folders.shared.service';
import {
  COMMENT_MAX_LENGTH,
  SharedService,
} from '../services/shared/shared.service';
import { UniqueViewsSharedService } from '../services/shared/uniqueViews.shared.service';
import { TokenService } from './auth/services/tokens';
import { ImageController } from './image/image.controller';
import { ImageService } from './image/image.service';
import { ContextUploader as ImageContextUploader } from './image/uploader/context.uploader';
import { ContextUploader as VideoContextUploader } from './video/services/uploader/context.uploader';
import { VideoController } from './video/video.controller';
import { VideoService } from './video/video.service';

jest.mock('firebase/compat/auth', () => ({}));
jest.mock('firebase/compat/firestore', () => ({}));
jest.mock('./auth/services/tokens', () => ({ TokenService: class {} }));
jest.mock('../services/shared/folders.shared.service', () => ({
  FoldersSharedService: class {},
}));
jest.mock('../services/shared/uniqueViews.shared.service', () => ({
  UniqueViewsSharedService: class {},
}));
jest.mock('./image/uploader/context.uploader', () => ({
  ContextUploader: class {},
}));
jest.mock('./video/services/uploader/context.uploader', () => ({
  ContextUploader: class {},
}));
jest.mock('./image/image.service', () => ({ ImageService: class {} }));
jest.mock('./video/video.service', () => ({ VideoService: class {} }));

// The optional-user guard reads the id token with the admin SDK.
jest.mock('firebase-admin/auth', () => ({
  getAuth: () => ({
    verifyIdToken: async (token: string) => {
      if (!token.startsWith('uid-')) throw new Error('bad token');
      return { uid: token };
    },
  }),
}));

// An in-memory database tree behind `admin.database().ref(path)`.
const mockDb: { data: any } = { data: {} };
jest.mock('firebase-admin', () => {
  const segments = (path: string) => path.split('/').filter(Boolean);
  const read = (path: string) =>
    segments(path).reduce((node, key) => node?.[key], mockDb.data as any);
  return {
    database: () => ({
      ref: (path: string) => ({
        // `orderByChild(key).equalTo(value)`: the children whose `key` equals `value`.
        orderByChild: (key: string) => ({
          equalTo: (wanted: any) => ({
            get: async () => {
              const out: Record<string, any> = {};
              for (const [id, child] of Object.entries(read(path) ?? {})) {
                if ((child as any)?.[key] === wanted) out[id] = child;
              }
              const found = Object.keys(out).length > 0;
              return {
                val: () => (found ? out : null),
                exists: () => found,
              };
            },
          }),
        }),
        get: async () => {
          const value = read(path);
          return {
            val: () => (value === undefined ? null : value),
            exists: () => value !== undefined && value !== null,
          };
        },
        set: async (value: any) => {
          const keys = segments(path);
          const last = keys.pop() as string;
          let node = mockDb.data;
          for (const key of keys) {
            node[key] = node[key] ?? {};
            node = node[key];
          }
          node[last] = JSON.parse(JSON.stringify(value));
        },
        remove: async () => {
          const keys = segments(path);
          const last = keys.pop() as string;
          const parent = keys.reduce(
            (node, key) => node?.[key],
            mockDb.data as any,
          );
          if (parent) delete parent[last];
        },
      }),
    }),
  };
});

const KINDS = [
  {
    type: 'image',
    collection: 'screenshots',
    sharedRoot: 'shared',
    refKey: 'imageId',
    uidKey: 'uidImageId',
    sharedItem: 'item-shared',
    privateItem: 'item-private',
  },
  {
    type: 'video',
    collection: 'videos',
    sharedRoot: 'sharedVideos',
    refKey: 'videoId',
    uidKey: 'uidVideoId',
    sharedItem: 'item-shared',
    privateItem: 'item-private',
  },
];

const comment = (id: string, uid: string) => ({
  id,
  content: `text of ${id}`,
  timestamp: 1,
  uid,
  isEdited: false,
});

describe.each(KINDS)('comments of a $type', (kind) => {
  let app: INestApplication;
  const emit = jest.fn();

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [ImageController, VideoController],
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
        { provide: HttpService, useValue: {} },
        { provide: ConfigService, useValue: {} },
        { provide: EventEmitter2, useValue: { emit } },
        SharedService,
        { provide: ImageService, useValue: {} },
        { provide: VideoService, useValue: {} },
        { provide: FoldersSharedService, useValue: {} },
        { provide: UniqueViewsSharedService, useValue: {} },
        { provide: ImageContextUploader, useValue: {} },
        { provide: VideoContextUploader, useValue: {} },
      ],
    }).compile();

    app = moduleRef.createNestApplication({ logger: false });
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  const itemWithComments = (extra: object = {}) => ({
    id: 'x',
    comments: {
      byAuthor: comment('byAuthor', 'uid-author'),
      byOwner: comment('byOwner', 'uid-owner'),
    },
    ...extra,
  });

  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    emit.mockReset();
    mockDb.data = {
      users: {
        'uid-owner': {
          email: 'owner@example.test',
          [kind.collection]: {
            [kind.sharedItem]: itemWithComments({ id: kind.sharedItem }),
            [kind.privateItem]: itemWithComments({ id: kind.privateItem }),
          },
        },
        'uid-author': { email: 'author@example.test' },
        'uid-stranger': { email: 'stranger@example.test' },
      },
      [kind.sharedRoot]: {
        link1: {
          [kind.refKey]: kind.sharedItem,
          uid: 'uid-owner',
          [kind.uidKey]: `uid-owner|${kind.sharedItem}`,
        },
        // A record of someone else's item with the same item id must not count.
        link2: {
          [kind.refKey]: kind.privateItem,
          uid: 'uid-other',
          [kind.uidKey]: `uid-other|${kind.privateItem}`,
        },
      },
    };
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const snapshot = () => JSON.stringify(mockDb.data);
  const as = (uid: string) => ({ Authorization: `Bearer ${uid}` });
  const asOptional = (uid?: string) => (uid ? { idtoken: uid } : {});
  const commentsOf = (item: string) =>
    mockDb.data.users['uid-owner'][kind.collection][item].comments;

  const edit = (uid: string, item: string, commentId: string, body: object) =>
    request(app.getHttpServer())
      .put(`/${kind.type}/user/uid-owner/${item}/comment/${commentId}`)
      .set(as(uid))
      .send(body);
  const remove = (uid: string, item: string, commentId: string, pub = false) =>
    request(app.getHttpServer())
      .delete(
        `/${kind.type}/user/uid-owner/${item}/comments/${commentId}?isPublic=${pub}`,
      )
      .set(as(uid));
  const read = (item: string, body: object, uid?: string) =>
    request(app.getHttpServer())
      .post(`/${kind.type}/${item}/comments`)
      .set(asOptional(uid))
      .send(body);
  const add = (uid: string, item: string, body: object) =>
    request(app.getHttpServer())
      .post(`/${kind.type}/uid-owner/comment`)
      .set(as(uid))
      .send({ itemId: item, ...body });

  describe('edit', () => {
    it('is refused for someone who is not the author, on a shared item', async () => {
      const before = snapshot();
      const res = await edit('uid-stranger', kind.sharedItem, 'byAuthor', {
        comment: 'hacked',
        isPublic: true,
      }).expect(200);
      expect(res.body.status).toBe('error');
      expect(snapshot()).toBe(before);
    });

    it('is refused for someone who is not the author, on an unshared item', async () => {
      const before = snapshot();
      const res = await edit('uid-stranger', kind.privateItem, 'byOwner', {
        comment: 'hacked',
        isPublic: false,
      }).expect(200);
      expect(res.body.status).toBe('error');
      expect(snapshot()).toBe(before);
    });

    it('is refused for the item owner on a comment of someone else', async () => {
      const before = snapshot();
      await edit('uid-owner', kind.sharedItem, 'byAuthor', {
        comment: 'rewritten',
        isPublic: true,
      }).expect(200);
      expect(snapshot()).toBe(before);
    });

    it('is refused for the author once the item is no longer shared', async () => {
      const before = snapshot();
      await edit('uid-author', kind.privateItem, 'byAuthor', {
        comment: 'late',
        isPublic: true,
      }).expect(200);
      expect(snapshot()).toBe(before);
    });

    it('is refused for an unknown comment and creates nothing', async () => {
      const before = snapshot();
      await edit('uid-owner', kind.sharedItem, 'nope', {
        comment: 'x',
      }).expect(200);
      expect(snapshot()).toBe(before);
    });

    it.each([undefined, null, '', '   ', 5, { a: 1 }, ['a']])(
      'is refused for content %j',
      async (content) => {
        const before = snapshot();
        await edit('uid-author', kind.sharedItem, 'byAuthor', {
          comment: content,
          isPublic: true,
        }).expect(200);
        expect(snapshot()).toBe(before);
      },
    );

    it('is refused for content longer than the limit', async () => {
      const before = snapshot();
      await edit('uid-author', kind.sharedItem, 'byAuthor', {
        comment: 'a'.repeat(COMMENT_MAX_LENGTH + 1),
        isPublic: true,
      }).expect(200);
      expect(snapshot()).toBe(before);
    });

    it('is refused without a signed-in user', async () => {
      const before = snapshot();
      await request(app.getHttpServer())
        .put(
          `/${kind.type}/user/uid-owner/${kind.sharedItem}/comment/byAuthor`,
        )
        .send({ comment: 'x' })
        .expect(401);
      expect(snapshot()).toBe(before);
    });

    it('lets the author edit their comment on a shared item', async () => {
      const res = await edit('uid-author', kind.sharedItem, 'byAuthor', {
        comment: 'fixed typo',
        isPublic: true,
      }).expect(200);
      expect(res.body.status).toBe('success');
      expect(commentsOf(kind.sharedItem).byAuthor).toMatchObject({
        content: 'fixed typo',
        isEdited: true,
        uid: 'uid-author',
      });
    });

    it('lets the owner edit their own comment on their unshared item', async () => {
      await edit('uid-owner', kind.privateItem, 'byOwner', {
        comment: 'note to self',
        isPublic: false,
      }).expect(200);
      expect(commentsOf(kind.privateItem).byOwner.content).toBe('note to self');
    });

    it('accepts content of exactly the limit', async () => {
      await edit('uid-author', kind.sharedItem, 'byAuthor', {
        comment: 'a'.repeat(COMMENT_MAX_LENGTH),
        isPublic: true,
      }).expect(200);
      expect(commentsOf(kind.sharedItem).byAuthor.content).toHaveLength(
        COMMENT_MAX_LENGTH,
      );
    });
  });

  describe('delete', () => {
    it('is refused for someone who is not the author, on a shared item', async () => {
      const before = snapshot();
      const res = await remove(
        'uid-stranger',
        kind.sharedItem,
        'byAuthor',
        true,
      ).expect(200);
      expect(res.body.status).toBe('error');
      expect(snapshot()).toBe(before);
      expect(emit).not.toHaveBeenCalled();
    });

    it('is refused for someone who is not the author, on an unshared item', async () => {
      const before = snapshot();
      const res = await remove(
        'uid-stranger',
        kind.privateItem,
        'byOwner',
      ).expect(200);
      expect(res.body.status).toBe('error');
      expect(snapshot()).toBe(before);
    });

    it('is refused for the item owner on a comment of someone else', async () => {
      const before = snapshot();
      await remove('uid-owner', kind.sharedItem, 'byAuthor', true).expect(200);
      expect(snapshot()).toBe(before);
    });

    it('is refused without a signed-in user', async () => {
      const before = snapshot();
      await request(app.getHttpServer())
        .delete(
          `/${kind.type}/user/uid-owner/${kind.sharedItem}/comments/byAuthor`,
        )
        .expect(401);
      expect(snapshot()).toBe(before);
    });

    it('lets the author delete their comment on a shared item', async () => {
      const res = await remove(
        'uid-author',
        kind.sharedItem,
        'byAuthor',
        true,
      ).expect(200);
      expect(res.body.status).toBe('success');
      expect(commentsOf(kind.sharedItem).byAuthor).toBeUndefined();
      expect(commentsOf(kind.sharedItem).byOwner).toBeDefined();
    });

    it('lets the owner delete their own comment on their unshared item', async () => {
      await remove('uid-owner', kind.privateItem, 'byOwner').expect(200);
      expect(commentsOf(kind.privateItem).byOwner).toBeUndefined();
    });
  });

  describe('read', () => {
    it('does not return the comments of an unshared item for a body owner id', async () => {
      const res = await read(
        kind.privateItem,
        { ownerId: 'uid-owner', isPublic: true },
        'uid-stranger',
      ).expect(200);
      expect(res.body).toEqual({ comments: [], commentsLength: 0 });
    });

    it('does not return them to an anonymous caller either', async () => {
      const res = await read(kind.privateItem, {
        ownerId: 'uid-owner',
        isPublic: false,
      }).expect(200);
      expect(res.body).toEqual({ comments: [], commentsLength: 0 });
    });

    it('does not trust isPublic: false with an owner id to reach an unshared item', async () => {
      const res = await read(
        kind.privateItem,
        { ownerId: 'uid-owner', isPublic: false },
        'uid-stranger',
      ).expect(200);
      expect(res.body.comments).toEqual([]);
    });

    it('gives nothing for an owner id that is not a plain id', async () => {
      const res = await read(
        kind.sharedItem,
        { ownerId: 'uid-owner/other', isPublic: true },
        'uid-stranger',
      ).expect(200);
      expect(res.body).toEqual({ comments: [], commentsLength: 0 });
    });

    it('gives nothing for an owner id that is not a string', async () => {
      const res = await read(
        kind.sharedItem,
        { ownerId: { a: 1 }, isPublic: true },
        'uid-stranger',
      ).expect(200);
      expect(res.body).toEqual({ comments: [], commentsLength: 0 });
    });

    it('returns the comments of a shared item to a signed-in viewer and to an anonymous one', async () => {
      for (const uid of ['uid-stranger', undefined]) {
        const res = await read(
          kind.sharedItem,
          { ownerId: 'uid-owner', isPublic: true },
          uid,
        ).expect(200);
        expect(res.body.commentsLength).toBe(2);
        expect(res.body.comments.map((c: any) => c.id).sort()).toEqual([
          'byAuthor',
          'byOwner',
        ]);
      }
    });

    it('returns the comments of their own unshared item to the owner', async () => {
      const res = await read(
        kind.privateItem,
        { ownerId: null, isPublic: false },
        'uid-owner',
      ).expect(200);
      expect(res.body.commentsLength).toBe(2);
    });
  });

  describe('add', () => {
    it('is refused on an unshared item of someone else, and writes nothing', async () => {
      const before = snapshot();
      const res = await add('uid-stranger', kind.privateItem, {
        comment: 'hello',
        isPublic: false,
      }).expect(201);
      expect(res.body.status).toBe('error');
      expect(snapshot()).toBe(before);
    });

    it('is refused for an item that does not exist, with no stray node', async () => {
      const before = snapshot();
      await add('uid-owner', 'missing', {
        comment: 'hello',
        isPublic: false,
      }).expect(201);
      expect(snapshot()).toBe(before);
    });

    it('is refused for an item id that is not a plain id', async () => {
      const before = snapshot();
      await add('uid-owner', `${kind.sharedItem}/comments`, {
        comment: 'hello',
        isPublic: false,
      }).expect(201);
      expect(snapshot()).toBe(before);
    });

    it.each([undefined, null, '', '  ', 7, { a: 1 }])(
      'is refused for content %j',
      async (content) => {
        const before = snapshot();
        await add('uid-stranger', kind.sharedItem, {
          comment: content,
          isPublic: true,
        }).expect(201);
        expect(snapshot()).toBe(before);
      },
    );

    it('is refused for content longer than the limit', async () => {
      const before = snapshot();
      await add('uid-stranger', kind.sharedItem, {
        comment: 'a'.repeat(COMMENT_MAX_LENGTH + 1),
        isPublic: true,
      }).expect(201);
      expect(snapshot()).toBe(before);
    });

    it('lets anyone signed in comment on a shared item', async () => {
      const res = await add('uid-stranger', kind.sharedItem, {
        comment: 'nice',
        isPublic: true,
      }).expect(201);
      expect(res.body.status).toBe('success');
      const stored = Object.values(commentsOf(kind.sharedItem)) as any[];
      expect(stored).toHaveLength(3);
      expect(stored.find((c) => c.content === 'nice').uid).toBe(
        'uid-stranger',
      );
    });

    it('lets the owner comment on their own unshared item', async () => {
      await add('uid-owner', kind.privateItem, {
        comment: 'todo',
        isPublic: false,
      }).expect(201);
      expect(Object.keys(commentsOf(kind.privateItem))).toHaveLength(3);
    });
  });
});
