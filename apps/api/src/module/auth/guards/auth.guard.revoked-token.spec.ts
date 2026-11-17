/**
 * `AuthGuard` looks the signed-in account up in Firebase once per request (the ID token check asks
 * for `checkRevoked` in one step only, not in each). A revoked ID token is still refused: the guard
 * then falls back to the refresh token, lets the request through when that one is still valid, and
 * answers 401 when it is revoked too.
 */
import request from 'supertest';
import { createTestApp, TestApp } from '../../../../test/support/test-app';

describe('AuthGuard, the account lookup and a revoked ID token', () => {
  let t: TestApp;

  const server = () => t.app.getHttpServer();

  const signIn = async (uid: string, email: string) => {
    t.firebase.authService.addUser({
      uid,
      email,
      password: 'Secret-1234',
      displayName: 'Signed In',
      emailVerified: true,
    });
    await t.firebase.db
      .ref(`users/${uid}`)
      .set({ email, displayName: 'Signed In' });
    const login = await request(server())
      .post('/api/v1/auth/login')
      .send({ email, password: 'Secret-1234' });
    const { idToken, refreshToken } = login.body.data;
    expect(idToken).toMatch(/^fid\./);
    return { idToken, refreshToken };
  };

  const userData = (idToken: string, refreshToken?: string) => {
    const call = request(server())
      .get('/api/v1/auth/user-data')
      .set('idtoken', idToken);
    return refreshToken ? call.set('refreshtoken', refreshToken) : call;
  };

  /** Every `verifyIdToken` call from here on, the real fake answering unless `refuse` says so. */
  const watchVerify = (
    refuse?: (token: string, checkRevoked: boolean) => boolean,
  ) => {
    const auth = t.firebase.authService;
    const verify = auth.verifyIdToken.bind(auth);
    return jest
      .spyOn(auth, 'verifyIdToken')
      .mockImplementation(async (token: string, checkRevoked = false) => {
        if (refuse?.(token, checkRevoked)) {
          throw Object.assign(
            new Error('The Firebase ID token has been revoked.'),
            {
              code: 'auth/id-token-revoked',
            },
          );
        }
        return verify(token, checkRevoked);
      });
  };

  const lookups = (verify: jest.SpyInstance) =>
    verify.mock.calls.filter(([, checkRevoked]) => checkRevoked === true);

  const refreshCalls = () =>
    t.toolkit.calls.filter((call) => call.path === 'token');

  beforeEach(async () => {
    t = await createTestApp({ everId: false });
  });

  afterEach(async () => {
    jest.restoreAllMocks();
    await t.close();
  });

  it('looks the account up once per request', async () => {
    const { idToken, refreshToken } = await signIn(
      'uid-live',
      'live@example.test',
    );
    const verify = watchVerify();

    const response = await userData(idToken, refreshToken);

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({ id: 'uid-live' });
    expect(lookups(verify)).toEqual([[idToken, true]]);
    expect(refreshCalls()).toHaveLength(0);
  });

  it('lets a request with a revoked ID token and a valid refresh token through the refresh path', async () => {
    const { idToken, refreshToken } = await signIn(
      'uid-revoked',
      'revoked@example.test',
    );
    const verify = watchVerify(
      (token, checkRevoked) => checkRevoked && token === idToken,
    );

    const response = await userData(idToken, refreshToken);

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({
      id: 'uid-revoked',
      email: 'revoked@example.test',
    });
    expect(lookups(verify)).toEqual([[idToken, true]]);
    // The session's refresh token carries the Firebase one, which the refresh path renews.
    expect(refreshCalls()).toEqual([
      {
        path: 'token',
        body: {
          grant_type: 'refresh_token',
          refresh_token: expect.stringMatching(/^frt\.uid-revoked\./),
        },
      },
    ]);
  });

  it('answers 401 when the refresh token is revoked too', async () => {
    const { idToken, refreshToken } = await signIn(
      'uid-revoked',
      'revoked@example.test',
    );
    await t.firebase.authService.revokeRefreshTokens('uid-revoked');
    watchVerify((token, checkRevoked) => checkRevoked && token === idToken);

    expect((await userData(idToken, refreshToken)).status).toBe(401);
    expect((await userData(idToken)).status).toBe(401);
    expect(refreshCalls()).toHaveLength(1);
  });
});
