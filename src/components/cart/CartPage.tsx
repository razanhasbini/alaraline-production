'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { formatPrice } from '@/lib/site';
import { wpImage } from '@/lib/wp-image';
import { useCart } from './CartProvider';
import QtyStepper from './QtyStepper';

/** The /cart page: the bag kept on this site, with quantities, coupon and "Proceed to checkout", which hands it to
 *  WooCommerce's own cart and checkout on shop.alaraline.co (see src/lib/bag.ts). */
export default function CartPage() {
  const { cart, update, remove, clear, addCoupon, removeCoupon, go, busy, error } = useCart();
  const [code, setCode] = useState('');
  const [msg, setMsg] = useState('');

  if (!cart) return <div className="wrap cart-wrap"><p>Loading your cart…</p></div>;
  const waiting = cart.shopCount;
  if (cart.items.length === 0) {
    return (
      <div className="wrap cart-empty">
        <svg viewBox="0 0 250 230" aria-hidden="true"><path d="M20 30h28l30 110h120l26-78H66" fill="none" stroke="#4f8ef7" strokeWidth="8" strokeLinejoin="round" /><circle cx="95" cy="185" r="16" fill="#3b6fd8" /><circle cx="180" cy="185" r="16" fill="#3b6fd8" /><circle cx="190" cy="90" r="38" fill="#fff4cf" stroke="#5fd0c9" strokeWidth="8" /><rect x="172" y="84" width="36" height="12" rx="4" fill="#f4a1a1" /></svg>
        {waiting > 0 ? (
          <>
            <h2>Your {waiting === 1 ? 'item is' : `${waiting} items are`} waiting at checkout.</h2>
            <p>Review your cart or continue to checkout.</p>
            <p className="cart-empty-actions">
              <button type="button" className="btn btn-black" disabled={busy} onClick={() => go('checkout')}>Checkout</button>
              <button type="button" className="btn btn-grey" disabled={busy} onClick={() => go('cart')}>View cart</button>
            </p>
          </>
        ) : (
          <>
            <h2>Your cart is currently empty.</h2>
            <p>You may check out all the available products and buy some in the shop.</p>
            <Link className="btn btn-black" href="/shop">Return to shop</Link>
          </>
        )}
      </div>
    );
  }
  const money = (n: number) => formatPrice(n, cart.currency);
  const href = (slug: string) => (slug ? `/product/${slug}` : '/shop');

  return (
    <div className="wrap cart-wrap">
      {(error || msg) && <p className={`notice ${error ? 'is-err' : 'is-ok'}`} role="status">{error || msg}</p>}
      <div className="cart-table">
        <div className="cart-row cart-head"><span>Product</span><span>Price</span><span>Quantity</span><span>Subtotal</span><span /></div>
        {cart.items.map(i => (
          <div className="cart-row" key={i.key}>
            <div className="cart-prod">
              <Link href={href(i.slug)} className="cart-thumb">{i.image && <Image src={wpImage(i.image, 160)} alt="" width={80} height={80} />}</Link>
              <div><Link href={href(i.slug)}>{i.name}</Link>{i.details.map(d => <small key={d.label}>{d.label}: {d.value}</small>)}</div>
            </div>
            <span data-label="Price">{i.price === null ? 'At checkout' : money(i.price)}</span>
            <span data-label="Quantity"><QtyStepper value={i.quantity} disabled={busy} onChange={q => update(i.key, q)} /></span>
            <b data-label="Subtotal">{i.price === null ? '—' : money(i.price * i.quantity)}</b>
            <button type="button" className="cart-x" onClick={() => remove(i.key)} aria-label={`Remove ${i.name}`} disabled={busy}>×</button>
          </div>
        ))}
      </div>
      <div className="cart-links">
        <Link href="/shop" className="cart-continue"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 4h2l2.5 11h11L21 7H6.5" /><circle cx="9" cy="19" r="1.4" /><circle cx="17" cy="19" r="1.4" /></svg>Continue shopping</Link>
        <button type="button" className="cart-clear" disabled={busy} onClick={() => { if (confirm('Remove all products from your cart?')) clear(); }}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="15" rx="1" /><path d="m3 7 9 6 9-6" /></svg>Clear shopping cart
        </button>
      </div>
      <div className="cart-bottom">
        <section>
          <h3>Coupon Discount</h3>
          <p>Enter your coupon code if you have one. It is checked and applied at checkout.</p>
          <form onSubmit={e => { e.preventDefault(); if (addCoupon(code)) { setCode(''); setMsg('Your coupon code will be applied at checkout.'); } }}>
            <input value={code} onChange={e => setCode(e.target.value)} placeholder="Coupon code" aria-label="Coupon code" />
            <button type="submit" className="btn btn-black" disabled={busy}>Apply coupon</button>
          </form>
        </section>
        <section>
          <h3>Delivery</h3>
          <p className="cart-ship-note">We deliver all over Lebanon. Delivery and packaging are added at checkout.</p>
        </section>
        <section className="cart-totals">
          <h3>Cart totals</h3>
          <dl>
            <div><dt>Subtotal</dt><dd>{cart.subtotal === null ? 'At checkout' : money(cart.subtotal)}</dd></div>
            {cart.coupons.map(c => <div key={c}><dt>Coupon: {c.toUpperCase()} <button type="button" onClick={() => removeCoupon(c)}>[Remove]</button></dt><dd>at checkout</dd></div>)}
            {waiting > 0 && <div><dt>Already in your cart at checkout</dt><dd>{waiting} {waiting === 1 ? 'item' : 'items'}</dd></div>}
          </dl>
          <button type="button" className="btn btn-black btn-wide" disabled={busy} onClick={() => go('checkout')}>{busy ? 'Opening checkout…' : 'Proceed to checkout'}</button>
        </section>
      </div>
    </div>
  );
}
