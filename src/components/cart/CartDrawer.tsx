'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { formatPrice } from '@/lib/site';
import { useCart } from './CartProvider';
import QtyStepper from './QtyStepper';

/** The live "Shopping bag" drawer + the "added to cart!" note, both opened from anywhere in the shop. */
export default function CartDrawer() {
  const { cart, drawer, setDrawer, call, busy, error, toast, closeToast } = useCart();
  const [code, setCode] = useState('');

  useEffect(() => {
    if (!drawer) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setDrawer(false); };
    addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [drawer, setDrawer]);

  const c = cart;
  const money = (n: number) => formatPrice(n, c?.currency ?? 'US$');

  return (
    <>
      <div className={`bag-overlay${drawer ? ' is-open' : ''}`} onClick={() => setDrawer(false)} aria-hidden="true" />
      <aside className={`bag${drawer ? ' is-open' : ''}`} role="dialog" aria-modal="true" aria-label="Shopping bag" aria-hidden={!drawer} inert={!drawer}>
        <button type="button" className="bag-close" onClick={() => setDrawer(false)} aria-label="Close">×</button>
        <h3>Shopping bag</h3>
        {!c || c.items.length === 0 ? (
          <div className="bag-empty">
            {error && <p className="bag-error" role="alert">{error}</p>}
            <p>No products in the cart.</p>
            <Link className="btn" href="/shop" onClick={() => setDrawer(false)}>Return to shop</Link>
          </div>
        ) : (
          <>
            <ul className="bag-items">
              {c.items.map(i => (
                <li key={i.key}>
                  <button type="button" className="bag-remove" onClick={() => call({ action: 'remove', key: i.key })} aria-label={`Remove ${i.name}`} disabled={busy}>×</button>
                  <Link href={`/product/${i.slug}`} onClick={() => setDrawer(false)} className="bag-img">{i.image && <Image src={i.image} alt="" width={70} height={70} />}</Link>
                  <div className="bag-info">
                    <Link href={`/product/${i.slug}`} onClick={() => setDrawer(false)}>{i.name}</Link>
                    {i.details.map(d => <small key={d.label}>{d.label}: {d.value}</small>)}
                    <QtyStepper value={i.quantity} max={i.max} disabled={busy} onChange={q => call({ action: 'update', key: i.key, quantity: q })} small />
                  </div>
                  <span className="bag-price">{money(i.lineTotal)}</span>
                </li>
              ))}
            </ul>
            <form className="bag-coupon" onSubmit={async e => { e.preventDefault(); if (code.trim()) { const d = await call({ action: 'coupon', code }); if (d.ok) setCode(''); } }}>
              <input value={code} onChange={e => setCode(e.target.value)} placeholder="Coupon code" aria-label="Coupon code" />
              <button type="submit" disabled={busy}>Apply</button>
            </form>
            {error && <p className="bag-error" role="alert">{error}</p>}
            <dl className="bag-totals">
              <div><dt>Subtotal:</dt><dd>{money(c.subtotal)}</dd></div>
              {c.coupons.map(x => <div key={x.code}><dt>Coupon: {x.code.toUpperCase()} <button type="button" onClick={() => call({ action: 'removeCoupon', code: x.code })}>[Remove]</button></dt><dd>−{money(x.discount)}</dd></div>)}
              {c.fees.map(f => <div key={f.name}><dt>{f.name}:</dt><dd>{money(f.amount)}</dd></div>)}
              {c.shipping !== null && <div><dt>{c.shippingLabel}:</dt><dd>{money(c.shipping)}</dd></div>}
              <div className="bag-total"><dt>Total:</dt><dd>{money(c.total)}</dd></div>
            </dl>
            <Link className="bag-checkout" href="/checkout" onClick={() => setDrawer(false)}>Checkout</Link>
            <Link className="bag-view" href="/cart" onClick={() => setDrawer(false)}>View cart</Link>
          </>
        )}
      </aside>

      {toast && (
        <div className="added" role="status">
          <button type="button" className="added-close" onClick={closeToast} aria-label="Close">×</button>
          <div className="added-row">
            {toast.image && <Image src={toast.image} alt="" width={80} height={80} />}
            <p><b>{toast.name}</b><span>added to cart!</span></p>
          </div>
          <button type="button" className="added-view" onClick={() => { closeToast(); setDrawer(true); }}>View cart</button>
        </div>
      )}
    </>
  );
}
