/**
 * The optional sign-in of public routes: a usable session (any provider, and an expired token
 * renewed with the refresh token) gives `request.user`; anything else gives `null`. It never
 * rejects the request.
 */
import { OptionalAuthGuard } from './optional-auth.guard';

jest.mock('../services/tokens', () => ({ TokenService: class {} }));

describe('OptionalAuthGuard', () => {
  const processToken = jest.fn();
  const refreshToken = jest.fn();
  const guard = new OptionalAuthGuard({ processToken, refreshToken } as any);

  const run = async (headers: Record<string, string>) => {
    const request: any = { headers, user: { id: 'preset' } };
    const allowed = await guard.canActivate({
      switchToHttp: () => ({ getRequest: () => request }),
    } as any);
    return { allowed, user: request.user };
  };

  beforeEach(() => {
    processToken.mockReset();
    refreshToken.mockReset();
  });

  it('sets the user of a valid token', async () => {
    processToken.mockImplementation(async (_t, req) => {
      req.user = { id: 'uid-a' };
    });

    expect(await run({ idtoken: 'good' })).toEqual({
      allowed: true,
      user: { id: 'uid-a' },
    });
    expect(refreshToken).not.toHaveBeenCalled();
  });

  it('renews an expired session with the refresh token, so the viewer is kept', async () => {
    processToken.mockRejectedValue(new Error('expired'));
    refreshToken.mockImplementation(async (_t, req) => {
      req.user = { id: 'uid-a', email: 'a@example.com' };
    });

    expect(await run({ idtoken: 'old', refreshtoken: 'r' })).toEqual({
      allowed: true,
      user: { id: 'uid-a', email: 'a@example.com' },
    });
    expect(refreshToken).toHaveBeenCalledWith('r', expect.anything());
  });

  it('reads a bearer token too', async () => {
    processToken.mockImplementation(async (_t, req) => {
      req.user = { id: 'uid-b' };
    });

    expect((await run({ authorization: 'Bearer tok' })).user).toEqual({
      id: 'uid-b',
    });
    expect(processToken).toHaveBeenCalledWith('tok', expect.anything());
  });

  it('lets an anonymous request through with no user', async () => {
    expect(await run({})).toEqual({ allowed: true, user: null });
    expect(processToken).not.toHaveBeenCalled();
  });

  it('lets a request with an unusable session through with no user', async () => {
    processToken.mockRejectedValue(new Error('bad'));
    refreshToken.mockRejectedValue(new Error('bad'));

    expect(await run({ idtoken: 'x', refreshtoken: 'y' })).toEqual({
      allowed: true,
      user: null,
    });
  });
});
