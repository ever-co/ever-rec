/**
 * An ID token stays valid for up to an hour after it was issued, also when its account is deleted
 * in the meantime. `AuthGuard` refuses the token of a deleted account (the sign-in account is
 * looked up, not only the signature and the expiry), falls back to the refresh token, which fails
 * for a deleted account too, and answers 401. A still-open tab can then not write data back under
 * the account. The token of a live account still passes.
 */
import request from 'supertest';
import { createTestApp, TestApp } from '../../../../test/support/test-app';

describe('AuthGuard and the ID token of a deleted account', () => {
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

  beforeEach(async () => {
    t = await createTestApp({ everId: false });
  });

  afterEach(async () => {
    jest.restoreAllMocks();
    await t.close();
  });

  it('lets the token of a live account through', async () => {
    const { idToken, refreshToken } = await signIn(
      'uid-live',
      'live@example.test',
    );

    const response = await userData(idToken, refreshToken);

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({
      id: 'uid-live',
      email: 'live@example.test',
    });
  });

  it('answers 401 to the token of a deleted account, with or without its refresh token', async () => {
    const { idToken, refreshToken } = await signIn(
      'uid-gone',
      'gone@example.test',
    );
    // The shares cleanup logs that no default Firebase app exists in this test app.
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    const deleted = await request(server())
      .delete('/api/v1/auth/user')
      .set('idtoken', idToken);
    expect(deleted.status).toBe(200);
    expect(deleted.body.status).toBe('success');
    expect(t.firebase.authService.users.has('uid-gone')).toBe(false);

    expect((await userData(idToken, refreshToken)).status).toBe(401);
    expect((await userData(idToken)).status).toBe(401);
    expect(
      (
        await request(server())
          .get('/api/v1/auth/user-data')
          .set('authorization', `Bearer ${idToken}`)
      ).status,
    ).toBe(401);
  });

  it('keeps the token of another account working after one account is deleted', async () => {
    const gone = await signIn('uid-gone', 'gone@example.test');
    const live = await signIn('uid-live', 'live@example.test');
    await t.firebase.authService.deleteUser('uid-gone');

    expect((await userData(gone.idToken, gone.refreshToken)).status).toBe(401);
    expect((await userData(live.idToken, live.refreshToken)).status).toBe(200);
  });
});
