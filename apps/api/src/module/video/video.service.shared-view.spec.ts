/**
 * The share page of a video names its owner from the share record, never from the `uid` field of
 * the video (its owner can write that field), and sends neither the owner's email nor the uids of
 * the people who liked it. Likes are not written by the video update.
 */
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

const mockDb: { data: Record<string, any>; updates: Record<string, any> } = {
  data: {},
  updates: {},
};
jest.mock('firebase-admin', () => {
  const read = (path: string) => {
    let value: any = mockDb.data;
    for (const segment of path.split('/').filter(Boolean)) {
      value = value?.[segment];
    }
    return value ?? null;
  };
  const ref = (path: string) => ({
    get: async () => ({
      val: () => read(path),
      exists: () => read(path) != null,
    }),
    update: async (data: any) => {
      mockDb.updates[path] = data;
    },
    orderByKey: () => ({
      equalTo: (key: string) => ({
        get: async () => {
          const value = (read(path) ?? {})[key];
          return { val: () => (value ? { [key]: value } : null) };
        },
      }),
    }),
  });
  return {
    database: () => ({ ref }),
    storage: () => ({
      bucket: () => ({
        file: (path: string) => ({
          getSignedUrl: async () => [`signed:${path}`],
        }),
      }),
    }),
  };
});

describe('VideoService shared view and update', () => {
  let service: VideoService;

  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    service = new VideoService(
      {} as any,
      { emit: jest.fn() } as any,
      {} as any,
      {} as any,
    );
    mockDb.updates = {};
    mockDb.data = {
      users: {
        'uid-owner': {
          displayName: 'Owner',
          photoURL: 'owner.png',
          email: 'owner@example.test',
          videos: {
            vid1: {
              id: 'vid1',
              refName: 'a.webm',
              title: 'Mine',
              // Written by the owner: names somebody else.
              uid: 'uid-victim',
              likes: [
                { uid: 'uid-a', timestamp: 1 },
                { uid: 'uid-b', timestamp: 2 },
              ],
            },
          },
        },
        'uid-victim': {
          displayName: 'Victim',
          photoURL: 'victim.png',
          email: 'victim@example.test',
        },
        'uid-uploader': {
          displayName: 'Uploader',
          photoURL: 'uploader.png',
          email: 'uploader@example.test',
        },
      },
      sharedVideos: {
        link1: {
          uid: 'uid-owner',
          videoId: 'vid1',
          uidVideoId: 'uid-owner|vid1',
        },
      },
      workspaces: {
        ws1: {
          videos: {
            item1: {
              id: 'item1',
              refName: 'w.webm',
              uid: 'uid-uploader',
              likes: [],
            },
          },
        },
      },
      sharedWorkspaceItems: {
        wlink: { workspaceId: 'ws1', itemId: 'item1', queryField: 'q' },
      },
    };
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('getVideoBySharedId', () => {
    it('names the owner from the share record, not from the video’s own uid', async () => {
      const result = await service.getVideoBySharedId('link1', false);

      expect(result.data.video.owner).toEqual({
        displayName: 'Owner',
        photoURL: 'owner.png',
        id: 'uid-owner',
      });
      expect(result.data.video.dbData.uid).toBe('uid-owner');
    });

    it('sends no email at all', async () => {
      const result = await service.getVideoBySharedId('link1', false);

      expect(result.data.video.owner).not.toHaveProperty('email');
      expect(JSON.stringify(result)).not.toContain('@example.test');
    });

    it('sends the likes without the uids of the likers', async () => {
      const result = await service.getVideoBySharedId('link1', false);

      expect(result.data.video.dbData.likes).toEqual([
        { uid: '', timestamp: 1 },
        { uid: '', timestamp: 2 },
      ]);
      expect(JSON.stringify(result)).not.toContain('uid-a');
      expect(JSON.stringify(result)).not.toContain('uid-b');
    });

    it('keeps the viewer’s own like marked', async () => {
      const result = await service.getVideoBySharedId('link1', false, 'uid-a');

      expect(result.data.video.dbData.likes).toEqual([
        { uid: 'uid-a', timestamp: 1 },
        { uid: '', timestamp: 2 },
      ]);
    });

    it('still reads a workspace item’s uploader from the item', async () => {
      const result = await service.getVideoBySharedId('wlink', true);

      expect(result.data.video.owner).toEqual({
        displayName: 'Uploader',
        photoURL: 'uploader.png',
        id: 'uid-uploader',
      });
      expect(result.data.video.url).toBe(
        'signed:workspaces/ws1/videos/w.webm',
      );
    });

    it('keeps serving the video file of the share record’s user', async () => {
      const result = await service.getVideoBySharedId('link1', false);

      expect(result.data.video.url).toBe('signed:users/uid-owner/videos/a.webm');
    });
  });

  describe('updateVideoData', () => {
    beforeEach(() => {
      jest.spyOn(service, 'getVideoByIdPrivate').mockResolvedValue(null);
    });

    it('does not write the likes sent by the client', async () => {
      await service.updateVideoData(
        'uid-owner',
        'vid1',
        false,
        false,
        [{ uid: 'planted', timestamp: 9 }],
        'Renamed',
      );

      expect(mockDb.updates['users/uid-owner/videos/vid1']).toEqual({
        title: 'Renamed',
        parentId: false,
        trash: false,
      });
    });

    it('does not reset the likes when the client sends none', async () => {
      await service.updateVideoData(
        'uid-owner',
        'vid1',
        undefined,
        true,
        undefined,
      );

      expect(mockDb.updates['users/uid-owner/videos/vid1']).toEqual({
        trash: true,
      });
    });
  });
});
