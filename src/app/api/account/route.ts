import { NextResponse } from 'next/server';
import { accountApi, CartError, customerToken, setCustomerToken } from '@/lib/cart';

// Customer accounts (the same WooCommerce customers as before). Sign-in is kept in an HttpOnly cookie on this site.
type AuthResult = { token: string; user: unknown };
const s = (v: unknown, max = 200) => String(v ?? '').trim().slice(0, max);

export async function GET(req: Request) {
  const what = new URL(req.url).searchParams.get('what') ?? 'me';
  if (!(await customerToken())) return NextResponse.json({ ok: true, user: null });
  try {
    if (what === 'orders') return NextResponse.json({ ok: true, orders: await accountApi('/account/orders') });
    if (what === 'order') return NextResponse.json({ ok: true, order: await accountApi(`/account/orders/${Number(new URL(req.url).searchParams.get('id'))}`) });
    return NextResponse.json({ ok: true, user: await accountApi('/account/me') });
  } catch (e) {
    if (e instanceof CartError && e.status === 401) { await setCustomerToken(null); return NextResponse.json({ ok: true, user: null }); }
    return fail(e);
  }
}

export async function POST(req: Request) {
  const b = await req.json().catch(() => ({})) as Record<string, unknown>;
  const ip = req.headers.get('x-forwarded-for') ?? '';
  try {
    switch (b.action) {
      case 'login': {
        const r = await fetchAuth('/account/login', { username: s(b.username), password: String(b.password ?? '') }, ip);
        await setCustomerToken(r.token, b.remember !== false);
        return NextResponse.json({ ok: true, user: r.user });
      }
      case 'register': {
        const r = await accountApi<AuthResult>('/account/register', { method: 'POST', json: { email: s(b.email), password: String(b.password ?? ''), username: s(b.username, 60), fullname: s(b.fullname, 120) }, withCustomer: false });
        await setCustomerToken(r.token);
        return NextResponse.json({ ok: true, user: r.user });
      }
      case 'logout':
        await setCustomerToken(null);
        return NextResponse.json({ ok: true });
      case 'lost':
        return NextResponse.json({ ok: true, ...(await accountApi<{ message: string }>('/account/lost-password', { method: 'POST', json: { username: s(b.username) }, withCustomer: false })) });
      case 'reset': {
        const r = await accountApi<AuthResult>('/account/reset-password', { method: 'POST', json: { key: s(b.key), login: s(b.login), password: String(b.password ?? '') }, withCustomer: false });
        await setCustomerToken(r.token);
        return NextResponse.json({ ok: true, user: r.user });
      }
      case 'update':
        return NextResponse.json({ ok: true, user: await accountApi('/account/me', { method: 'POST', json: { billing: b.billing, shipping: b.shipping, account: b.account } }) });
      default:
        return NextResponse.json({ ok: false, message: 'Unknown action.' }, { status: 400 });
    }
  } catch (e) { return fail(e); }
}

/** Login passes the shopper's IP along so WordPress can slow down password guessing. */
async function fetchAuth(path: string, json: unknown, ip: string): Promise<AuthResult> {
  const WC = process.env.WC_URL ?? 'https://alaraline.co';
  const res = await fetch(`${WC}/wp-json/alara/v1${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': ip }, body: JSON.stringify(json), cache: 'no-store' });
  const data = await res.json().catch(() => null) as (AuthResult & { message?: string }) | null;
  if (!res.ok || !data) throw new CartError(data?.message?.replace(/<[^>]+>/g, '') ?? 'Something went wrong. Please try again.', res.status);
  return data;
}

function fail(e: unknown) {
  const err = e instanceof CartError ? e : new CartError('Something went wrong. Please try again.', 500);
  return NextResponse.json({ ok: false, message: err.message }, { status: err.status });
}
