'use client';

import { createContext, use, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
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

  useEffect(() => {
    fetch('/api/cart').then(r => r.json()).then(d => { if (d.ok) setCart(d.cart); }).catch(() => {});
  }, []);

  const call: Ctx['call'] = useCallback(async (body: Record<string, unknown>) => {
    setBusy(true); setError('');
    try {
      const res = await fetch('/api/cart', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const d = await res.json();
      if (d.cart) setCart(d.cart);
      if (!d.ok) setError(d.message ?? 'Something went wrong.');
      return d;
    } catch {
      setError('The shop could not be reached. Please try again.');
      return { ok: false, message: 'The shop could not be reached. Please try again.' };
    } finally { setBusy(false); }
  }, []);

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
