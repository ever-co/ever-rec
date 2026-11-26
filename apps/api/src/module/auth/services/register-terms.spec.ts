/**
 * Password sign-up: a failed terms record never fails the sign-up, and it raises the Sentry alert (#276). The
 * real TermsAcceptanceService runs on the package's in-memory adapter.
 */
jest.mock('@sentry/nestjs', () => ({ captureException: jest.fn() }));
jest.mock('terms-acceptance/firebase', () => {
  const { MemoryAcceptanceAdapter: Memory } =
    jest.requireActual('terms-acceptance');
  return {
    FirebaseAcceptanceAdapter: jest.fn().mockImplementation(() => new Memory()),
  };
});

import * as Sentry from '@sentry/nestjs';
import { TermsAcceptanceService } from '../../terms/terms-acceptance.service';
import { AuthenticationService } from './authentication.service';

const newAuth = () => {
  const terms = new TermsAcceptanceService({ firestore: () => ({}) } as any);
  const firebaseAuthService = {
    signup: jest.fn().mockResolvedValue({
      success: true,
      data: {
        localId: 'uid-1',
        idToken: 'id-token',
        refreshToken: 'refresh-token',
        expiresIn: '3600',
        email: 'new@example.test',
      },
    }),
    updateUser: jest.fn().mockResolvedValue(undefined),
  };
  const userService = {
    addUserToDb: jest.fn().mockResolvedValue({
      uid: 'uid-1',
      email: 'new@example.test',
      displayName: 'New Person',
      photoURL: null,
    }),
    generateCustomToken: jest.fn().mockResolvedValue('custom-token'),
  };
  const auth = new AuthenticationService(
    firebaseAuthService as any,
    {} as any,
    userService as any,
    { emit: jest.fn() } as any,
    terms,
  );
  const claims = terms
    .getRequiredDocuments('en')
    .map(({ documentId, version, sha256, locale }) => ({
      documentId,
      version,
      sha256,
      locale,
    }));
  const register = () =>
    auth.register({
      email: 'new@example.test',
      password: 'not-a-real-password',
      username: 'New Person',
      terms: claims,
      ip: null,
      userAgent: 'jest',
    } as any);
  return { terms, userService, register };
};

describe('AuthenticationService.register and the terms record', () => {
  beforeEach(() => jest.clearAllMocks());

  it('records the terms and sends no alert when the write works', async () => {
    const { terms, register } = newAuth();

    const result = await register();

    expect(result.data).toMatchObject({ id: 'uid-1' });
    expect((await terms.status('uid-1', 'en')).satisfied).toBe(true);
    expect(Sentry.captureException).not.toHaveBeenCalled();
  });

  it('still creates the account and raises the alert when the write fails', async () => {
    const { terms, userService, register } = newAuth();
    jest
      .spyOn(terms, 'record')
      .mockRejectedValueOnce(new Error('7 PERMISSION_DENIED'));

    const result = await register();

    expect(result.error).toBeNull();
    expect(result.data).toMatchObject({
      id: 'uid-1',
      customToken: 'custom-token',
    });
    expect(userService.addUserToDb).toHaveBeenCalledTimes(1);
    expect(Sentry.captureException).toHaveBeenCalledWith(expect.any(Error), {
      level: 'error',
      tags: { area: 'terms-acceptance', flow: 'password-signup' },
    });
    // The sign-in gate will ask again: nothing is on file yet.
    expect((await terms.status('uid-1', 'en')).satisfied).toBe(false);
  });
});
