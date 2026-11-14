import 'server-only';

// Read-only requests to WordPress (products, categories, bundles, Results Wall, product tabs), made gently:
// - identical requests already in flight are shared (one WordPress call, many waiters);
// - at most 4 WordPress reads run at once per server instance (no bursts);
// - a temporary failure (429, 5xx, dropped connection) is retried with bounded exponential backoff, honouring
//   Retry-After; a wait longer than MAX_WAIT_MS is not attempted inside a page render;
// - after a 429, catalog reads use their saved copies for a cooldown (Retry-After, else 30 s, max 2 min) instead
//   of asking again (see inCooldown + fallback.ts).
// Cart and checkout changes never come through here: they are sent once (src/lib/cart.ts).

const MAX_CONCURRENT = 4;
const MAX_WAIT_MS = 2500;
const LOG_HEADERS = ['retry-after', 'server', 'cf-ray', 'content-type', 'x-litespeed-cache', 'x-hcdn-request-id', 'platform'];

let active = 0;
const waiting: (() => void)[] = [];
async function withSlot<T>(fn: () => Promise<T>): Promise<T> {
  if (active >= MAX_CONCURRENT) await new Promise<void>(resolve => waiting.push(resolve));
  active++;
  try { return await fn(); } finally { active--; waiting.shift()?.(); }
}

let coolUntil = 0;
/** True for a short while after WordPress answered 429: catalog reads should use their saved copies. */
export const inCooldown = () => Date.now() < coolUntil;

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

/** Retry-After in ms (seconds or an HTTP date), or null. */
export function retryAfterMs(res: Response | null): number | null {
  const v = res?.headers.get('retry-after');
  if (!v) return null;
  const s = Number(v);
  if (Number.isFinite(s)) return Math.max(0, s * 1000);
  const d = Date.parse(v);
  return Number.isFinite(d) ? Math.max(0, d - Date.now()) : null;
}

/** One log line per WordPress problem: timestamp, what, status and a few response headers. Never bodies, query
 *  strings with personal data, cookies, tokens or credentials. */
export function logWp(level: 'warn' | 'error', what: string, status: number, res: Response | null, extra: Record<string, unknown> = {}) {
  const headers: Record<string, string> = {};
  for (const h of LOG_HEADERS) { const v = res?.headers.get(h); if (v) headers[h] = v.slice(0, 120); }
  console[level](JSON.stringify({ t: new Date().toISOString(), wp: what, status, ...(Object.keys(headers).length ? { headers } : {}), ...extra }));
}

/** Mark a 429 so catalog reads back off for a while. */
export function noteRateLimit(res: Response | null) {
  coolUntil = Math.max(coolUntil, Date.now() + Math.min(retryAfterMs(res) ?? 30_000, 120_000));
}

type Result<T> = { ok: true; data: T } | { ok: false; status: number };
const inFlight = new Map<string, Promise<Result<unknown>>>();

/** GET a WordPress JSON endpoint (read-only). `what` is a short label for logs (no personal data). */
export function wpGetJson<T>(url: string, what: string, opts: { headers?: Record<string, string>; retries?: number } = {}): Promise<Result<T>> {
  const key = `${url}|${opts.headers?.Authorization ? 'key' : ''}`;
  const existing = inFlight.get(key);
  if (existing) return existing as Promise<Result<T>>;
  const retries = opts.retries ?? 2;
  const run = (async (): Promise<Result<T>> => {
    for (let attempt = 0; ; attempt++) {
      let res: Response | null = null;
      try {
        res = await withSlot(() => fetch(url, { headers: { Accept: 'application/json', ...opts.headers } }));
      } catch (e) {
        logWp('warn', what, 0, null, { attempt, error: (e as Error).message.slice(0, 120) });
      }
      if (res?.ok) {
        try { return { ok: true, data: (await res.json()) as T }; } catch {
          logWp('error', what, res.status, res, { attempt, problem: 'unreadable JSON' });
          return { ok: false, status: 502 };
        }
      }
      const status = res?.status ?? 0;
      if (res) { logWp('warn', what, status, res, { attempt }); res.body?.cancel().catch(() => {}); }
      if (status === 429) noteRateLimit(res);
      const temporary = status === 0 || status === 429 || status >= 500;
      if (!temporary || attempt >= retries) return { ok: false, status };
      const told = retryAfterMs(res);
      if (told !== null && told > MAX_WAIT_MS) return { ok: false, status }; // too long to wait inside a page
      await sleep(told ?? Math.min(MAX_WAIT_MS, 300 * 2 ** attempt) * (0.75 + Math.random() * 0.5));
    }
  })().finally(() => inFlight.delete(key));
  inFlight.set(key, run);
  return run;
}
