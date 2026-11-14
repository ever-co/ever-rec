/**
 * The view counter of a shared item. The item is found from the share link record, the viewer is
 * the verified user and the address is the one of the connection: nothing that decides which
 * database node is read or written comes from the caller. The viewers (name, email, photo) are
 * returned to the owner of the item, or a member of its workspace, and to nobody else. The writes
 * are transactions, so two views at once are both kept.
 */
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { UniqueViewsSharedService } from './uniqueViews.shared.service';

const mockDb: { data: Record<string, any>; writes: string[] } = {
  data: {},
  writes: [],
};

jest.mock('firebase-admin', () => {
  const segments = (path: string) => path.split('/').filter(Boolean);
  const read = (path: string) => {
    let value: any = mockDb.data;
    for (const segment of segments(path)) {
      value = value?.[segment];
    }
    return value ?? null;
  };
  const write = (path: string, value: any) => {
    const parts = segments(path);
    let node = mockDb.data;
    for (const part of parts.slice(0, -1)) {
      node[part] = node[part] ?? {};
      node = node[part];
    }
    node[parts[parts.length - 1]] = value;
    mockDb.writes.push(path);
  };
  const snapshot = (value: any) => ({
    val: () => value ?? null,
    exists: () => value !== null && value !== undefined,
  });
  const makeRef = (path: string): any => ({
    get: async () => {
      await Promise.resolve();
      return snapshot(read(path));
    },
    child: (name: string) => makeRef(`${path}/${name}`),
    // Like the real thing, the update function runs against the current value and nothing can
    // happen between the read and the write.
    transaction: async (update: (current: any) => any) => {
      await Promise.resolve();
      const current = read(path);
      const next = update(current);
      if (next === undefined) {
        return { committed: false, snapshot: snapshot(current) };
      }
      write(path, next);
      return { committed: true, snapshot: snapshot(next) };
    },
  });
  return { database: () => ({ ref: makeRef }) };
});

const owner = { id: 'uid-owner', email: 'owner@example.com' };
const guest = {
  id: 'uid-guest',
  email: 'guest@example.com',
  name: 'Guest Person',
  photoURL: 'https://img.test/guest.png',
};

describe('UniqueViewsSharedService', () => {
  let service: UniqueViewsSharedService;

  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    service = new UniqueViewsSharedService();
    mockDb.writes = [];
    mockDb.data = {
      users: {
        'uid-owner': {
          screenshots: { img1: { id: 'img1', uid: 'uid-owner' } },
          videos: {
            vid1: { id: 'vid1', uid: 'uid-owner' },
            trashed: { id: 'trashed', uid: 'uid-owner', trash: true },
          },
        },
        'uid-other': {
          screenshots: { img1: { id: 'img1', uid: 'uid-other', views: [] } },
        },
      },
      shared: {
        linkImg: { uid: 'uid-owner', imageId: 'img1', uidImageId: 'x' },
        evil: { uid: 'uid-owner/screenshots/img1/likes', imageId: 'img1' },
      },
      sharedVideos: {
        linkVid: { uid: 'uid-owner', videoId: 'vid1' },
        linkTrashed: { uid: 'uid-owner', videoId: 'trashed' },
      },
      sharedWorkspaceItems: {
        wsLink: { id: 'wsLink', workspaceId: 'ws1', itemId: 'wimg1' },
      },
      workspaces: {
        ws1: {
          admin: 'uid-admin',
          members: { m1: { id: 'uid-member' } },
          screenshots: {
            wimg1: { id: 'wimg1', uid: 'uid-creator', workspaceIds: ['ws1'] },
          },
        },
      },
    };
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const add = (overrides: Record<string, any> = {}) =>
    service.addUniqueView({
      sharedId: 'linkImg',
      itemType: 'image',
      isWorkspace: false,
      viewer: null,
      ip: '1.1.1.1',
      ...overrides,
    });

  describe('addUniqueView', () => {
    it('counts an anonymous viewer once per address', async () => {
      const first = await add();
      const again = await add();
      const another = await add({ ip: '2.2.2.2' });

      expect(first.data).toEqual({ uniqueViewsDb: [], views: 1 });
      expect(again.data?.views).toBe(1);
      expect(another.data?.views).toBe(2);
      expect(
        mockDb.data.users['uid-owner'].screenshots.img1.views.map(
          (view: any) => view.ip,
        ),
      ).toEqual(['1.1.1.1', '2.2.2.2']);
    });

    it('records a signed-in viewer once, from the verified user', async () => {
      await add({ viewer: guest });
      await add({ viewer: guest });

      const stored = mockDb.data.users['uid-owner'].screenshots.img1;
      expect(stored.uniqueViews).toHaveLength(1);
      expect(stored.uniqueViews[0]).toMatchObject({
        id: 'uid-guest',
        displayName: 'Guest Person',
        email: 'guest@example.com',
        photoURL: 'https://img.test/guest.png',
      });
      expect(stored.views).toHaveLength(1);
    });

    it('does not return the viewers to whoever opened the link', async () => {
      await add({ viewer: guest });
      const res = await add({ viewer: { id: 'uid-third', email: 't@x.test' } });

      expect(res.data?.uniqueViewsDb).toEqual([]);
      expect(JSON.stringify(res)).not.toContain('guest@example.com');
    });

    it('does not count the owner looking at their own item', async () => {
      const res = await add({ viewer: owner });

      expect(res.data?.views).toBe(0);
      expect(mockDb.writes).toEqual([]);
    });

    it('keeps both views when two viewers arrive at the same time', async () => {
      await Promise.all([
        add({ ip: '3.3.3.3' }),
        add({ ip: '4.4.4.4' }),
        add({ viewer: guest, ip: '5.5.5.5' }),
        add({ viewer: { id: 'uid-b', email: 'b@x.test' }, ip: '6.6.6.6' }),
      ]);

      const stored = mockDb.data.users['uid-owner'].screenshots.img1;
      expect(stored.views).toHaveLength(4);
      expect(stored.uniqueViews).toHaveLength(2);
    });

    it('writes nothing without an address, and never an empty or oversized one', async () => {
      await add({ ip: null });
      await add({ ip: '   ' });
      expect(mockDb.writes).toEqual([]);

      await add({ ip: 'x'.repeat(500) });
      const [view] = mockDb.data.users['uid-owner'].screenshots.img1.views;
      expect(view.ip).toHaveLength(64);
    });

    it('counts a video through a video link, and a workspace item through a workspace link', async () => {
      await add({ sharedId: 'linkVid', itemType: 'video' });
      await add({ sharedId: 'wsLink', isWorkspace: true });

      expect(mockDb.data.users['uid-owner'].videos.vid1.views).toHaveLength(1);
      expect(mockDb.data.workspaces.ws1.screenshots.wimg1.views).toHaveLength(
        1,
      );
    });

    it('refuses a link that does not exist, or a trashed item, with nothing written', async () => {
      await expect(add({ sharedId: 'nope' })).rejects.toBeInstanceOf(
        NotFoundException,
      );
      await expect(
        add({ sharedId: 'linkTrashed', itemType: 'video' }),
      ).rejects.toBeInstanceOf(NotFoundException);
      // A video link is not an image link.
      await expect(add({ sharedId: 'linkVid' })).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(mockDb.writes).toEqual([]);
    });

    it('refuses a link id that is not a plain id, so no path can be built from it', async () => {
      for (const sharedId of [
        'linkImg/likes',
        '../users',
        'a.b',
        '',
        undefined,
        null,
        { a: 1 },
        ['linkImg'],
      ]) {
        await expect(add({ sharedId })).rejects.toBeInstanceOf(
          BadRequestException,
        );
      }
      expect(mockDb.writes).toEqual([]);
    });

    it('refuses a link record that holds an id which is not a plain id', async () => {
      await expect(add({ sharedId: 'evil' })).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(mockDb.writes).toEqual([]);
    });

    it('reads the workspace flag from the server side value only', async () => {
      // `isWorkspace` false: the workspace link id is looked up among the personal links.
      await expect(
        add({ sharedId: 'wsLink', isWorkspace: false }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('getUniqueView', () => {
    beforeEach(async () => {
      await add({ viewer: guest });
      await add({ ip: '9.9.9.9' });
      await service.addUniqueView({
        sharedId: 'wsLink',
        itemType: 'image',
        isWorkspace: true,
        viewer: guest,
        ip: '7.7.7.7',
      });
    });

    const get = (overrides: Record<string, any> = {}) =>
      service.getUniqueView({
        itemType: 'image',
        sharedId: 'linkImg',
        isWorkspace: false,
        userId: null,
        ...overrides,
      });

    it('returns the viewers to the owner of the item', async () => {
      const res = await get({ userId: 'uid-owner' });

      expect(res.data?.views).toBe(2);
      expect(res.data?.uniqueViewsDb).toHaveLength(1);
      expect(res.data?.uniqueViewsDb[0].email).toBe('guest@example.com');
    });

    it.each([
      ['an anonymous caller', null],
      ['a signed-in stranger', 'uid-guest'],
    ])('gives %s the count only, with no email in it', async (_name, userId) => {
      const res = await get({ userId });

      expect(res.data).toEqual({ uniqueViewsDb: [], views: 2 });
      expect(JSON.stringify(res)).not.toContain('guest@example.com');
      expect(JSON.stringify(res)).not.toContain('Guest Person');
    });

    it('finds the caller’s own item by id', async () => {
      const res = await get({
        sharedId: undefined,
        itemId: 'img1',
        userId: 'uid-owner',
      });

      expect(res.data?.uniqueViewsDb).toHaveLength(1);
    });

    it('does not let an item id reach another user’s item: it is looked up in the caller’s own library', async () => {
      // `uid-other` has an `img1` too, with no viewers; the caller never sees `uid-owner`'s.
      const res = await get({
        sharedId: undefined,
        itemId: 'img1',
        userId: 'uid-other',
      });
      expect(res.data).toEqual({ uniqueViewsDb: [], views: 0 });

      await expect(
        get({ sharedId: undefined, itemId: 'img1', userId: null }),
      ).rejects.toBeInstanceOf(NotFoundException);
      await expect(
        get({ sharedId: undefined, itemId: 'missing', userId: 'uid-owner' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('returns the viewers of a workspace item to its admin, its members and its creator only', async () => {
      const as = (userId: string | null) =>
        get({ sharedId: 'wsLink', isWorkspace: true, userId });

      expect((await as('uid-admin')).data?.uniqueViewsDb).toHaveLength(1);
      expect((await as('uid-member')).data?.uniqueViewsDb).toHaveLength(1);
      expect((await as('uid-creator')).data?.uniqueViewsDb).toHaveLength(1);

      for (const outsider of ['uid-outsider', null]) {
        const res = await as(outsider);
        expect(res.data).toEqual({ uniqueViewsDb: [], views: 1 });
      }
    });

    it('finds a workspace item by id and workspace', async () => {
      const byId = (userId: string) =>
        get({
          sharedId: undefined,
          itemId: 'wimg1',
          workspaceId: 'ws1',
          userId,
        });

      expect((await byId('uid-member')).data?.uniqueViewsDb).toHaveLength(1);
      expect((await byId('uid-outsider')).data?.uniqueViewsDb).toEqual([]);
    });

    it('refuses ids that are not plain ids', async () => {
      for (const overrides of [
        { sharedId: 'linkImg/likes' },
        { sharedId: undefined, itemId: 'img1/likes', userId: 'uid-owner' },
        { sharedId: undefined, itemId: undefined, userId: 'uid-owner' },
        {
          sharedId: undefined,
          itemId: 'wimg1',
          workspaceId: 'ws1/members',
          userId: 'uid-member',
        },
      ]) {
        await expect(get(overrides)).rejects.toBeInstanceOf(
          BadRequestException,
        );
      }
    });
  });
});
