import 'server-only';
import type { AdminSession } from './session';

// Talks to WooCommerce for the admin panel with the panel's own WooCommerce REST key (WooCommerce → Settings →
// Advanced → REST API, Read/Write), kept only on this server in WC_ADMIN_KEY / WC_ADMIN_SECRET.
// No WordPress logins are used. Every call needs a signed-in admin session (passed in) and is never cached.

const WC = process.env.WC_URL ?? 'https://alaraline.co';

export class WpError extends Error {
  constructor(message: string, public status: number) { super(message); }
}

function auth() {
  const k = process.env.WC_ADMIN_KEY, s = process.env.WC_ADMIN_SECRET;
  if (!k || !s) throw new WpError('The admin panel is not connected to the shop yet: set WC_ADMIN_KEY and WC_ADMIN_SECRET.', 500);
  return `Basic ${Buffer.from(`${k}:${s}`).toString('base64')}`;
}

type Init = { method?: string; json?: unknown; body?: BodyInit; headers?: Record<string, string> };

async function call(path: string, init: Init = {}): Promise<Response> {
  const headers: Record<string, string> = { Authorization: auth(), Accept: 'application/json', ...init.headers };
  let body = init.body;
  if (init.json !== undefined) { headers['Content-Type'] = 'application/json'; body = JSON.stringify(init.json); }
  let res: Response | null = null;
  // the live server sometimes drops a request: retry reads, never repeat writes
  const tries = (init.method ?? 'GET') === 'GET' ? 3 : 1;
  for (let i = 0; i < tries; i++) {
    if (i) await new Promise(r => setTimeout(r, 400 * i));
    try {
      res = await fetch(`${WC}/wp-json${path}`, { method: init.method ?? 'GET', headers, body, cache: 'no-store' });
      if (res.status < 500) break;
    } catch {
      res = null;
    }
  }
  if (!res) throw new WpError('The shop could not be reached. Please try again.', 503);
  if (!res.ok) {
    const d = await res.json().catch(() => null) as { message?: string } | null;
    const msg = d?.message?.replace(/<[^>]+>/g, '') || `The shop answered ${res.status}.`;
    throw new WpError(res.status === 401 ? `The shop refused the admin panel's key (${msg})` : msg, res.status);
  }
  return res;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function wp<T>(_session: AdminSession, path: string, init?: Init): Promise<T> {
  const text = await (await call(path, init)).text();
  try { return (text ? JSON.parse(text) : null) as T; } catch { return null as T; }
}

/** Same as wp() but also returns WooCommerce's X-WP-Total / X-WP-TotalPages headers (for paging). */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function wpList<T>(_session: AdminSession, path: string): Promise<{ items: T[]; total: number; pages: number }> {
  const res = await call(path);
  return { items: (await res.json()) as T[], total: Number(res.headers.get('x-wp-total') ?? 0), pages: Number(res.headers.get('x-wp-totalpages') ?? 1) };
}
