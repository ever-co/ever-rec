/**
 * Connecting Slack with the real controller, service and one-time state. The token exchange and
 * the database are mocked. A state that is not a nonce we issued, such as a raw user id, must
 * exchange no code and write nothing; a nonce is good once, only for the user it was issued for and
 * only for the browser that asked for it (it holds a cookie that is set with the Connect URL).
 */
import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { SlackBoltService } from 'src/services/slack/slack-bolt.service';
import {
  newOAuthBinding,
  OAuthStateService,
} from '../../services/shared/oauth-state.service';
import { createFakeRealtimeDb } from '../../services/shared/fake-realtime-db';
import { TokenService } from '../auth/services/tokens';
import { ImageService } from '../image/image.service';
import { VideoService } from '../video/video.service';
import { SlackController } from './slack.controller';
import { SlackService } from './slack.service';

jest.mock('../auth/services/tokens', () => ({ TokenService: class {} }));
jest.mock('../image/image.service', () => ({ ImageService: class {} }));
jest.mock('../video/video.service', () => ({ VideoService: class {} }));
jest.mock('src/services/slack/slack-bolt.service', () => ({
  SlackBoltService: class {},
}));

const mockDb = createFakeRealtimeDb();
jest.mock('firebase-admin', () => ({
  database: (...args: any[]) => (mockDb.admin.database as any)(...args),
}));

const website = 'https://web.test';
const invalidState = `${website}/integrations?error=invalid_state`;
const cookieName = 'ever_rec_oauth_slack';

describe('Slack connection', () => {
  let app: INestApplication;
  let oauthState: OAuthStateService;
  const slackAuthorizeToken = jest.fn();

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [SlackController],
      providers: [
        SlackService,
        OAuthStateService,
        {
          provide: TokenService,
          useValue: {
            processToken: async (token: string, req: any) => {
              req.user = { id: token };
            },
          },
        },
        { provide: ImageService, useValue: {} },
        { provide: VideoService, useValue: {} },
        {
          provide: SlackBoltService,
          useValue: {
            slackAuthorizeToken,
            slackLoginUrl: async (uid: string, binding: string) =>
              `https://slack.test/authorize?state=${await oauthState.issue(
                uid,
                'slack',
                binding,
              )}`,
          },
        },
        { provide: ConfigService, useValue: { get: () => website } },
        { provide: EventEmitter2, useValue: { emit: jest.fn() } },
      ],
    }).compile();

    app = moduleRef.createNestApplication({ logger: false });
    await app.init();
    // Listen once, here. Given a server that is not listening, supertest starts it for one request
    // and closes it when that request ends, which resets the other callback of the race test below
    // while it is still in flight (`read ECONNRESET` on Linux).
    await app.listen(0, '127.0.0.1');
    oauthState = moduleRef.get(OAuthStateService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    mockDb.data = {
      users: {
        'uid-victim': { slackToken: 'victim-token', isSlackIntegrate: true },
        'uid-a': { name: 'A' },
      },
    };
    mockDb.writes = [];
    mockDb.staleReads = {};
    slackAuthorizeToken.mockReset();
    let call = 0;
    slackAuthorizeToken.mockImplementation(async () => ({
      access_token: `bot-${++call}`,
      authed_user: { access_token: `user-${call}` },
    }));
  });

  const userWrites = () =>
    mockDb.writes.filter((path) => path.startsWith('users/'));

  const callback = (query: Record<string, string>, binding?: string) => {
    const req = request(app.getHttpServer())
      .get('/slack/installation')
      .query(query);
    return binding ? req.set('Cookie', `${cookieName}=${binding}`) : req;
  };

  it('sets the browser secret in an HttpOnly cookie with the Connect URL', async () => {
    const res = await request(app.getHttpServer())
      .get('/slack/login-url')
      .set('Authorization', 'Bearer uid-a');

    expect(res.status).toBe(200);
    const state = new URL(res.text).searchParams.get('state');
    expect(state).toMatch(/^[A-Za-z0-9_-]{32}$/);
    const setCookie = (res.headers['set-cookie'] as unknown as string[]).find(
      (cookie) => cookie.startsWith(`${cookieName}=`),
    );
    expect(setCookie).toContain('HttpOnly');
    expect(setCookie).toContain('Path=/api/v1');
    const binding = setCookie!.split(';')[0].split('=')[1];

    // The browser that got the cookie completes the connection...
    const done = await callback({ code: 'good-code', state: state! }, binding);
    expect(done.headers.location).toBe(`${website}/integrations`);
    expect(mockDb.data.users['uid-a'].slackToken).toBe('user-1');
  });

  it('writes nothing when the state is a raw user id', async () => {
    const res = await callback(
      { code: 'attacker-code', state: 'uid-victim' },
      newOAuthBinding(),
    );

    expect(res.status).toBe(302);
    expect(res.headers.location).toBe(invalidState);
    expect(slackAuthorizeToken).not.toHaveBeenCalled();
    expect(userWrites()).toEqual([]);
    expect(mockDb.data.users['uid-victim'].slackToken).toBe('victim-token');
  });

  it('writes nothing when the state is missing', async () => {
    const res = await callback({ code: 'attacker-code' });

    expect(res.status).toBe(400);
    expect(slackAuthorizeToken).not.toHaveBeenCalled();
    expect(userWrites()).toEqual([]);
  });

  it('stores the tokens only on the user the nonce was issued for', async () => {
    const binding = newOAuthBinding();
    const state = await oauthState.issue('uid-a', 'slack', binding);

    const res = await callback({ code: 'good-code', state }, binding);

    expect(res.status).toBe(302);
    expect(res.headers.location).toBe(`${website}/integrations`);
    expect(slackAuthorizeToken).toHaveBeenCalledWith('good-code');
    expect(mockDb.data.users['uid-a']).toMatchObject({
      slackToken: 'user-1',
      slackBotToken: 'bot-1',
      isSlackIntegrate: true,
    });
    expect(userWrites().every((path) => path.startsWith('users/uid-a/'))).toBe(
      true,
    );
    expect(mockDb.data.users['uid-victim'].slackToken).toBe('victim-token');
  });

  it('writes nothing when the Connect link of another user is opened without their cookie', async () => {
    // The attacker asks for a Connect link and sends it to the victim.
    const state = await oauthState.issue('uid-a', 'slack', newOAuthBinding());

    const withoutCookie = await callback({ code: 'victim-code', state });
    const withOtherCookie = await callback(
      { code: 'victim-code', state },
      newOAuthBinding(),
    );

    expect(withoutCookie.headers.location).toBe(invalidState);
    expect(withOtherCookie.headers.location).toBe(invalidState);
    expect(slackAuthorizeToken).not.toHaveBeenCalled();
    expect(userWrites()).toEqual([]);
  });

  it('writes nothing when the nonce is replayed', async () => {
    const binding = newOAuthBinding();
    const state = await oauthState.issue('uid-a', 'slack', binding);
    await callback({ code: 'good-code', state }, binding);
    mockDb.writes = [];

    const res = await callback({ code: 'second-code', state }, binding);

    expect(res.status).toBe(302);
    expect(res.headers.location).toBe(invalidState);
    expect(slackAuthorizeToken).toHaveBeenCalledTimes(1);
    expect(userWrites()).toEqual([]);
    expect(mockDb.data.users['uid-a'].slackToken).toBe('user-1');
  });

  it('exchanges the code once when two callbacks race with the same nonce', async () => {
    const binding = newOAuthBinding();
    const state = await oauthState.issue('uid-a', 'slack', binding);

    const responses = await Promise.all([
      callback({ code: 'code-1', state }, binding),
      callback({ code: 'code-2', state }, binding),
    ]);

    expect(slackAuthorizeToken).toHaveBeenCalledTimes(1);
    expect(responses.map((res) => res.headers.location).sort()).toEqual(
      [`${website}/integrations`, invalidState].sort(),
    );
    expect(
      userWrites().filter((path) => path === 'users/uid-a/slackToken'),
    ).toHaveLength(1);
  });

  it('writes nothing for a nonce issued for another provider', async () => {
    const binding = newOAuthBinding();
    const state = await oauthState.issue('uid-a', 'dropbox', binding);

    const res = await callback({ code: 'good-code', state }, binding);

    expect(res.headers.location).toBe(invalidState);
    expect(slackAuthorizeToken).not.toHaveBeenCalled();
    expect(userWrites()).toEqual([]);
  });
});
