import type { Metadata } from 'next';
import PageBand from '@/components/PageBand';
import CompareTable from '@/components/cart/CompareTable';
import { compareItems } from '@/lib/compare';
import { getProducts } from '@/lib/woo';

export const metadata: Metadata = { title: 'Compare products', robots: { index: false, follow: true } };

export default async function ComparePage() {
  const products = compareItems(await getProducts());
  return (
    <>
      <PageBand title="Compare products" crumbs={[{ label: 'Home', href: '/' }, { label: 'Compare' }]} />
      <CompareTable products={products} />
    </>
  );
}
