/**
 * The Jira callback with the real controller, service and one-time state. The token exchange and
 * the database are mocked. A state that is not a nonce we issued, such as a raw user id, must
 * exchange no code and write nothing; a nonce is good once and only for the user it was issued for.
 */
import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AtlassianApiService } from 'src/services/atlassian/atlassian.api.service';
import { OAuthStateService } from '../../services/shared/oauth-state.service';
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

describe('Jira complete-oauth callback', () => {
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
        { provide: TokenService, useValue: {} },
        { provide: ImageService, useValue: {} },
        { provide: VideoService, useValue: {} },
        {
          provide: AtlassianApiService,
          useValue: { getAccessToken, getJiraUserDetails },
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

  it('writes nothing when the state is a raw user id', async () => {
    const res = await request(app.getHttpServer())
      .get('/atlassian/jira/complete-oauth')
      .query({ code: 'attacker-code', state: 'uid-victim' });

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
    const state = await oauthState.issue('uid-a', 'jira');

    const res = await request(app.getHttpServer())
      .get('/atlassian/jira/complete-oauth')
      .query({ code: 'good-code', state });

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

  it('writes nothing when the nonce is replayed', async () => {
    const state = await oauthState.issue('uid-a', 'jira');
    await request(app.getHttpServer())
      .get('/atlassian/jira/complete-oauth')
      .query({ code: 'good-code', state });
    mockDb.writes = [];

    const res = await request(app.getHttpServer())
      .get('/atlassian/jira/complete-oauth')
      .query({ code: 'second-code', state });

    expect(res.headers.location).toBe(invalidState);
    expect(getAccessToken).toHaveBeenCalledTimes(1);
    expect(userWrites()).toEqual([]);
    expect(
      mockDb.data.users['uid-a'].jiraAPISCredentials.credentials.access_token,
    ).toBe('access-1');
  });

  it('exchanges the code once when two callbacks race with the same nonce', async () => {
    const state = await oauthState.issue('uid-a', 'jira');

    const responses = await Promise.all([
      request(app.getHttpServer())
        .get('/atlassian/jira/complete-oauth')
        .query({ code: 'code-1', state }),
      request(app.getHttpServer())
        .get('/atlassian/jira/complete-oauth')
        .query({ code: 'code-2', state }),
    ]);

    expect(getAccessToken).toHaveBeenCalledTimes(1);
    expect(
      responses.map((res) => res.headers.location).sort(),
    ).toEqual([done, invalidState].sort());
    expect(
      userWrites().filter((path) => path === 'users/uid-a/jiraAPISCredentials'),
    ).toHaveLength(1);
  });

  it('writes nothing for a nonce issued for another provider', async () => {
    const state = await oauthState.issue('uid-a', 'slack');

    const res = await request(app.getHttpServer())
      .get('/atlassian/jira/complete-oauth')
      .query({ code: 'good-code', state });

    expect(res.headers.location).toBe(invalidState);
    expect(getAccessToken).not.toHaveBeenCalled();
    expect(userWrites()).toEqual([]);
  });
});
