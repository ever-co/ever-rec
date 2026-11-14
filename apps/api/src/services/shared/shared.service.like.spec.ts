/**
 * The like route is the only way likes change: the caller toggles their own like and gets back the
 * count and their own uid, never the uids of the other likers. A stored value that is not a list
 * (the legacy number 0, planted data) counts as no likes.
 */
import { SharedService } from './shared.service';

const mockDb: { data: Record<string, any>; updates: Record<string, any> } = {
  data: {},
  updates: {},
};
const mockRead = (path: string) => {
  let value: any = mockDb.data;
  for (const segment of path.split('/').filter(Boolean)) {
    value = value?.[segment];
  }
  return value;
};
jest.mock('firebase-admin', () => ({
  database: () => ({
    ref: (path: string) => ({
      get: async () => {
        const value = mockRead(path);
        return { val: () => value ?? null, exists: () => value != null };
      },
      update: async (data: any) => {
        mockDb.updates[path] = data;
      },
    }),
  }),
}));

describe('SharedService.likeItem', () => {
  let service: SharedService;
  const path = '/users/uid-owner/videos/vid1';

  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    service = new SharedService({ emit: jest.fn() } as any);
    mockDb.updates = {};
    mockDb.data = {
      users: {
        'uid-owner': {
          videos: {
            vid1: {
              likes: [
                { uid: 'uid-a', timestamp: 1 },
                { uid: 'uid-b', timestamp: 2 },
              ],
            },
            legacy: { likes: 0 },
            planted: { likes: 'x' },
          },
        },
      },
    };
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('adds the caller’s like and returns the count with only their own uid', async () => {
    const result = await service.likeItem(
      'video',
      'vid1',
      'uid-owner',
      'uid-c',
    );

    expect(mockDb.updates[path].likes.map((like) => like.uid)).toEqual([
      'uid-a',
      'uid-b',
      'uid-c',
    ]);
    expect(result.data).toEqual([
      { uid: '', timestamp: 1 },
      { uid: '', timestamp: 2 },
      { uid: 'uid-c', timestamp: expect.any(Number) },
    ]);
  });

  it('removes the caller’s own like, and only theirs', async () => {
    const result = await service.likeItem(
      'video',
      'vid1',
      'uid-owner',
      'uid-a',
    );

    expect(mockDb.updates[path].likes).toEqual([{ uid: 'uid-b', timestamp: 2 }]);
    expect(result.data).toEqual([{ uid: '', timestamp: 2 }]);
  });

  it('starts a list when the stored likes are not a list', async () => {
    for (const id of ['legacy', 'planted']) {
      const result = await service.likeItem('video', id, 'uid-owner', 'uid-a');
      expect(result.data).toEqual([
        { uid: 'uid-a', timestamp: expect.any(Number) },
      ]);
    }
  });
});
