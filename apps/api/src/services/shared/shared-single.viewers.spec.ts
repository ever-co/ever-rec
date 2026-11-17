/**
 * The share page of an image or a video (`shared/single`) is open to anyone with the link. Its
 * answer must not carry `uniqueViews`, the names and emails of the signed-in viewers: those go to
 * the owner only, through `shared/get-view-info`. Nor may it carry the owner's Google Drive and
 * Dropbox copies of the item (`drivesData`, `dropBoxData`), which hold the owner's account emails,
 * the Drive file id and the Dropbox path. Only the fields the share and embed pages read go out.
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
    const item = (id: string, extra: Record<string, unknown> = {}) => ({
      id,
      uid: 'uid-owner',
      title: `Title ${id}`,
      created: '2026-01-02T03:04:05.000Z',
      refName: `${id}.bin`,
      parentId: 'folder-owner',
      trash: false,
      sourceUrl: 'https://intranet.example.test/private',
      uniqueViews: viewers,
      views: [{ ip: '1.1.1.1', timestamp: 1 }],
      // Saved to the owner's Google Drive and Dropbox: their account emails are on the item.
      drivesData: [{ email: 'owner@drive.test', driveId: 'd1' }],
      dropBoxData: { email: 'owner@dropbox.test', path_lower: '/x.png' },
      ...extra,
    });
    const video = { duration: '00:05', chaptersEnabled: true };
    const workspace = {
      workspaceIds: ['ws1'],
      isPublic: false,
      access: { members: [{ uid: 'uid-member', access: 'write' }] },
    };
    mockDb.data = {
      users: {
        'uid-owner': {
          displayName: 'Owner',
          screenshots: { img1: item('img1') },
          videos: { vid1: item('vid1', video) },
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
          screenshots: { wimg1: item('wimg1', workspace) },
          videos: {
            wvid1: item('wvid1', {
              ...video,
              ...workspace,
              streamData: { playbackUrl: 'https://stream.test/wvid1' },
            }),
          },
        },
      },
    };
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const expectNoOwnerOnlyData = (result: unknown, dbData: unknown) => {
    const json = JSON.stringify(result);
    expect(json).not.toContain('viewer@example.test');
    expect(json).not.toContain('owner@drive.test');
    expect(json).not.toContain('owner@dropbox.test');
    expect(dbData).not.toHaveProperty('uniqueViews');
    expect(dbData).not.toHaveProperty('drivesData');
    expect(dbData).not.toHaveProperty('dropBoxData');
  };

  it.each([
    ['a personal image', 'linkImg', false],
    ['a workspace image', 'wsImg', true],
  ])('%s', async (_name, link, isWorkspace) => {
    const result = await images.getImageBySharedId(link, isWorkspace);

    expect(result.image.dbData.views).toBe(1);
    expectNoOwnerOnlyData(result, result.image.dbData);
  });

  it.each([
    ['a personal video', 'linkVid', false],
    ['a workspace video', 'wsVid', true],
  ])('%s', async (_name, link, isWorkspace) => {
    const result: any = await videos.getVideoBySharedId(link, isWorkspace);

    expect(result.data.video.dbData.views).toBe(1);
    expectNoOwnerOnlyData(result, result.data.video.dbData);
  });

  // The share pages read these. A workspace item also keeps `workspaceIds`: the page asks for the
  // viewer list with it when the uploader opens their own link.
  const imageFields = ['id', 'title', 'created', 'views', 'link']
    .concat(['commentsLength', 'comments', 'likes', 'uid'])
    .sort();
  const videoFields = imageFields
    .concat(['duration', 'chaptersEnabled', 'chapters'])
    .sort();

  it.each([
    ['a personal image', 'linkImg', false, 'img1', imageFields],
    [
      'a workspace image',
      'wsImg',
      true,
      'wimg1',
      [...imageFields, 'workspaceIds'].sort(),
    ],
  ])(
    '%s answers only the fields the share page reads',
    async (_name, link, isWorkspace, id, fields) => {
      const result = await images.getImageBySharedId(link, isWorkspace);
      const dbData: any = result.image.dbData;

      expect(Object.keys(dbData).sort()).toEqual(fields);
      expect(dbData.id).toBe(id);
      expect(dbData.title).toBe(`Title ${id}`);
      expect(dbData.created).toBe('2026-01-02T03:04:05.000Z');
      expect(dbData.uid).toBe('uid-owner');
      if (isWorkspace) {
        expect(dbData.workspaceIds).toEqual(['ws1']);
      }
    },
  );

  it.each([
    ['a personal video', 'linkVid', false, 'vid1', videoFields],
    [
      'a workspace video',
      'wsVid',
      true,
      'wvid1',
      [...videoFields, 'streamData', 'workspaceIds'].sort(),
    ],
  ])(
    '%s answers only the fields the share and embed pages read',
    async (_name, link, isWorkspace, id, fields) => {
      const result: any = await videos.getVideoBySharedId(link, isWorkspace);
      const dbData = result.data.video.dbData;

      expect(Object.keys(dbData).sort()).toEqual(fields);
      expect(dbData.id).toBe(id);
      expect(dbData.title).toBe(`Title ${id}`);
      expect(dbData.duration).toBe('00:05');
      expect(dbData.chaptersEnabled).toBe(true);
      expect(dbData.uid).toBe('uid-owner');
      if (isWorkspace) {
        expect(dbData.workspaceIds).toEqual(['ws1']);
        expect(dbData.streamData).toEqual({
          playbackUrl: 'https://stream.test/wvid1',
        });
        expect(result.data.video.url).toBe('https://stream.test/wvid1');
      }
    },
  );
});
