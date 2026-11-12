import { NextResponse, type NextRequest } from 'next/server';

const PUBLIC_SITE_HOSTS = ['alaraline.co', 'www.alaraline.co'];

/** WordPress's own address, once it has one (shop.alaraline.co). Null while WordPress still lives on alaraline.co,
 *  so the forwarding below can never loop. Read at run time: switching WC_URL is enough, no rebuild needed. */
function wordpressOrigin(): string | null {
  try {
    const u = new URL(process.env.WC_URL || process.env.NEXT_PUBLIC_WC_URL || 'https://alaraline.co');
    return u.protocol === 'https:' && !PUBLIC_SITE_HOSTS.includes(u.host) ? u.origin : null;
  } catch { return null; }
}

// 1. Staff bookmarks: WordPress admin and login (alaraline.co/wp-admin…) go to WordPress's own address, ?query kept.
// 2. Admin panel gate: without the login cookie, go straight to the sign-in page (the cookie itself is
//    fully verified, and WordPress re-checks permissions, on every admin page and action).
//    Admin pages are also never cached and can't be embedded in other sites.
export function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  if (pathname === '/wp-login.php' || pathname === '/wp-admin' || pathname.startsWith('/wp-admin/')) {
    const wp = wordpressOrigin();
    if (!wp) return new NextResponse('Not found', { status: 404 });
    return NextResponse.redirect(`${wp}${pathname === '/wp-admin' ? '/wp-admin/' : pathname}${search}`, 307);
  }
  if (pathname !== '/admin/login' && !req.cookies.has('alara_admin')) {
    return NextResponse.redirect(new URL('/admin/login', req.url));
  }
  const res = NextResponse.next();
  res.headers.set('Cache-Control', 'no-store');
  res.headers.set('X-Frame-Options', 'DENY');
  res.headers.set('Referrer-Policy', 'same-origin');
  return res;
}

export const config = { matcher: ['/admin', '/admin/:path*', '/wp-admin', '/wp-admin/:path*', '/wp-login.php'] };
