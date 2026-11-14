'use client';

import { createContext, use, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Cart } from '@/lib/cart';

type Toast = { name: string; image: string } | null;
type Ctx = {
  cart: Cart | null;
  busy: boolean;
  error: string;
  drawer: boolean;
  setDrawer: (open: boolean) => void;
  toast: Toast;
  closeToast: () => void;
  call: (body: Record<string, unknown>) => Promise<{ ok: boolean; message?: string; cart?: Cart; order?: { id: number; key: string } }>;
  add: (id: number, opts?: { quantity?: number; variation?: { attribute: string; value: string }[]; name?: string; image?: string; silent?: boolean }) => Promise<boolean>;
};

const CartContext = createContext<Ctx | null>(null);
export const useCart = () => {
  const c = use(CartContext);
  if (!c) throw new Error('useCart must be inside CartProvider');
  return c;
};

/** One cart for the whole shop, loaded once and kept in sync with WooCommerce after every change. */
export default function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<Cart | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [drawer, setDrawer] = useState(false);
  const [toast, setToast] = useState<Toast>(null);

  // Cart requests go to WooCommerce one at a time. A new shopper has no cart cookie yet: if the first
  // load and an "Add to cart" ran side by side, WooCommerce would open two separate carts and the empty
  // one could win (the bag then opened empty). In a queue, the first request sets the cookie for the rest.
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const pending = useRef(0);
  const enqueue = useCallback(<T,>(task: () => Promise<T>) => {
    const run = queue.current.then(task, task);
    queue.current = run.catch(() => {});
    return run;
  }, []);

  useEffect(() => {
    enqueue(async () => {
      const d = await fetch('/api/cart').then(r => r.json()).catch(() => null);
      // a failed background load stays quiet: the error would otherwise sit in every buy box before the shopper did anything
      if (d?.ok) setCart(d.cart);
    });
  }, [enqueue]);

  const call: Ctx['call'] = useCallback((body: Record<string, unknown>) => {
    pending.current++; setBusy(true); setError('');
    return enqueue(async () => {
      try {
        const res = await fetch('/api/cart', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        const d = await res.json().catch(() => ({ ok: false, message: `The shop did not answer properly (error ${res.status}). Please try again.` }));
        if (d.cart) setCart(d.cart);
        if (!d.ok) {
          setError(d.message ?? 'Something went wrong.');
          // a change can go through even when its answer was lost: show the cart as WooCommerce has it now.
          // Not after a 429 ("too many requests"): nothing reached WooCommerce, and asking again adds load.
          if (res.status !== 429) {
            const now = await fetch('/api/cart').then(r => r.json()).catch(() => null);
            if (now?.ok) setCart(now.cart);
          }
        }
        return d;
      } catch {
        setError('The shop could not be reached. Please try again.');
        return { ok: false, message: 'The shop could not be reached. Please try again.' };
      } finally { if (--pending.current === 0) setBusy(false); }
    });
  }, [enqueue]);

  const add: Ctx['add'] = useCallback(async (id, opts = {}) => {
    const d = await call({ action: 'add', id, quantity: opts.quantity ?? 1, variation: opts.variation });
    if (d.ok && !opts.silent) {
      const line = d.cart?.items.find(i => i.id === id) ?? d.cart?.items.at(-1);
      setToast({ name: opts.name ?? line?.name ?? 'Product', image: opts.image ?? line?.image ?? '' });
    } else if (!d.ok && !opts.silent) setDrawer(true); // show the problem in the bag
    return d.ok;
  }, [call]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(t);
  }, [toast]);

  const value = useMemo(() => ({ cart, busy, error, drawer, setDrawer, toast, closeToast: () => setToast(null), call, add }), [cart, busy, error, drawer, toast, call, add]);
  return <CartContext value={value}>{children}</CartContext>;
}
