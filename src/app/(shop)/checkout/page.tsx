import type { Metadata } from 'next';
import CheckoutHandoff from '@/components/cart/CheckoutHandoff';
import PageBand from '@/components/PageBand';

export const metadata: Metadata = { title: 'Checkout', robots: { index: false, follow: false }, alternates: { canonical: '/checkout' } };

// The checkout itself is WooCommerce's, on shop.alaraline.co (see src/lib/bag.ts).
export default function Checkout() {
  return (
    <>
      <PageBand title="Checkout" crumbs={[{ label: 'Home', href: '/' }, { label: 'Checkout' }]} />
      <CheckoutHandoff />
    </>
  );
}
