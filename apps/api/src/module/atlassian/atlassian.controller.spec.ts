/**
 * Connecting Jira with the real controller, service and one-time state. The token exchange and
 * the database are mocked. A state that is not a nonce we issued, such as a raw user id, must
 * exchange no code and write nothing; a nonce is good once, only for the user it was issued for and
 * only for the browser that asked for it (it holds a cookie that is set with the Connect URL).
 */
import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AtlassianApiService } from 'src/services/atlassian/atlassian.api.service';
import {
  newOAuthBinding,
  OAuthStateService,
} from '../../services/shared/oauth-state.service';
import { createFakeRealtimeDb } from '../../services/shared/fake-realtime-db';
import { TokenService } from '../auth/services/tokens';
import { ImageService } from '../image/image.service';
import { VideoService } from '../video/video.service';
import { AtlassianController } from './atlassian.controller';
import { AtlassianService } from './atlassian.service';

jest.mock('../auth/services/tokens', () => ({ TokenService: class {} }));
jest.mock('../image/image.service', () => ({ ImageService: class {} }));
jest.mock('../video/video.service', () => ({ VideoService: class {} }));
jest.mock('src/services/atlassian/atlassian.api.service', () => ({
  AtlassianApiService: class {},
}));

const mockDb = createFakeRealtimeDb();
jest.mock('firebase-admin', () => ({
  database: (...args: any[]) => (mockDb.admin.database as any)(...args),
}));

const website = 'https://web.test';
const done = `${website}/media/integrations`;
const invalidState = `${done}?error=invalid_state`;
const cookieName = 'ever_rec_oauth_jira';

describe('Jira connection', () => {
  let app: INestApplication;
  let oauthState: OAuthStateService;
  const getAccessToken = jest.fn();
  const getJiraUserDetails = jest.fn();

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [AtlassianController],
      providers: [
        AtlassianService,
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
          provide: AtlassianApiService,
          useValue: {
            getAccessToken,
            getJiraUserDetails,
            generateOauthLink: async (uid: string, binding: string) =>
              `https://auth.test/authorize?state=${await oauthState.issue(
                uid,
                'jira',
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
    oauthState = moduleRef.get(OAuthStateService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    mockDb.data = {
      users: {
        'uid-victim': {
          jiraAPISCredentials: { credentials: { access_token: 'victim' } },
        },
        'uid-a': { name: 'A' },
      },
    };
    mockDb.writes = [];
    mockDb.staleReads = {};
    getAccessToken.mockReset();
    getJiraUserDetails.mockReset();
    let call = 0;
    getAccessToken.mockImplementation(async () => ({
      status: 'success',
      data: {
        access_token: `access-${++call}`,
        refresh_token: `refresh-${call}`,
      },
    }));
    getJiraUserDetails.mockResolvedValue({
      status: 'success',
      data: { email: 'a@example.com', account_id: 'acc-a', picture: 'p' },
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const userWrites = () =>
    mockDb.writes.filter((path) => path.startsWith('users/'));

  const callback = (query: Record<string, string>, binding?: string) => {
    const req = request(app.getHttpServer())
      .get('/atlassian/jira/complete-oauth')
      .query(query);
    return binding ? req.set('Cookie', `${cookieName}=${binding}`) : req;
  };

  it('sets the browser secret in an HttpOnly cookie with the Connect URL', async () => {
    const res = await request(app.getHttpServer())
      .get('/atlassian/jira/sign-in')
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
    const completed = await callback(
      { code: 'good-code', state: state! },
      binding,
    );
    expect(completed.headers.location).toBe(done);
    expect(
      mockDb.data.users['uid-a'].jiraAPISCredentials.credentials.access_token,
    ).toBe('access-1');
  });

  it('writes nothing when the state is a raw user id', async () => {
    const res = await callback(
      { code: 'attacker-code', state: 'uid-victim' },
      newOAuthBinding(),
    );

    expect(res.status).toBe(302);
    expect(res.headers.location).toBe(invalidState);
    expect(getAccessToken).not.toHaveBeenCalled();
    expect(userWrites()).toEqual([]);
    expect(
      mockDb.data.users['uid-victim'].jiraAPISCredentials.credentials
        .access_token,
    ).toBe('victim');
  });

  it('stores the credentials only on the user the nonce was issued for', async () => {
    const binding = newOAuthBinding();
    const state = await oauthState.issue('uid-a', 'jira', binding);

    const res = await callback({ code: 'good-code', state }, binding);

    expect(res.status).toBe(302);
    expect(res.headers.location).toBe(done);
    expect(getAccessToken).toHaveBeenCalledWith('good-code');
    expect(mockDb.data.users['uid-a'].jiraAPISCredentials).toMatchObject({
      credentials: { access_token: 'access-1', refresh_token: 'refresh-1' },
      account_id: 'acc-a',
    });
    expect(userWrites().every((path) => path.startsWith('users/uid-a/'))).toBe(
      true,
    );
    expect(
      mockDb.data.users['uid-victim'].jiraAPISCredentials.credentials
        .access_token,
    ).toBe('victim');
  });

  it('writes nothing when the Connect link of another user is opened without their cookie', async () => {
    // The attacker asks for a Connect link and sends it to the victim.
    const state = await oauthState.issue('uid-a', 'jira', newOAuthBinding());

    const withoutCookie = await callback({ code: 'victim-code', state });
    const withOtherCookie = await callback(
      { code: 'victim-code', state },
      newOAuthBinding(),
    );

    expect(withoutCookie.headers.location).toBe(invalidState);
    expect(withOtherCookie.headers.location).toBe(invalidState);
    expect(getAccessToken).not.toHaveBeenCalled();
    expect(userWrites()).toEqual([]);
  });

  it('writes nothing when the nonce is replayed', async () => {
    const binding = newOAuthBinding();
    const state = await oauthState.issue('uid-a', 'jira', binding);
    await callback({ code: 'good-code', state }, binding);
    mockDb.writes = [];

    const res = await callback({ code: 'second-code', state }, binding);

    expect(res.headers.location).toBe(invalidState);
    expect(getAccessToken).toHaveBeenCalledTimes(1);
    expect(userWrites()).toEqual([]);
    expect(
      mockDb.data.users['uid-a'].jiraAPISCredentials.credentials.access_token,
    ).toBe('access-1');
  });

  it('exchanges the code once when two callbacks race with the same nonce', async () => {
    const binding = newOAuthBinding();
    const state = await oauthState.issue('uid-a', 'jira', binding);

    const responses = await Promise.all([
      callback({ code: 'code-1', state }, binding),
      callback({ code: 'code-2', state }, binding),
    ]);

    expect(getAccessToken).toHaveBeenCalledTimes(1);
    expect(responses.map((res) => res.headers.location).sort()).toEqual(
      [done, invalidState].sort(),
    );
    expect(
      userWrites().filter((path) => path === 'users/uid-a/jiraAPISCredentials'),
    ).toHaveLength(1);
  });

  it('writes nothing for a nonce issued for another provider', async () => {
    const binding = newOAuthBinding();
    const state = await oauthState.issue('uid-a', 'slack', binding);

    const res = await callback({ code: 'good-code', state }, binding);

    expect(res.headers.location).toBe(invalidState);
    expect(getAccessToken).not.toHaveBeenCalled();
    expect(userWrites()).toEqual([]);
  });
});
