jest.mock('next/server', () => ({
  NextResponse: {
    next: jest.fn(() => ({ kind: 'next' })),
    redirect: jest.fn((url: { pathname: string }) => ({ kind: 'redirect', pathname: url.pathname })),
  },
}));
jest.mock('jwt-decode', () => ({
  __esModule: true,
  default: jest.fn((token: string) => {
    if (token === 'bad') throw new Error('invalid');
    return { sub: 'user' };
  }),
}));

import { isPublicSharedPath, middleware } from '../middleware';

function makeRequest(pathname: string, cookies: Record<string, string> = {}) {
  const nextUrl: any = {
    pathname,
    search: '?x=1',
    clone() {
      return { ...nextUrl, pathname: nextUrl.pathname };
    },
  };
  return {
    nextUrl,
    cookies: { get: (name: string) => (cookies[name] ? { value: cookies[name] } : undefined) },
  } as any;
}

describe('isPublicSharedPath', () => {
  it.each([
    '/video/shared/abc123',
    '/video/shared/abc123/',
    '/image/shared/abc123',
    '/image/shared/abc-123_XYZ',
    '/video/shared/embed/abc123',
    '/video/shared/embed/abc123/',
  ])('allows the public share page %s', (path) => {
    expect(isPublicSharedPath(path)).toBe(true);
  });

  it.each([
    '/media/shared',
    '/shared-settings',
    '/settings/shared',
    '/media/workspaces/shared',
    '/video/shared',
    '/video/shared/',
    '/image/shared',
    '/video/shared/abc/extra',
    '/video/sharedfoo/abc',
    '/edit/shared/abc',
    '/video/abc/shared/def',
    '/foo/video/shared/abc',
    '/image/shared/embed/abc123',
    '/video/shared/embed/abc123/extra',
    '/video/embed/abc123',
    '/foo/video/shared/embed/abc123',
  ])('does not allow %s without sign-in', (path) => {
    expect(isPublicSharedPath(path)).toBe(false);
  });
});

describe('middleware', () => {
  beforeEach(() => jest.clearAllMocks());

  it('lets share-link pages through when signed out', () => {
    expect(middleware(makeRequest('/video/shared/abc'))).toEqual({ kind: 'next' });
    expect(middleware(makeRequest('/image/shared/abc'))).toEqual({ kind: 'next' });
  });

  it.each(['/media/shared', '/shared-settings', '/video/shared'])(
    'redirects %s to sign-in when signed out',
    (path) => {
      expect(middleware(makeRequest(path))).toEqual({ kind: 'redirect', pathname: '/auth/login' });
    },
  );

  it('lets the embed player page through when signed out', () => {
    expect(middleware(makeRequest('/video/shared/embed/abc'))).toEqual({
      kind: 'next',
    });
  });

  it('lets a signed-in user reach /media/shared', () => {
    const res = middleware(makeRequest('/media/shared', { refreshToken: 'r', idToken: 'ok' }));
    expect(res).toEqual({ kind: 'next' });
  });

  it('keeps redirecting /auth to /auth/login', () => {
    expect(middleware(makeRequest('/auth'))).toEqual({ kind: 'redirect', pathname: '/auth/login' });
  });
});
