import type { MetadataRoute } from 'next';
import { getCategories, getProducts } from '@/lib/woo';

const SITE = 'https://alaraline.co';

// Every page Google should know about: home, shop, the six content pages, each category and each product.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, categories] = await Promise.all([getProducts(), getCategories()]);
  const pages: MetadataRoute.Sitemap = [
    { url: `${SITE}/`, changeFrequency: 'daily', priority: 1 },
    { url: `${SITE}/shop`, changeFrequency: 'daily', priority: 0.9 },
    ...['about', 'ingredients', 'faqs', 'contact', 'shipping-policy', 'membership'].map(p => ({ url: `${SITE}/${p}`, changeFrequency: 'monthly' as const, priority: 0.5 })),
  ];
  return [
    ...pages,
    ...categories.map(c => ({ url: `${SITE}/product-category/${c.slug}`, changeFrequency: 'weekly' as const, priority: 0.8 })),
    ...products.map(p => ({ url: `${SITE}/product/${p.slug}`, changeFrequency: 'weekly' as const, priority: 0.8, images: p.images.slice(0, 3).map(i => i.src) })),
  ];
}
