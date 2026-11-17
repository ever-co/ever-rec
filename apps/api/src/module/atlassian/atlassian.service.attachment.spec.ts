/**
 * The file attached to a Jira issue or a Trello card. The `downloadUrl` of a streamed video is
 * written by its owner (the save route used to store what the client sent), so the server must
 * never fetch it: a URL such as an internal service or the cloud metadata endpoint would be read
 * from inside the network and handed back as an attachment. A streamed video is attached from its
 * master file in the bucket, like any other video, and gets no attachment while that file is not
 * there yet.
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

/** The bucket: the files that exist, by path. */
const mockBucket: { files: Record<string, string>; opened: string[] } = {
  files: {},
  opened: [],
};
const mockDb = createFakeRealtimeDb();
jest.mock('firebase-admin', () => ({
  database: (...args: any[]) => (mockDb.admin.database as any)(...args),
  storage: () => ({
    bucket: () => ({
      file: (path: string) => {
        mockBucket.opened.push(path);
        const content = mockBucket.files[path];
        return {
          exists: async () => [content !== undefined],
          getMetadata: async () => {
            if (content === undefined)
              throw new Error(`No such object: ${path}`);
            return [{ size: String(Buffer.byteLength(content)), name: path }];
          },
          createReadStream: () => {
            if (content === undefined)
              throw new Error(`No such object: ${path}`);
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

  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    mockFetch.mockClear();
    mockBucket.files = { [masterPath]: 'master file bytes' };
    mockBucket.opened = [];
    mockDb.data = {
      users: {
        [uid]: {
          jiraAPISCredentials: { credentials: { access_token: 'jira' } },
          trelloAPISCredentials: { credentials: { access_token: 'trello' } },
        },
      },
    };

    getVideoByIdPrivate.mockReset().mockResolvedValue({
      dbData: {
        id: 'vid1',
        uid,
        refName: 'vid1.webm',
        streamData: {
          serviceType: 'mux',
          assetId: 'asset1',
          playbackUrl: 'https://stream.test/p.m3u8',
          downloadUrl: internalUrl,
        },
      },
      url: 'https://stream.test/p.m3u8',
      sharedLink: 'shared1',
    });
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
});
