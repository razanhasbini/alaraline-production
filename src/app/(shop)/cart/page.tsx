import type { Metadata } from 'next';
import CartPage from '@/components/cart/CartPage';
import PageBand from '@/components/PageBand';

export const metadata: Metadata = { title: 'Cart', robots: { index: false, follow: true }, alternates: { canonical: '/cart' } };

export default function Cart() {
  return (
    <>
      <PageBand title="Cart" crumbs={[{ label: 'Home', href: '/' }, { label: 'Cart' }]} />
      <CartPage />
    </>
  );
}
