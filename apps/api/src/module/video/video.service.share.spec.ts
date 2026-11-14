/**
 * `VideoService.share` is called by the share route and by the messaging and issue-tracker
 * integrations with an id taken from the request. A link is made only for a video the caller owns;
 * an unknown id, another user's video or an id that is not a plain id is refused with nothing
 * written, and an owner still gets the same link every time.
 */
import { ForbiddenException } from '@nestjs/common';
import { VideoService } from './video.service';

jest.mock('sharp', () => ({}), { virtual: true });
jest.mock('src/services/utils/uploadVideoToBucket', () => ({
  uploadVideoToBucket: jest.fn(),
}));
jest.mock('../../services/utils/fixVideoWithFFMPEG', () => ({
  fixVideoWithFFMPEG: jest.fn(),
}));
jest.mock('../video-services/streamService.service', () => ({
  StreamServiceService: class {},
}));
jest.mock('../../services/shared/shared.service', () => ({
  SharedService: class {},
}));
jest.mock('../../services/shared/folders.shared.service', () => ({
  FoldersSharedService: class {},
}));

const mockDb: { data: Record<string, any>; writes: string[] } = {
  data: {},
  writes: [],
};
jest.mock('firebase-admin', () => {
  const read = (path: string) => {
    let value: any = mockDb.data;
    for (const segment of path.split('/').filter(Boolean)) {
      value = value?.[segment];
    }
    return value ?? null;
  };
  return {
    database: () => ({
      ref: (path: string) => ({
        get: async () => ({ val: () => read(path) }),
        set: async () => {
          mockDb.writes.push(path);
        },
        orderByChild: (child: string) => ({
          equalTo: (wanted: string) => ({
            get: async () => {
              const all = read(path) ?? {};
              const found = Object.fromEntries(
                Object.entries<any>(all).filter(
                  ([, v]) => v?.[child] === wanted,
                ),
              );
              return {
                val: () => (Object.keys(found).length ? found : null),
              };
            },
          }),
        }),
      }),
    }),
  };
});

describe('VideoService.share', () => {
  const emit = jest.fn();
  let service: VideoService;

  beforeEach(() => {
    service = new VideoService(
      {} as any,
      { emit } as any,
      {} as any,
      {} as any,
    );
    emit.mockReset();
    mockDb.writes = [];
    mockDb.data = {
      users: { 'uid-owner': { videos: { vid1: { id: 'vid1' } } } },
      sharedVideos: {
        existing: {
          uid: 'uid-owner',
          videoId: 'vid1',
          uidVideoId: 'uid-owner|vid1',
        },
      },
    };
  });

  it('returns the existing link of an own video and writes nothing', async () => {
    await expect(service.share('uid-owner', 'vid1')).resolves.toBe('existing');
    expect(mockDb.writes).toEqual([]);
  });

  it('creates a link for an own video that has none', async () => {
    mockDb.data.sharedVideos = {};
    const link = await service.share('uid-owner', 'vid1');
    expect(link).toHaveLength(12);
    expect(mockDb.writes).toEqual([`sharedVideos/${link}`]);
  });

  it('refuses a video that does not exist or belongs to someone else', async () => {
    mockDb.data.sharedVideos = {};
    await expect(service.share('uid-owner', 'gone')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    await expect(service.share('uid-other', 'vid1')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(mockDb.writes).toEqual([]);
  });

  it('refuses ids that are not plain ids', async () => {
    for (const id of ['vid1/x', '', 'a.b', '$x', undefined, null, { a: 1 }]) {
      await expect(
        service.share('uid-owner', id as any),
      ).rejects.toBeInstanceOf(ForbiddenException);
    }
    await expect(service.share('', 'vid1')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(mockDb.writes).toEqual([]);
  });
});
