import type { Metadata } from 'next';
import { Suspense } from 'react';
import CategoryListing from '@/components/CategoryListing';
import { getCategories } from '@/lib/woo';

// Same URLs as WordPress (/product-category/<slug>, page 2 at /product-category/<slug>/page/2).
export async function generateStaticParams() {
  const cats = await getCategories();
  return cats.map(c => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: PageProps<'/product-category/[slug]'>): Promise<Metadata> {
  const { slug } = await params;
  const cat = (await getCategories()).find(c => c.slug === slug);
  return cat ? { title: cat.name, description: `Shop ÀLara Line ${cat.name}.`, alternates: { canonical: `/product-category/${slug}` } } : {};
}

export default function CategoryPage({ params, searchParams }: PageProps<'/product-category/[slug]'>) {
  return (
    <Suspense fallback={<div className="cat-head" style={{ minHeight: 320 }} />}>
      {Promise.all([params, searchParams]).then(([{ slug }, search]) => (
        <CategoryListing slug={slug} page={1} search={search as Record<string, string>} />
      ))}
    </Suspense>
  );
}
