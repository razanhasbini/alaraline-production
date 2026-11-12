'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { Packaging } from '@/lib/alara';
import type { Customer } from '@/lib/orders';
import { useAuth } from '../account/AuthPopup';
import { formatPrice } from '@/lib/site';
import { useCart } from './CartProvider';
import { wpImage } from '@/lib/wp-image';

type Addr = { first_name: string; last_name: string; country: string; address_1: string; address_2: string; city: string; state: string; postcode: string; phone: string; email: string };
const EMPTY: Addr = { first_name: '', last_name: '', country: 'LB', address_1: '', address_2: '', city: '', state: '', postcode: '', phone: '', email: '' };

/**
 * The live classic WooCommerce checkout with the ÀLara additions: Billing details, "Choose Your Packaging"
 * (Brand Bag free / PR Box $25), promo code, create an account, ship to a different address, order notes,
 * the newsletter consent box and Cash on delivery. WooCommerce re-checks everything when the order is placed.
 */
export default function CheckoutForm({ packaging, blocked }: { packaging: Packaging | null; blocked: string | null }) {
  const { cart, call, busy, error } = useCart();
  const auth = useAuth();
  const router = useRouter();
  const [bill, setBill] = useState<Addr>(EMPTY);
  const [ship, setShip] = useState<Addr>(EMPTY);
  const [shipOther, setShipOther] = useState(false);
  const [account, setAccount] = useState(false);
  const [password, setPassword] = useState('');
  const [note, setNote] = useState('');
  const [news, setNews] = useState(false);
  const [code, setCode] = useState('');
  const [user, setUser] = useState<Customer | null>(null);
  const [placing, setPlacing] = useState(false);
  const [msg, setMsg] = useState('');
  const [gallery, setGallery] = useState<{ title: string; photos: string[]; at: number } | null>(null);

  // a signed-in customer's saved addresses fill the form, as on the live site
  useEffect(() => {
    if (!auth.signedIn) return;
    fetch('/api/account').then(r => r.json()).then((d: { user: Customer | null }) => {
      if (!d.user) return;
      setUser(d.user);
      setBill(b => ({ ...b, ...pick(d.user!.billing), email: d.user!.billing.email || d.user!.email, country: 'LB' }));
      if (d.user.shipping.address_1) setShip(s => ({ ...s, ...pick(d.user!.shipping), country: 'LB' }));
    }).catch(() => {});
  }, [auth.signedIn]);

  if (!cart) return <div className="wrap checkout"><p>Loading…</p></div>;
  if (cart.items.length === 0 && !placing) {
    return (
      <div className="wrap cart-empty">
        <h2>Your cart is currently empty.</h2>
        <p>Checkout is not available whilst your cart is empty.</p>
        <Link className="btn btn-black" href="/shop">Return to shop</Link>
      </div>
    );
  }
  const money = (n: number) => formatPrice(n, cart.currency);
  const prPrice = packaging?.pr_box_price ?? 25;
  const pkgOn = packaging?.enabled !== false;

  const place = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg('');
    if (blocked) { setMsg(blocked); return; }
    setPlacing(true);
    const d = await call({ action: 'checkout', billing: bill, shipping: shipOther ? ship : bill, note, newsletter: news, accountPassword: !user && account ? password : '' });
    if (d.ok && d.order) router.push(`/checkout/order-received/${d.order.id}?key=${encodeURIComponent(d.order.key)}`);
    else { setPlacing(false); scrollTo({ top: 0, behavior: 'smooth' }); }
  };

  const field = (a: Addr, set: (f: (x: Addr) => Addr) => void, k: keyof Addr, label: string, o: { required?: boolean; type?: string; auto?: string; placeholder?: string; wide?: boolean } = {}) => (
    <label className={`co-field${o.wide ? ' is-wide' : ''}`}>
      <span>{label} {o.required ? <abbr title="required">*</abbr> : <em>(optional)</em>}</span>
      <input type={o.type ?? 'text'} value={a[k]} required={o.required} autoComplete={o.auto} placeholder={o.placeholder} onChange={e => set(x => ({ ...x, [k]: e.target.value }))} />
    </label>
  );
  const addressFields = (a: Addr, set: (f: (x: Addr) => Addr) => void, prefix: 'billing' | 'shipping') => (
    <>
      {field(a, set, 'first_name', 'First name', { required: true, auto: `${prefix} given-name` })}
      {field(a, set, 'last_name', 'Last name', { required: true, auto: `${prefix} family-name` })}
      <div className="co-field is-wide"><span>Country / Region <abbr title="required">*</abbr></span><strong>Lebanon</strong></div>
      <label className="co-field is-wide">
        <span>Street address <abbr title="required">*</abbr></span>
        <input value={a.address_1} required autoComplete={`${prefix} address-line1`} placeholder="House number and street name" onChange={e => set(x => ({ ...x, address_1: e.target.value }))} />
        <input value={a.address_2} autoComplete={`${prefix} address-line2`} placeholder="Apartment, suite, unit, etc. (optional)" aria-label="Apartment, suite, unit, etc. (optional)" onChange={e => set(x => ({ ...x, address_2: e.target.value }))} />
      </label>
      {field(a, set, 'city', 'Town / City', { required: true, wide: true, auto: `${prefix} address-level2` })}
      {field(a, set, 'state', 'State / County', { wide: true, auto: `${prefix} address-level1` })}
      {field(a, set, 'postcode', 'Postcode / ZIP', { required: true, wide: true, auto: `${prefix} postal-code` })}
    </>
  );

  const setPkg = (sel: 'bag' | 'pr') => { if (sel !== cart.packaging) call({ action: 'packaging', selection: sel }); };
  const photos = (k: 'bag' | 'pr') => (k === 'bag' ? [packaging?.bag?.image?.src] : [packaging?.pr_box?.image?.src, packaging?.pr_box?.image_open?.src]).filter((s): s is string => !!s && s.startsWith('http') && s.length > 12);

  return (
    <form className="wrap checkout" onSubmit={place}>
      {(blocked || error || msg || cart.errors.length > 0) && (
        <div className="notice is-err" role="alert">{msg || error || blocked}{cart.errors.map(x => <p key={x}>{x}</p>)}</div>
      )}
      {!user && <p className="co-login">Returning customer? <button type="button" onClick={() => auth.open('login')}>Click here to login</button></p>}

      <div className="co-grid">
        <div className="co-main">
          <section className="co-box">
            <h3>Billing details</h3>
            <div className="co-fields">
              {addressFields(bill, setBill, 'billing')}
              {field(bill, setBill, 'phone', 'Phone', { required: true, type: 'tel', wide: true, auto: 'billing tel' })}
              {field(bill, setBill, 'email', 'Email address', { required: true, type: 'email', wide: true, auto: 'billing email' })}
            </div>
          </section>

          {pkgOn && (
            <section className="alara-packaging" aria-labelledby="pkg-title">
              <h3 id="pkg-title">Choose Your Packaging</h3>
              <p className="alara-packaging-intro">The finishing touch to your ÀLara order. Your selection applies to the entire order.</p>
              <div className="alara-packaging-options">
                {(['bag', 'pr'] as const).map(k => {
                  const name = k === 'pr' ? 'ÀLara PR Box' : 'ÀLara Brand Bag';
                  const ph = photos(k);
                  return (
                    <div key={k} className={`alara-package-card${cart.packaging === k ? ' is-selected' : ''}`}>
                      <div className="alara-package-photo">
                        {ph[0] ? (
                          <button type="button" onClick={() => setGallery({ title: name, photos: ph, at: 0 })} aria-label={`View ${name} photos in popup`}>
                            <Image src={wpImage(ph[0], 600)} alt={name} fill sizes="(max-width: 767px) 45vw, 260px" />
                            {ph.length > 1 && <span className="alara-photo-count" aria-hidden="true">1 / {ph.length}</span>}
                          </button>
                        ) : (
                          <div className="alara-package-placeholder" aria-hidden="true">
                            {k === 'pr'
                              ? <svg viewBox="0 0 96 96"><path d="M16 34 48 19l32 15v39L48 89 16 73V34Zm0 0 32 15 32-15M48 49v40M36 23c-17-21 18-20 12 0 5-20 29-22 13 0" /></svg>
                              : <svg viewBox="0 0 96 96"><path d="M19 35h58l-5 49H24l-5-49Zm16 0V25a13 13 0 0 1 26 0v10M34 47v7m28-7v7" /></svg>}
                          </div>
                        )}
                      </div>
                      <label className="alara-package-select">
                        <input type="radio" name="alara_packaging" value={k} checked={cart.packaging === k} disabled={busy} onChange={() => setPkg(k)} />
                        <span className="alara-package-label">{name}</span>
                        <span className="alara-package-price">{k === 'pr' ? money(prPrice) : 'FREE'}</span>
                      </label>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          <section className="co-box co-promo">
            <h3>Promo Code <em>(Optional)</em></h3>
            <div className="co-promo-row">
              <input value={code} onChange={e => setCode(e.target.value)} placeholder="Promo code" aria-label="Promo code" />
              <button type="button" className="btn btn-black" disabled={busy || !code.trim()} onClick={async () => { const d = await call({ action: 'coupon', code }); if (d.ok) setCode(''); }}>Apply</button>
            </div>
            {cart.coupons.map(c => (
              <p key={c.code} className="co-coupon">Coupon <b>{c.code.toUpperCase()}</b> applied (−{money(c.discount)}) <button type="button" onClick={() => call({ action: 'removeCoupon', code: c.code })}>[Remove]</button></p>
            ))}
          </section>

          {!user && (
            <section className="co-box">
              <label className="co-check"><input type="checkbox" checked={account} onChange={e => setAccount(e.target.checked)} /> Create an account?</label>
              {account && (
                <label className="co-field is-wide">
                  <span>Create account password <abbr title="required">*</abbr></span>
                  <input type="password" value={password} required minLength={8} autoComplete="new-password" onChange={e => setPassword(e.target.value)} />
                </label>
              )}
            </section>
          )}

          <section className="co-box">
            <label className="co-check co-ship-toggle"><input type="checkbox" checked={shipOther} onChange={e => setShipOther(e.target.checked)} /> <h3>Ship to a different address?</h3></label>
            {shipOther && <div className="co-fields">{addressFields(ship, setShip, 'shipping')}</div>}
          </section>

          <section className="co-box">
            <h3>Additional information</h3>
            <label className="co-field is-wide">
              <span>Order notes <em>(optional)</em></span>
              <textarea rows={4} value={note} onChange={e => setNote(e.target.value)} placeholder="Notes about your order, e.g. special notes for delivery." />
            </label>
            <label className="co-check co-news"><input type="checkbox" checked={news} onChange={e => setNews(e.target.checked)} /> Yes, I&apos;m ok with you sending me additional newsletter and email content</label>
          </section>
        </div>

        <aside className="co-side">
          <section className="co-box co-order">
            <h3>Your order</h3>
            <ul>
              {cart.items.map(i => (
                <li key={i.key}>
                  <span className="co-thumb">{i.image && <Image src={i.image} alt="" width={56} height={56} />}<b>{i.quantity}</b></span>
                  <span className="co-name">{i.name}{i.details.map(d => <small key={d.label}>{d.label}: {d.value}</small>)}</span>
                  <span>{money(i.lineTotal)}</span>
                </li>
              ))}
            </ul>
            <dl>
              <div><dt>Subtotal</dt><dd>{money(cart.subtotal)}</dd></div>
              {cart.coupons.map(c => <div key={c.code}><dt>Coupon: {c.code.toUpperCase()}</dt><dd>−{money(c.discount)}</dd></div>)}
              {cart.fees.map(f => <div key={f.name}><dt>{f.name}</dt><dd>{money(f.amount)}</dd></div>)}
              <div><dt>Shipment</dt><dd>{cart.shippingLabel}: {cart.shipping === null ? '—' : money(cart.shipping)}</dd></div>
              <div className="co-total"><dt>Total</dt><dd>{money(cart.total)}</dd></div>
            </dl>
          </section>

          <section className="co-box co-pay">
            <h3>Payment information</h3>
            <label className="co-check"><input type="radio" name="payment_method" value="cod" defaultChecked /> Cash on delivery</label>
            <p className="co-pay-note">Pay with cash upon delivery.</p>
            <p className="co-privacy">Your personal data will be used to process your order, support your experience throughout this website, and for other purposes described in our privacy policy.</p>
            <button type="submit" className="btn btn-black btn-wide" disabled={busy || placing || !!blocked}>{placing ? 'Placing order…' : 'Place order'}</button>
          </section>
        </aside>
      </div>

      {gallery && (
        <div className="pkg-modal" role="dialog" aria-modal="true" aria-label={`${gallery.title} photos`} onClick={() => setGallery(null)}>
          <div className="pkg-modal-box" onClick={e => e.stopPropagation()}>
            <button type="button" className="pkg-modal-close" onClick={() => setGallery(null)} aria-label="Close packaging photo preview">×</button>
            <div className="pkg-modal-img">
              <Image src={wpImage(gallery.photos[gallery.at], 1200)} alt={gallery.title} fill sizes="(max-width: 767px) 90vw, 600px" />
              {gallery.photos.length > 1 && <>
                <button type="button" className="pkg-prev" aria-label="Previous photo" onClick={() => setGallery(g => g && { ...g, at: (g.at + g.photos.length - 1) % g.photos.length })}>‹</button>
                <button type="button" className="pkg-next" aria-label="Next photo" onClick={() => setGallery(g => g && { ...g, at: (g.at + 1) % g.photos.length })}>›</button>
              </>}
            </div>
            <p className="pkg-modal-foot"><span>{gallery.title}</span>{gallery.photos.length > 1 && <span>{gallery.at + 1} / {gallery.photos.length}</span>}</p>
          </div>
        </div>
      )}
    </form>
  );
}

function pick(a: Record<string, string>): Partial<Addr> {
  const out: Partial<Addr> = {};
  for (const k of Object.keys(EMPTY) as (keyof Addr)[]) if (a[k]) out[k] = a[k];
  return out;
}
