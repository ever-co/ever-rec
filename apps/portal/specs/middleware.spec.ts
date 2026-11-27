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

import { NextResponse } from 'next/server';
import { isPublicSharedPath, middleware, signInSearchFor } from '../middleware';

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

  it('sends a signed-out visit of the export page to sign-in', () => {
    expect(middleware(makeRequest('/settings/data-export'))).toEqual({ kind: 'redirect', pathname: '/auth/login' });
  });
});

describe('the export page through the sign-in', () => {
  beforeEach(() => jest.clearAllMocks());

  const visit = (cookies: Record<string, string>) => {
    const nextUrl: any = {
      pathname: '/settings/data-export',
      search: '?job=01KJOB',
      searchParams: new URLSearchParams('?job=01KJOB'),
      clone() {
        return { ...nextUrl };
      },
    };
    middleware({
      nextUrl,
      cookies: { get: (name: string) => (cookies[name] ? { value: cookies[name] } : undefined) },
    } as any);
    return (NextResponse.redirect as jest.Mock).mock.calls[0][0];
  };

  it('signed out: the sign-in gets the job as dataExport', () => {
    const target = visit({});
    expect(target.pathname).toBe('/auth/login');
    expect(target.search).toBe('?dataExport=01KJOB');
  });

  it('with an unreadable token: the same', () => {
    const target = visit({ refreshToken: 'r', idToken: 'bad' });
    expect(target.pathname).toBe('/auth/login');
    expect(target.search).toBe('?dataExport=01KJOB');
  });
});

describe('signInSearchFor', () => {
  const url = (pathname: string, search: string) => ({ pathname, searchParams: new URLSearchParams(search) });

  it('keeps the job of the export page through the sign-in', () => {
    expect(signInSearchFor(url('/settings/data-export', '?job=01KJOB_1-a'))).toBe('?dataExport=01KJOB_1-a');
  });

  it('keeps nothing else: another page, no job, or a job that is not an id', () => {
    expect(signInSearchFor(url('/media/shared', '?job=01KJOB'))).toBe('');
    expect(signInSearchFor(url('/settings/data-export', ''))).toBe('');
    expect(signInSearchFor(url('/settings/data-export', '?job=https://evil.example/x'))).toBe('');
    expect(signInSearchFor(url('/settings/data-export', '?job=a%2Fb'))).toBe('');
    expect(signInSearchFor({ pathname: '/settings/data-export' })).toBe('');
  });
});
