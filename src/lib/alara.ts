import 'server-only';
import { cacheLife, cacheTag } from 'next/cache';
import { recall, remember } from './fallback';
import { CATALOG_CACHE } from './woo';
import { inCooldown, logWp, wpGetJson } from './wp-fetch';

// Data from the "ÀLara Headless API" WordPress plugin (wp-plugins/alara-headless-api).
// If the plugin isn't installed yet, these return null and the sections simply don't render.
// For local previews, ALARA_SNAPSHOTS=1 uses a saved copy of the live data instead.

const WC = process.env.WC_URL ?? 'https://alaraline.co';

export type BundleChoice = { key: string; label: string; options: string[] };
export type BundleImage = { src: string; width: number | null; height: number | null; alt: string };
export type Bundle = {
  slot: number;
  id: number;
  name: string;
  slug: string;
  type: string;
  image: BundleImage | null;
  image2?: BundleImage | null; // optional second photo (bundles plugin 1.3.11+)
  details: string;
  price: string;
  max_price: string | null;
  regular_price: string;
  on_sale: boolean;
  in_stock: boolean;
  purchasable: boolean;
  choices: BundleChoice[];
};
export type Bundles = { enabled: boolean; currency: string; currency_symbol: string; items: Bundle[] };
export type Packaging = {
  enabled: boolean; pr_box_price: number; currency: string;
  bag?: { name: string; image: BundleImage | null };
  pr_box?: { name: string; image: BundleImage | null; image_open: BundleImage | null };
};

/** A read from the ÀLara Headless API (wp-fetch.ts: shared, gentle, backoff); right after a 429, or if WordPress
 *  can't answer, the last good answer is used (fallback.ts). */
async function alara<T>(path: string): Promise<T | null> {
  const key = `alara:${path}`;
  if (inCooldown()) { const saved = await recall<T>(key); if (saved !== undefined) return saved; }
  const r = await wpGetJson<T>(`${WC}/wp-json/alara/v1/${path}`, `alara ${path}`, { retries: 2 });
  if (r.ok) { await remember(key, r.data); return r.data; }
  const saved = await recall<T>(key);
  if (saved !== undefined) logWp('warn', `alara ${path}`, r.status, null, { served: 'saved copy' });
  return saved ?? null;
}

export async function getBundles(): Promise<Bundles | null> {
  'use cache';
  cacheLife(CATALOG_CACHE);
  cacheTag('bundles', 'products');
  const live = await alara<Bundles>('bundles');
  if (live) return live;
  if (process.env.ALARA_SNAPSHOTS === '1') return (await import('@/data/bundles.snapshot.json')).default as Bundles;
  return null;
}

export type ResultPhoto = { src: string; width: number | null; height: number | null; alt: string };
export type ClientResult = { id: number; before: ResultPhoto; after: ResultPhoto; hair: string; time: string; handle: string; featured: boolean };

/** The Results Wall, managed in wp-admin → Client Results. */
export async function getResults(): Promise<ClientResult[] | null> {
  'use cache';
  cacheLife(CATALOG_CACHE);
  cacheTag('results');
  const live = await alara<{ items: ClientResult[] }>('results');
  if (live) return live.items;
  if (process.env.ALARA_SNAPSHOTS === '1') return ((await import('@/data/results.snapshot.json')).default as { items: ClientResult[] }).items;
  return null;
}

export async function getPackaging(): Promise<Packaging | null> {
  'use cache';
  cacheLife(CATALOG_CACHE);
  cacheTag('packaging');
  const live = await alara<Packaging>('packaging');
  if (live) return live;
  if (process.env.ALARA_SNAPSHOTS === '1') return { enabled: true, pr_box_price: 25, currency: 'USD', bag: { name: 'ÀLara Brand Bag', image: { src: 'https://alaraline.co/wp-content/uploads/2026/11/IMG_1112.png', width: null, height: null, alt: '' } }, pr_box: { name: 'ÀLara PR Box', image: null, image_open: null } };
  return null;
}
