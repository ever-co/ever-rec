/**
 * The Dropbox callback with the real controller, service and one-time state. The token exchange and
 * the database are mocked. A state that is not a nonce we issued, such as a raw user id, must
 * exchange no code and write nothing; a nonce is good once and only for the user it was issued for.
 */
import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Test } from '@nestjs/testing';
import { HttpService } from 'nestjs-http-promise';
import request from 'supertest';
import { OAuthStateService } from '../../services/shared/oauth-state.service';
import { createFakeRealtimeDb } from '../../services/shared/fake-realtime-db';
import { TokenService } from '../auth/services/tokens';
import { ImageService } from '../image/image.service';
import { VideoService } from '../video/video.service';
import { DropboxController } from './dropbox.controller';
import { DropboxService } from './dropbox.service';

jest.mock('../auth/services/tokens', () => ({ TokenService: class {} }));
jest.mock('../image/image.service', () => ({ ImageService: class {} }));
jest.mock('../video/video.service', () => ({ VideoService: class {} }));

const mockGetToken = jest.fn();
jest.mock('dropbox-v2-api', () => ({
  __esModule: true,
  default: {
    authenticate: () => {
      const client: any = (_req: unknown, cb: (...args: any[]) => void) =>
        cb(null, { email: 'a@example.com' });
      client.getToken = (code: string, cb: (...args: any[]) => void) =>
        mockGetToken(code, cb);
      client.generateAuthUrl = () => 'https://dropbox.test/authorize';
      return client;
    },
  },
}));

const mockDb = createFakeRealtimeDb();
jest.mock('firebase-admin', () => ({
  database: (...args: any[]) => (mockDb.admin.database as any)(...args),
}));

const website = 'https://web.test';
const done = `${website}/media/integrations`;
const invalidState = `${done}?error=invalid_state`;

describe('Dropbox complete-oauth callback', () => {
  let app: INestApplication;
  let oauthState: OAuthStateService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [DropboxController],
      providers: [
        DropboxService,
        OAuthStateService,
        { provide: TokenService, useValue: {} },
        { provide: HttpService, useValue: {} },
        { provide: ImageService, useValue: {} },
        { provide: VideoService, useValue: {} },
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
        'uid-victim': {
          dropboxAPISCredentials: { credentials: { access_token: 'victim' } },
        },
        'uid-a': { name: 'A' },
      },
    };
    mockDb.writes = [];
    mockGetToken.mockReset();
    let call = 0;
    mockGetToken.mockImplementation((_code, cb) =>
      cb(null, {
        access_token: `access-${++call}`,
        refresh_token: `refresh-${call}`,
        account_id: 'acc-a',
      }),
    );
  });

  const userWrites = () =>
    mockDb.writes.filter((path) => path.startsWith('users/'));

  it('writes nothing when the state is a raw user id', async () => {
    const res = await request(app.getHttpServer())
      .get('/dropbox/complete-oauth')
      .query({ code: 'attacker-code', state: 'uid-victim' });

    expect(res.status).toBe(302);
    expect(res.headers.location).toBe(invalidState);
    expect(mockGetToken).not.toHaveBeenCalled();
    expect(userWrites()).toEqual([]);
    expect(
      mockDb.data.users['uid-victim'].dropboxAPISCredentials.credentials
        .access_token,
    ).toBe('victim');
  });

  it('stores the credentials only on the user the nonce was issued for', async () => {
    const state = await oauthState.issue('uid-a', 'dropbox');

    const res = await request(app.getHttpServer())
      .get('/dropbox/complete-oauth')
      .query({ code: 'good-code', state });

    expect(res.status).toBe(302);
    expect(res.headers.location).toBe(done);
    expect(mockGetToken).toHaveBeenCalledWith('good-code', expect.any(Function));
    expect(mockDb.data.users['uid-a'].dropboxAPISCredentials).toMatchObject({
      credentials: { access_token: 'access-1', refresh_token: 'refresh-1' },
      account_id: 'acc-a',
      email: 'a@example.com',
    });
    expect(userWrites().every((path) => path.startsWith('users/uid-a/'))).toBe(
      true,
    );
    expect(
      mockDb.data.users['uid-victim'].dropboxAPISCredentials.credentials
        .access_token,
    ).toBe('victim');
  });

  it('writes nothing when the nonce is replayed', async () => {
    const state = await oauthState.issue('uid-a', 'dropbox');
    await request(app.getHttpServer())
      .get('/dropbox/complete-oauth')
      .query({ code: 'good-code', state });
    mockDb.writes = [];

    const res = await request(app.getHttpServer())
      .get('/dropbox/complete-oauth')
      .query({ code: 'second-code', state });

    expect(res.headers.location).toBe(invalidState);
    expect(mockGetToken).toHaveBeenCalledTimes(1);
    expect(userWrites()).toEqual([]);
    expect(
      mockDb.data.users['uid-a'].dropboxAPISCredentials.credentials
        .access_token,
    ).toBe('access-1');
  });

  it('writes nothing for a nonce issued for another provider', async () => {
    const state = await oauthState.issue('uid-a', 'jira');

    const res = await request(app.getHttpServer())
      .get('/dropbox/complete-oauth')
      .query({ code: 'good-code', state });

    expect(res.headers.location).toBe(invalidState);
    expect(mockGetToken).not.toHaveBeenCalled();
    expect(userWrites()).toEqual([]);
  });
});
