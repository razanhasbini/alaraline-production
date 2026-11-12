import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import CategoryListing from '@/components/CategoryListing';

export async function generateMetadata({ params }: PageProps<'/product-category/[slug]/page/[n]'>): Promise<Metadata> {
  const { slug, n } = await params;
  return { alternates: { canonical: `/product-category/${slug}/page/${n}` }, robots: { index: true, follow: true } };
}

export default function CategoryPaged({ params, searchParams }: PageProps<'/product-category/[slug]/page/[n]'>) {
  return (
    <Suspense fallback={<div className="cat-head" style={{ minHeight: 320 }} />}>
      {Promise.all([params, searchParams]).then(([{ slug, n }, search]) => {
        const page = Number(n);
        if (!Number.isInteger(page) || page < 2) notFound();
        return <CategoryListing slug={slug} page={page} search={search as Record<string, string>} />;
      })}
    </Suspense>
  );
}
