import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import ListingView from '@/components/ListingView';
import PageBand from '@/components/PageBand';
import ProductCard from '@/components/ProductCard';
import { SearchIcon } from '@/components/Icons';
import { getProducts, type Product, type SortKey } from '@/lib/woo';

export const metadata: Metadata = { title: 'Search', robots: { index: false, follow: true } };

// The live search results page: "Search Result of 'mask'", Filter By Categories (with counts), Price Filter, Sort by Relevance.
const PRICES = [
  { label: 'All' },
  { label: 'US$0.00 - US$30.00', min: 0, max: 30 },
  { label: 'US$30.00 - US$60.00', min: 30, max: 60 },
  { label: 'US$60.00 - US$90.00', min: 60, max: 90 },
  { label: 'US$90.00 - US$120.00', min: 90, max: 120 },
  { label: 'US$120.00 +', min: 120 },
];
const SORTS: SortKey[] = ['popularity', 'rating', 'date', 'price', 'price-desc'];

export default function SearchPage(props: PageProps<'/search'>) {
  return (
    <>
      <PageBand title="Shop" crumbs={[{ label: 'Home', href: '/' }, { label: 'Search' }]} />
      <Suspense fallback={<div className="wrap cat-layout" style={{ minHeight: '60vh' }} />}>
        <Results {...props} />
      </Suspense>
    </>
  );
}

const text = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/&[a-z#0-9]+;/gi, ' ').toLowerCase();

/** Same idea as WordPress search: every word must appear in the title, short description or description; title hits rank first. */
function score(p: Product, words: string[]) {
  const name = p.name.toLowerCase(), body = `${text(p.shortDescription)} ${text(p.description)} ${p.sku.toLowerCase()}`;
  let s = 0;
  for (const w of words) {
    if (name.includes(w)) s += 10;
    else if (body.includes(w)) s += 1;
    else return 0;
  }
  return s;
}

async function Results({ searchParams }: PageProps<'/search'>) {
  const sp = await searchParams;
  const one = (v: string | string[] | undefined) => (typeof v === 'string' ? v : '');
  const q = one(sp.q).trim().slice(0, 100);
  const cat = one(sp.product_cat);
  const orderby = one(sp.orderby);
  const min = one(sp.min_price) === '' ? undefined : Number(one(sp.min_price));
  const max = one(sp.max_price) === '' ? undefined : Number(one(sp.max_price));
  const sort = (SORTS as string[]).includes(orderby) ? (orderby as SortKey) : 'relevance';

  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  const all = await getProducts({ sort: sort === 'relevance' ? 'popularity' : sort });
  const matched = (words.length ? all.map(p => ({ p, s: score(p, words) })).filter(x => x.s > 0) : all.map(p => ({ p, s: 0 })))
    .sort((a, b) => (sort === 'relevance' ? b.s - a.s : 0))
    .map(x => x.p);

  // category counts come from the search results, before the category/price filter (as on live)
  const cats = new Map<string, { name: string; count: number }>();
  for (const p of matched) for (const c of p.categories) cats.set(c.slug, { name: c.name, count: (cats.get(c.slug)?.count ?? 0) + 1 });
  const shown = matched
    .filter(p => !cat || p.categories.some(c => c.slug === cat))
    .filter(p => (min === undefined || p.price >= min) && (max === undefined || p.price <= max));

  const href = (extra: Record<string, string | number | undefined>) => {
    const u = new URLSearchParams();
    const merged: Record<string, string | number | undefined> = { q, product_cat: cat, orderby: sort === 'relevance' ? undefined : sort, min_price: min, max_price: max, ...extra };
    for (const [k, v] of Object.entries(merged)) if (v !== undefined && v !== '') u.set(k, String(v));
    return `/search?${u}`;
  };
  const activePrice = PRICES.findIndex(p => p.min === min && p.max === max);

  return (
    <div className="wrap cat-layout">
      <aside className="cat-side" aria-label="Filters">
        <form className="search-form" action="/search" role="search">
          <input name="q" defaultValue={q} placeholder="Search products…" aria-label="Search products" />
          <button type="submit" aria-label="Search"><SearchIcon /></button>
        </form>
        <div className="side-block">
          <h2>Filter By Categories</h2>
          <ul>
            {[...cats].map(([slug, c]) => (
              <li key={slug}><Link href={href({ product_cat: cat === slug ? undefined : slug })} aria-current={cat === slug ? 'true' : undefined} rel="nofollow"><span>{c.name}</span><span>({c.count})</span></Link></li>
            ))}
          </ul>
        </div>
        <div className="side-block">
          <h2>Price Filter</h2>
          <ul className="price-filter">
            {PRICES.map((p, i) => (
              <li key={p.label}>
                <Link href={href({ min_price: p.min, max_price: p.max })} className={(activePrice === -1 ? 0 : activePrice) === i ? 'is-active' : undefined} rel="nofollow">{p.label}</Link>
              </li>
            ))}
          </ul>
        </div>
      </aside>
      <div className="cat-main">
        {q && <h2 className="search-title">Search Result of &lsquo;{q}&rsquo;</h2>}
        {shown.length === 0
          ? <p className="notice">No products were found matching your selection.</p>
          : (
            <ListingView relevance sort={sort} showing={shown.length === 1 ? 'Showing the single result' : `Showing all ${shown.length} results`}>
              {shown.map((p, i) => <ProductCard key={p.id} product={p} priority={i < 3} />)}
            </ListingView>
          )}
      </div>
    </div>
  );
}
