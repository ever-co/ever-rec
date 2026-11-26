/**
 * A chapter saved with no new thumbnail used to be stored with whatever thumbnail URL the editor
 * sent, and the video page, the share page included, then loads that URL in every viewer's
 * browser: any host could learn their IP address and when they watched. A thumbnail URL is now
 * kept only when it is empty or a signed link of the API's own storage bucket; anything else is
 * stored as '' with no thumbnail name, and chapters saved before the fix are served the same way.
 */
import { VideoChapterService } from './chapter.service';

const mockBucketName = 'rec-test.appspot.com';
// What `getSignedUrl` returns: a path-style link on the storage host, in the API's bucket.
const signed = (path: string) =>
  `https://storage.googleapis.com/${mockBucketName}/${path}?GoogleAccessId=rec%40rec-test.iam.gserviceaccount.com&Expires=16725225600&Signature=c2lnbmVk`;

const mockDb: {
  data: Record<string, any>;
  updates: Record<string, any>;
} = { data: {}, updates: {} };

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
        get: async () => ({
          val: () => read(path),
          exists: () => read(path) != null,
        }),
        update: async (data: any) => {
          mockDb.updates[path] = data;
        },
        set: async () => undefined,
      }),
    }),
    storage: () => ({
      bucket: () => ({
        name: mockBucketName,
        file: (path: string) => ({
          save: async () => undefined,
          delete: async () => undefined,
          getSignedUrl: async () => [
            `https://storage.googleapis.com/${mockBucketName}/${path}?Signature=new`,
          ],
        }),
        getFiles: async () => [[]],
      }),
    }),
  };
});

const OWN_URL = signed('users/uid-owner/videosThumbnails/vid1/keep.jpg');

// Each one names a host other than the API's own storage links, or is no web link at all.
const FOREIGN_URLS: Array<[string, string]> = [
  ['a foreign host', 'https://other.example/p.jpg'],
  ['an .svg on a foreign host', 'https://other.example/p.svg'],
  ['a javascript: URL', 'javascript:alert(document.cookie)'],
  [
    'a data: URL',
    'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg"/>',
  ],
  [
    'a plain http link to the storage host',
    `http://storage.googleapis.com/${mockBucketName}/users/x.jpg`,
  ],
  [
    'another bucket on the storage host',
    'https://storage.googleapis.com/other-bucket/users/x.jpg',
  ],
  [
    'a bucket whose name only starts with the API bucket',
    `https://storage.googleapis.com/${mockBucketName}.other.example/x.jpg`,
  ],
  [
    'a host that only starts with the storage host',
    `https://storage.googleapis.com.other.example/${mockBucketName}/x.jpg`,
  ],
  [
    'a link that names the storage host as a user name',
    `https://storage.googleapis.com@other.example/${mockBucketName}/x.jpg`,
  ],
  [
    'a link to the storage host on another port',
    `https://storage.googleapis.com:8443/${mockBucketName}/x.jpg`,
  ],
  ['text that is no URL', 'p.jpg'],
];

const chapter = (id: string, thumbnailURL: string, refName = `${id}.jpg`) => ({
  id,
  content: 'Intro',
  timestamp: '00:00',
  timestampSeconds: 0,
  thumbnailURL,
  refName,
});

describe('VideoChapterService chapter thumbnail URLs', () => {
  let service: VideoChapterService;

  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    service = new VideoChapterService();
    mockDb.updates = {};
    mockDb.data = {
      users: {
        'uid-owner': {
          videos: { vid1: { id: 'vid1', refName: 'a.webm' } },
        },
      },
      workspaces: {
        ws1: { videos: { item1: { id: 'item1', refName: 'w.webm' } } },
      },
    };
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('saveChapters, for a chapter with no new thumbnail', () => {
    const save = (chapters: any[], workspaceId?: string) =>
      service.saveChapters(
        'uid-owner',
        workspaceId ? 'item1' : 'vid1',
        chapters,
        [],
        [],
        workspaceId,
      );
    const stored = (path = 'users/uid-owner/videos/vid1') =>
      mockDb.updates[path]?.chapters;

    it.each(FOREIGN_URLS)(
      'stores %s as an empty thumbnail URL with no thumbnail name',
      async (_name, url) => {
        const result = await save([chapter('abc', url)]);

        const expected = {
          id: 'abc',
          content: 'Intro',
          timestamp: '00:00',
          timestampSeconds: 0,
          thumbnailURL: '',
        };
        expect(stored()).toStrictEqual({ abc: expected });
        expect(result.data).toStrictEqual([expected]);
      },
    );

    it('keeps a signed link of the API’s own bucket, with its thumbnail name', async () => {
      const result = await save([chapter('keep', OWN_URL)]);

      expect(stored()).toStrictEqual({ keep: chapter('keep', OWN_URL) });
      expect(result.data).toStrictEqual([chapter('keep', OWN_URL)]);
    });

    it('keeps a signed link in a workspace video', async () => {
      const url = signed('workspaces/ws1/videosThumbnails/item1/keep.jpg');
      await save([chapter('keep', url)], 'ws1');

      expect(stored('workspaces/ws1/videos/item1')).toStrictEqual({
        keep: chapter('keep', url),
      });
    });

    it('keeps a chapter with no thumbnail as it is', async () => {
      await save([chapter('none', '', '')]);

      expect(stored()).toStrictEqual({ none: chapter('none', '', '') });
    });

    it('blanks only the chapter with the foreign link', async () => {
      await save([
        chapter('keep', OWN_URL),
        chapter('abc', 'https://other.example/p.svg'),
      ]);

      expect(stored().keep).toStrictEqual(chapter('keep', OWN_URL));
      expect(stored().abc.thumbnailURL).toBe('');
      expect(stored().abc).not.toHaveProperty('refName');
    });

    it('still stores the API’s new signed link for a chapter with a new thumbnail', async () => {
      const blob = chapter('fresh', 'blob:https://app.rec.so/1234', '');
      const result = await service.saveChapters(
        'uid-owner',
        'vid1',
        [blob],
        [blob],
        [{ mimetype: 'image/jpeg', buffer: Buffer.alloc(4) } as any],
      );

      const url = `https://storage.googleapis.com/${mockBucketName}/users/uid-owner/videosThumbnails/vid1/fresh.jpg?Signature=new`;
      expect(stored().fresh).toStrictEqual(chapter('fresh', url));
      expect(result.data).toStrictEqual([chapter('fresh', url)]);
    });
  });

  describe('getChapters, for chapters saved before the fix', () => {
    it.each(FOREIGN_URLS)(
      'serves %s as an empty thumbnail URL with no thumbnail name',
      async (_name, url) => {
        mockDb.data.users['uid-owner'].videos.vid1.chapters = {
          abc: chapter('abc', url),
        };

        const result = await service.getChapters('uid-owner', 'vid1', '');

        expect(result.data).toStrictEqual([
          {
            id: 'abc',
            content: 'Intro',
            timestamp: '00:00',
            timestampSeconds: 0,
            thumbnailURL: '',
          },
        ]);
      },
    );

    it('serves a signed link of the API’s own bucket as it is', async () => {
      mockDb.data.workspaces.ws1.videos.item1.chapters = {
        keep: chapter('keep', OWN_URL),
        none: chapter('none', '', ''),
      };

      const result = await service.getChapters('uid-owner', 'item1', 'ws1');

      expect(result.data).toStrictEqual([
        chapter('keep', OWN_URL),
        chapter('none', '', ''),
      ]);
    });
  });
});
