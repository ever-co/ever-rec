/**
 * The share page of an image or a video (`shared/single`) is open to anyone with the link. Its
 * answer must not carry `uniqueViews`, the names and emails of the signed-in viewers: those go to
 * the owner only, through `shared/get-view-info`.
 */
import { ImageService } from '../../module/image/image.service';
import { VideoService } from '../../module/video/video.service';

jest.mock('sharp', () => ({}), { virtual: true });
jest.mock('../../module/editor-websocket-module/editor.gateway', () => ({
  EditorGateway: class {},
}));
jest.mock('src/services/utils/uploadVideoToBucket', () => ({
  uploadVideoToBucket: jest.fn(),
}));
jest.mock('../utils/fixVideoWithFFMPEG', () => ({
  fixVideoWithFFMPEG: jest.fn(),
}));
jest.mock('../../module/video-services/streamService.service', () => ({
  StreamServiceService: class {},
}));
jest.mock('./shared.service', () => ({ SharedService: class {} }));
jest.mock('./folders.shared.service', () => ({
  FoldersSharedService: class {},
}));

const mockDb: { data: Record<string, any> } = { data: {} };
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

const viewers = [
  {
    id: 'uid-viewer',
    email: 'viewer@example.test',
    displayName: 'Viewer',
    timestamp: 1,
  },
];

describe('shared/single never returns the viewers of an item', () => {
  let images: ImageService;
  let videos: VideoService;

  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    images = new ImageService(
      {} as any,
      {} as any,
      { emit: jest.fn() } as any,
      {} as any,
    );
    videos = new VideoService(
      {} as any,
      { emit: jest.fn() } as any,
      {} as any,
      {} as any,
    );
    const item = (id: string) => ({
      id,
      uid: 'uid-owner',
      refName: `${id}.bin`,
      uniqueViews: viewers,
      views: [{ ip: '1.1.1.1', timestamp: 1 }],
    });
    mockDb.data = {
      users: {
        'uid-owner': {
          displayName: 'Owner',
          screenshots: { img1: item('img1') },
          videos: { vid1: item('vid1') },
        },
      },
      shared: { linkImg: { uid: 'uid-owner', imageId: 'img1' } },
      sharedVideos: { linkVid: { uid: 'uid-owner', videoId: 'vid1' } },
      sharedWorkspaceItems: {
        wsImg: { workspaceId: 'ws1', itemId: 'wimg1' },
        wsVid: { workspaceId: 'ws1', itemId: 'wvid1' },
      },
      workspaces: {
        ws1: {
          screenshots: { wimg1: item('wimg1') },
          videos: { wvid1: item('wvid1') },
        },
      },
    };
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it.each([
    ['a personal image', 'linkImg', false],
    ['a workspace image', 'wsImg', true],
  ])('%s', async (_name, link, isWorkspace) => {
    const result = await images.getImageBySharedId(link, isWorkspace);

    expect(result.image.dbData.views).toBe(1);
    expect(result.image.dbData).not.toHaveProperty('uniqueViews');
    expect(JSON.stringify(result)).not.toContain('viewer@example.test');
  });

  it.each([
    ['a personal video', 'linkVid', false],
    ['a workspace video', 'wsVid', true],
  ])('%s', async (_name, link, isWorkspace) => {
    const result: any = await videos.getVideoBySharedId(link, isWorkspace);

    expect(result.data.video.dbData.views).toBe(1);
    expect(result.data.video.dbData).not.toHaveProperty('uniqueViews');
    expect(JSON.stringify(result)).not.toContain('viewer@example.test');
  });
});
