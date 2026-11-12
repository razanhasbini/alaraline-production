import 'server-only';
import { cookies } from 'next/headers';

// The shopper's cart, checkout and account all run through WooCommerce's official Store API
// (/wp-json/wc/store/v1). WooCommerce keeps doing all the real work: prices, stock, promo codes,
// delivery ($4 Lebanon), cash on delivery, the PR box fee, order emails. This file only passes requests
// along from this site's server and keeps the shopper's cart id in an HttpOnly cookie on this site.

const WC = process.env.WC_URL ?? 'https://alaraline.co';
const STORE = `${WC}/wp-json/wc/store/v1`;
const CART = 'alara_cart', NONCE = 'alara_nonce', CUSTOMER = 'alara_customer';
const MONTH = 30 * 86400;

export class CartError extends Error {
  constructor(message: string, public status = 400, public code = '') { super(message); }
}

/** Orders must never be placed on the live store from a test copy of the site by accident. */
export function checkoutBlockedReason(): string | null {
  const live = new URL(WC).hostname.endsWith('alaraline.co');
  if (live && process.env.ALLOW_LIVE_CHECKOUT !== '1') {
    return 'Test mode: this copy of the website is connected to the live ÀLara store, so placing orders is switched off. (Set ALLOW_LIVE_CHECKOUT=1 when the new site goes live.)';
  }
  return null;
}

const decode = (s: string) => s.replace(/&quot;/g, '"').replace(/&#0?39;|&#8217;/g, '’').replace(/&amp;/g, '&').replace(/<[^>]+>/g, '');

export async function storeApi<T = RawCart>(path: string, init: { method?: string; json?: unknown } = {}): Promise<T> {
  const jar = await cookies();
  const method = init.method ?? 'GET';
  const secure = process.env.NODE_ENV === 'production';
  // this request's cart id + security nonce (updated as WooCommerce hands out new ones)
  const ids = { token: jar.get(CART)?.value, nonce: jar.get(NONCE)?.value };

  const send = async (m: string, p: string, json?: unknown) => {
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (ids.token) headers['Cart-Token'] = ids.token;
    if (ids.nonce) headers.Nonce = ids.nonce;
    if (json !== undefined) headers['Content-Type'] = 'application/json';
    let res: Response | null = null;
    for (let i = 0; i < (m === 'GET' ? 3 : 1); i++) {
      if (i) await new Promise(r => setTimeout(r, 400 * i));
      try {
        res = await fetch(`${STORE}${p}`, { method: m, headers, body: json === undefined ? undefined : JSON.stringify(json), cache: 'no-store' });
        if (res.status < 500) break;
      } catch { res = null; }
    }
    if (!res) throw new CartError('The shop could not be reached. Please try again.', 503);
    // WooCommerce hands back (or renews) the cart id and the security nonce on every response
    const newToken = res.headers.get('cart-token'), newNonce = res.headers.get('nonce');
    if (newToken && newToken !== ids.token) { ids.token = newToken; jar.set(CART, newToken, { httpOnly: true, sameSite: 'lax', secure, path: '/', maxAge: MONTH }); }
    if (newNonce && newNonce !== ids.nonce) { ids.nonce = newNonce; jar.set(NONCE, newNonce, { httpOnly: true, sameSite: 'lax', secure, path: '/', maxAge: MONTH }); }
    return res;
  };

  // changes need a nonce: get one first if this shopper has none yet, and once more if it expired
  if (method !== 'GET' && !ids.nonce) await send('GET', '/cart');
  let res = await send(method, path, init.json);
  let data = await res.json().catch(() => null) as (T & { code?: string; message?: string }) | null;
  if (method !== 'GET' && res.status === 401 && /nonce/i.test(data?.code ?? '')) {
    await send('GET', '/cart');
    res = await send(method, path, init.json);
    data = await res.json().catch(() => null) as (T & { code?: string; message?: string }) | null;
  }
  if (!res.ok) throw new CartError(decode(data?.message ?? 'Something went wrong. Please try again.'), res.status, data?.code ?? '');
  return data as T;
}

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

/** Calls the ÀLara Headless API account routes (customer accounts live in WooCommerce, as before). */
export async function accountApi<T>(path: string, init: { method?: string; json?: unknown; withCustomer?: boolean } = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (init.json !== undefined) headers['Content-Type'] = 'application/json';
  if (init.withCustomer !== false) { const t = await customerToken(); if (t) headers['X-Alara-Customer'] = t; }
  const res = await fetch(`${WC}/wp-json/alara/v1${path}`, { method: init.method ?? 'GET', headers, body: init.json === undefined ? undefined : JSON.stringify(init.json), cache: 'no-store' });
  const data = await res.json().catch(() => null) as (T & { message?: string }) | null;
  if (!res.ok) throw new CartError(decode(data?.message ?? 'Something went wrong. Please try again.'), res.status);
  return data as T;
}

/* ---------------------------------------------------------------- shapes */

type Money = { currency_minor_unit: number; currency_prefix: string };
export type RawCart = {
  items: {
    key: string; id: number; quantity: number; name: string; permalink: string;
    images: { thumbnail: string; src: string }[];
    variation: { attribute: string; value: string }[];
    item_data: { name?: string; key?: string; value: string }[];
    prices: Money & { price: string; regular_price: string };
    totals: Money & { line_total: string; line_subtotal: string };
    quantity_limits: { maximum: number };
  }[];
  coupons: { code: string; totals: Money & { total_discount: string } }[];
  fees: { key: string; name: string; totals: Money & { total: string } }[];
  totals: Money & { total_items: string; total_discount: string; total_shipping: string | null; total_fees: string; total_price: string };
  shipping_rates: { shipping_rates: { rate_id: string; name: string; price: string; selected: boolean }[] }[];
  needs_shipping: boolean;
  items_count: number;
  payment_methods: string[];
  billing_address: Record<string, string>;
  shipping_address: Record<string, string>;
  errors: { message: string }[];
  extensions?: { alara?: { packaging?: string } };
};

export type Cart = {
  count: number;
  items: { key: string; id: number; quantity: number; max: number; name: string; slug: string; image: string; price: number; regular: number; lineTotal: number; details: { label: string; value: string }[] }[];
  coupons: { code: string; discount: number }[];
  fees: { name: string; amount: number }[];
  subtotal: number; discount: number; shipping: number | null; shippingLabel: string; total: number; currency: string;
  packaging: 'bag' | 'pr';
  payment: string[];
  billing: Record<string, string>;
  errors: string[];
};

const amount = (v: string | null | undefined, m: Money) => (v == null ? 0 : Number(v) / 10 ** m.currency_minor_unit);

export function toCart(c: RawCart): Cart {
  const m = c.totals;
  const rate = c.shipping_rates[0]?.shipping_rates.find(r => r.selected);
  return {
    count: c.items_count,
    items: c.items.map(i => ({
      key: i.key, id: i.id, quantity: i.quantity, max: i.quantity_limits?.maximum ?? 99, name: decode(i.name),
      slug: (i.permalink.match(/\/product\/([^/]+)/) ?? [])[1] ?? '',
      image: i.images[0]?.thumbnail || i.images[0]?.src || '',
      price: amount(i.prices.price, i.prices), regular: amount(i.prices.regular_price, i.prices), lineTotal: amount(i.totals.line_subtotal, i.totals),
      details: [
        ...i.variation.map(v => ({ label: v.attribute, value: v.value })),
        ...i.item_data.map(d => ({ label: decode(d.name ?? d.key ?? ''), value: decode(d.value) })),
      ],
    })),
    coupons: c.coupons.map(x => ({ code: x.code, discount: amount(x.totals.total_discount, x.totals) })),
    fees: c.fees.map(f => ({ name: decode(f.name), amount: amount(f.totals.total, f.totals) })),
    subtotal: amount(m.total_items, m), discount: amount(m.total_discount, m),
    shipping: m.total_shipping == null ? (rate ? amount(rate.price, m) : null) : amount(m.total_shipping, m),
    shippingLabel: rate?.name ?? 'Delivery',
    total: amount(m.total_price, m), currency: m.currency_prefix || 'US$',
    packaging: c.extensions?.alara?.packaging === 'pr' ? 'pr' : 'bag',
    payment: c.payment_methods,
    billing: c.billing_address,
    errors: (c.errors ?? []).map(e => decode(e.message)),
  };
}
