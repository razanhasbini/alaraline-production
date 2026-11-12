import type { Metadata } from 'next';
import Crumbs from '@/components/Crumbs';
import content from '@/data/pages.json';

export const metadata: Metadata = {
  title: 'Shipping Policy',
  description: 'ÀLara Line shipping policy: order processing time, shipping fees, delivery timeframes and tracking.',
  alternates: { canonical: '/shipping-policy' },
};

// Live /shipping-policy/: the same text, word for word.
export default function ShippingPolicyPage() {
  return (
    <>
      <Crumbs items={[{ label: 'Home', href: '/' }, { label: 'Shipping Policy' }]} />
      <h1 className="sr-only">Shipping Policy</h1>
      <section className="wrap policy" dangerouslySetInnerHTML={{ __html: content.shippingPolicy.html }} />
    </>
  );
}
