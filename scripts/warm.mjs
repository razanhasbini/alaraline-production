// Manual warm-up: visits every page in the sitemap once, slowly (one page every 3 seconds), so the
// first customers after an update get fast pages and the saved WordPress copies are filled. NOT run on deploy:
// a burst of requests from Cloudflare trips Hostinger's server-level per-address limit (429) for ~10 minutes.
// Usage: npm run warm [base-url]
// Base URL: argument, or WARM_URL, or the workers.dev address. (Only ever the new website, never WordPress.)

const base = (process.argv[2] || process.env.WARM_URL || 'https://alaraline-frontend.noisy-dawn-98ec.workers.dev').replace(/\/$/, '');
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function get(url) {
  const t = Date.now();
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'alara-warmup' }, redirect: 'manual', signal: AbortSignal.timeout(30_000) });
    await res.arrayBuffer();
    return { status: res.status, ms: Date.now() - t };
  } catch (e) {
    return { status: 0, ms: Date.now() - t, error: e.message };
  }
}

async function main() {
  await sleep(Number(process.env.WARM_DELAY_MS ?? 15_000)); // let the new version reach Cloudflare's edge first
  const xml = await fetch(`${base}/sitemap.xml`).then(r => r.text()).catch(() => '');
  const paths = [...new Set([...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => new URL(m[1]).pathname))];
  if (!paths.length) paths.push('/', '/shop');
  console.log(`[warm] ${paths.length} pages on ${base}`);
  let ok = 0, slow = 0;
  for (const p of paths) {
    const r = await get(base + p);
    if (r.status >= 200 && r.status < 400) ok++;
    if (r.ms > 2000) slow++;
    if (r.status === 0 || r.status >= 500) console.log(`[warm] ${p} → ${r.status || r.error}`);
    await sleep(3000);
  }
  console.log(`[warm] done: ${ok}/${paths.length} ok, ${slow} took over 2 s (first render)`);
}

main().catch(e => console.log('[warm] skipped:', e.message));
