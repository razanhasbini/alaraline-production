'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { Attribute, Variation } from '@/lib/woo';
import { useCart } from './cart/CartProvider';
import QtyStepper from './cart/QtyStepper';
import { useCompare, useWishlist } from './cart/Wishlist';
import { CompareIcon, HeartIcon } from './Icons';

type Props = { id: number; name: string; image: string; type: string; inStock: boolean; purchasable: boolean; attributes: Attribute[]; variations: Variation[] };

// Live product form: option dropdowns ("Choose an option"), quantity − 1 +, ADD TO CART, BUY NOW, Compare / Add to wishlist.
// The cart is WooCommerce's; it checks stock, the option and the price itself.
export default function BuyBox({ id, name, image, type, inStock, purchasable, attributes, variations }: Props) {
  const choices = type === 'variable' ? attributes.filter(a => a.forVariations) : [];
  const [picked, setPicked] = useState<Record<string, string>>({});
  const [qty, setQty] = useState(1);
  const [hint, setHint] = useState('');
  const { add, busy, error } = useCart();
  const router = useRouter();
  const wish = useWishlist(), cmp = useCompare();

  const complete = choices.every(a => picked[a.name]);
  const variation = complete && type === 'variable'
    ? variations.find(v => v.attributes.every(va => va.value === null || va.value === picked[va.name]))
    : undefined;
  const ready = inStock && purchasable && (type !== 'variable' || !!variation);
  const go = async (checkout: boolean) => {
    // same message WooCommerce shows when options are missing
    if (!ready) { setHint('Please select some product options before adding this product to your cart.'); return; }
    setHint('');
    const ok = await add(id, { quantity: qty, name, image, silent: checkout, variation: choices.map(c => ({ attribute: c.name, value: picked[c.name] })) });
    if (ok && checkout) router.push('/checkout');
  };

  return (
    <div className="buy">
      {choices.map(a => (
        <label key={a.name} className="buy-option">
          <span>{a.name}</span>
          <select value={picked[a.name] ?? ''} onChange={e => { setPicked(p => ({ ...p, [a.name]: e.target.value })); setHint(''); }}>
            <option value="">Choose an option</option>
            {a.options.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </label>
      ))}
      {!inStock && <p className="stock-out">Out of stock</p>}
      {inStock && (
        <>
          <div className="buy-qty"><span>Quantity</span><QtyStepper value={qty} onChange={setQty} /></div>
          <button type="button" className={`buy-btn${ready ? '' : ' is-off'}`} aria-disabled={!ready} disabled={busy} onClick={() => go(false)}>Add to cart</button>
          <button type="button" className={`buy-btn buy-now${ready ? '' : ' is-off'}`} aria-disabled={!ready} disabled={busy} onClick={() => go(true)}>Buy now</button>
          {hint && <p className="buy-hint" role="alert">{hint}</p>}
          {error && <p className="stock-out" role="alert">{error}</p>}
        </>
      )}
      <div className="buy-links">
        <button type="button" onClick={() => cmp.toggle(id)} aria-pressed={cmp.has(id)}><CompareIcon /> {cmp.has(id) ? 'Added to compare' : 'Compare'}</button>
        <button type="button" onClick={() => wish.toggle(id)} aria-pressed={wish.has(id)}><HeartIcon /> {wish.has(id) ? 'In your wishlist' : 'Add to wishlist'}</button>
      </div>
    </div>
  );
}
