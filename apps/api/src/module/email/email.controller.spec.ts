/**
 * `email/send-item`, `email/send-welcome-email` and `email/welcome-email` with the real guard and
 * service. Only a signed-in user can send. The welcome mail goes to the session's own address, and
 * an item is mailed only for a share record of the caller, with the sender name and the links
 * taken from the session and the item: never from the body.
 */
import { ConfigService } from '@nestjs/config';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { TokenService } from '../auth/services/tokens';
import { FirebaseClient } from 'src/services/firebase/firebase.client';
import { EmailController } from './email.controller';
import { EmailService } from './email.service';

jest.mock('../auth/services/tokens', () => ({ TokenService: class {} }));
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
            vid2: {
              id: 'vid2',
              streamData: {
                playbackUrl: 'https://stream.test/vid2.m3u8',
                thumbnailUrl: 'https://stream.test/vid2.jpg',
              },
            },
          },
        },
        'uid-b': {
          screenshots: { img2: { id: 'img2', refName: 'two.png' } },
          videos: { vid9: { id: 'vid9', refName: 'nine.webm' } },
        },
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
      expect(sentMessages()[0].TemplateModel).toEqual(
        expect.objectContaining({
          itemPublicLink: 'https://stream.test/vid2.m3u8',
          templateUrl: 'https://stream.test/vid2.jpg',
        }),
      );
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
});
