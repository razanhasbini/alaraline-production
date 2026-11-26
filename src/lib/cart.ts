import 'server-only';
import { cookies } from 'next/headers';

// Customer accounts (sign-in, My Account) for the storefront, through the ÀLara Headless API on WordPress.
// The cart and checkout are no longer here: the shopper's bag is handed to WooCommerce's own cart and checkout on
// shop.alaraline.co straight from their browser (src/lib/bag.ts), with no Cloudflare Worker in between.

const WC = process.env.WC_URL ?? 'https://alaraline.co';
const CUSTOMER = 'alara_customer';
const MONTH = 30 * 86400;

export class CartError extends Error {
  constructor(message: string, public status = 400, public code = '') { super(message); }
}

const decode = (s: string) => s.replace(/&quot;/g, '"').replace(/&#0?39;|&#8217;/g, '’').replace(/&amp;/g, '&').replace(/<[^>]+>/g, '');

/* ---------------------------------------------------------------- customer (signed-in shopper) */

export async function customerToken() { return (await cookies()).get(CUSTOMER)?.value ?? null; }
/** Signs the shopper in on this site (or out, with null). Without "Remember me" it ends when the browser closes.
 *  A second, readable cookie (no secret in it) only tells the header to show "My account" instead of "Log in". */
export async function setCustomerToken(token: string | null, remember = true) {
  const jar = await cookies();
  const base = { sameSite: 'lax' as const, secure: process.env.NODE_ENV === 'production', path: '/', ...(remember ? { maxAge: MONTH } : {}) };
  if (token) { jar.set(CUSTOMER, token, { ...base, httpOnly: true }); jar.set('alara_in', '1', base); }
  else { jar.delete(CUSTOMER); jar.delete('alara_in'); }
}

/** The account id inside a sign-in token ("id|expiry|signature", base64; WordPress checks the signature). Used only
 *  to double-check WordPress's answer, never to trust anyone: 0 when unreadable. */
export function tokenUserId(token: string | null): number {
  if (!token) return 0;
  try { return Number(atob(token).split('|')[0]) || 0; } catch { return 0; }
}

/** Calls the ÀLara Headless API account routes (customer accounts live in WooCommerce, as before). */
export async function accountApi<T>(path: string, init: { method?: string; json?: unknown; withCustomer?: boolean } = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  const method = init.method ?? 'GET';
  if (init.json !== undefined) headers['Content-Type'] = 'application/json';
  let url = `${WC}/wp-json/alara/v1${path}`;
  if (init.withCustomer !== false) {
    const t = await customerToken();
    if (t) headers['X-Alara-Customer'] = t;
    // Hostinger's LiteSpeed cache keys answers by address only (it ignores the sign-in header) and once served one
    // customer's account to everyone. The customer's id in the address means a cached copy can only ever be their own.
    if (method === 'GET') url += `${url.includes('?') ? '&' : '?'}c=${tokenUserId(t)}`;
  }
  const res = await fetch(url, { method, headers, body: init.json === undefined ? undefined : JSON.stringify(init.json), cache: 'no-store' });
  const data = await res.json().catch(() => null) as (T & { message?: string }) | null;
  if (!res.ok) throw new CartError(decode(data?.message ?? 'Something went wrong. Please try again.'), res.status);
  return data as T;
}
