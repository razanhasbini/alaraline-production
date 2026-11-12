import { NextResponse } from 'next/server';
import { CartError, EMPTY_CART, checkoutBlockedReason, customerToken, hasCart, storeApi, toCart, type RawCart } from '@/lib/cart';

// The shopper's cart. Every action is performed by WooCommerce (Store API); this only relays it.
export async function GET() {
  try {
    if (!(await hasCart())) return NextResponse.json({ ok: true, cart: EMPTY_CART }); // nothing added yet: no need to ask WordPress
    return NextResponse.json({ ok: true, cart: toCart(await storeApi('/cart')) });
  }
  catch (e) { return fail(e); }
}

type Body =
  | { action: 'add'; id: number; quantity?: number; variation?: { attribute: string; value: string }[] }
  | { action: 'update'; key: string; quantity: number }
  | { action: 'remove'; key: string }
  | { action: 'clear' }
  | { action: 'coupon'; code: string }
  | { action: 'removeCoupon'; code: string }
  | { action: 'packaging'; selection: 'bag' | 'pr' }
  | { action: 'bundle'; slot: number; choices: Record<string, string> }
  | { action: 'customer'; billing: Record<string, string>; shipping?: Record<string, string> }
  | { action: 'checkout'; billing: Record<string, string>; shipping?: Record<string, string>; note?: string; newsletter?: boolean; accountPassword?: string };

const str = (v: unknown, max = 200) => String(v ?? '').trim().slice(0, max);
const address = (a: Record<string, string> | undefined, withContact: boolean) => {
  const k = ['first_name', 'last_name', 'company', 'address_1', 'address_2', 'city', 'state', 'postcode', 'country'];
  if (withContact) k.push('phone', 'email');
  return Object.fromEntries(k.map(f => [f, str(a?.[f])]));
};
/** The delivery address. WooCommerce asks for a phone on it too: the shopper's phone goes with it
 *  (the one typed for the delivery address if any, otherwise the billing phone). */
const shippingAddress = (ship: Record<string, string> | undefined, bill: Record<string, string> | undefined) =>
  ({ ...address(ship ?? bill, false), phone: str(ship?.phone) || str(bill?.phone) });

export async function POST(req: Request) {
  let b: Body;
  try { b = (await req.json()) as Body; } catch { return NextResponse.json({ ok: false, message: 'Bad request.' }, { status: 400 }); }
  try {
    let raw: RawCart;
    switch (b.action) {
      case 'add':
        raw = await storeApi('/cart/add-item', { method: 'POST', json: { id: Number(b.id), quantity: Math.max(1, Number(b.quantity) || 1), ...(b.variation?.length ? { variation: b.variation.map(v => ({ attribute: str(v.attribute), value: str(v.value) })) } : {}) } });
        break;
      case 'update':
        raw = await storeApi('/cart/update-item', { method: 'POST', json: { key: str(b.key), quantity: Math.max(1, Number(b.quantity) || 1) } });
        break;
      case 'remove':
        raw = await storeApi('/cart/remove-item', { method: 'POST', json: { key: str(b.key) } });
        break;
      case 'clear':
        raw = await storeApi('/cart/items', { method: 'DELETE' }).then(() => storeApi('/cart'));
        break;
      case 'coupon':
        raw = await storeApi('/cart/apply-coupon', { method: 'POST', json: { code: str(b.code, 60).toLowerCase() } });
        break;
      case 'removeCoupon':
        raw = await storeApi('/cart/remove-coupon', { method: 'POST', json: { code: str(b.code, 60) } });
        break;
      case 'packaging':
        raw = await storeApi('/cart/extensions', { method: 'POST', json: { namespace: 'alara', data: { action: 'packaging', selection: b.selection === 'pr' ? 'pr' : 'bag' } } });
        break;
      case 'bundle':
        raw = await storeApi('/cart/extensions', { method: 'POST', json: { namespace: 'alara', data: { action: 'add_bundle', slot: Number(b.slot), choices: Object.fromEntries(Object.entries(b.choices ?? {}).map(([k, v]) => [str(k, 60), str(v, 100)])) } } });
        break;
      case 'customer':
        raw = await storeApi('/cart/update-customer', { method: 'POST', json: { billing_address: address(b.billing, true), shipping_address: shippingAddress(b.shipping, b.billing) } });
        break;
      case 'checkout': {
        const blocked = checkoutBlockedReason();
        if (blocked) return NextResponse.json({ ok: false, message: blocked }, { status: 403 });
        const token = await customerToken();
        const order = await storeApi<{ order_id: number; order_key: string; status: string }>('/checkout', {
          method: 'POST',
          json: {
            billing_address: address(b.billing, true),
            shipping_address: shippingAddress(b.shipping, b.billing),
            customer_note: str(b.note, 2000),
            payment_method: 'cod',
            extensions: { alara: { customer_token: token, newsletter: !!b.newsletter, account_password: b.accountPassword ? str(b.accountPassword, 200) : null } },
          },
        });
        const after = await storeApi('/cart').then(toCart).catch(() => null);
        return NextResponse.json({ ok: true, order: { id: order.order_id, key: order.order_key, status: order.status }, ...(after ? { cart: after } : {}) });
      }
      default:
        return NextResponse.json({ ok: false, message: 'Unknown action.' }, { status: 400 });
    }
    return NextResponse.json({ ok: true, cart: toCart(raw) });
  } catch (e) { return fail(e); }
}

function fail(e: unknown) {
  if (!(e instanceof CartError)) console.error('[cart] unexpected error', e);
  const err = e instanceof CartError ? e : new CartError('Something went wrong on our side. Please refresh the page and try again.', 500);
  return NextResponse.json({ ok: false, message: err.message, code: err.code }, { status: err.status });
}
