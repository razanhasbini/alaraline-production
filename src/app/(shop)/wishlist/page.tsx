import type { Metadata } from 'next';
import PageBand from '@/components/PageBand';
import SavedList from '@/components/cart/SavedList';
import { lean } from '@/lib/lean';
import { getProducts } from '@/lib/woo';

export const metadata: Metadata = { title: 'Wishlist', robots: { index: false, follow: true } };

export default async function WishlistPage() {
  const products = (await getProducts()).map(lean);
  return (
    <>
      <PageBand title="Wishlist" crumbs={[{ label: 'Home', href: '/' }, { label: 'Wishlist' }]} />
      <SavedList kind="wishlist" products={products} />
    </>
  );
}
