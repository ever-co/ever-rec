/**
 * The file attached to a Jira issue or a Trello card. The `downloadUrl` of a streamed video is
 * written by its owner (the save route used to store what the client sent), so the server must
 * never fetch it: a URL such as an internal service or the cloud metadata endpoint would be read
 * from inside the network and handed back as an attachment. A streamed video is attached from its
 * master file in the bucket, like any other video, and gets no attachment while that file is not
 * there yet.
 *
 * After a trim or a reset (`stream/save-data/:videoId`), the master file is replaced in the
 * background. Until that upload is done, and for good when it fails, the bucket still holds the
 * previous cut, such as the untrimmed video with the part the owner cut out. The record says so
 * (`streamData.masterStale`), and such a video gets no attachment either. A bucket that cannot be
 * read gives no attachment too, and the issue or card is still reported as created.
 */
import { Readable } from 'stream';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AtlassianApiService } from 'src/services/atlassian/atlassian.api.service';
import { OAuthStateService } from '../../services/shared/oauth-state.service';
import { createFakeRealtimeDb } from '../../services/shared/fake-realtime-db';
import { ImageService } from '../image/image.service';
import { VideoService } from '../video/video.service';
import { AtlassianService } from './atlassian.service';

jest.mock('../image/image.service', () => ({ ImageService: class {} }));
jest.mock('../video/video.service', () => ({ VideoService: class {} }));
jest.mock('src/services/atlassian/atlassian.api.service', () => ({
  AtlassianApiService: class {},
}));
jest.mock('../../services/shared/oauth-state.service', () => ({
  OAuthStateService: class {},
}));

const mockFetch = jest.fn(async () => ({
  buffer: async () => Buffer.from('internal secret'),
}));
// Read lazily: the service requires node-fetch before this file's constants are initialized.
jest.mock(
  'node-fetch',
  () =>
    (...args: any[]) =>
      (mockFetch as any)(...args),
);

/** The bucket: the files that exist, by path, and the call that fails, if any. */
const mockBucket: {
  files: Record<string, string>;
  opened: string[];
  failing: 'exists' | 'getMetadata' | 'read' | null;
} = {
  files: {},
  opened: [],
  failing: null,
};
const storageError = () => new Error('storage unavailable');
const mockDb = createFakeRealtimeDb();
jest.mock('firebase-admin', () => ({
  database: (...args: any[]) => (mockDb.admin.database as any)(...args),
  storage: () => ({
    bucket: () => ({
      file: (path: string) => {
        mockBucket.opened.push(path);
        const content = mockBucket.files[path];
        return {
          exists: async () => {
            if (mockBucket.failing === 'exists') throw storageError();
            return [content !== undefined];
          },
          getMetadata: async () => {
            if (mockBucket.failing === 'getMetadata') throw storageError();
            if (content === undefined)
              throw new Error(`No such object: ${path}`);
            return [{ size: String(Buffer.byteLength(content)), name: path }];
          },
          createReadStream: () => {
            if (content === undefined)
              throw new Error(`No such object: ${path}`);
            if (mockBucket.failing === 'read') {
              // The read fails midway, as a dropped connection would.
              return new Readable({
                read() {
                  this.destroy(storageError());
                },
              });
            }
            return Readable.from([Buffer.from(content)]);
          },
        };
      },
    }),
  }),
}));

const uid = 'uid-me';
const internalUrl = 'http://internal.test/secret';
const masterPath = `users/${uid}/videos/vid1.webm`;

/** The bytes a multipart form would send. */
const sent = (form: any): string => form.getBuffer().toString();

describe('AtlassianService attachments of streamed videos', () => {
  let service: AtlassianService;
  const getVideoByIdPrivate = jest.fn();
  const api = {
    checkTokenExpiration: jest.fn(),
    createIssue: jest.fn(),
    attachmentsIssue: jest.fn(),
    createTrelloCard: jest.fn(),
    trelloAttachmentsIssue: jest.fn(),
  };

  /** The stored video, a streamed one, with `extra` in its streamData. */
  const storedStreamData = (extra: Record<string, unknown>) =>
    getVideoByIdPrivate.mockResolvedValue({
      dbData: {
        id: 'vid1',
        uid,
        refName: 'vid1.webm',
        streamData: {
          serviceType: 'mux',
          assetId: 'asset1',
          playbackUrl: 'https://stream.test/p.m3u8',
          downloadUrl: internalUrl,
          ...extra,
        },
      },
      url: 'https://stream.test/p.m3u8',
      sharedLink: 'shared1',
    });

  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    mockFetch.mockClear();
    mockBucket.files = { [masterPath]: 'master file bytes' };
    mockBucket.opened = [];
    mockBucket.failing = null;
    mockDb.data = {
      users: {
        [uid]: {
          jiraAPISCredentials: { credentials: { access_token: 'jira' } },
          trelloAPISCredentials: { credentials: { access_token: 'trello' } },
        },
      },
    };

    getVideoByIdPrivate.mockReset();
    storedStreamData({});
    api.checkTokenExpiration.mockReset().mockResolvedValue(true);
    api.createIssue
      .mockReset()
      .mockResolvedValue({ status: 'success', data: { key: 'REC-1' } });
    api.attachmentsIssue.mockReset().mockResolvedValue(undefined);
    api.createTrelloCard
      .mockReset()
      .mockResolvedValue({ status: 'success', data: { id: 'card1' } });
    api.trelloAttachmentsIssue.mockReset().mockResolvedValue(undefined);

    service = new AtlassianService(
      { emit: jest.fn() } as unknown as EventEmitter2,
      {} as ImageService,
      { getVideoByIdPrivate } as unknown as VideoService,
      api as unknown as AtlassianApiService,
      { get: () => 'https://web.test' } as unknown as ConfigService,
      {} as OAuthStateService,
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const trelloCard = () =>
    service.createTrelloCard(uid, {
      body: {
        itemId: 'vid1',
        itemType: 'video',
        projectId: 'board1',
        issueType: 'list1',
      },
    });

  const jiraIssue = () =>
    service.createJiraIssue({
      user: { id: uid },
      body: {
        itemId: 'vid1',
        itemType: 'video',
        projectId: 'project1',
        issueType: 'task',
        resourceId: 'site1',
      },
    });

  describe('Trello card', () => {
    it('attaches the master file from the bucket and never fetches the stored downloadUrl', async () => {
      const res = await trelloCard();

      expect(res.status).toBe('success');
      expect(mockFetch).not.toHaveBeenCalled();
      expect(mockBucket.opened).toContain(masterPath);
      expect(api.trelloAttachmentsIssue).toHaveBeenCalledTimes(1);
      const [token, cardId, form] = api.trelloAttachmentsIssue.mock.calls[0];
      expect([token, cardId]).toEqual(['trello', 'card1']);
      expect(sent(form)).toContain('master file bytes');
      expect(sent(form)).not.toContain('internal secret');
    });

    it('attaches nothing while the master file is not in the bucket yet', async () => {
      mockBucket.files = {};

      const res = await trelloCard();

      expect(res.status).toBe('success');
      expect(mockFetch).not.toHaveBeenCalled();
      expect(api.trelloAttachmentsIssue).not.toHaveBeenCalled();
    });
  });

  describe('Jira issue', () => {
    it('attaches the master file from the bucket and never fetches the stored downloadUrl', async () => {
      const res = await jiraIssue();

      expect(res.status).toBe('success');
      expect(mockFetch).not.toHaveBeenCalled();
      expect(mockBucket.opened).toContain(masterPath);
      expect(api.attachmentsIssue).toHaveBeenCalledTimes(1);
      const [resourceId, , path, form] = api.attachmentsIssue.mock.calls[0];
      expect([resourceId, path]).toEqual(['site1', 'issue/REC-1/attachments']);
      expect(sent(form)).toContain('master file bytes');
      expect(sent(form)).not.toContain('internal secret');
    });

    it('attaches nothing while the master file is not in the bucket yet', async () => {
      mockBucket.files = {};

      const res = await jiraIssue();

      expect(res.status).toBe('success');
      expect(mockFetch).not.toHaveBeenCalled();
      expect(api.attachmentsIssue).not.toHaveBeenCalled();
    });
  });

  const integrations = [
    {
      name: 'Jira issue',
      create: () => jiraIssue(),
      sends: api.attachmentsIssue,
    },
    {
      name: 'Trello card',
      create: () => trelloCard(),
      sends: api.trelloAttachmentsIssue,
    },
  ];

  describe.each(integrations)('$name after a trim', ({ create, sends }) => {
    beforeEach(() => {
      // The bucket still holds the previous cut: the part the owner cut out is in it.
      mockBucket.files = { [masterPath]: 'full recording with the cut part' };
    });

    it('attaches nothing while the master file is still the previous cut', async () => {
      storedStreamData({ assetId: 'trimmed-asset', masterStale: true });

      const res = await create();

      expect(res.status).toBe('success');
      expect(mockFetch).not.toHaveBeenCalled();
      expect(sends).not.toHaveBeenCalled();
    });

    it('attaches the master file once the upload of the current cut is done', async () => {
      mockBucket.files = { [masterPath]: 'the trimmed cut' };
      storedStreamData({ assetId: 'trimmed-asset', masterStale: false });

      const res = await create();

      expect(res.status).toBe('success');
      expect(sends).toHaveBeenCalledTimes(1);
      const form = sends.mock.calls[0][sends.mock.calls[0].length - 1];
      expect(sent(form)).toContain('the trimmed cut');
    });
  });

  describe.each(integrations)(
    '$name when the bucket cannot be read',
    ({ create, sends }) => {
      it.each(['exists', 'getMetadata', 'read'] as const)(
        'attaches nothing and reports success when %s fails',
        async (failing) => {
          mockBucket.failing = failing;

          const res = await create();

          expect(res.status).toBe('success');
          expect(mockFetch).not.toHaveBeenCalled();
          expect(sends).not.toHaveBeenCalled();
        },
      );
    },
  );
});
