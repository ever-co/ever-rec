/**
 * `FirebaseValidateStrategy` is the ID token check behind `AuthGuard`, `OptionalAuthGuard` and the
 * editor socket. `supports` checks the signature and the expiry only; `handle` asks Firebase to look
 * the account up as well (`checkRevoked`), so the token of a deleted, disabled or signed-out account
 * is refused instead of passing on its signature and expiry alone. The account is looked up once
 * per request, not once in each step.
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

  afterEach(() => {
    jest.restoreAllMocks();
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
  ])(
    'refuses a token that the account lookup refuses with %s and sets no user',
    async (code) => {
      // As Firebase does: the signature and the expiry still pass, only the lookup refuses.
      const auth = firebase.authService;
      const verify = auth.verifyIdToken.bind(auth);
      jest
        .spyOn(auth, 'verifyIdToken')
        .mockImplementation(async (token: string, checkRevoked?: boolean) => {
          if (checkRevoked) throw Object.assign(new Error(code), { code });
          return verify(token, checkRevoked);
        });
      const request: any = {};

      await expect(
        strategy.resolve({ token: TOKEN, request } as any),
      ).rejects.toThrow();
      await expect(
        strategy.handle({ token: TOKEN, request } as any),
      ).rejects.toMatchObject({ code });
      expect(request.user).toBeUndefined();
    },
  );

  it('looks the account up once per resolve, in the step that sets the user', async () => {
    const verify = jest.spyOn(firebase.authService, 'verifyIdToken');

    await strategy.resolve({ token: TOKEN, request: {} } as any);

    const lookups = verify.mock.calls.filter(
      ([, checkRevoked]) => checkRevoked === true,
    );
    expect(lookups).toEqual([[TOKEN, true]]);
    expect(verify).toHaveBeenCalledTimes(2);
    expect(verify).toHaveBeenNthCalledWith(1, TOKEN, false);
    expect(verify).toHaveBeenNthCalledWith(2, TOKEN, true);
  });
});
