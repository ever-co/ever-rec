/**
 * `PUT /api/v1/auth/password` (`AuthenticationService.changePassword`): a password change revokes
 * the sessions of the account, so a token taken before the change stops working. The tokens the
 * answer hands the portal must come from a session opened after that revocation. The tokens of
 * `updatePassword` are revoked with the rest, and with them the next call of the portal was
 * answered 401 and the person was signed out.
 */
import request from 'supertest';
import { createTestApp, TestApp } from '../../../../test/support/test-app';
import { AuthProviderId } from '../interfaces/auth.interface';
import { AuthContext } from './auth.context';
import { AuthenticationService } from './authentication.service';
import { PasswordUpdate } from './password-update/interfaces/password-update.interface';
import { FirebasePasswordUpdateState } from './password-update/state/firebase-password-update.state';
import { FirebaseValidateStrategy } from './tokens/refresh/validations/firebase-validate.strategy';

describe('changing the password', () => {
  let t: TestApp;

  const UID = 'uid-1';
  const EMAIL = 'person@example.test';
  const OLD_PASSWORD = 'Secret-1234';
  const NEW_PASSWORD = 'Changed-5678';

  const server = () => t.app.getHttpServer();

  const signIn = async () => {
    t.firebase.authService.addUser({
      uid: UID,
      email: EMAIL,
      password: OLD_PASSWORD,
      displayName: 'Person',
      emailVerified: true,
    });
    await t.firebase.db
      .ref(`users/${UID}`)
      .set({ email: EMAIL, displayName: 'Person' });
    const login = await request(server())
      .post('/api/v1/auth/login')
      .send({ email: EMAIL, password: OLD_PASSWORD });
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

  it('answers with tokens that keep the portal signed in, and ends the sessions opened before', async () => {
    const before = await signIn();

    const changed = await request(server())
      .put('/api/v1/auth/password')
      .set('idtoken', before.idToken)
      .set('refreshtoken', before.refreshToken)
      .send({
        email: EMAIL,
        oldPassword: OLD_PASSWORD,
        password: NEW_PASSWORD,
      });

    expect(changed.status).toBe(200);
    expect(changed.body.status).toBe('success');
    const { idToken, refreshToken, expiresAt } = changed.body.data;
    expect(idToken).toMatch(/^fid\./);
    expect(refreshToken).toMatch(/^eyJ/);
    expect(expiresAt).toBeTruthy();

    // The next calls of the portal: the ID token passes on its own, and the refresh token renews.
    expect((await userData(idToken)).status).toBe(200);
    expect((await userData(idToken, refreshToken)).status).toBe(200);
    expect(
      (
        await request(server())
          .get('/api/v1/auth/refresh-token')
          .set('refreshtoken', refreshToken)
      ).status,
    ).toBe(200);

    // The sessions opened before the change stay revoked.
    expect(t.firebase.authService.revoked).toEqual([UID]);
    expect((await userData(before.idToken, before.refreshToken)).status).toBe(
      401,
    );
  });

  it('signs in with the new password after the revocation and answers with the tokens of that sign-in', async () => {
    const before = await signIn();
    const steps: string[] = [];
    const signIns: Array<{ password: string; data: any }> = [];
    const post = t.toolkit.post.bind(t.toolkit);
    jest
      .spyOn(t.toolkit, 'post')
      .mockImplementation(async (path: string, body: any) => {
        steps.push(path);
        const answer = await post(path, body);
        if (path === 'accounts:signInWithPassword') {
          signIns.push({ password: body.password, data: answer.data });
        }
        return answer;
      });
    const revoke = t.firebase.authService.revokeRefreshTokens.bind(
      t.firebase.authService,
    );
    jest
      .spyOn(t.firebase.authService, 'revokeRefreshTokens')
      .mockImplementation(async (uid: string) => {
        steps.push(`revoke ${uid}`);
        return revoke(uid);
      });

    const { status, data } = await t.app
      .get(AuthenticationService)
      .changePassword({
        uid: UID,
        email: EMAIL,
        oldPassword: OLD_PASSWORD,
        newPassword: NEW_PASSWORD,
        token: before.refreshToken,
      });

    expect(status).toBe('success');
    expect(steps).toEqual([
      'accounts:createAuthUri',
      'accounts:signInWithPassword',
      'accounts:update',
      `revoke ${UID}`,
      'accounts:signInWithPassword',
    ]);
    expect(signIns.map((signIn) => signIn.password)).toEqual([
      OLD_PASSWORD,
      NEW_PASSWORD,
    ]);
    const last = signIns[1].data;
    expect(data.idToken).toBe(last.idToken);
    expect(data.refreshToken).toBe(last.refreshToken);
    expect(data.expiresAt).toBeInstanceOf(Date);

    const validated: any = {};
    await t.app
      .get(FirebaseValidateStrategy)
      .resolve({ token: data.idToken, request: validated } as any);
    expect(validated.user).toMatchObject({ id: UID, email: EMAIL });
  });

  it('keeps the change and runs the next provider when the sign-in with the new password fails', async () => {
    const before = await signIn();
    const post = t.toolkit.post.bind(t.toolkit);
    let signIns = 0;
    jest
      .spyOn(t.toolkit, 'post')
      .mockImplementation(async (path: string, body: any) => {
        if (path === 'accounts:signInWithPassword' && ++signIns === 2) {
          throw new Error('sign-in unavailable');
        }
        return post(path, body);
      });
    const gauzy = { handle: jest.fn().mockResolvedValue(undefined) };
    const state = new FirebasePasswordUpdateState(
      t.app.get(AuthenticationService),
      gauzy as any,
      true,
    );
    const context = new AuthContext<PasswordUpdate>(state, {
      isValid: async () => true,
    } as any);

    await context.request({
      uid: UID,
      email: EMAIL,
      oldPassword: OLD_PASSWORD,
      newPassword: NEW_PASSWORD,
      token: before.refreshToken,
    });

    // The password is changed, so the next provider gets it too, and no revoked token is answered.
    expect(signIns).toBe(2);
    expect(gauzy.handle).toHaveBeenCalledTimes(1);
    expect(t.firebase.authService.users.get(UID)?.password).toBe(NEW_PASSWORD);
    const answered: any = context.getResults().get(AuthProviderId.FIREBASE);
    expect(answered.data.message).toBe('Password changed successfully!');
    expect(answered.data.idToken).toBeUndefined();
    expect(answered.data.refreshToken).toBeUndefined();
  });

  it('still puts the old password back when the next provider fails', async () => {
    const before = await signIn();
    const gauzy = {
      handle: jest.fn().mockRejectedValue(new Error('gauzy unavailable')),
    };
    const state = new FirebasePasswordUpdateState(
      t.app.get(AuthenticationService),
      gauzy as any,
      true,
    );
    const context = new AuthContext<PasswordUpdate>(state, {
      isValid: async () => true,
    } as any);

    await expect(
      context.request({
        uid: UID,
        email: EMAIL,
        oldPassword: OLD_PASSWORD,
        newPassword: NEW_PASSWORD,
        token: before.refreshToken,
      }),
    ).rejects.toThrow('gauzy unavailable');

    expect(gauzy.handle).toHaveBeenCalledTimes(1);
    expect(t.firebase.authService.users.get(UID)?.password).toBe(OLD_PASSWORD);
    const login = await request(server())
      .post('/api/v1/auth/login')
      .send({ email: EMAIL, password: OLD_PASSWORD });
    expect(login.body.status).toBe('success');
  });
});
