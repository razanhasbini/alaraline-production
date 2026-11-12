import type { Product } from './woo';

/** Just what the wishlist and compare tables show (keeps the page small; the browser picks the saved ids). */
export type LeanProduct = Pick<Product, 'id' | 'slug' | 'name' | 'type' | 'price' | 'regularPrice' | 'maxPrice' | 'onSale' | 'currency' | 'inStock' | 'purchasable' | 'sku' | 'rating' | 'reviewCount'> & {
  image: string; summary: string; categories: string;
};

export const lean = (p: Product): LeanProduct => ({
  id: p.id, slug: p.slug, name: p.name, type: p.type, price: p.price, regularPrice: p.regularPrice, maxPrice: p.maxPrice, onSale: p.onSale,
  currency: p.currency, inStock: p.inStock, purchasable: p.purchasable, sku: p.sku, rating: p.rating, reviewCount: p.reviewCount,
  image: p.images[0]?.src ?? '',
  summary: p.shortDescription.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim().slice(0, 220),
  categories: p.categories.map(c => c.name).join(', '),
});
