import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import jwt_decode from 'jwt-decode';

export function middleware(request: NextRequest) {
  const refreshToken = request.cookies.get('refreshToken');
  const idToken = request.cookies.get('idToken');

  if (request.nextUrl.pathname.includes('/shared')) {
    return NextResponse.next();
  }

  if (request.nextUrl.pathname === '/auth') {
    const urlNext = request.nextUrl.clone();
    urlNext.pathname = '/auth/login';
    return NextResponse.redirect(urlNext);
  }

  if (refreshToken && idToken) {
    try {
      const decodedToken: any = jwt_decode(idToken);
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
    '/settings/password',
    '/settings/slack',
    '/image/:path*',
    '/video/:path*',
    '/edit/:path*',
    '/auth',
  ],
};
