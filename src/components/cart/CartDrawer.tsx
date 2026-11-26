'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { formatPrice } from '@/lib/site';
import { wpImage } from '@/lib/wp-image';
import { useCart } from './CartProvider';
import QtyStepper from './QtyStepper';

/** The live "Shopping bag" drawer + the "added to cart!" note, both opened from anywhere in the shop.
 *  Checkout / View cart hand the bag to WooCommerce on shop.alaraline.co (see src/lib/bag.ts). */
export default function CartDrawer() {
  const { cart, drawer, setDrawer, update, remove, addCoupon, removeCoupon, go, busy, error, toast, closeToast } = useCart();
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
  const waiting = c?.shopCount ?? 0;
  const href = (slug: string) => (slug ? `/product/${slug}` : '/shop');

  return (
    <>
      <div className={`bag-overlay${drawer ? ' is-open' : ''}`} onClick={() => setDrawer(false)} aria-hidden="true" />
      <aside className={`bag${drawer ? ' is-open' : ''}`} role="dialog" aria-modal="true" aria-label="Shopping bag" aria-hidden={!drawer} inert={!drawer}>
        <button type="button" className="bag-close" onClick={() => setDrawer(false)} aria-label="Close">×</button>
        <h3>Shopping bag</h3>
        {!c || (c.items.length === 0 && waiting === 0) ? (
          <div className="bag-empty">
            {error && <p className="bag-error" role="alert">{error}</p>}
            <p>No products in the cart.</p>
            <Link className="btn" href="/shop" onClick={() => setDrawer(false)}>Return to shop</Link>
          </div>
        ) : (
          <>
            {c.items.length > 0 && (
              <ul className="bag-items">
                {c.items.map(i => (
                  <li key={i.key}>
                    <button type="button" className="bag-remove" onClick={() => remove(i.key)} aria-label={`Remove ${i.name}`} disabled={busy}>×</button>
                    <Link href={href(i.slug)} onClick={() => setDrawer(false)} className="bag-img">{i.image && <Image src={wpImage(i.image, 140)} alt="" width={70} height={70} />}</Link>
                    <div className="bag-info">
                      <Link href={href(i.slug)} onClick={() => setDrawer(false)}>{i.name}</Link>
                      {i.details.map(d => <small key={d.label}>{d.label}: {d.value}</small>)}
                      <QtyStepper value={i.quantity} disabled={busy} onChange={q => update(i.key, q)} small />
                    </div>
                    <span className="bag-price">{i.price === null ? '' : money(i.price * i.quantity)}</span>
                  </li>
                ))}
              </ul>
            )}
            {waiting > 0 && (
              <p className="bag-waiting">{c.items.length > 0 ? 'Plus ' : 'You have '}{waiting} {waiting === 1 ? 'item' : 'items'} already in your cart at checkout.</p>
            )}
            {c.items.length > 0 && (
              <form className="bag-coupon" onSubmit={e => { e.preventDefault(); if (addCoupon(code)) setCode(''); }}>
                <input value={code} onChange={e => setCode(e.target.value)} placeholder="Coupon code" aria-label="Coupon code" />
                <button type="submit" disabled={busy}>Apply</button>
              </form>
            )}
            {error && <p className="bag-error" role="alert">{error}</p>}
            {(c.subtotal !== null && c.items.length > 0) || c.coupons.length > 0 ? (
              <dl className="bag-totals">
                {c.items.length > 0 && c.subtotal !== null && <div><dt>Subtotal:</dt><dd>{money(c.subtotal)}</dd></div>}
                {c.coupons.map(x => <div key={x}><dt>Coupon: {x.toUpperCase()} <button type="button" onClick={() => removeCoupon(x)}>[Remove]</button></dt><dd>at checkout</dd></div>)}
              </dl>
            ) : null}
            <p className="bag-note">Delivery, packaging and promo codes are confirmed at checkout.</p>
            <button type="button" className="bag-checkout" disabled={busy} onClick={() => go('checkout')}>{busy ? 'Opening checkout…' : 'Checkout'}</button>
            <button type="button" className="bag-view" disabled={busy} onClick={() => go('cart')}>View cart</button>
          </>
        )}
      </aside>

      {toast && (
        <div className="added" role="status">
          <button type="button" className="added-close" onClick={closeToast} aria-label="Close">×</button>
          <div className="added-row">
            {toast.image && <Image src={wpImage(toast.image, 160)} alt="" width={80} height={80} />}
            <p><b>{toast.name}</b><span>added to cart!</span></p>
          </div>
          <button type="button" className="added-view" onClick={() => { closeToast(); setDrawer(true); }}>View cart</button>
        </div>
      )}
    </>
  );
}
