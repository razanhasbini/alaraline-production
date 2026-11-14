import 'server-only';
import { cacheLife, cacheTag } from 'next/cache';
import { recall, remember } from './fallback';
import { inCooldown, logWp, wpGetJson } from './wp-fetch';

/** Catalog data is refreshed every 6 hours (not hourly) to stay well inside the Workers Free KV write allowance
 *  (~1,000/day). Edits made in this site's /admin refresh at once (updateTag); cart and checkout always use live
 *  WooCommerce prices and stock. */
export const CATALOG_CACHE = { stale: 300, revalidate: 6 * 3600, expire: 3 * 86400 };

// The only module that talks to WordPress. WooCommerce stays the source of truth for products and prices;
// nothing here is hardcoded. Results are cached for an hour (and can be refreshed on demand by tag later).

const WC = process.env.WC_URL ?? 'https://alaraline.co';
const STORE = `${WC}/wp-json/wc/store/v1`;

export type Img = { src: string; alt: string };
export type Variation = { id: number; attributes: { name: string; value: string | null }[] };
export type Attribute = { name: string; options: string[]; forVariations: boolean };
export type Product = {
  id: number;
  slug: string;
  name: string;
  type: 'simple' | 'variable' | string;
  price: number;          // current price, in dollars
  regularPrice: number;
  maxPrice?: number;      // variable products with a price range
  onSale: boolean;
  currency: string;       // "US$"
  inStock: boolean;
  purchasable: boolean;
  hasOptions: boolean;
  images: Img[];
  categories: { slug: string; name: string }[];
  tags: string[];         // tag slugs, e.g. "just-restocked", "limited"
  shortDescription: string; // HTML written in wp-admin
  description: string;      // HTML written in wp-admin
  attributes: Attribute[];
  variations: Variation[];
  isNew: boolean;         // the theme's "New" badge: published within NEW_DAYS
  sku: string;
  rating: number;         // average rating 0–5
  reviewCount: number;
};

export type SortKey = 'popularity' | 'rating' | 'date' | 'price' | 'price-desc' | 'date-asc';

/** Makeaholic shows "New" on recently added products (live: 4-day-old products have it, 26-day-old ones don't). */
const NEW_DAYS = 7;
export type Category = { id: number; slug: string; name: string; count: number; image?: Img };
export type Tab = { title: string; content: string };

/* ---------------------------------------------------------------------------------------------- */

type StoreProduct = {
  id: number; slug: string; name: string; type: string; on_sale: boolean; sku: string; average_rating: string; review_count: number;
  is_in_stock: boolean; is_purchasable: boolean; has_options: boolean;
  short_description: string; description: string;
  prices: {
    price: string; regular_price: string; currency_minor_unit: number; currency_prefix: string;
    price_range: { min_amount: string; max_amount: string } | null;
  };
  images: { src: string; alt: string; name: string }[];
  categories: { slug: string; name: string }[];
  tags: { slug: string }[];
  attributes: { name: string; has_variations: boolean; terms: { name: string }[] }[];
  variations: { id: number; attributes: { name: string; value: string | null }[] }[];
};

/**
 * A read-only catalog request with the saved-copy fallback (fallback.ts), made through wp-fetch.ts (shared
 * in-flight requests, max 4 at once, bounded backoff honouring Retry-After). Right after a 429 the saved copy is
 * used without asking WordPress again. Only if there is no saved copy at all does the page fail (friendly notice).
 */
async function catalogRead<T>(key: string, url: string, what: string, headers?: Record<string, string>): Promise<T | undefined> {
  if (inCooldown()) {
    const saved = await recall<T>(key);
    if (saved !== undefined) return saved;
  }
  const r = await wpGetJson<T>(url, what, { headers, retries: 2 });
  if (r.ok) { await remember(key, r.data); return r.data; }
  const saved = await recall<T>(key);
  if (saved !== undefined) logWp('warn', what, r.status, null, { served: 'saved copy' });
  return saved;
}

/** A WooCommerce Store API read (public). */
async function store<T>(path: string): Promise<T> {
  const data = await catalogRead<T>(`store:${path}`, `${STORE}${path}`, `store ${path}`);
  if (data === undefined) throw new Error(`WooCommerce ${path} unavailable`);
  return data;
}

/** A read with the read-only REST key (product meta, publish dates). The key travels in a header, never logged. */
async function restRead<T>(path: string): Promise<T | null> {
  const key = process.env.WC_CONSUMER_KEY, secret = process.env.WC_CONSUMER_SECRET;
  if (!key || !secret) return null;
  const auth = { Authorization: `Basic ${Buffer.from(`${key}:${secret}`).toString('base64')}` };
  return (await catalogRead<T>(`rest:${path}`, `${WC}/wp-json/wc/v3${path}`, `rest ${path}`, auth)) ?? null;
}

function toProduct(p: StoreProduct): Product {
  const unit = 10 ** p.prices.currency_minor_unit;
  const money = (s: string) => Number(s) / unit;
  const range = p.prices.price_range;
  return {
    id: p.id,
    slug: p.slug,
    name: decode(p.name),
    type: p.type,
    price: money(range ? range.min_amount : p.prices.price),
    regularPrice: money(p.prices.regular_price),
    maxPrice: range && range.max_amount !== range.min_amount ? money(range.max_amount) : undefined,
    onSale: p.on_sale,
    currency: decode(p.prices.currency_prefix || 'US$'),
    inStock: p.is_in_stock,
    purchasable: p.is_purchasable,
    hasOptions: p.has_options,
    images: p.images.map(i => ({ src: i.src, alt: decode(i.alt || i.name || p.name) })),
    categories: p.categories.map(c => ({ slug: c.slug, name: decode(c.name) })),
    tags: p.tags.map(t => t.slug),
    shortDescription: p.short_description,
    description: p.description,
    attributes: p.attributes.map(a => ({ name: a.name, options: a.terms.map(t => decode(t.name)), forVariations: a.has_variations })),
    variations: p.variations,
    isNew: false,
    sku: p.sku || '',
    rating: Number(p.average_rating) || 0,
    reviewCount: p.review_count || 0,
  };
}

/** Publish dates (the public Store API doesn't include them); used for the "New" badge. */
async function getPublishDates(): Promise<Record<number, string>> {
  'use cache';
  cacheLife(CATALOG_CACHE);
  cacheTag('products');
  const list = await restRead<{ id: number; date_created_gmt: string }[]>('/products?per_page=100&_fields=id,date_created_gmt');
  return Object.fromEntries((list ?? []).map(p => [p.id, p.date_created_gmt]));
}

async function withBadges(products: Product[]): Promise<Product[]> {
  const dates = await getPublishDates();
  const cutoff = Date.now() - NEW_DAYS * 86_400_000;
  return products.map(p => ({ ...p, isNew: !!dates[p.id] && Date.parse(dates[p.id] + 'Z') > cutoff }));
}

/* ---------------------------------------------------------------------------------------------- */

const SORTS: Record<SortKey, [string, string]> = {
  popularity: ['popularity', 'desc'], rating: ['rating', 'desc'], date: ['date', 'desc'],
  price: ['price', 'asc'], 'price-desc': ['price', 'desc'], 'date-asc': ['date', 'asc'],
};

/** Newest first by default, like the theme's product grids and tabs on the live homepage. */
export async function getProducts(opts: { category?: string; perPage?: number; sort?: SortKey } = {}): Promise<Product[]> {
  'use cache';
  cacheLife(CATALOG_CACHE);
  cacheTag('products');
  const [orderby, order] = SORTS[opts.sort ?? 'date'];
  const q = new URLSearchParams({ per_page: String(opts.perPage ?? 100), orderby, order });
  if (opts.category) q.set('category', opts.category);
  const list = await store<StoreProduct[]>(`/products?${q}`);
  return withBadges(list.map(toProduct));
}

export async function getProduct(slug: string): Promise<Product | null> {
  'use cache';
  cacheLife(CATALOG_CACHE);
  cacheTag('products', `product:${slug}`);
  const list = await store<StoreProduct[]>(`/products?slug=${encodeURIComponent(slug)}`);
  // a variation can share its parent's slug (live: The All-In Set); always take the product itself
  const hit = list.find(x => x.type !== 'variation') ?? null;
  return hit ? (await withBadges([toProduct(hit)]))[0] : null;
}

export async function getCategories(): Promise<Category[]> {
  'use cache';
  cacheLife(CATALOG_CACHE);
  cacheTag('categories');
  const list = await store<{ id: number; slug: string; name: string; count: number; image: { src: string; alt: string } | null }[]>(
    '/products/categories?per_page=100',
  );
  return list
    .filter(c => c.count > 0 && c.slug !== 'uncategorized')
    .map(c => ({ id: c.id, slug: c.slug, name: decode(c.name), count: c.count, image: c.image ? { src: c.image.src, alt: c.image.alt || c.name } : undefined }));
}

/**
 * Ingredients / How to Use, written in wp-admin with the "WB Custom Product Tabs" plugin (meta `wb_custom_tabs`).
 * The public Store API doesn't return product meta, so this uses the read-only REST key, server-side only.
 */
export async function getProductTabs(id: number): Promise<Tab[]> {
  'use cache';
  cacheLife(CATALOG_CACHE);
  cacheTag('products', `tabs:${id}`);
  const data = await restRead<{ meta_data: { key: string; value: unknown }[] }>(`/products/${id}?_fields=meta_data`);
  const raw = data?.meta_data?.find(m => m.key === 'wb_custom_tabs')?.value;
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((t): t is { title: string; content: string; position?: string } => typeof t?.title === 'string' && typeof t?.content === 'string')
    .sort((a, b) => Number(a.position ?? 0) - Number(b.position ?? 0))
    // The same tab is titled "How To Use" on some products and "How to Use" on others.
    .map(t => ({ title: t.title.trim().replace(/^how to use$/i, 'How to Use'), content: t.content }));
}

/* ---------------------------------------------------------------------------------------------- */

const ENTITIES: Record<string, string> = { amp: '&', quot: '"', '#039': "'", apos: "'", lt: '<', gt: '>', nbsp: ' ', '#8211': '–', '#8217': '’', '#036': '$', '#36': '$' };
/** WooCommerce returns names HTML-encoded ("ÀLara&#8217;s Pouch"). */
export function decode(s: string): string {
  return s.replace(/&(#?\w+);/g, (m, e: string) => ENTITIES[e] ?? (e.startsWith('#') ? String.fromCodePoint(Number(e.slice(1))) : m));
}


export type Review = { id: number; reviewer: string; rating: number; review: string; date: string };

/** Published product reviews (public Store API). */
export async function getReviews(productId: number): Promise<Review[]> {
  'use cache';
  cacheLife(CATALOG_CACHE);
  cacheTag('reviews', `reviews:${productId}`);
  try {
    const list = await store<{ id: number; reviewer: string; rating: number; review: string; date_created: string }[]>(`/products/reviews?product_id=${productId}&per_page=20`);
    return list.map(r => ({ id: r.id, reviewer: decode(r.reviewer), rating: r.rating, review: r.review, date: r.date_created }));
  } catch {
    return [];
  }
}
