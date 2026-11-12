'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { formatPrice } from '@/lib/site';
import { useCart } from './CartProvider';
import QtyStepper from './QtyStepper';

/** The live /cart/ page: item table, Update cart, Continue shopping / Clear shopping cart, coupon, shipping, Cart totals. */
export default function CartPage() {
  const { cart, call, busy, error } = useCart();
  const [qty, setQty] = useState<Record<string, number>>({});
  const [code, setCode] = useState('');
  const [msg, setMsg] = useState('');
  // typed quantities reset whenever WooCommerce sends back a new cart
  const [seen, setSeen] = useState(cart);
  if (seen !== cart) { setSeen(cart); setQty({}); }

  if (!cart) return <div className="wrap cart-wrap"><p>Loading your cart…</p></div>;
  if (cart.items.length === 0) {
    return (
      <div className="wrap cart-empty">
        <svg viewBox="0 0 250 230" aria-hidden="true"><path d="M20 30h28l30 110h120l26-78H66" fill="none" stroke="#4f8ef7" strokeWidth="8" strokeLinejoin="round" /><circle cx="95" cy="185" r="16" fill="#3b6fd8" /><circle cx="180" cy="185" r="16" fill="#3b6fd8" /><circle cx="190" cy="90" r="38" fill="#fff4cf" stroke="#5fd0c9" strokeWidth="8" /><rect x="172" y="84" width="36" height="12" rx="4" fill="#f4a1a1" /></svg>
        <h2>Your cart is currently empty.</h2>
        <p>You may check out all the available products and buy some in the shop.</p>
        <Link className="btn btn-black" href="/shop">Return to shop</Link>
      </div>
    );
  }
  const money = (n: number) => formatPrice(n, cart.currency);
  const changed = Object.entries(qty).filter(([k, q]) => cart.items.find(i => i.key === k)?.quantity !== q);

  return (
    <div className="wrap cart-wrap">
      {(error || msg) && <p className={`notice ${error ? 'is-err' : 'is-ok'}`} role="status">{error || msg}</p>}
      <div className="cart-table">
        <div className="cart-row cart-head"><span>Product</span><span>Price</span><span>Quantity</span><span>Subtotal</span><span /></div>
        {cart.items.map(i => (
          <div className="cart-row" key={i.key}>
            <div className="cart-prod">
              <Link href={`/product/${i.slug}`} className="cart-thumb">{i.image && <Image src={i.image} alt="" width={80} height={80} />}</Link>
              <div><Link href={`/product/${i.slug}`}>{i.name}</Link>{i.details.map(d => <small key={d.label}>{d.label}: {d.value}</small>)}</div>
            </div>
            <span data-label="Price">{money(i.price)}</span>
            <span data-label="Quantity"><QtyStepper value={qty[i.key] ?? i.quantity} max={i.max} disabled={busy} onChange={q => setQty(s => ({ ...s, [i.key]: q }))} /></span>
            <b data-label="Subtotal">{money(i.lineTotal)}</b>
            <button type="button" className="cart-x" onClick={() => call({ action: 'remove', key: i.key })} aria-label={`Remove ${i.name}`} disabled={busy}>×</button>
          </div>
        ))}
        <div className="cart-row cart-actions">
          <button type="button" className="btn btn-grey" disabled={busy || changed.length === 0} onClick={async () => {
            for (const [key, quantity] of changed) await call({ action: 'update', key, quantity });
            setMsg('Cart updated.');
          }}>Update cart</button>
        </div>
      </div>
      <div className="cart-links">
        <Link href="/shop" className="cart-continue"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 4h2l2.5 11h11L21 7H6.5" /><circle cx="9" cy="19" r="1.4" /><circle cx="17" cy="19" r="1.4" /></svg>Continue shopping</Link>
        <button type="button" className="cart-clear" disabled={busy} onClick={() => { if (confirm('Remove all products from your cart?')) call({ action: 'clear' }); }}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="15" rx="1" /><path d="m3 7 9 6 9-6" /></svg>Clear shopping cart
        </button>
      </div>
      <div className="cart-bottom">
        <section>
          <h3>Coupon Discount</h3>
          <p>Enter your coupon code if you have one.</p>
          <form onSubmit={async e => { e.preventDefault(); if (!code.trim()) return; const d = await call({ action: 'coupon', code }); if (d.ok) { setCode(''); setMsg('Coupon code applied successfully.'); } }}>
            <input value={code} onChange={e => setCode(e.target.value)} placeholder="Coupon code" aria-label="Coupon code" />
            <button type="submit" className="btn btn-black" disabled={busy}>Apply coupon</button>
          </form>
        </section>
        <section>
          <h3>Calculate shipping</h3>
          <p>{cart.shippingLabel}: <b>{cart.shipping === null ? '—' : money(cart.shipping)}</b></p>
          <p className="cart-ship-note">We deliver all over Lebanon. The exact cost is confirmed at checkout.</p>
        </section>
        <section className="cart-totals">
          <h3>Cart totals</h3>
          <dl>
            <div><dt>Subtotal</dt><dd>{money(cart.subtotal)}</dd></div>
            {cart.coupons.map(c => <div key={c.code}><dt>Coupon: {c.code.toUpperCase()} <button type="button" onClick={() => call({ action: 'removeCoupon', code: c.code })}>[Remove]</button></dt><dd>−{money(c.discount)}</dd></div>)}
            {cart.fees.map(f => <div key={f.name}><dt>{f.name}</dt><dd>{money(f.amount)}</dd></div>)}
            <div><dt>Shipping</dt><dd>{cart.shippingLabel}: <b>{cart.shipping === null ? '—' : money(cart.shipping)}</b></dd></div>
            <div className="cart-grand"><dt>Total Price:</dt><dd>{money(cart.total)}</dd></div>
          </dl>
          <Link className="btn btn-black btn-wide" href="/checkout">Checkout</Link>
        </section>
      </div>
    </div>
  );
}
