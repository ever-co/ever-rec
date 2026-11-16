/**
 * The one-time `state` of the OAuth redirects. A nonce works once, for the provider it was issued
 * for, to the browser it was issued to, within ten minutes. Anything else, a raw user id included,
 * gives null.
 */
import {
  newOAuthBinding,
  OAUTH_STATE_TTL_MS,
  OAuthStateService,
  readOAuthBinding,
  setOAuthBindingCookie,
} from './oauth-state.service';
import { createFakeRealtimeDb } from './fake-realtime-db';

const mockDb = createFakeRealtimeDb();
jest.mock('firebase-admin', () => ({
  database: (...args: any[]) => (mockDb.admin.database as any)(...args),
}));

describe('OAuthStateService', () => {
  let service: OAuthStateService;
  let binding: string;

  beforeEach(() => {
    mockDb.data = {};
    mockDb.writes = [];
    mockDb.staleReads = {};
    service = new OAuthStateService();
    binding = newOAuthBinding();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('issues a long random nonce and keeps the user only on the server', async () => {
    const nonce = await service.issue('uid-a', 'slack', binding);

    expect(nonce).toMatch(/^[A-Za-z0-9_-]{32}$/);
    expect(nonce).not.toContain('uid-a');
    const record = mockDb.data.oauthStates[nonce];
    expect(record).toEqual({
      uid: 'uid-a',
      provider: 'slack',
      bindingHash: expect.any(String),
      expiresAt: expect.any(Number),
    });
    // Only a hash of the browser secret is stored.
    expect(JSON.stringify(record)).not.toContain(binding);
    const other = await service.issue('uid-a', 'slack', binding);
    expect(other).not.toBe(nonce);
  });

  it('returns the uid once and then nothing', async () => {
    const nonce = await service.issue('uid-a', 'jira', binding);

    await expect(service.consume(nonce, 'jira', binding)).resolves.toBe(
      'uid-a',
    );
    expect(mockDb.data.oauthStates[nonce]).toBeUndefined();
    await expect(service.consume(nonce, 'jira', binding)).resolves.toBeNull();
  });

  it('gives null for a nonce issued for another provider, and burns it', async () => {
    const nonce = await service.issue('uid-a', 'slack', binding);

    await expect(
      service.consume(nonce, 'dropbox', binding),
    ).resolves.toBeNull();
    await expect(service.consume(nonce, 'slack', binding)).resolves.toBeNull();
  });

  it('gives null for an expired nonce', async () => {
    const now = Date.now();
    const nonce = await service.issue('uid-a', 'dropbox', binding);
    jest.spyOn(Date, 'now').mockReturnValue(now + OAUTH_STATE_TTL_MS + 1);

    await expect(
      service.consume(nonce, 'dropbox', binding),
    ).resolves.toBeNull();
    expect(mockDb.data.oauthStates).toEqual({});
  });

  it('still accepts a nonce just before it expires', async () => {
    const now = Date.now();
    const nonce = await service.issue('uid-a', 'dropbox', binding);
    jest.spyOn(Date, 'now').mockReturnValue(now + OAUTH_STATE_TTL_MS - 1000);

    await expect(service.consume(nonce, 'dropbox', binding)).resolves.toBe(
      'uid-a',
    );
  });

  describe('browser binding', () => {
    it('gives null when another browser presents the nonce', async () => {
      // The attacker asks for a Connect link and passes it to the victim.
      const nonce = await service.issue('uid-attacker', 'slack', binding);

      await expect(
        service.consume(nonce, 'slack', newOAuthBinding()),
      ).resolves.toBeNull();
      // The record is gone: the link cannot be tried again.
      await expect(
        service.consume(nonce, 'slack', binding),
      ).resolves.toBeNull();
    });

    it.each([undefined, null, '', 42, ['x']])(
      'gives null, and leaves the record alone, when the browser secret is %p',
      async (missing) => {
        const nonce = await service.issue('uid-a', 'slack', binding);
        mockDb.writes = [];

        await expect(
          service.consume(nonce, 'slack', missing),
        ).resolves.toBeNull();
        expect(mockDb.writes).toEqual([]);
        // The browser that asked can still complete the connection.
        await expect(service.consume(nonce, 'slack', binding)).resolves.toBe(
          'uid-a',
        );
      },
    );

    it('gives null for a record that has no binding hash', async () => {
      const nonce = 'n'.repeat(32);
      mockDb.data = {
        oauthStates: {
          [nonce]: {
            uid: 'uid-a',
            provider: 'slack',
            expiresAt: Date.now() + 1000,
          },
        },
      };

      await expect(service.consume(nonce, 'slack', binding)).resolves.toBeNull();
    });
  });

  it.each([
    ['a raw user id', 'uid-victim'],
    ['an unknown nonce of the right shape', 'a'.repeat(32)],
    ['a path', '../users/uid-victim'],
    ['a nonce with a slash', `${'a'.repeat(31)}/`],
    ['an empty string', ''],
    ['undefined', undefined],
    ['an array', ['a'.repeat(32)]],
    ['an object', { uid: 'uid-victim' }],
  ])('gives null for %s without touching the database', async (_name, value) => {
    mockDb.data = { users: { 'uid-victim': { name: 'Victim' } } };

    await expect(service.consume(value, 'slack', binding)).resolves.toBeNull();
    expect(mockDb.writes).toEqual([]);
  });

  describe('callbacks that compete for the same nonce', () => {
    it('lets only one of two callbacks through', async () => {
      const nonce = await service.issue('uid-a', 'slack', binding);

      const results = await Promise.all([
        service.consume(nonce, 'slack', binding),
        service.consume(nonce, 'slack', binding),
      ]);

      expect(results.filter((uid) => uid === 'uid-a')).toHaveLength(1);
      expect(results.filter((uid) => uid === null)).toHaveLength(1);
    });

    it('gives null when a retry finds the record already taken by another callback', async () => {
      // The first attempt sees the valid record in the local cache; by the time the server
      // answers, a competing callback has removed it and the update function runs again with null.
      const nonce = 'r'.repeat(32);
      mockDb.staleReads[`oauthStates/${nonce}`] = [
        {
          uid: 'uid-a',
          provider: 'slack',
          bindingHash: 'ignored',
          expiresAt: Date.now() + 60_000,
        },
      ];

      await expect(service.consume(nonce, 'slack', binding)).resolves.toBeNull();
    });

    it('returns the uid when a retry finds the record after a first attempt with null', async () => {
      const nonce = await service.issue('uid-a', 'slack', binding);
      mockDb.staleReads[`oauthStates/${nonce}`] = [null];

      await expect(service.consume(nonce, 'slack', binding)).resolves.toBe(
        'uid-a',
      );
      expect(mockDb.data.oauthStates[nonce]).toBeUndefined();
    });
  });
});

describe('browser binding cookie', () => {
  it('is HttpOnly, limited to the API path, and Lax over plain http', () => {
    const cookie = jest.fn();

    setOAuthBindingCookie({ cookie }, 'jira', 'secret', 'http://localhost:3000');

    expect(cookie).toHaveBeenCalledWith('ever_rec_oauth_jira', 'secret', {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      maxAge: OAUTH_STATE_TTL_MS,
      path: '/api/v1',
    });
  });

  it('is Secure and SameSite=None over https, so the web app can set it', () => {
    const cookie = jest.fn();

    setOAuthBindingCookie({ cookie }, 'slack', 'secret', 'https://api.test');

    expect(cookie.mock.calls[0][2]).toMatchObject({
      httpOnly: true,
      secure: true,
      sameSite: 'none',
    });
  });

  it('is read back for the right provider only', () => {
    const req = {
      headers: { cookie: 'a=1; ever_rec_oauth_slack=abc; ever_rec_oauth_jira=def' },
    };

    expect(readOAuthBinding(req, 'slack')).toBe('abc');
    expect(readOAuthBinding(req, 'jira')).toBe('def');
    expect(readOAuthBinding(req, 'dropbox')).toBeUndefined();
    expect(readOAuthBinding({ headers: {} }, 'slack')).toBeUndefined();
    expect(readOAuthBinding(undefined, 'slack')).toBeUndefined();
  });
});
