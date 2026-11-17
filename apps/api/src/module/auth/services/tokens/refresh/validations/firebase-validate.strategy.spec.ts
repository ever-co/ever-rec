/**
 * `FirebaseValidateStrategy` is the ID token check behind `AuthGuard`, `OptionalAuthGuard` and the
 * editor socket. It asks Firebase to look the account up as well (`checkRevoked`), so the token of
 * a deleted, disabled or signed-out account is refused instead of passing on its signature and
 * expiry alone.
 */
import { FirebaseAdminService } from '../../../../../firebase/services/firebase-admin.service';
import { InMemoryFirebaseApp } from '../../../../../../../test/support/in-memory-firebase';
import { UserFactory } from '../../user.factory';
import { FirebaseValidateStrategy } from './firebase-validate.strategy';

describe('FirebaseValidateStrategy', () => {
  let firebase: InMemoryFirebaseApp;
  let strategy: FirebaseValidateStrategy;

  const TOKEN = 'fid.uid-a.000001';

  beforeEach(() => {
    firebase = new InMemoryFirebaseApp();
    firebase.authService.addUser({
      uid: 'uid-a',
      email: 'a@example.test',
      displayName: 'Person A',
    });
    strategy = new FirebaseValidateStrategy(
      new FirebaseAdminService(firebase as any),
      new UserFactory(),
    );
  });

  it('supports and handles the token of a live account', async () => {
    const request: any = {};

    await strategy.resolve({ token: TOKEN, request } as any);

    expect(request.user).toMatchObject({
      id: 'uid-a',
      email: 'a@example.test',
    });
  });

  it('refuses the token of a deleted account and sets no user', async () => {
    await firebase.authService.deleteUser('uid-a');
    const request: any = {};

    await expect(strategy.supports(TOKEN)).resolves.toBe(false);
    await expect(
      strategy.resolve({ token: TOKEN, request } as any),
    ).rejects.toThrow();
    await expect(
      strategy.handle({ token: TOKEN, request } as any),
    ).rejects.toMatchObject({ code: 'auth/user-not-found' });
    expect(request.user).toBeUndefined();
  });

  it.each([
    'auth/user-not-found',
    'auth/user-disabled',
    'auth/id-token-revoked',
  ])('refuses a token that Firebase refuses with %s', async (code) => {
    jest
      .spyOn(firebase.authService, 'verifyIdToken')
      .mockRejectedValue(Object.assign(new Error(code), { code }));
    const request: any = {};

    await expect(strategy.supports(TOKEN)).resolves.toBe(false);
    await expect(
      strategy.resolve({ token: TOKEN, request } as any),
    ).rejects.toThrow();
    expect(request.user).toBeUndefined();
  });

  it('asks Firebase to look the account up in both steps', async () => {
    const verify = jest.spyOn(firebase.authService, 'verifyIdToken');

    await strategy.resolve({ token: TOKEN, request: {} } as any);

    expect(verify).toHaveBeenCalledTimes(2);
    expect(verify).toHaveBeenNthCalledWith(1, TOKEN, true);
    expect(verify).toHaveBeenNthCalledWith(2, TOKEN, true);
  });
});
