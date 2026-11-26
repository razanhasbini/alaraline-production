'use client';

import Image from 'next/image';
import Link from 'next/link';
import type { LeanProduct } from '@/lib/lean';
import { formatPrice } from '@/lib/site';
import { HeartIcon } from '../Icons';
import { useCart } from './CartProvider';
import { useWishlist } from './Wishlist';
import { wpImage } from '@/lib/wp-image';

/** The wishlist page. The saved product ids live in the shopper's browser, as with the live plugin.
 *  (The compare page has its own table: CompareTable.tsx.) */
export default function SavedList({ products }: { kind?: 'wishlist'; products: LeanProduct[] }) {
  const wish = useWishlist();
  const items = wish.ids.map(id => products.find(p => p.id === id)).filter((p): p is LeanProduct => !!p);

  if (items.length === 0) {
    return (
      <div className="wrap wl">
        <div className="wl-empty">
          <HeartIcon />
          <p>There are no products on the Wishlist!</p>
          <Link className="btn btn-black" href="/shop">Return to shop</Link>
        </div>
      </div>
    );
  }
  return <WishTable items={items} remove={wish.remove} />;
}

const price = (p: LeanProduct) => (
  p.maxPrice ? `${formatPrice(p.price, p.currency)} – ${formatPrice(p.maxPrice, p.currency)}`
    : <>{p.onSale && p.regularPrice > p.price && <del>{formatPrice(p.regularPrice, p.currency)}</del>} {formatPrice(p.price, p.currency)}</>
);

export function Buy({ p }: { p: LeanProduct }) {
  const { add, busy } = useCart();
  if (p.type === 'simple' && p.purchasable && p.inStock) return <button type="button" className="btn btn-black" disabled={busy} onClick={() => add(p.id, { name: p.name, image: p.image, slug: p.slug, price: p.price })}>Add to cart</button>;
  return <Link className="btn btn-black" href={`/product/${p.slug}`}>{p.inStock ? 'Select options' : 'Read more'}</Link>;
}

function WishTable({ items, remove }: { items: LeanProduct[]; remove: (id: number) => void }) {
  return (
    <div className="wrap wl">
      <table className="wl-table">
        <thead><tr><th><span className="sr-only">Image</span></th><th>Product name</th><th>Unit price</th><th>Stock status</th><th /><th><span className="sr-only">Remove</span></th></tr></thead>
        <tbody>
          {items.map(p => (
            <tr key={p.id}>
              <td><Link href={`/product/${p.slug}`}>{p.image && <Image src={wpImage(p.image, 160)} alt="" width={80} height={80} />}</Link></td>
              <td><Link href={`/product/${p.slug}`}>{p.name}</Link></td>
              <td className="price">{price(p)}</td>
              <td>{p.inStock ? 'In Stock' : 'Out of stock'}</td>
              <td><Buy p={p} /></td>
              <td><button type="button" className="wl-x" onClick={() => remove(p.id)} aria-label={`Remove ${p.name} from wishlist`}>×</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
