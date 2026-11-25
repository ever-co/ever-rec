/**
 * `email/send-item`, `email/send-welcome-email`, `email/welcome-email` and
 * `email/send-workspace-invite-email` with the real guard and service. Only a signed-in user can
 * send. The welcome mail goes to the session's own address, an item is mailed only for a share
 * record of the caller, and an invite only for a workspace the caller is in. The sender name, the
 * links and the workspace name come from the session and the stored records: never from the body.
 */
import { ConfigService } from '@nestjs/config';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { TokenService } from '../auth/services/tokens';
import { FirebaseClient } from 'src/services/firebase/firebase.client';
import { EmailController } from './email.controller';
import { EmailService } from './email.service';
import { StreamServiceService } from '../video-services/streamService.service';

const mockGetStreamLinks = jest.fn();

jest.mock('../auth/services/tokens', () => ({ TokenService: class {} }));
jest.mock('../video-services/streamService.service', () => ({
  StreamServiceService: class {},
}));
jest.mock('src/services/firebase/firebase.client', () => ({
  FirebaseClient: class {},
}));
jest.mock('firebase/auth', () => ({
  confirmPasswordReset: jest.fn(),
  verifyPasswordResetCode: jest.fn(),
}));
jest.mock('firebase-admin/auth', () => ({ getAuth: jest.fn() }));

const mockSendWithTemplate = jest.fn();
const mockSendBatch = jest.fn();
jest.mock('postmark', () => ({
  ServerClient: class {
    sendEmailWithTemplate = mockSendWithTemplate;
    sendEmailBatchWithTemplates = mockSendBatch;
  },
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
  return {
    database: () => ({
      ref: (path: string) => ({ get: async () => ({ val: () => read(path) }) }),
    }),
    storage: () => ({
      bucket: () => ({
        file: (path: string) => ({
          getSignedUrl: async () => [`https://files.test/${path}?signed`],
        }),
      }),
    }),
  };
});

describe('email routes', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [EmailController],
      providers: [
        EmailService,
        { provide: FirebaseClient, useValue: {} },
        {
          provide: StreamServiceService,
          useValue: { getStreamLinks: mockGetStreamLinks },
        },
        {
          provide: ConfigService,
          useValue: {
            get: (key: string) =>
              ({
                POSTMARK_CLIENT_TOKEN: 'pm-token',
                POSTMARK_SENDER_EMAIL: 'sender@rec.test',
                WEBSITE_URL: 'https://rec.test',
              })[key],
          },
        },
        {
          provide: TokenService,
          useValue: {
            processToken: async (token: string, req: any) => {
              if (!token.startsWith('uid-')) throw new Error('bad token');
              req.user = {
                id: token,
                email: `${token}@example.test`,
                name: `Name of ${token}`,
              };
            },
            refreshToken: async () => {
              throw new Error('no refresh');
            },
          },
        },
      ],
    }).compile();

    app = moduleRef.createNestApplication({ logger: false });
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    mockSendWithTemplate.mockReset().mockResolvedValue({});
    mockSendBatch.mockReset().mockResolvedValue([]);
    mockGetStreamLinks.mockReset().mockImplementation(async (assetId) =>
      ({
        asset1: {
          playbackUrl: 'https://stream.mux.com/pb1.m3u8',
          thumbnailUrl: 'https://image.mux.com/pb1/thumbnail.png',
        },
        asset2: {
          playbackUrl: 'https://vod.api.video/asset2/manifest.m3u8',
          thumbnailUrl: undefined,
        },
      }[assetId] ?? null),
    );
    mockDb.data = {
      shared: {
        imgLink: { uid: 'uid-a', imageId: 'img1' },
        imgOther: { uid: 'uid-b', imageId: 'img2' },
        imgGone: { uid: 'uid-a', imageId: 'nope' },
        imgTrash: { uid: 'uid-a', imageId: 'img3' },
      },
      sharedVideos: {
        vidLink: { uid: 'uid-a', videoId: 'vid1' },
        vidStream: { uid: 'uid-a', videoId: 'vid2' },
        vidUnknownAsset: { uid: 'uid-a', videoId: 'vid3' },
        vidBadAsset: { uid: 'uid-a', videoId: 'vid4' },
        vidNoAsset: { uid: 'uid-a', videoId: 'vid5' },
        vidThumb: { uid: 'uid-a', videoId: 'vid6' },
        vidPath: { uid: 'uid-a', videoId: 'vid7' },
        vidOther: { uid: 'uid-b', videoId: 'vid9' },
      },
      users: {
        'uid-a': {
          screenshots: {
            img1: { id: 'img1', refName: 'one.png' },
            img3: { id: 'img3', refName: 'three.png', trash: true },
          },
          videos: {
            vid1: { id: 'vid1', refName: 'one.webm', posterRef: 'one.jpg' },
            // The URLs saved with a streamed video are written by its owner: here they are
            // planted, and only the asset id is used.
            vid2: {
              id: 'vid2',
              streamData: {
                serviceType: 'mux',
                assetId: 'asset1',
                playbackUrl: 'https://evil.test/login',
                thumbnailUrl: 'https://evil.test/pixel.png',
              },
            },
            // An asset the provider does not know, an asset id that is not a plain id, and
            // stream data without an asset id.
            vid3: {
              id: 'vid3',
              streamData: {
                serviceType: 'mux',
                assetId: 'unknown',
                playbackUrl: 'https://evil.test/login',
              },
            },
            vid4: {
              id: 'vid4',
              streamData: {
                serviceType: 'mux',
                assetId: 'asset1/../x',
                playbackUrl: 'https://evil.test/login',
              },
            },
            vid5: {
              id: 'vid5',
              streamData: { playbackUrl: 'https://evil.test/login' },
            },
            // The provider reports no thumbnail.
            vid6: {
              id: 'vid6',
              streamData: {
                serviceType: 'api.video',
                assetId: 'asset2',
                thumbnailUrl: 'https://evil.test/pixel.png',
              },
            },
            vid7: { id: 'vid7', refName: '../uid-b/videos/nine.webm' },
          },
        },
        'uid-b': {
          screenshots: { img2: { id: 'img2', refName: 'two.png' } },
          videos: { vid9: { id: 'vid9', refName: 'nine.webm' } },
        },
      },
      workspaceInvites: {
        // uid-a is a member of ws1 and the admin of ws3, and not in ws2.
        inv1: { id: 'inv1', workspaceId: 'ws1', inviterId: 'uid-b' },
        invAdmin: { id: 'invAdmin', workspaceId: 'ws3', inviterId: 'uid-a' },
        invOther: { id: 'invOther', workspaceId: 'ws2', inviterId: 'uid-b' },
        invGone: { id: 'invGone', workspaceId: 'wsGone', inviterId: 'uid-a' },
      },
      workspaces: {
        ws1: {
          name: 'Team One',
          admin: 'uid-b',
          members: [{ id: 'uid-b' }, { id: 'uid-a' }],
        },
        ws2: { name: 'Team Two', admin: 'uid-b', members: [{ id: 'uid-b' }] },
        ws3: { name: 'Team Three', admin: 'uid-a' },
      },
    };
  });

  const post = (path: string, body: object, uid?: string) => {
    const req = request(app.getHttpServer()).post(`/email/${path}`);
    if (uid) req.set({ Authorization: `Bearer ${uid}` });
    return req.send(body);
  };

  const sentMessages = () => mockSendBatch.mock.calls[0][0];

  describe.each(['send-welcome-email', 'welcome-email'])('%s', (path) => {
    it('needs a signed-in user, and sends nothing without one', async () => {
      await post(path, { email: 'victim@example.test' }).expect(401);
      await post(path, { email: 'victim@example.test' }, 'bad').expect(401);
      expect(mockSendWithTemplate).not.toHaveBeenCalled();
    });

    it("sends to the session's address, even when the body names another", async () => {
      await post(path, { email: 'victim@example.test' }, 'uid-a').expect(201);

      expect(mockSendWithTemplate).toHaveBeenCalledTimes(1);
      expect(mockSendWithTemplate).toHaveBeenCalledWith(
        expect.objectContaining({
          To: 'uid-a@example.test',
          TemplateModel: { email: 'uid-a@example.test' },
        }),
      );
    });
  });

  describe('send-item', () => {
    const body = (extra: object = {}) => ({
      emails: ['friend@example.test'],
      itemType: 'image',
      itemLink: 'imgLink',
      message: 'Look at this',
      ...extra,
    });

    it('needs a signed-in user, and sends nothing without one', async () => {
      await post('send-item', body()).expect(401);
      await post('send-item', body(), 'bad').expect(401);
      expect(mockSendBatch).not.toHaveBeenCalled();
    });

    it('mails an image the caller shared, with the links built from the item', async () => {
      await post('send-item', body(), 'uid-a').expect(201);

      expect(sentMessages()).toEqual([
        {
          From: 'sender@rec.test',
          To: 'friend@example.test',
          TemplateAlias: expect.any(String),
          TemplateModel: {
            itemLink: 'https://rec.test/image/shared/imgLink',
            itemPublicLink:
              'https://files.test/users/uid-a/screenshots/one.png?signed',
            fullName: 'Name of uid-a',
            firstName: 'from Name',
            message: 'Look at this',
            templateUrl: false,
          },
        },
      ]);
    });

    it('mails a video with its poster, or the stream thumbnail', async () => {
      await post(
        'send-item',
        body({ itemType: 'video', itemLink: 'vidLink' }),
        'uid-a',
      ).expect(201);
      expect(sentMessages()[0].TemplateModel).toEqual(
        expect.objectContaining({
          itemLink: 'https://rec.test/video/shared/vidLink',
          itemPublicLink:
            'https://files.test/users/uid-a/videos/one.webm?signed',
          templateUrl:
            'https://files.test/users/uid-a/videoPosters/one.jpg?signed',
        }),
      );

      mockSendBatch.mockClear();
      await post(
        'send-item',
        body({ itemType: 'video', itemLink: 'vidStream' }),
        'uid-a',
      ).expect(201);
      expect(mockGetStreamLinks).toHaveBeenCalledWith('asset1', 'mux');
      expect(sentMessages()[0].TemplateModel).toEqual(
        expect.objectContaining({
          itemPublicLink: 'https://stream.mux.com/pb1.m3u8',
          templateUrl: 'https://image.mux.com/pb1/thumbnail.png',
        }),
      );
      expect(JSON.stringify(sentMessages())).not.toContain('evil.test');
    });

    it('never mails the stream URLs saved with a video, only what the provider reports', async () => {
      const video = (itemLink: string) =>
        post('send-item', body({ itemType: 'video', itemLink }), 'uid-a');

      await video('vidUnknownAsset').expect(403);
      await video('vidBadAsset').expect(403);
      await video('vidNoAsset').expect(403);
      await video('vidPath').expect(403);
      expect(mockSendBatch).not.toHaveBeenCalled();
      // An asset id that is not a plain id never reaches the provider.
      expect(mockGetStreamLinks).not.toHaveBeenCalledWith(
        'asset1/../x',
        expect.anything(),
      );

      // The provider reports no thumbnail: the video is mailed without one.
      await video('vidThumb').expect(201);
      expect(sentMessages()[0].TemplateModel).toEqual(
        expect.objectContaining({
          itemPublicLink: 'https://vod.api.video/asset2/manifest.m3u8',
          templateUrl: false,
        }),
      );
      expect(JSON.stringify(sentMessages())).not.toContain('evil.test');
    });

    it('never mails the sender name or the links of the body', async () => {
      await post(
        'send-item',
        body({
          userDisplayName: 'Support Team',
          itemPublicLink: 'https://evil.test/login',
          templateUrl: 'https://evil.test/pixel.png',
        }),
        'uid-a',
      ).expect(201);

      const mailed = JSON.stringify(sentMessages());
      expect(mailed).not.toContain('Support Team');
      expect(mailed).not.toContain('evil.test');
      expect(sentMessages()[0].TemplateModel.fullName).toBe('Name of uid-a');
    });

    it("refuses another user's link, a missing item and a trashed item", async () => {
      await post('send-item', body({ itemLink: 'imgOther' }), 'uid-a').expect(
        403,
      );
      await post(
        'send-item',
        body({ itemType: 'video', itemLink: 'vidOther' }),
        'uid-a',
      ).expect(403);
      await post('send-item', body({ itemLink: 'imgGone' }), 'uid-a').expect(
        403,
      );
      await post('send-item', body({ itemLink: 'imgTrash' }), 'uid-a').expect(
        403,
      );
      // A link of the other kind of item, and one that does not exist.
      await post('send-item', body({ itemLink: 'vidLink' }), 'uid-a').expect(
        403,
      );
      await post('send-item', body({ itemLink: 'unknown' }), 'uid-a').expect(
        403,
      );
      expect(mockSendBatch).not.toHaveBeenCalled();
    });

    it('refuses a link that is not a plain id', async () => {
      const links = ['imgLink/uid', '../x', '', 5, null, ['imgLink']];
      for (const itemLink of links) {
        await post('send-item', body({ itemLink }), 'uid-a').expect(403);
      }
      expect(mockSendBatch).not.toHaveBeenCalled();
    });

    it('refuses an item type other than image or video', async () => {
      for (const itemType of ['shared', 'whiteboard', '', undefined, 1]) {
        await post('send-item', body({ itemType }), 'uid-a').expect(400);
      }
      expect(mockSendBatch).not.toHaveBeenCalled();
    });

    it('refuses too many recipients, none, and anything that is not an email', async () => {
      const many = Array.from({ length: 21 }, (_, i) => `p${i}@example.test`);
      await post('send-item', body({ emails: many }), 'uid-a').expect(400);
      await post('send-item', body({ emails: [] }), 'uid-a').expect(400);
      const refused = (extra: object) =>
        post('send-item', body(extra), 'uid-a').expect(400);
      await refused({ emails: 'a@example.test' });
      await refused({ emails: ['not an email'] });
      await refused({
        emails: ['a@example.test', 'b@example.test, c@example.test'],
      });
      await refused({ emails: [1] });
      await refused({ message: 'x'.repeat(1001) });
      await refused({ message: { a: 1 } });
      expect(mockSendBatch).not.toHaveBeenCalled();
    });

    it('lets the largest allowed list through, without repeats', async () => {
      const max = Array.from({ length: 20 }, (_, i) => `p${i}@example.test`);
      await post('send-item', body({ emails: max }), 'uid-a').expect(201);
      expect(sentMessages()).toHaveLength(20);

      mockSendBatch.mockClear();
      await post(
        'send-item',
        body({ emails: ['a@example.test', 'a@example.test'] }),
        'uid-a',
      ).expect(201);
      expect(sentMessages()).toHaveLength(1);
    });
  });

  describe('send-workspace-invite-email', () => {
    // What the portal and the extension send: the inviter name is the user's own display name.
    const body = (extra: object = {}) => ({
      emails: ['friend@example.test', 'pal@example.test'],
      inviteId: 'inv1',
      inviterDisplayName: 'Name of uid-a',
      ...extra,
    });
    const invite = (extra: object = {}) =>
      post('send-workspace-invite-email', body(extra), 'uid-a');

    it('needs a signed-in user, and sends nothing without one', async () => {
      await post('send-workspace-invite-email', body()).expect(401);
      await post('send-workspace-invite-email', body(), 'bad').expect(401);
      expect(mockSendBatch).not.toHaveBeenCalled();
    });

    it('mails a member one batch, with the session name and the workspace name', async () => {
      await invite().expect(201);

      expect(mockSendBatch).toHaveBeenCalledTimes(1);
      expect(sentMessages()).toEqual(
        ['friend@example.test', 'pal@example.test'].map((To) => ({
          From: 'sender@rec.test',
          To,
          TemplateAlias: expect.any(String),
          TemplateModel: {
            joinWorkspaceLink: 'https://rec.test/workspace/invite/inv1',
            fullName: 'Name of uid-a',
            workspaceName: 'Team One',
          },
        })),
      );

      // The admin of a workspace is in it too.
      mockSendBatch.mockClear();
      await invite({ inviteId: 'invAdmin' }).expect(201);
      expect(sentMessages()[0].TemplateModel.workspaceName).toBe('Team Three');
    });

    it('never mails the inviter name of the body', async () => {
      await invite({ inviterDisplayName: 'Support Team' }).expect(201);
      expect(JSON.stringify(sentMessages())).not.toContain('Support Team');
      expect(
        sentMessages().map((message) => message.TemplateModel.fullName),
      ).toEqual(['Name of uid-a', 'Name of uid-a']);

      mockSendBatch.mockClear();
      await invite({ inviterDisplayName: undefined }).expect(201);
      expect(sentMessages()[0].TemplateModel.fullName).toBe('Name of uid-a');
    });

    it('refuses an invite of a workspace the caller is not in, a missing invite and a gone workspace', async () => {
      await invite({ inviteId: 'invOther' }).expect(403);
      await invite({ inviteId: 'unknown' }).expect(403);
      await invite({ inviteId: 'invGone' }).expect(403);
      expect(mockSendBatch).not.toHaveBeenCalled();
    });

    it('refuses an invite id that is not a plain id', async () => {
      for (const inviteId of ['a/b', 'inv1/x', '../x', '', 5, null, ['inv1']]) {
        await invite({ inviteId }).expect(400);
      }
      await post(
        'send-workspace-invite-email',
        { emails: ['a@example.test'] },
        'uid-a',
      ).expect(400);
      expect(mockSendBatch).not.toHaveBeenCalled();
    });

    it('refuses too many recipients, none, and anything that is not an email', async () => {
      const many = Array.from({ length: 21 }, (_, i) => `p${i}@example.test`);
      await invite({ emails: many }).expect(400);
      await invite({ emails: [] }).expect(400);
      await invite({ emails: undefined }).expect(400);
      await invite({ emails: 'a@example.test' }).expect(400);
      await invite({ emails: ['not an email'] }).expect(400);
      await invite({
        emails: ['a@example.test', 'b@example.test, c@example.test'],
      }).expect(400);
      await invite({ emails: [1] }).expect(400);
      expect(mockSendBatch).not.toHaveBeenCalled();
    });

    it('lets the largest allowed list through, without repeats', async () => {
      const max = Array.from({ length: 20 }, (_, i) => `p${i}@example.test`);
      await invite({ emails: max }).expect(201);
      expect(sentMessages()).toHaveLength(20);

      mockSendBatch.mockClear();
      await invite({ emails: ['a@example.test', 'a@example.test'] }).expect(
        201,
      );
      expect(sentMessages()).toHaveLength(1);
    });
  });
});
