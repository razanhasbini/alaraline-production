import Link from 'next/link';
import { addressLines, usd, type OrderFull } from '@/lib/orders';

/** WooCommerce's "Order details" table + billing/shipping addresses (order received page and My account). */
export default function OrderDetails({ order: o }: { order: OrderFull }) {
  const bill = addressLines(o.billing);
  const ship = addressLines(o.shipping_address);
  return (
    <>
      <section className="order-details">
        <h2>Order details</h2>
        <table>
          <thead><tr><th>Product</th><th>Total</th></tr></thead>
          <tbody>
            {o.items.map((i, n) => (
              <tr key={n}>
                <td>
                  {i.slug ? <Link href={`/product/${i.slug}`}>{i.name}</Link> : i.name} <b>× {i.quantity}</b>
                  {i.meta.length > 0 && <ul>{i.meta.map(m => <li key={m.key}><b>{m.key}:</b> {m.value}</li>)}</ul>}
                </td>
                <td>{usd(i.total)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr><th>Subtotal:</th><td>{usd(o.subtotal)}</td></tr>
            {Number(o.discount) > 0 && <tr><th>Discount:</th><td>−{usd(o.discount)}</td></tr>}
            {o.fees.map(f => <tr key={f.name}><th>{f.name}:</th><td>{usd(f.total)}</td></tr>)}
            {o.shipping.method && <tr><th>Shipping:</th><td>{usd(o.shipping.total)} <small>via {o.shipping.method}</small></td></tr>}
            {o.packaging && <tr><th>Packaging:</th><td>{o.packaging}</td></tr>}
            <tr><th>Payment method:</th><td>{o.payment}</td></tr>
            <tr className="order-grand"><th>Total:</th><td>{usd(o.total)}</td></tr>
            {o.note && <tr><th>Note:</th><td>{o.note}</td></tr>}
          </tfoot>
        </table>
      </section>
      <section className="order-addresses">
        <div>
          <h2>Billing address</h2>
          <address>
            {bill.map(l => <span key={l}>{l}</span>)}
            {o.billing.phone && <span className="order-phone">{o.billing.phone}</span>}
            {o.billing.email && <span className="order-email">{o.billing.email}</span>}
          </address>
        </div>
        {ship.length > 0 && ship.join() !== bill.join() && (
          <div>
            <h2>Shipping address</h2>
            <address>{ship.map(l => <span key={l}>{l}</span>)}</address>
          </div>
        )}
      </section>
    </>
  );
}
