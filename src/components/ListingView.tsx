'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useState, type ReactNode } from 'react';

const LABELS: Record<string, string> = {
  popularity: 'Popularity', rating: 'Average rating', date: 'Latest', price: 'Price: low to high', 'price-desc': 'Price: high to low',
};

// The bar above the products ("Showing 1–12 of 20 results", grid/list switch, "Sort by") and the product grid.
export default function ListingView({ showing, sort, relevance = false, children }: { showing: string; sort: string; relevance?: boolean; children: ReactNode }) {
  // search results sort by "Relevance" first, like WooCommerce's search page
  const labels = relevance ? { relevance: 'Relevance', ...LABELS } : LABELS;
  const def = relevance ? 'relevance' : 'popularity';
  const [list, setList] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const onSort = (value: string) => {
    const q = new URLSearchParams(params.toString());
    if (value === def) q.delete('orderby'); else q.set('orderby', value);
    // sorting starts again from page 1
    const base = pathname.replace(/\/page\/\d+$/, '');
    router.push(q.toString() ? `${base}?${q}` : base);
  };

  return (
    <>
      <div className="toolbar">
        <p className="result-count">{showing}</p>
        <div className="toolbar-right">
          <span className="see">See</span>
          <button type="button" className="view-btn" aria-pressed={!list} aria-label="Grid view" onClick={() => setList(false)}>
            <svg viewBox="0 0 20 20" aria-hidden="true"><rect x="2" y="2" width="6.5" height="6.5" /><rect x="11.5" y="2" width="6.5" height="6.5" /><rect x="2" y="11.5" width="6.5" height="6.5" /><rect x="11.5" y="11.5" width="6.5" height="6.5" /></svg>
          </button>
          <button type="button" className="view-btn" aria-pressed={list} aria-label="List view" onClick={() => setList(true)}>
            <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M2 4h16M2 10h16M2 16h16" /></svg>
          </button>
          <label className="sort">
            <span className="sr-only">Shop order</span>
            <select value={sort} onChange={e => onSort(e.target.value)}>
              {Object.entries(labels).map(([v, l]) => <option key={v} value={v}>Sort by: {l}</option>)}
            </select>
          </label>
        </div>
      </div>
      <div className={`grid cat-grid${list ? ' is-list' : ''}`}>{children}</div>
    </>
  );
}
