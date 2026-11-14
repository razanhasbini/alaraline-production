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
  // quality: without it Jetpack sends PNG photos as lossless WebP (~590 KB for one 900px bundle photo); with it the
  // same photo is ~70 KB and looks the same (checked side by side, small print stays sharp)
  return `https://i0.wp.com/${host}${path}?w=${Math.round(width)}&quality=${PHOTO_QUALITY}&ssl=1`;
}

const PHOTO_QUALITY = 85;
const WIDTHS = [320, 480, 640, 800, 1000, 1200, 1600];

/** Several widths of the same WordPress photo for <img srcSet> with `sizes`: the browser downloads only the one
 *  that fits the screen (a phone card gets ~480px instead of 900px). Undefined when the photo isn't resizable. */
export function wpSrcSet(src: string, max: number): string | undefined {
  const urls = [...WIDTHS.filter(w => w < max), max].map(w => [wpImage(src, w), w] as const);
  if (!urls[0][0].startsWith('https://i0.wp.com/')) return undefined;
  return urls.map(([u, w]) => `${u} ${w}w`).join(', ');
}

/** The srcSet as a spreadable attribute for next/image (vinext passes it through to the <img>; Next's types leave
 *  it out): <Image {...srcSetOf(src, 640)} … /> */
export function srcSetOf(src: string, max: number): object {
  const srcSet = wpSrcSet(src, max);
  return srcSet ? { srcSet } : {};
}
