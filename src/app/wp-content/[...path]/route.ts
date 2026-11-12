// Old WordPress file links (https://alaraline.co/wp-content/...) keep working after WordPress moves to its own
// address (WC_URL, e.g. https://shop.alaraline.co): this site forwards them there.
// Loop guard: when WordPress is still on this same address (today's setup, and every preview), nothing is
// forwarded. The redirect is temporary (307) so it can change later without browsers remembering it forever.
export function GET(req: Request): Response {
  const here = new URL(req.url);
  let target: URL;
  try { target = new URL(here.pathname + here.search, process.env.WC_URL || 'https://alaraline.co'); }
  catch { return new Response('Not found', { status: 404 }); }
  if (target.host === here.host) return new Response('Not found', { status: 404 });
  return new Response(null, { status: 307, headers: { Location: target.toString(), 'Cache-Control': 'public, max-age=86400' } });
}

export const HEAD = GET;
