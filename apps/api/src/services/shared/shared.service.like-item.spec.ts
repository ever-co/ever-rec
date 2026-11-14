/**
 * Liking an item reads, changes and writes its likes list. That now happens in one transaction,
 * so two people liking at the same moment both end up in the list, and nothing is created for an
 * item that does not exist or for an id that is not a plain id.
 */
import { SharedService } from './shared.service';

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
    // The update function runs against the current value; nothing can happen between the read
    // and the write.
    transaction: async (update: (current: any) => any) => {
      await Promise.resolve();
      const next = update(read(path));
      write(path, next);
      return { committed: true, snapshot: snapshot(next) };
    },
  });
  return { database: () => ({ ref: makeRef }) };
});

describe('SharedService.likeItem', () => {
  let service: SharedService;

  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    service = new SharedService({ emit: jest.fn() } as any);
    mockDb.writes = [];
    mockDb.data = {
      users: {
        'uid-owner': {
          videos: { vid1: { id: 'vid1' }, vid0: { id: 'vid0', likes: 0 } },
          screenshots: { img1: { id: 'img1' } },
        },
      },
      workspaces: {
        ws1: { videos: { wvid1: { id: 'wvid1' } } },
      },
    };
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('adds the like, and takes it back on the second call', async () => {
    const liked = await service.likeItem(
      'video',
      'vid1',
      'uid-owner',
      'uid-a',
    );
    expect(liked.data?.map((like) => like.uid)).toEqual(['uid-a']);

    const unliked = await service.likeItem(
      'video',
      'vid1',
      'uid-owner',
      'uid-a',
    );
    expect(unliked.data).toEqual([]);
  });

  it('keeps every like when several people like at the same time', async () => {
    await Promise.all(
      ['uid-a', 'uid-b', 'uid-c', 'uid-d'].map((uid) =>
        service.likeItem('video', 'vid1', 'uid-owner', uid),
      ),
    );

    const stored = mockDb.data.users['uid-owner'].videos.vid1.likes;
    expect(stored.map((like: any) => like.uid).sort()).toEqual([
      'uid-a',
      'uid-b',
      'uid-c',
      'uid-d',
    ]);
  });

  it('applies a like and an unlike that happen at the same moment', async () => {
    await service.likeItem('video', 'vid1', 'uid-owner', 'uid-a');
    await Promise.all([
      service.likeItem('video', 'vid1', 'uid-owner', 'uid-a'),
      service.likeItem('video', 'vid1', 'uid-owner', 'uid-b'),
    ]);

    const stored = mockDb.data.users['uid-owner'].videos.vid1.likes;
    expect(stored.map((like: any) => like.uid)).toEqual(['uid-b']);
  });

  it('treats a likes value of 0 as no likes', async () => {
    const res = await service.likeItem('video', 'vid0', 'uid-owner', 'uid-a');
    expect(res.data?.map((like) => like.uid)).toEqual(['uid-a']);
  });

  it('likes an item of a workspace', async () => {
    await service.likeItem('video', 'wvid1', 'uid-owner', 'uid-a', 'ws1');

    expect(mockDb.data.workspaces.ws1.videos.wvid1.likes).toHaveLength(1);
  });

  it('writes nothing for an item that does not exist', async () => {
    const res = await service.likeItem('video', 'gone', 'uid-owner', 'uid-a');

    expect(res.data).toBeNull();
    expect(mockDb.writes).toEqual([]);
  });

  it('writes nothing when an id is not a plain id', async () => {
    for (const [itemId, ownerUid] of [
      ['vid1/likes', 'uid-owner'],
      ['vid1', 'uid-owner/videos'],
      ['vid1', undefined],
      ['', 'uid-owner'],
    ]) {
      const res = await service.likeItem(
        'video',
        itemId as string,
        ownerUid as string,
        'uid-a',
      );
      expect(res.data).toBeNull();
    }
    expect(mockDb.writes).toEqual([]);
  });
});
