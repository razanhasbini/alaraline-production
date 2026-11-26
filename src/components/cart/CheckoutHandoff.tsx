'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';
import { SHOP_CHECKOUT } from '@/lib/bag';
import { useCart } from './CartProvider';

/** /checkout on this site (old links, bookmarks): the real checkout is WooCommerce's on shop.alaraline.co.
 *  A bag waiting here is handed over once; otherwise the shopper goes straight to that checkout. */
export default function CheckoutHandoff() {
  const { cart, go, busy, error } = useCart();
  const once = useRef(false);

  useEffect(() => {
    if (!cart || once.current) return;
    if (cart.items.length > 0) { once.current = true; go('checkout'); }
    else if (cart.shopCount > 0) { once.current = true; location.replace(SHOP_CHECKOUT); } // replace: Back doesn't bounce here again
  }, [cart, go]);

  if (cart && cart.items.length === 0 && cart.shopCount === 0) {
    return (
      <div className="wrap cart-empty">
        <h2>Your cart is currently empty.</h2>
        <p>Checkout is not available whilst your cart is empty.</p>
        <Link className="btn btn-black" href="/shop">Return to shop</Link>
      </div>
    );
  }
  return (
    <div className="wrap cart-empty">
      <h2>Taking you to our secure checkout…</h2>
      {error && <p className="notice is-err" role="alert">{error}</p>}
      <p>If nothing happens, <button type="button" className="acc-link" disabled={busy && !error} onClick={() => go('checkout')}>continue to checkout</button>.</p>
    </div>
  );
}
