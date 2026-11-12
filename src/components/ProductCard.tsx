import Image from 'next/image';
import Link from 'next/link';
import type { Product } from '@/lib/woo';
import CardActions from './cart/CardActions';
import Price from './Price';
import { wpImage } from '@/lib/wp-image';

/**
 * Same badges as the live theme + "Product Labels" snippet: Sold out, New (recently added),
 * Just Restocked! and Limited (product tags). Live shows no "Sale" badge; the crossed-out price says it.
 */
function badges(p: Product) {
  const list: { label: string; cls: string }[] = [];
  if (!p.inStock) list.push({ label: 'Sold Out', cls: 'out' });
  if (p.isNew) list.push({ label: 'New', cls: 'new' });
  if (p.tags.includes('just-restocked')) list.push({ label: 'Just Restocked!', cls: 'restock' });
  if (p.tags.includes('limited')) list.push({ label: 'Limited', cls: 'limited' });
  return list;
}

export default function ProductCard({ product: p, priority = false }: { product: Product; priority?: boolean }) {
  const href = `/product/${p.slug}`;
  const img = p.images[0];
  // the second gallery photo fades in on hover (CSS only), when the product has one
  const alt = p.images.find(i => i.src !== img?.src);
  const simple = p.type === 'simple';
  const b = badges(p);
  const sizes = '(max-width: 767px) 50vw, (max-width: 1024px) 34vw, 20vw';
  return (
    <article className={`card${alt ? ' has-alt' : ''}`}>
      <div className="card-media">
        <Link className="card-img" href={href} tabIndex={-1} aria-hidden="true">
          {img && <Image className="card-img-main" src={wpImage(img.src, 640)} alt="" fill sizes={sizes} priority={priority} />}
          {alt && <Image className="card-img-alt" src={wpImage(alt.src, 640)} alt="" fill sizes={sizes} />}
        </Link>
        {b.length > 0 && <div className="badges">{b.map(x => <span key={x.label} className={`badge ${x.cls}`}>{x.label}</span>)}</div>}
        <CardActions id={p.id} name={p.name} slug={p.slug} image={img?.src ?? ''} quickAdd={simple && p.purchasable && p.inStock} inStock={p.inStock} />
      </div>
      <Price product={p} />
      <h3 className="card-title"><Link href={href}>{p.name}</Link></h3>
    </article>
  );
}
