// The shopper's bag on alaraline.co ("hybrid" shop).
//
// Browsing happens here; the real cart and checkout are WooCommerce's own, on shop.alaraline.co. "Add to cart" keeps
// the shopper here and remembers the product in their browser (nothing is sent anywhere). "View cart" / "Checkout"
// then submits the whole bag in ONE normal form POST from the shopper's browser straight to WordPress (ÀLara Headless
// API 1.4.0, "bag hand-off"): no Cloudflare Worker in between. WooCommerce checks every product, option, stock and
// quantity, calculates every price, and adds the bag to whatever that shopper's cart already holds there.
//
// Two small cookies set by WordPress for .alaraline.co keep this side in step:
//   alara_cart_count    how many items the shopper's WooCommerce cart holds (shown on the bag icon)
//   alara_handoff_done  the id of the last bag WordPress received, so this copy can be emptied

export const SHOP_URL = (process.env.NEXT_PUBLIC_WC_URL || 'https://shop.alaraline.co').replace(/\/+$/, '');
export const SHOP_CART = `${SHOP_URL}/cart/`;
export const SHOP_CHECKOUT = `${SHOP_URL}/checkout/`;

export type BagLine = {
  key: string;
  kind: 'product' | 'bundle';
  id: number;                 // the product (a bundle's own product)
  slot?: number;              // bundles: position in the Christmas Bundles settings
  choices?: Record<string, string>;                     // bundles: scent answers
  variation?: { attribute: string; value: string }[];   // variable products: the options picked
  quantity: number;
  name: string;
  image: string;
  slug: string;
  price: number | null;       // shown as a guide only; WooCommerce sets the real price
  details: { label: string; value: string }[];
};

export type Bag = {
  lines: BagLine[];
  coupons: string[];
  packaging: 'pr' | null;     // the PR box, ticked in a bundle's popup
  sent: { id: string; at: number } | null; // the last hand-off of these exact lines (same id = never added twice)
};

export const EMPTY_BAG: Bag = { lines: [], coupons: [], packaging: null, sent: null };
export const MAX_QTY = 99;
const STORE_KEY = 'alara_bag_v1';

/** Same product with the same options = same line (quantities add up). */
export function lineKey(l: Pick<BagLine, 'kind' | 'id' | 'slot' | 'choices' | 'variation'>): string {
  if (l.kind === 'bundle') return `b:${l.slot}:${Object.entries(l.choices ?? {}).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${k}=${v}`).join('&')}`;
  return `p:${l.id}:${(l.variation ?? []).map(v => `${v.attribute}=${v.value}`).sort().join('&')}`;
}

export function readBag(): Bag {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return EMPTY_BAG;
    const b = JSON.parse(raw) as Partial<Bag>;
    return {
      lines: Array.isArray(b.lines) ? b.lines.filter(l => l && typeof l.id === 'number' && l.quantity > 0) : [],
      coupons: Array.isArray(b.coupons) ? b.coupons.filter(c => typeof c === 'string') : [],
      packaging: b.packaging === 'pr' ? 'pr' : null,
      sent: b.sent && typeof b.sent.id === 'string' ? b.sent : null,
    };
  } catch { return EMPTY_BAG; }
}

export function writeBag(b: Bag) {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(b)); } catch { /* private mode / storage full: the bag still works for this page */ }
}

export function readCookie(name: string): string | null {
  const m = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return m ? decodeURIComponent(m[1]) : null;
}

/** Items already in the shopper's WooCommerce cart (0 if unknown). */
export const shopCount = () => Math.max(0, Number(readCookie('alara_cart_count')) || 0);

/** WordPress confirmed it received this bag: the copy here can go. */
export const wasReceived = (b: Bag) => !!b.sent && readCookie('alara_handoff_done') === b.sent.id;

function newId() {
  try { return crypto.randomUUID(); } catch { return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`; }
}

/**
 * Sends the bag to WooCommerce and opens its cart or checkout. A normal page navigation (form POST), so the
 * shopper's own shop.alaraline.co cookies (their cart, their sign-in there) come along. Re-sending unchanged lines
 * reuses the same id, so a second click can never add them twice. Returns the bag as saved before leaving.
 */
export function sendBag(b: Bag, next: 'cart' | 'checkout'): Bag {
  const saved: Bag = { ...b, sent: b.sent ?? { id: newId(), at: Date.now() } };
  writeBag(saved);
  const payload = {
    v: 1,
    id: saved.sent!.id,
    items: b.lines.map(l => l.kind === 'bundle'
      ? { type: 'bundle', slot: l.slot, choices: l.choices ?? {}, quantity: l.quantity }
      : { type: 'product', id: l.id, quantity: l.quantity, ...(l.variation?.length ? { variation: l.variation } : {}) }),
    coupons: b.coupons,
    ...(b.packaging ? { packaging: b.packaging } : {}),
  };
  const form = document.createElement('form');
  form.method = 'POST';
  form.action = `${SHOP_URL}/?alara-handoff=1`;
  form.style.display = 'none';
  for (const [name, value] of [['alara_action', 'handoff'], ['next', next], ['payload', JSON.stringify(payload)]]) {
    const input = document.createElement('input');
    input.type = 'hidden'; input.name = name; input.value = value;
    form.appendChild(input);
  }
  document.body.appendChild(form);
  form.submit();
  return saved;
}
