'use client';

import { createContext, use, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { EMPTY_BAG, MAX_QTY, SHOP_CART, SHOP_CHECKOUT, lineKey, readBag, sendBag, shopCount, wasReceived, writeBag, type Bag, type BagLine } from '@/lib/bag';

// The shopper's bag (see src/lib/bag.ts). It lives in this browser until "View cart" / "Checkout" hands it to
// WooCommerce on shop.alaraline.co, which then runs the real cart and checkout.

export type BagView = {
  count: number;            // items here + items already in the WooCommerce cart
  items: BagLine[];         // items not handed over yet
  shopCount: number;        // items already in the WooCommerce cart
  subtotal: number | null;  // a guide only (null when a price is only known at checkout)
  coupons: string[];
  currency: string;
};

type Toast = { name: string; image: string } | null;
type Detail = { label: string; value: string };
type AddOpts = { quantity?: number; variation?: { attribute: string; value: string }[]; name?: string; image?: string; slug?: string; price?: number | null; details?: Detail[]; silent?: boolean };
type BundleAdd = { id: number; slot: number; choices: Record<string, string>; name: string; image: string; slug: string; price: number | null; details: Detail[]; pr?: boolean; silent?: boolean };

type Ctx = {
  cart: BagView | null;     // null until the browser's bag has been read
  busy: boolean;            // true while the shopper is being sent to the cart / checkout
  error: string;
  drawer: boolean;
  setDrawer: (open: boolean) => void;
  toast: Toast;
  closeToast: () => void;
  add: (id: number, opts?: AddOpts) => Promise<boolean>;
  addBundle: (b: BundleAdd) => boolean;
  update: (key: string, quantity: number) => void;
  remove: (key: string) => void;
  clear: () => void;
  addCoupon: (code: string) => boolean;
  removeCoupon: (code: string) => void;
  /** Hands the bag to WooCommerce and opens its cart or checkout (or just opens them when nothing is waiting here). */
  go: (next: 'cart' | 'checkout') => void;
};

const CartContext = createContext<Ctx | null>(null);
export const useCart = () => {
  const c = use(CartContext);
  if (!c) throw new Error('useCart must be inside CartProvider');
  return c;
};

export default function CartProvider({ children }: { children: ReactNode }) {
  const [bag, setBag] = useState<Bag | null>(null);
  const [wp, setWp] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [drawer, setDrawer] = useState(false);
  const [toast, setToast] = useState<Toast>(null);
  const bagRef = useRef<Bag>(EMPTY_BAG);

  // Read the bag (and what WordPress already holds) on load, when coming back from the shop with the browser's Back
  // button (the page may be restored from memory), when the tab is shown again, and when another tab changes it.
  useEffect(() => {
    const sync = () => {
      let b = readBag();
      if (wasReceived(b)) { b = { ...EMPTY_BAG }; writeBag(b); } // WordPress has these items now
      bagRef.current = b;
      setBag(b);
      setWp(shopCount());
      setBusy(false);
    };
    sync();
    const onVisible = () => { if (document.visibilityState === 'visible') sync(); };
    const onStorage = (e: StorageEvent) => { if (e.key === null || e.key === 'alara_bag_v1') sync(); };
    addEventListener('pageshow', sync);
    addEventListener('storage', onStorage);
    document.addEventListener('visibilitychange', onVisible);
    return () => { removeEventListener('pageshow', sync); removeEventListener('storage', onStorage); document.removeEventListener('visibilitychange', onVisible); };
  }, []);

  /** Every change is saved right away; changed lines get a new hand-off id the next time (sent = null). */
  const change = useCallback((fn: (b: Bag) => Bag) => {
    const next = { ...fn(bagRef.current), sent: null };
    bagRef.current = next;
    writeBag(next);
    setBag(next);
    setError('');
  }, []);

  const addLine = useCallback((line: Omit<BagLine, 'key'>) => {
    const key = lineKey(line);
    change(b => {
      const found = b.lines.some(l => l.key === key);
      const lines = found
        ? b.lines.map(l => (l.key === key ? { ...l, quantity: Math.min(MAX_QTY, l.quantity + line.quantity) } : l))
        : [...b.lines, { ...line, key }];
      return { ...b, lines };
    });
  }, [change]);

  const add: Ctx['add'] = useCallback(async (id, opts = {}) => {
    const variation = (opts.variation ?? []).filter(v => v.value);
    addLine({
      kind: 'product', id, variation, quantity: Math.max(1, Math.min(MAX_QTY, opts.quantity ?? 1)),
      name: opts.name ?? 'Product', image: opts.image ?? '', slug: opts.slug ?? '', price: opts.price ?? null,
      details: opts.details ?? variation.map(v => ({ label: v.attribute, value: v.value })),
    });
    if (!opts.silent) setToast({ name: opts.name ?? 'Product', image: opts.image ?? '' });
    return true;
  }, [addLine]);

  const addBundle: Ctx['addBundle'] = useCallback(b => {
    addLine({ kind: 'bundle', id: b.id, slot: b.slot, choices: b.choices, quantity: 1, name: b.name, image: b.image, slug: b.slug, price: b.price, details: b.details });
    if (b.pr) change(x => ({ ...x, packaging: 'pr' }));
    if (!b.silent) setToast({ name: b.name, image: b.image });
    return true;
  }, [addLine, change]);

  const update = useCallback((key: string, quantity: number) =>
    change(b => ({ ...b, lines: b.lines.map(l => (l.key === key ? { ...l, quantity: Math.max(1, Math.min(MAX_QTY, quantity)) } : l)) })), [change]);
  const remove = useCallback((key: string) => change(b => ({ ...b, lines: b.lines.filter(l => l.key !== key) })), [change]);
  const clear = useCallback(() => change(() => ({ ...EMPTY_BAG })), [change]);
  const addCoupon = useCallback((code: string) => {
    const c = code.trim().toLowerCase().slice(0, 60);
    if (!c) return false;
    change(b => ({ ...b, coupons: b.coupons.includes(c) ? b.coupons : [...b.coupons, c].slice(-5) }));
    return true;
  }, [change]);
  const removeCoupon = useCallback((code: string) => change(b => ({ ...b, coupons: b.coupons.filter(c => c !== code) })), [change]);

  const go = useCallback((next: 'cart' | 'checkout') => {
    const b = bagRef.current;
    setBusy(true);
    setError('');
    if (b.lines.length === 0) { location.assign(next === 'checkout' ? SHOP_CHECKOUT : SHOP_CART); return; } // nothing waiting here
    try { bagRef.current = sendBag(b, next); }
    catch { setBusy(false); setError('We could not open the checkout. Please try again.'); }
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(t);
  }, [toast]);

  const cart = useMemo<BagView | null>(() => {
    if (!bag) return null;
    const here = bag.lines.reduce((n, l) => n + l.quantity, 0);
    const known = bag.lines.every(l => l.price !== null);
    return {
      count: here + wp,
      items: bag.lines,
      shopCount: wp,
      subtotal: known ? bag.lines.reduce((s, l) => s + (l.price ?? 0) * l.quantity, 0) : null,
      coupons: bag.coupons,
      currency: 'US$',
    };
  }, [bag, wp]);

  // opening the bag closes the "added to cart!" note, which would otherwise cover its Checkout button
  const openDrawer = useCallback((open: boolean) => { setDrawer(open); if (open) setToast(null); }, []);

  const value = useMemo(() => ({ cart, busy, error, drawer, setDrawer: openDrawer, toast, closeToast: () => setToast(null), add, addBundle, update, remove, clear, addCoupon, removeCoupon, go }),
    [cart, busy, error, drawer, openDrawer, toast, add, addBundle, update, remove, clear, addCoupon, removeCoupon, go]);
  return <CartContext value={value}>{children}</CartContext>;
}
