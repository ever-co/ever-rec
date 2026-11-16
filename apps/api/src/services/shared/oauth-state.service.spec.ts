/**
 * The one-time `state` of the OAuth redirects. A nonce works once, for the provider it was issued
 * for, within ten minutes. Anything else, a raw user id included, gives null.
 */
import { OAUTH_STATE_TTL_MS, OAuthStateService } from './oauth-state.service';
import { createFakeRealtimeDb } from './fake-realtime-db';

const mockDb = createFakeRealtimeDb();
jest.mock('firebase-admin', () => ({
  database: (...args: any[]) => (mockDb.admin.database as any)(...args),
}));

describe('OAuthStateService', () => {
  let service: OAuthStateService;

  beforeEach(() => {
    mockDb.data = {};
    mockDb.writes = [];
    service = new OAuthStateService();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('issues a long random nonce and keeps the user only on the server', async () => {
    const nonce = await service.issue('uid-a', 'slack');

    expect(nonce).toMatch(/^[A-Za-z0-9_-]{32}$/);
    expect(nonce).not.toContain('uid-a');
    expect(mockDb.data.oauthStates[nonce]).toEqual({
      uid: 'uid-a',
      provider: 'slack',
      expiresAt: expect.any(Number),
    });
    const other = await service.issue('uid-a', 'slack');
    expect(other).not.toBe(nonce);
  });

  it('returns the uid once and then nothing', async () => {
    const nonce = await service.issue('uid-a', 'jira');

    await expect(service.consume(nonce, 'jira')).resolves.toBe('uid-a');
    expect(mockDb.data.oauthStates[nonce]).toBeUndefined();
    await expect(service.consume(nonce, 'jira')).resolves.toBeNull();
  });

  it('gives null for a nonce issued for another provider, and burns it', async () => {
    const nonce = await service.issue('uid-a', 'slack');

    await expect(service.consume(nonce, 'dropbox')).resolves.toBeNull();
    await expect(service.consume(nonce, 'slack')).resolves.toBeNull();
  });

  it('gives null for an expired nonce', async () => {
    const now = Date.now();
    const nonce = await service.issue('uid-a', 'dropbox');
    jest.spyOn(Date, 'now').mockReturnValue(now + OAUTH_STATE_TTL_MS + 1);

    await expect(service.consume(nonce, 'dropbox')).resolves.toBeNull();
    expect(mockDb.data.oauthStates).toEqual({});
  });

  it('still accepts a nonce just before it expires', async () => {
    const now = Date.now();
    const nonce = await service.issue('uid-a', 'dropbox');
    jest.spyOn(Date, 'now').mockReturnValue(now + OAUTH_STATE_TTL_MS - 1000);

    await expect(service.consume(nonce, 'dropbox')).resolves.toBe('uid-a');
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

    await expect(service.consume(value, 'slack')).resolves.toBeNull();
    expect(mockDb.writes).toEqual([]);
  });

  it('lets only one of two callbacks with the same nonce through', async () => {
    const nonce = await service.issue('uid-a', 'slack');

    const results = await Promise.all([
      service.consume(nonce, 'slack'),
      service.consume(nonce, 'slack'),
    ]);

    expect(results.filter((uid) => uid === 'uid-a')).toHaveLength(1);
  });
});
