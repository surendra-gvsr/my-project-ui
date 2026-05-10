import { NextRequest, NextResponse } from 'next/server';

// Cookie name and expected value — must match lib/auth.ts
const SESSION_COOKIE = 'claimspack-session';
const AUTHENTICATED_VALUE = 'authenticated';

// Paths that always pass through without an auth check.
// The matcher already excludes _next/static and _next/image, but
// /_next/webpack-hmr and other Next.js runtime paths still reach middleware.
const ALWAYS_ALLOWED_PREFIXES = ['/_next/', '/favicon.ico'];

// Page paths that unauthenticated users may visit.
const PUBLIC_PAGE_PATHS = ['/login'];

export function middleware(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;

  // Step 1: unconditionally allow Next.js internals and static assets.
  for (const prefix of ALWAYS_ALLOWED_PREFIXES) {
    if (pathname.startsWith(prefix)) {
      return NextResponse.next();
    }
  }

  // Step 2: read the session cookie and compare strictly — no loose equality.
  const sessionCookie = request.cookies.get(SESSION_COOKIE);
  const isAuthenticated = sessionCookie?.value === AUTHENTICATED_VALUE;

  // Step 3: authenticated users must not revisit /login — redirect to home.
  if (isAuthenticated && pathname === '/login') {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // Step 4: authenticated users may proceed to any other path.
  if (isAuthenticated) {
    return NextResponse.next();
  }

  // --- Unauthenticated from here down ---

  // Step 5: API routes must receive a JSON 401, never a redirect.
  // Redirecting API calls to /login would break fetch() callers expecting JSON.
  if (pathname.startsWith('/api/')) {
    return NextResponse.json(
      { success: false, data: null, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  // Step 6: public pages (e.g. /login) are accessible without a session.
  if (PUBLIC_PAGE_PATHS.includes(pathname)) {
    return NextResponse.next();
  }

  // Step 7: redirect all other navigation requests to /login.
  // Only write `next` if pathname is a safe relative path (always true here since
  // it comes from request.nextUrl, but validated explicitly to future-proof the code).
  const loginUrl = new URL('/login', request.url);
  if (pathname.startsWith('/') && !pathname.startsWith('//')) {
    loginUrl.searchParams.set('next', pathname);
  }
  return NextResponse.redirect(loginUrl);
}

export const config = {
  // Run on every path except _next/static, _next/image, and favicon.ico.
  // The ALWAYS_ALLOWED_PREFIXES guard inside the function handles the rest
  // of the /_next/* namespace (e.g. /_next/webpack-hmr).
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
