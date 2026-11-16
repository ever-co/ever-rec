/**
 * The Slack callback with the real controller, service and one-time state. The token exchange and
 * the database are mocked. A state that is not a nonce we issued, such as a raw user id, must
 * exchange no code and write nothing; a nonce is good once and only for the user it was issued for.
 */
import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { SlackBoltService } from 'src/services/slack/slack-bolt.service';
import { OAuthStateService } from '../../services/shared/oauth-state.service';
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

describe('Slack installation callback', () => {
  let app: INestApplication;
  let oauthState: OAuthStateService;
  const slackAuthorizeToken = jest.fn();

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [SlackController],
      providers: [
        SlackService,
        OAuthStateService,
        { provide: TokenService, useValue: {} },
        { provide: ImageService, useValue: {} },
        { provide: VideoService, useValue: {} },
        { provide: SlackBoltService, useValue: { slackAuthorizeToken } },
        { provide: ConfigService, useValue: { get: () => website } },
        { provide: EventEmitter2, useValue: { emit: jest.fn() } },
      ],
    }).compile();

    app = moduleRef.createNestApplication({ logger: false });
    await app.init();
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
    slackAuthorizeToken.mockReset();
    let call = 0;
    slackAuthorizeToken.mockImplementation(async () => ({
      access_token: `bot-${++call}`,
      authed_user: { access_token: `user-${call}` },
    }));
  });

  const userWrites = () =>
    mockDb.writes.filter((path) => path.startsWith('users/'));

  it('writes nothing when the state is a raw user id', async () => {
    const res = await request(app.getHttpServer())
      .get('/slack/installation')
      .query({ code: 'attacker-code', state: 'uid-victim' });

    expect(res.status).toBe(302);
    expect(res.headers.location).toBe(invalidState);
    expect(slackAuthorizeToken).not.toHaveBeenCalled();
    expect(userWrites()).toEqual([]);
    expect(mockDb.data.users['uid-victim'].slackToken).toBe('victim-token');
  });

  it('writes nothing when the state is missing', async () => {
    const res = await request(app.getHttpServer())
      .get('/slack/installation')
      .query({ code: 'attacker-code' });

    expect(res.status).toBe(400);
    expect(slackAuthorizeToken).not.toHaveBeenCalled();
    expect(userWrites()).toEqual([]);
  });

  it('stores the tokens only on the user the nonce was issued for', async () => {
    const state = await oauthState.issue('uid-a', 'slack');

    const res = await request(app.getHttpServer())
      .get('/slack/installation')
      .query({ code: 'good-code', state });

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

  it('writes nothing when the nonce is replayed', async () => {
    const state = await oauthState.issue('uid-a', 'slack');
    await request(app.getHttpServer())
      .get('/slack/installation')
      .query({ code: 'good-code', state });
    mockDb.writes = [];

    const res = await request(app.getHttpServer())
      .get('/slack/installation')
      .query({ code: 'second-code', state });

    expect(res.status).toBe(302);
    expect(res.headers.location).toBe(invalidState);
    expect(slackAuthorizeToken).toHaveBeenCalledTimes(1);
    expect(userWrites()).toEqual([]);
    expect(mockDb.data.users['uid-a'].slackToken).toBe('user-1');
  });

  it('exchanges the code once when two callbacks race with the same nonce', async () => {
    const state = await oauthState.issue('uid-a', 'slack');

    const responses = await Promise.all([
      request(app.getHttpServer())
        .get('/slack/installation')
        .query({ code: 'code-1', state }),
      request(app.getHttpServer())
        .get('/slack/installation')
        .query({ code: 'code-2', state }),
    ]);

    expect(slackAuthorizeToken).toHaveBeenCalledTimes(1);
    expect(
      responses.map((res) => res.headers.location).sort(),
    ).toEqual([`${website}/integrations`, invalidState].sort());
    expect(
      userWrites().filter((path) => path === 'users/uid-a/slackToken'),
    ).toHaveLength(1);
  });

  it('writes nothing for a nonce issued for another provider', async () => {
    const state = await oauthState.issue('uid-a', 'dropbox');

    const res = await request(app.getHttpServer())
      .get('/slack/installation')
      .query({ code: 'good-code', state });

    expect(res.headers.location).toBe(invalidState);
    expect(slackAuthorizeToken).not.toHaveBeenCalled();
    expect(userWrites()).toEqual([]);
  });
});
