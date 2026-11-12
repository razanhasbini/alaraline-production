import type { Metadata } from 'next';
import CheckoutForm from '@/components/cart/CheckoutForm';
import PageBand from '@/components/PageBand';
import { getPackaging } from '@/lib/alara';
import { checkoutBlockedReason } from '@/lib/cart';

export const metadata: Metadata = { title: 'Checkout', robots: { index: false, follow: false }, alternates: { canonical: '/checkout' } };

export default async function Checkout() {
  const packaging = await getPackaging();
  return (
    <>
      <PageBand title="Checkout" crumbs={[{ label: 'Home', href: '/' }, { label: 'Checkout' }]} />
      <CheckoutForm packaging={packaging} blocked={checkoutBlockedReason()} />
    </>
  );
}
