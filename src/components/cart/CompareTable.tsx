'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState, useSyncExternalStore, type ReactNode } from 'react';
import type { CompareItem, CompareTabs } from '@/lib/compare';
import { formatPrice } from '@/lib/site';
import { wpImage } from '@/lib/wp-image';
import { CompareIcon } from '../Icons';
import { Buy } from './SavedList';
import { COMPARE_MAX, useCompare } from './Wishlist';

type Loaded = CompareTabs | 'error';
type Row = { key: string; label: string; long?: boolean; cell: (p: CompareItem, t: Loaded | undefined) => ReactNode };

const GROUPS: CompareItem['group'][] = ['Sets & offers', 'Hair care', 'Hair accessories'];
const noop = () => () => {};

const priceOf = (p: CompareItem) => p.maxPrice
  ? <>{formatPrice(p.price, p.currency)} – {formatPrice(p.maxPrice, p.currency)}</>
  : <>{p.onSale && p.regularPrice > p.price && <del>{formatPrice(p.regularPrice, p.currency)}</del>} <strong>{formatPrice(p.price, p.currency)}</strong></>;

/** Text from a product tab, while it loads, or a way to the product page when it couldn't be loaded. */
const fromTab = (p: CompareItem, t: Loaded | undefined, pick: (t: CompareTabs) => string) =>
  t === undefined ? <span className="cmp-wait">Loading…</span>
    : t === 'error' ? <Link className="cmp-more" href={`/product/${p.slug}`}>See the product page</Link>
      : pick(t) || <span className="cmp-none">—</span>;

/**
 * Up to 4 products side by side: price, size, what a set includes, description, ingredients, how to use,
 * availability and rating. The chosen ids live in this browser; more products are picked from the list.
 */
export default function CompareTable({ products }: { products: CompareItem[] }) {
  const cmp = useCompare();
  const ready = useSyncExternalStore(noop, () => true, () => false); // the saved list exists only in the browser
  const items = cmp.ids.map(id => products.find(p => p.id === id)).filter((p): p is CompareItem => !!p);
  const [tabs, setTabs] = useState<Record<number, Loaded>>({});
  const [open, setOpen] = useState<Record<string, boolean>>({});

  const need = items.filter(p => !(p.id in tabs)).map(p => p.id).join(',');
  useEffect(() => {
    if (!need) return;
    const ids = need.split(',').map(Number);
    let live = true;
    fetch(`/api/compare?ids=${need}`).then(r => r.json()).catch(() => null).then(d => {
      if (live) setTabs(t => ({ ...t, ...Object.fromEntries(ids.map(id => [id, d?.ok && d.tabs?.[id] ? d.tabs[id] : 'error'])) }));
    });
    return () => { live = false; };
  }, [need]);

  if (!ready) return <div className="wrap cmp" style={{ minHeight: 480 }} />;

  const picker = (
    <select className="cmp-pick" value="" onChange={e => { if (e.target.value) cmp.add(Number(e.target.value)); }} aria-label="Add a product to compare">
      <option value="">Choose a product…</option>
      {GROUPS.map(g => {
        const list = products.filter(p => p.group === g && !cmp.has(p.id));
        return list.length ? <optgroup key={g} label={g}>{list.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</optgroup> : null;
      })}
    </select>
  );

  if (items.length === 0) {
    return (
      <div className="wrap cmp">
        <div className="cmp-empty">
          <CompareIcon />
          <h2>Compare products side by side</h2>
          <p>Choose up to {COMPARE_MAX} products to see their price, size, ingredients and how to use them, all in one table.</p>
          {picker}
          <Link className="cmp-more" href="/shop">Or browse the shop</Link>
        </div>
      </div>
    );
  }

  const rows: Row[] = [
    { key: 'price', label: 'Price', cell: p => <span className="cmp-price">{priceOf(p)}</span> },
    { key: 'size', label: 'Size', cell: p => p.size || <span className="cmp-none">—</span> },
    ...(items.some(p => p.included.length) ? [{
      key: 'included', label: 'What’s included', long: true,
      cell: (p: CompareItem) => p.included.length ? <ul className="cmp-list">{p.included.map(i => <li key={i}>{i}</li>)}</ul> : <span className="cmp-none">—</span>,
    }] : []),
    { key: 'about', label: 'Description', long: true, cell: (p, t) => p.about || fromTab(p, t, x => x.about) },
    { key: 'ingredients', label: 'Ingredients', long: true, cell: (p, t) => fromTab(p, t, x => x.ingredients) },
    { key: 'howTo', label: 'How to use', long: true, cell: (p, t) => fromTab(p, t, x => x.howTo) },
    { key: 'stock', label: 'Availability', cell: p => p.inStock ? <span className="cmp-in">In stock</span> : <span className="cmp-out">Out of stock</span> },
    { key: 'rating', label: 'Rating', cell: p => p.reviewCount ? <><span className="cmp-stars" aria-hidden="true">★</span> {p.rating.toFixed(1)} <span className="cmp-muted">({p.reviewCount} {p.reviewCount === 1 ? 'review' : 'reviews'})</span></> : <span className="cmp-muted">No reviews yet</span> },
  ];
  const slot = items.length < COMPARE_MAX;
  const cols = items.length + (slot ? 1 : 0);

  return (
    <div className="wrap cmp">
      <div className="cmp-bar">
        <p><strong>{items.length}</strong> of {COMPARE_MAX} products</p>
        <button type="button" className="cmp-clear" onClick={cmp.clear}>Clear all</button>
      </div>
      {cols > 2 && <p className="cmp-swipe" aria-hidden="true">Swipe sideways to see all columns →</p>}
      <div className="cmp-scroll">
        <div className="cmp-grid" role="table" aria-label="Product comparison" style={{ ['--cols' as string]: cols }}>
          <div className="cmp-row cmp-heads" role="row">
            <div className="cmp-label" role="columnheader"><span>Product</span></div>
            {items.map(p => (
              <div key={p.id} className="cmp-cell cmp-head" role="columnheader">
                <button type="button" className="cmp-x" onClick={() => cmp.remove(p.id)} aria-label={`Remove ${p.name} from the comparison`}>×</button>
                <Link className="cmp-img" href={`/product/${p.slug}`} tabIndex={-1} aria-hidden="true">
                  {p.image && <Image src={wpImage(p.image, 400)} alt="" width={200} height={200} />}
                </Link>
                <p className="cmp-group">{p.group}</p>
                <Link className="cmp-name" href={`/product/${p.slug}`}>{p.name}</Link>
                <Buy p={p} />
              </div>
            ))}
            {slot && (
              <div className="cmp-cell cmp-head cmp-slot" role="columnheader">
                <div className="cmp-add">
                  <span className="cmp-plus" aria-hidden="true">+</span>
                  <p>Add a product</p>
                  {picker}
                </div>
              </div>
            )}
          </div>
          {rows.map(r => {
            const isOpen = !!open[r.key];
            const canOpen = r.long && items.some(p => {
              const t = tabs[p.id];
              const s = r.key === 'included' ? p.included.join(' ') : r.key === 'about' ? (p.about || (t && t !== 'error' ? t.about : ''))
                : t && t !== 'error' ? (r.key === 'ingredients' ? t.ingredients : t.howTo) : '';
              return s.length > 200 || (r.key === 'included' && p.included.length > 5);
            });
            return (
              <div key={r.key} className={`cmp-row${r.long ? ' is-long' : ''}${isOpen ? ' is-open' : ''}`} role="row">
                <div className="cmp-label" role="rowheader">
                  <span>{r.label}
                    {canOpen && <button type="button" className="cmp-toggle" aria-expanded={isOpen} onClick={() => setOpen(o => ({ ...o, [r.key]: !isOpen }))}>{isOpen ? 'Show less' : 'Show all'}</button>}
                  </span>
                </div>
                {items.map(p => <div key={p.id} className="cmp-cell" role="cell"><div className="cmp-text">{r.cell(p, tabs[p.id])}</div></div>)}
                {slot && <div className="cmp-cell cmp-blank" role="cell" />}
              </div>
            );
          })}
        </div>
      </div>
      {!slot && <p className="cmp-note">The table holds {COMPARE_MAX} products. Remove one to add another.</p>}
    </div>
  );
}
