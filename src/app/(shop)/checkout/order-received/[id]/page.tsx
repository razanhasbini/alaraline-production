import type { Metadata } from 'next';
import Link from 'next/link';
import { connection } from 'next/server';
import { Suspense } from 'react';
import OrderDetails from '@/components/OrderDetails';
import PageBand from '@/components/PageBand';
import { accountApi } from '@/lib/cart';
import { orderDate, usd, type OrderFull } from '@/lib/orders';

export const metadata: Metadata = { title: 'Order received', robots: { index: false, follow: false } };

export default function OrderReceived(props: PageProps<'/checkout/order-received/[id]'>) {
  return (
    <>
      <PageBand title="Checkout" crumbs={[{ label: 'Home', href: '/' }, { label: 'Checkout' }]} />
      <Suspense fallback={<div className="wrap thanks" style={{ minHeight: '50vh' }} />}>
        <Received {...props} />
      </Suspense>
    </>
  );
}

// Like WooCommerce's thank-you page: shown only with the order's secret key from the checkout.
async function Received({ params, searchParams }: PageProps<'/checkout/order-received/[id]'>) {
  await connection(); // always rendered for the person who placed the order, never stored
  const { id } = await params;
  const key = (await searchParams).key;
  const order = typeof key === 'string' && /^\d+$/.test(id)
    ? await accountApi<OrderFull>(`/order-received/${id}?key=${encodeURIComponent(key)}`, { withCustomer: false }).catch(() => null)
    : null;

  if (!order) {
    return (
      <div className="wrap thanks">
        <p className="notice is-err">Sorry, this order could not be found.</p>
        <Link className="btn btn-black" href="/shop">Return to shop</Link>
      </div>
    );
  }
  const failed = order.status === 'failed';
  return (
    <div className="wrap thanks">
      {failed
        ? <p className="notice is-err">Unfortunately your order cannot be processed as the originating bank/merchant has declined your transaction. Please attempt your purchase again.</p>
        : <p className="thanks-msg">Thank you. Your order has been received.</p>}
      <ul className="thanks-overview">
        <li>Order number: <b>{order.number}</b></li>
        <li>Date: <b>{orderDate(order.date)}</b></li>
        {order.billing.email && <li>Email: <b>{order.billing.email}</b></li>}
        <li>Total: <b>{usd(order.total)}</b></li>
        <li>Payment method: <b>{order.payment}</b></li>
      </ul>
      {order.payment.toLowerCase().includes('cash') && <p>Pay with cash upon delivery.</p>}
      <OrderDetails order={order} />
    </div>
  );
}
