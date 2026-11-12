import 'server-only';

// The last good answer from WordPress for each request, so a busy or briefly unreachable WordPress (Hostinger's
// "429 too many requests", a slow moment, an outage) shows the shop as it last was instead of an error page.
//
// Kept in this server's memory and in Cloudflare KV (the VINEXT_KV_CACHE binding, under its own "alara-lastgood:"
// keys). The page cache starts empty after every deploy; these copies don't, so a deploy right after a busy moment
// still has something to show. Written at most every 12 hours per request, well inside the free KV allowance.
// Outside Cloudflare (next dev / next build) only the memory copy is used.

type KV = {
  get(key: string, type: 'json'): Promise<unknown>;
  getWithMetadata(key: string): Promise<{ value: string | null; metadata: unknown }>;
  put(key: string, value: string, options?: { metadata?: unknown }): Promise<void>;
};

const REFRESH_MS = 12 * 3600_000;
const memory = new Map<string, unknown>();
let kvBinding: Promise<KV | null> | null = null;

function kv(): Promise<KV | null> {
  kvBinding ??= (async () => {
    try {
      const spec = 'cloudflare:workers'; // only exists on Cloudflare; kept out of the Node build on purpose
      const mod = (await import(/* @vite-ignore */ /* webpackIgnore: true */ spec)) as { env?: Record<string, unknown> };
      const b = mod.env?.VINEXT_KV_CACHE as KV | undefined;
      return b && typeof b.put === 'function' ? b : null;
    } catch {
      return null;
    }
  })();
  return kvBinding;
}

const kvKey = (key: string) => `alara-lastgood:${key}`.slice(0, 500);

/** Keep this good answer as the copy to fall back on. */
export async function remember(key: string, value: unknown): Promise<void> {
  memory.set(key, value);
  const store = await kv();
  if (!store) return;
  try {
    const { metadata } = await store.getWithMetadata(kvKey(key));
    const savedAt = (metadata as { t?: number } | null)?.t ?? 0;
    if (Date.now() - savedAt < REFRESH_MS) return;
    await store.put(kvKey(key), JSON.stringify(value), { metadata: { t: Date.now() } });
  } catch {
    // best effort: the live answer is still used
  }
}

/** The last good answer for this request, if there is one. */
export async function recall<T>(key: string): Promise<T | undefined> {
  if (memory.has(key)) return memory.get(key) as T;
  const store = await kv();
  if (!store) return undefined;
  try {
    const value = await store.get(kvKey(key), 'json');
    if (value == null) return undefined;
    memory.set(key, value);
    return value as T;
  } catch {
    return undefined;
  }
}
