import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import jwt_decode from 'jwt-decode';

// Public share-link pages (pages/image/shared/[id].tsx and pages/video/shared/[id].tsx):
// exactly one id segment after the prefix, optionally followed by a trailing slash.
// Anything else that merely contains "shared" (for example /media/shared) needs a sign-in.
const PUBLIC_SHARED_ROUTE = /^\/(?:image|video)\/shared\/[^/]+\/?$/;

export function isPublicSharedPath(pathname: string): boolean {
  return PUBLIC_SHARED_ROUTE.test(pathname);
}

export function middleware(request: NextRequest) {
  const refreshToken = request.cookies.get('refreshToken');
  const idToken = request.cookies.get('idToken');

  if (isPublicSharedPath(request.nextUrl.pathname)) {
    return NextResponse.next();
  }

  if (request.nextUrl.pathname === '/auth') {
    const urlNext = request.nextUrl.clone();
    urlNext.pathname = '/auth/login';
    return NextResponse.redirect(urlNext);
  }

  if (refreshToken && idToken) {
    try {
      const decodedToken: any = jwt_decode(idToken.value);
      if (decodedToken) {
        return NextResponse.next();
      }
    } catch (error: any) {
      console.log('Invalid token');
      const urlNext = request.nextUrl.clone();
      urlNext.pathname = '/auth/login';
      return NextResponse.redirect(urlNext);
    }
  } else {
    const urlNext = request.nextUrl.clone();
    urlNext.pathname = '/auth/login';
    urlNext.search = '';
    return NextResponse.redirect(urlNext);
  }
}

export const config = {
  matcher: [
    '/media/videos',
    '/media/shared',
    '/media/trashed',
    '/media/workspace',
    '/media/workspaces/:path*',
    '/settings/account',
    '/settings/billing',
    '/settings/drive',
    '/settings/profile',
    '/settings/ever-platform',
    '/settings/password',
    '/settings/slack',
    '/image/:path*',
    '/video/:path*',
    '/edit/:path*',
    '/auth',
  ],
};
