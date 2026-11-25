/**
 * Connecting Google Drive with the real controller, service and one-time state. The token exchange
 * (googleapis) and the database are mocked. The /oauth page redeems a `code` under the session of
 * whoever opens it, so a code is only exchanged when it comes with a nonce that was issued to that
 * same user, is presented by the browser that asked for it (it holds a cookie set with the nonce),
 * and has not been used before. Anything else is refused before Google is asked for a token, and
 * the user's own Drive link is left as it was.
 */
import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Test } from '@nestjs/testing';
import { HttpService } from 'nestjs-http-promise';
import request from 'supertest';
import {
  newOAuthBinding,
  OAuthStateService,
} from '../../services/shared/oauth-state.service';
import { createFakeRealtimeDb } from '../../services/shared/fake-realtime-db';
import { TokenService } from '../auth/services/tokens';
import { DriveController } from './drive.controller';
import { DriveService } from './drive.service';

jest.mock('../auth/services/tokens', () => ({ TokenService: class {} }));

const mockGetToken = jest.fn();
jest.mock('googleapis', () => ({
  google: {
    auth: {
      OAuth2: class {
        credentials: unknown;
        getToken(code: string, cb: (...args: any[]) => void) {
          return mockGetToken(code, cb);
        }
        setCredentials(credentials: unknown) {
          this.credentials = credentials;
        }
      },
    },
    drive: () => ({}),
  },
}));

const mockDb = createFakeRealtimeDb();
jest.mock('firebase-admin', () => ({
  database: (...args: any[]) => (mockDb.admin.database as any)(...args),
}));

const cookieName = 'ever_rec_oauth_drive';

const idToken = (claims: Record<string, string>) =>
  `header.${Buffer.from(JSON.stringify(claims)).toString('base64url')}.signature`;

describe('Google Drive connection', () => {
  let app: INestApplication;
  let oauthState: OAuthStateService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [DriveController],
      providers: [
        DriveService,
        OAuthStateService,
        {
          provide: TokenService,
          useValue: {
            processToken: async (token: string, req: any) => {
              req.user = { id: token };
            },
          },
        },
        { provide: HttpService, useValue: {} },
        {
          provide: ConfigService,
          useValue: { get: () => 'https://api.test' },
        },
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
        // The user's own Drive link, which a refused callback must not replace.
        'uid-a': {
          googleAPISCredentials: {
            credentials: { access_token: 'own-drive' },
            email: 'a@example.com',
          },
        },
        'uid-b': { name: 'B' },
      },
    };
    mockDb.writes = [];
    mockDb.staleReads = {};
    mockGetToken.mockReset();
    let call = 0;
    mockGetToken.mockImplementation((_code, cb) =>
      cb(null, {
        access_token: `access-${++call}`,
        refresh_token: `refresh-${call}`,
        expiry_date: 1,
        id_token: idToken({
          email: 'linked@example.com',
          name: 'Linked',
          picture: 'https://example.com/p.png',
        }),
      }),
    );
  });

  const credentialWrites = (uid: string) =>
    mockDb.writes.filter((path) =>
      path.startsWith(`users/${uid}/googleAPISCredentials`),
    );

  const ownLinkKept = () => {
    expect(mockGetToken).not.toHaveBeenCalled();
    expect(credentialWrites('uid-a')).toEqual([]);
    expect(mockDb.data.users['uid-a'].googleAPISCredentials).toEqual({
      credentials: { access_token: 'own-drive' },
      email: 'a@example.com',
    });
  };

  const callback = (
    query: Record<string, string>,
    binding?: string,
    uid = 'uid-a',
  ) => {
    const req = request(app.getHttpServer())
      .get('/drive/complete-oauth')
      .set('Authorization', `Bearer ${uid}`)
      .query(query);
    return binding ? req.set('Cookie', `${cookieName}=${binding}`) : req;
  };

  it('issues a nonce and sets the browser secret in an HttpOnly cookie', async () => {
    const res = await request(app.getHttpServer())
      .get('/drive/oauth-state')
      .set('Authorization', 'Bearer uid-a');

    expect(res.status).toBe(200);
    expect(res.text).toMatch(/^[A-Za-z0-9_-]{32}$/);
    const setCookie = (res.headers['set-cookie'] as unknown as string[]).find(
      (cookie) => cookie.startsWith(`${cookieName}=`),
    );
    expect(setCookie).toContain('HttpOnly');
    expect(setCookie).toContain('Path=/api/v1');
    const binding = setCookie!.split(';')[0].split('=')[1];

    // The browser that got the cookie completes the connection.
    const completed = await callback(
      { code: 'good-code', state: res.text },
      binding,
    );
    expect(completed.status).toBe(200);
    expect(
      mockDb.data.users['uid-a'].googleAPISCredentials.credentials.access_token,
    ).toBe('access-1');
  });

  it('needs a signed-in user to issue a nonce', async () => {
    const res = await request(app.getHttpServer()).get('/drive/oauth-state');

    expect(res.status).toBe(401);
    expect(res.headers['set-cookie']).toBeUndefined();
  });

  it('refuses a callback without a state', async () => {
    const res = await callback({ code: 'other-code' }, newOAuthBinding());

    expect(res.status).toBe(403);
    ownLinkKept();
  });

  it('refuses a malformed state', async () => {
    const binding = newOAuthBinding();
    for (const state of ['{"origin":"/settings/drive"}', 'uid-a', '../x']) {
      const res = await callback({ code: 'other-code', state }, binding);
      expect(res.status).toBe(403);
    }
    ownLinkKept();
  });

  it('refuses a nonce issued to another user', async () => {
    // Somebody else asks for a nonce and sends their callback link, cookie value and all.
    const binding = newOAuthBinding();
    const state = await oauthState.issue('uid-b', 'drive', binding);

    const res = await callback({ code: 'other-code', state }, binding);

    expect(res.status).toBe(403);
    ownLinkKept();
    expect(mockDb.data.users['uid-b'].googleAPISCredentials).toBeUndefined();
  });

  it('refuses a nonce presented without the cookie of the browser it was issued to', async () => {
    const state = await oauthState.issue('uid-a', 'drive', newOAuthBinding());

    const withoutCookie = await callback({ code: 'other-code', state });
    const withOtherCookie = await callback(
      { code: 'other-code', state },
      newOAuthBinding(),
    );

    expect(withoutCookie.status).toBe(403);
    expect(withOtherCookie.status).toBe(403);
    ownLinkKept();
  });

  it('refuses a nonce issued for another provider', async () => {
    const binding = newOAuthBinding();
    const state = await oauthState.issue('uid-a', 'dropbox', binding);

    const res = await callback({ code: 'other-code', state }, binding);

    expect(res.status).toBe(403);
    ownLinkKept();
  });

  it('stores the credentials for a nonce issued to the caller, once', async () => {
    const binding = newOAuthBinding();
    const state = await oauthState.issue('uid-a', 'drive', binding);

    const res = await callback({ code: 'good-code', state }, binding);

    expect(res.status).toBe(200);
    expect(mockGetToken).toHaveBeenCalledWith(
      'good-code',
      expect.any(Function),
    );
    expect(mockDb.data.users['uid-a'].googleAPISCredentials).toEqual({
      credentials: {
        access_token: 'access-1',
        refresh_token: 'refresh-1',
        expiry_date: 1,
      },
      email: 'linked@example.com',
      name: 'Linked',
      picture: 'https://example.com/p.png',
    });

    // The same nonce again is refused, and the stored credentials stay.
    mockDb.writes = [];
    const replay = await callback({ code: 'second-code', state }, binding);

    expect(replay.status).toBe(403);
    expect(mockGetToken).toHaveBeenCalledTimes(1);
    expect(credentialWrites('uid-a')).toEqual([]);
    expect(
      mockDb.data.users['uid-a'].googleAPISCredentials.credentials.access_token,
    ).toBe('access-1');
  });
});
