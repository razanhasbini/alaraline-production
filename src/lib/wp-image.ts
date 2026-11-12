// Photos that live in WordPress (product photos, bundles, Results Wall, page images).
//
// 1. Size: Cloudflare Workers (vinext) does not resize remote images, so a product card would download the
//    original 2–3 MB photo. WordPress already serves its photos through Jetpack's free image CDN (i0.wp.com),
//    which can resize: we ask it for the width the photo is actually shown at. Same photo, far fewer bytes.
// 2. Address: once WordPress moves from alaraline.co to its own address (e.g. shop.alaraline.co), photo links
//    saved as https://alaraline.co/wp-content/... are pointed at WordPress's address (NEXT_PUBLIC_WC_URL).
// Works on the server and in the browser (NEXT_PUBLIC_WC_URL is built in). Anything else is returned unchanged.

const PUBLIC_SITE_HOSTS = new Set(['alaraline.co', 'www.alaraline.co']);
const PHOTON = /^i[0-3]\.wp\.com$/;

function wordpressHost(): string | null {
  try { return new URL(process.env.NEXT_PUBLIC_WC_URL || 'https://alaraline.co').host; } catch { return null; }
}

// Jetpack can only fetch photos from public addresses (not the local test store)
const isPrivateHost = (host: string) => /^(localhost|127\.|10\.|192\.168\.)/.test(host) || host.endsWith('.local');

export function wpImage(src: string, width?: number): string {
  if (!src || !/^https?:\/\//.test(src)) return src;
  let url: URL;
  try { url = new URL(src); } catch { return src; }

  // the photo's real host + path, whether the link is direct or already through Jetpack
  let host: string, path: string;
  if (PHOTON.test(url.host)) {
    const [, h, ...rest] = url.pathname.split('/');
    host = h; path = '/' + rest.join('/');
  } else {
    host = url.host; path = url.pathname;
  }
  if (!path.startsWith('/wp-content/')) return src;

  // WordPress moved to its own address: old public-site links point there
  const wp = wordpressHost();
  // (only for a real public address: a local test store doesn't have the live photos)
  if (wp && PUBLIC_SITE_HOSTS.has(host) && !PUBLIC_SITE_HOSTS.has(wp) && !isPrivateHost(wp)) host = wp;

  if (isPrivateHost(host)) return `${url.protocol}//${host}${path}`;
  if (!width) return host === (PHOTON.test(url.host) ? url.pathname.split('/')[1] : url.host) ? src : `https://${host}${path}`;
  return `https://i0.wp.com/${host}${path}?w=${Math.round(width)}&ssl=1`;
}
