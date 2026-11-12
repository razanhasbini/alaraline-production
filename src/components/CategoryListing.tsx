import Link from 'next/link';
import { notFound } from 'next/navigation';
import Crumbs from './Crumbs';
import ListingView from './ListingView';
import ProductCard from './ProductCard';
import { getCategories, getProducts, type SortKey } from '@/lib/woo';

const PER_PAGE = 12;
const SORTS: SortKey[] = ['popularity', 'rating', 'date', 'price', 'price-desc'];
// The live "Price Filter" options (WooCommerce price filter list).
const PRICES = [
  { label: 'All' },
  { label: 'US$0.00 - US$10.00', min: 0, max: 10 },
  { label: 'US$10.00 - US$20.00', min: 10, max: 20 },
  { label: 'US$20.00 - US$30.00', min: 20, max: 30 },
  { label: 'US$30.00 +', min: 30 },
];

type Search = { orderby?: string; min_price?: string; max_price?: string };

// Same layout as the live category pages: pink title band with breadcrumb, Price Filter sidebar,
// "Showing 1–12 of N results", grid/list switch, "Sort by", 3 across, 12 per page, page numbers.
export default async function CategoryListing({ slug, page, search }: { slug: string; page: number; search: Search }) {
  const cat = (await getCategories()).find(c => c.slug === slug);
  if (!cat) notFound();
  const sort = (SORTS as string[]).includes(search.orderby ?? '') ? (search.orderby as SortKey) : 'popularity';
  const min = search.min_price !== undefined ? Number(search.min_price) : undefined;
  const max = search.max_price !== undefined ? Number(search.max_price) : undefined;

  const all = (await getProducts({ category: slug, sort }))
    .filter(p => (min === undefined || p.price >= min) && (max === undefined || p.price <= max));
  const pages = Math.max(1, Math.ceil(all.length / PER_PAGE));
  if (page > pages) notFound();
  const shown = all.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const from = all.length ? (page - 1) * PER_PAGE + 1 : 0, to = (page - 1) * PER_PAGE + shown.length;

  const query = (extra: Record<string, string | number | undefined>) => {
    const q = new URLSearchParams();
    const merged = { orderby: search.orderby, min_price: search.min_price, max_price: search.max_price, ...extra };
    for (const [k, v] of Object.entries(merged)) if (v !== undefined && v !== '') q.set(k, String(v));
    const s = q.toString();
    return s ? `?${s}` : '';
  };
  const pageHref = (n: number) => `/product-category/${slug}${n > 1 ? `/page/${n}` : ''}${query({})}`;
  const activePrice = PRICES.findIndex(p => p.min === min && p.max === max);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context': 'https://schema.org', '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://alaraline.co/' },
          { '@type': 'ListItem', position: 2, name: 'Shop', item: 'https://alaraline.co/shop' },
          { '@type': 'ListItem', position: 3, name: cat.name, item: `https://alaraline.co/product-category/${slug}` },
        ],
      }).replace(/</g, '\\u003c') }} />
      <header className="cat-head">
        <div className="wrap">
          <h1>{cat.name}</h1>
          <Crumbs bar={false} items={[{ label: 'Home', href: '/' }, { label: 'Products', href: '/shop' }, { label: cat.name }]} />
        </div>
      </header>
      <div className="wrap cat-layout">
        <aside className="cat-side" aria-label="Filters">
          <h2>Price Filter</h2>
          <ul className="price-filter">
            {PRICES.map((p, i) => (
              <li key={p.label}>
                <Link href={`/product-category/${slug}${query({ min_price: p.min, max_price: p.max, ...(p.min === undefined ? { min_price: undefined, max_price: undefined } : {}) })}`}
                  className={(activePrice === -1 ? 0 : activePrice) === i ? 'is-active' : undefined} rel="nofollow">
                  {p.label}
                </Link>
              </li>
            ))}
          </ul>
        </aside>
        <div className="cat-main">
          <ListingView showing={all.length ? `Showing ${from}–${to} of ${all.length} results` : 'No products were found matching your selection.'} sort={sort}>
            {shown.map((p, i) => <ProductCard key={p.id} product={p} priority={i < 3} />)}
          </ListingView>
          {pages > 1 && (
            <nav className="pager" aria-label="Pages">
              {Array.from({ length: pages }, (_, i) => i + 1).map(n => (
                n === page
                  ? <span key={n} className="is-current" aria-current="page">{n}</span>
                  : <Link key={n} href={pageHref(n)}>{n}</Link>
              ))}
              {page < pages && <Link href={pageHref(page + 1)} aria-label="Next page">»</Link>}
            </nav>
          )}
        </div>
      </div>
    </>
  );
}
