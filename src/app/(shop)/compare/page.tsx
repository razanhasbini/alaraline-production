import type { Metadata } from 'next';
import PageBand from '@/components/PageBand';
import SavedList from '@/components/cart/SavedList';
import { lean } from '@/lib/lean';
import { getProducts } from '@/lib/woo';

export const metadata: Metadata = { title: 'Compare', robots: { index: false, follow: true } };

export default async function ComparePage() {
  const products = (await getProducts()).map(lean);
  return (
    <>
      <PageBand title="Compare" crumbs={[{ label: 'Home', href: '/' }, { label: 'Compare' }]} />
      <SavedList kind="compare" products={products} />
    </>
  );
}
