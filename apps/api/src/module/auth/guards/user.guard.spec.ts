/**
 * `UserGuard` (image and video uploads, Google Drive and Dropbox) reads the user from the ID token
 * and never rejects the request. The token of a deleted account gives no user, so an upload from a
 * still-open tab cannot write a new record under the account; the token of a live account still
 * gives its user.
 */
import { InMemoryAuth } from '../../../../test/support/in-memory-firebase';
import { UserGuard } from './user.guard';

const mockAuth = { current: new InMemoryAuth() };

jest.mock('firebase-admin/auth', () => ({
  getAuth: () => mockAuth.current,
}));

describe('UserGuard', () => {
  const guard = new UserGuard({} as any, {} as any);

  const run = async (headers: Record<string, string>) => {
    const request: any = { headers };
    const allowed = await guard.canActivate({
      switchToHttp: () => ({ getRequest: () => request }),
    } as any);
    return { allowed, user: request.user };
  };

  beforeEach(() => {
    mockAuth.current = new InMemoryAuth();
    mockAuth.current.addUser({
      uid: 'uid-a',
      email: 'a@example.test',
      displayName: 'Person A',
    });
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('gives the user of a live account', async () => {
    expect(await run({ idtoken: 'fid.uid-a.000001' })).toEqual({
      allowed: true,
      user: {
        id: 'uid-a',
        email: 'a@example.test',
        photoURL: undefined,
        name: 'Person A',
      },
    });
  });

  it('gives no user for the token of a deleted account', async () => {
    await mockAuth.current.deleteUser('uid-a');

    expect(await run({ idtoken: 'fid.uid-a.000001' })).toEqual({
      allowed: true,
      user: null,
    });
  });

  it.each([
    'auth/user-not-found',
    'auth/user-disabled',
    'auth/id-token-revoked',
  ])('gives no user when the token is refused with %s', async (code) => {
    jest
      .spyOn(mockAuth.current, 'verifyIdToken')
      .mockRejectedValue(Object.assign(new Error(code), { code }));

    expect(await run({ idtoken: 'fid.uid-a.000001' })).toEqual({
      allowed: true,
      user: null,
    });
  });

  it('asks for the account to be looked up', async () => {
    const verify = jest.spyOn(mockAuth.current, 'verifyIdToken');

    await run({ idtoken: 'fid.uid-a.000001' });

    expect(verify).toHaveBeenCalledWith('fid.uid-a.000001', true);
  });
});
