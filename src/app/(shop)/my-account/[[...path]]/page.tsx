import type { Metadata } from 'next';
import { Suspense } from 'react';
import Account from '@/components/account/Account';
import PageBand from '@/components/PageBand';

export const metadata: Metadata = { title: 'My account', robots: { index: false, follow: true }, alternates: { canonical: '/my-account' } };

// Same addresses as WooCommerce's My account: /my-account, /orders, /view-order/123, /edit-address(/billing|/shipping),
// /edit-account, /lost-password, /reset-password?key=&login=
export default function MyAccount(props: PageProps<'/my-account/[[...path]]'>) {
  return (
    <>
      <PageBand title="My account" crumbs={[{ label: 'Home', href: '/' }, { label: 'My account' }]} />
      <Suspense fallback={<div className="wrap acc" style={{ minHeight: '50vh' }} />}>
        <View {...props} />
      </Suspense>
    </>
  );
}

async function View({ params, searchParams }: PageProps<'/my-account/[[...path]]'>) {
  const { path = [] } = await params;
  const q = await searchParams;
  const one = (v: string | string[] | undefined) => (typeof v === 'string' ? v : '');
  const next = one(q.next);
  return <Account path={path.slice(0, 3)} resetKey={one(q.key)} resetLogin={one(q.login)} next={next.startsWith('/') && !next.startsWith('//') ? next : ''} />;
}
