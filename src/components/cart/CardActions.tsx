'use client';

import Link from 'next/link';
import { CompareIcon, EyeIcon, HeartIcon } from '../Icons';
import { useCart } from './CartProvider';
import { useCompare, useWishlist } from './Wishlist';

/** The hover icons (wishlist, compare, quick view) and the black ADD TO CART bar of a product card. */
export default function CardActions({ id, name, slug, image, quickAdd, inStock }: { id: number; name: string; slug: string; image: string; quickAdd: boolean; inStock: boolean }) {
  const { add, busy } = useCart();
  const wish = useWishlist(), cmp = useCompare();
  const href = `/product/${slug}`;
  return (
    <>
      <div className="card-icons">
        <button type="button" aria-pressed={wish.has(id)} aria-label={wish.has(id) ? 'Remove from wishlist' : 'Add to wishlist'} onClick={() => wish.toggle(id)} className={wish.has(id) ? 'is-on' : undefined}><HeartIcon /></button>
        <button type="button" aria-pressed={cmp.has(id)} aria-label={cmp.has(id) ? 'Remove from compare' : 'Compare'} onClick={() => cmp.toggle(id)} className={cmp.has(id) ? 'is-on' : undefined}><CompareIcon /></button>
        <Link href={href} aria-label={`Quick view ${name}`}><EyeIcon /></Link>
      </div>
      {quickAdd
        ? <button type="button" className="card-cta" disabled={busy} onClick={() => add(id, { name, image })} aria-label={`Add to cart: “${name}”`}>Add to cart</button>
        : <Link className="card-cta" href={href}>{inStock ? 'Select options' : 'Read more'}</Link>}
    </>
  );
}
