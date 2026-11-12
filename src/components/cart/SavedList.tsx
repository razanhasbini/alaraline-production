'use client';

import Image from 'next/image';
import Link from 'next/link';
import type { LeanProduct } from '@/lib/lean';
import { formatPrice } from '@/lib/site';
import { HeartIcon } from '../Icons';
import { useCart } from './CartProvider';
import { useCompare, useWishlist } from './Wishlist';

/** The wishlist and compare pages. The saved product ids live in the shopper's browser, as with the live plugin. */
export default function SavedList({ kind, products }: { kind: 'wishlist' | 'compare'; products: LeanProduct[] }) {
  const wish = useWishlist(), cmp = useCompare();
  const store = kind === 'wishlist' ? wish : cmp;
  const items = store.ids.map(id => products.find(p => p.id === id)).filter((p): p is LeanProduct => !!p);

  if (items.length === 0) {
    return (
      <div className="wrap wl">
        <div className="wl-empty">
          <HeartIcon />
          <p>{kind === 'wishlist' ? 'There are no products on the Wishlist!' : 'No products added in the compare list.'}</p>
          <Link className="btn btn-black" href="/shop">Return to shop</Link>
        </div>
      </div>
    );
  }
  return kind === 'wishlist' ? <WishTable items={items} remove={wish.remove} /> : <CompareTable items={items} remove={cmp.remove} clear={cmp.clear} />;
}

const price = (p: LeanProduct) => (
  p.maxPrice ? `${formatPrice(p.price, p.currency)} – ${formatPrice(p.maxPrice, p.currency)}`
    : <>{p.onSale && p.regularPrice > p.price && <del>{formatPrice(p.regularPrice, p.currency)}</del>} {formatPrice(p.price, p.currency)}</>
);

function Buy({ p }: { p: LeanProduct }) {
  const { add, busy } = useCart();
  if (p.type === 'simple' && p.purchasable && p.inStock) return <button type="button" className="btn btn-black" disabled={busy} onClick={() => add(p.id, { name: p.name, image: p.image })}>Add to cart</button>;
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
              <td><Link href={`/product/${p.slug}`}>{p.image && <Image src={p.image} alt="" width={80} height={80} />}</Link></td>
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

function CompareTable({ items, remove, clear }: { items: LeanProduct[]; remove: (id: number) => void; clear: () => void }) {
  const rows: [string, (p: LeanProduct) => React.ReactNode][] = [
    ['Price', p => <span className="price">{price(p)}</span>],
    ['Description', p => p.summary],
    ['Category', p => p.categories],
    ['Availability', p => (p.inStock ? 'In Stock' : 'Out of stock')],
    ['SKU', p => p.sku || '—'],
    ['Rating', p => (p.reviewCount ? `${p.rating.toFixed(1)} / 5 (${p.reviewCount})` : '—')],
  ];
  return (
    <div className="wrap wl">
      <div className="cmp-scroll">
        <table className="cmp-table">
          <tbody>
            <tr>
              <th><button type="button" className="acc-link" onClick={clear}>Clear all</button></th>
              {items.map(p => (
                <td key={p.id}>
                  <button type="button" className="wl-x" onClick={() => remove(p.id)} aria-label={`Remove ${p.name} from compare`}>×</button>
                  <Link href={`/product/${p.slug}`}>{p.image && <Image src={p.image} alt="" width={180} height={180} />}{p.name}</Link>
                  <div><Buy p={p} /></div>
                </td>
              ))}
            </tr>
            {rows.map(([label, f]) => <tr key={label}><th>{label}</th>{items.map(p => <td key={p.id}>{f(p)}</td>)}</tr>)}
          </tbody>
        </table>
      </div>
    </div>
  );
}
