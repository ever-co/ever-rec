/**
 * Adding a comment writes a node under `users/<ownerId>/<collection>/<itemId>/comments`. All three
 * ids come from the request, so they must be plain ids, the item must exist, and the caller must
 * be its owner or the item must be shared by a link. The client-sent `isPublic` flag decides
 * nothing. Anything else is refused with nothing written.
 */
import { SharedService } from './shared.service';

const mockDb: { data: Record<string, any>; writes: string[] } = {
  data: {},
  writes: [],
};
jest.mock('firebase-admin', () => ({
  database: () => ({
    ref: (path: string) => ({
      get: async () => {
        let value: any = mockDb.data;
        for (const segment of path.split('/').filter(Boolean)) {
          value = value?.[segment];
        }
        return { val: () => value ?? null };
      },
      set: async () => {
        mockDb.writes.push(path);
      },
    }),
  }),
}));

describe('SharedService.addComment', () => {
  const emit = jest.fn();
  let service: SharedService;

  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    service = new SharedService({ emit } as any);
    emit.mockReset();
    mockDb.writes = [];
    mockDb.data = {
      users: {
        'uid-owner': {
          email: 'owner@example.com',
          videos: { vid1: { id: 'vid1' }, vid2: { id: 'vid2' } },
          screenshots: { img1: { id: 'img1' } },
        },
        'uid-guest': { email: 'guest@example.com' },
        'uid-noemail': {},
      },
      sharedVideos: {
        link1: { uid: 'uid-owner', videoId: 'vid1' },
      },
      shared: {
        link2: { uid: 'uid-owner', imageId: 'img1' },
      },
    };
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const comment = (
    type: 'video' | 'image',
    owner: string,
    user: string,
    itemId: string,
    isPublic: any = false,
  ) => service.addComment(type, owner, user, itemId, 'hello', isPublic);

  it('lets the owner comment on their own item, public flag or not', async () => {
    const result = await comment('video', 'uid-owner', 'uid-owner', 'vid2');
    expect(result.status).toBe('success');
    expect(mockDb.writes).toHaveLength(1);
    expect(mockDb.writes[0]).toMatch(
      /^\/users\/uid-owner\/videos\/vid2\/comments\/[\w-]{12}$/,
    );

    expect(
      (await comment('image', 'uid-owner', 'uid-owner', 'img1', true)).status,
    ).toBe('success');
    expect(mockDb.writes).toHaveLength(2);
  });

  it('lets another signed-in user comment on an item that is shared by link', async () => {
    expect(
      (await comment('video', 'uid-owner', 'uid-guest', 'vid1', true)).status,
    ).toBe('success');
    expect(
      (await comment('image', 'uid-owner', 'uid-guest', 'img1', true)).status,
    ).toBe('success');
    expect(mockDb.writes).toHaveLength(2);
  });

  it("refuses another user's item that is not shared, whatever isPublic says", async () => {
    for (const isPublic of [false, true, 'false', 'true', undefined]) {
      const result = await comment(
        'video',
        'uid-owner',
        'uid-guest',
        'vid2',
        isPublic,
      );
      expect(result.status).not.toBe('success');
    }
    expect(mockDb.writes).toEqual([]);
  });

  it('refuses an item of another owner than the one in the path', async () => {
    mockDb.data.users['uid-guest'].videos = { mine: { id: 'mine' } };
    expect((await comment('video', 'uid-guest', 'uid-owner', 'vid1')).status).not.toBe(
      'success',
    );
    expect((await comment('video', 'uid-guest', 'uid-guest', 'vid1')).status).not.toBe(
      'success',
    );
    expect(mockDb.writes).toEqual([]);
  });

  it('writes nothing for an item that does not exist', async () => {
    expect((await comment('video', 'uid-owner', 'uid-owner', 'gone')).status).not.toBe(
      'success',
    );
    expect(
      (await comment('video', 'uid-owner', 'uid-guest', 'gone', true)).status,
    ).not.toBe('success');
    expect((await comment('image', 'uid-owner', 'uid-owner', 'vid1')).status).not.toBe(
      'success',
    );
    expect(mockDb.writes).toEqual([]);
  });

  it('refuses nested paths and ids that are not plain ids', async () => {
    const bad = ['vid1/comments/x', 'vid1/..', 'a.b', '$x', 'a b', '', '*'];
    for (const itemId of bad) {
      expect(
        (await comment('video', 'uid-owner', 'uid-owner', itemId)).status,
      ).not.toBe('success');
    }
    expect(
      (await comment('video', 'uid-owner/videos/vid1', 'uid-owner', 'vid1'))
        .status,
    ).not.toBe('success');
    expect(
      (await comment('video', 'uid-owner', 'uid-owner/x', 'vid1')).status,
    ).not.toBe('success');
    for (const itemId of [undefined, null, 5, { a: 1 }, ['vid1']]) {
      expect(
        (await comment('video', 'uid-owner', 'uid-owner', itemId as any))
          .status,
      ).not.toBe('success');
    }
    expect(mockDb.writes).toEqual([]);
  });

  it('keeps refusing a user without an email and an empty comment', async () => {
    expect(
      (await comment('video', 'uid-owner', 'uid-noemail', 'vid1', true)).status,
    ).not.toBe('success');
    expect(
      (
        await service.addComment(
          'video',
          'uid-owner',
          'uid-owner',
          'vid1',
          '',
          false,
        )
      ).status,
    ).not.toBe('success');
    expect(mockDb.writes).toEqual([]);
  });
});
