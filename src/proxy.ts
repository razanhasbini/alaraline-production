import { NextResponse, type NextRequest } from 'next/server';

// Admin panel gate: without the login cookie, go straight to the sign-in page (the cookie itself is
// fully verified, and WordPress re-checks permissions, on every admin page and action).
// Admin pages are also never cached and can't be embedded in other sites.
export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname !== '/admin/login' && !req.cookies.has('alara_admin')) {
    return NextResponse.redirect(new URL('/admin/login', req.url));
  }
  const res = NextResponse.next();
  res.headers.set('Cache-Control', 'no-store');
  res.headers.set('X-Frame-Options', 'DENY');
  res.headers.set('Referrer-Policy', 'same-origin');
  return res;
}

export const config = { matcher: ['/admin', '/admin/:path*'] };
