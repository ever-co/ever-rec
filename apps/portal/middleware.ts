import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import jwt_decode from 'jwt-decode';

// Public share-link pages (pages/image/shared/[id].tsx, pages/video/shared/[id].tsx and the
// player-only pages/video/shared/embed/[id].tsx): exactly one id segment after the prefix,
// optionally followed by a trailing slash.
// Anything else that merely contains "shared" (for example /media/shared) needs a sign-in.
const PUBLIC_SHARED_ROUTE =
  /^\/(?:image\/shared|video\/shared(?:\/embed)?)\/[^/]+\/?$/;

export function isPublicSharedPath(pathname: string): boolean {
  return PUBLIC_SHARED_ROUTE.test(pathname);
}

/** A job id of a person's export (what Ever Platform names it by): letters, digits, `_` and `-`. */
export const EXPORT_JOB_ID = /^[A-Za-z0-9_-]{1,64}$/;

/**
 * The query the sign-in page gets for a signed-out visit: the export page
 * (`/settings/data-export?job=<id>`, the address Ever Platform shows the person) keeps its job as
 * `dataExport`, so the sign-in returns there; anything else gets none. A job id only, never an
 * address.
 */
export function signInSearchFor(url: {
  pathname: string;
  searchParams?: { get(name: string): string | null };
}): string {
  if (url.pathname !== '/settings/data-export') return '';
  const job = url.searchParams?.get('job') ?? '';
  return EXPORT_JOB_ID.test(job) ? `?dataExport=${job}` : '';
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
      // The export page keeps its job through the sign-in here too (other pages keep their query as before).
      const exportSearch = signInSearchFor(request.nextUrl);
      if (exportSearch) urlNext.search = exportSearch;
      return NextResponse.redirect(urlNext);
    }
  } else {
    const urlNext = request.nextUrl.clone();
    urlNext.pathname = '/auth/login';
    urlNext.search = signInSearchFor(request.nextUrl);
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
    '/settings/data-export',
    '/settings/password',
    '/settings/slack',
    '/image/:path*',
    '/video/:path*',
    '/edit/:path*',
    '/auth',
  ],
};
