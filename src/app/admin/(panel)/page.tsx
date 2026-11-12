import Link from 'next/link';
import { requireAdmin } from '@/lib/admin/session';
import { money, nowMs, STATUS_LABEL, when, type Order, type WcProduct } from '@/lib/admin/types';
import { wp } from '@/lib/admin/wp';

export const metadata = { title: 'Dashboard' };

const COUNTED = ['processing', 'completed', 'on-hold'];

export default async function Dashboard() {
  const s = await requireAdmin();
  const now = nowMs();
  const weekAgo = new Date(now - 7 * 86400_000).toISOString();
  const [orders, latest, outOfStock] = await Promise.all([
    wp<Order[]>(s, `/wc/v3/orders?after=${weekAgo}&dates_are_gmt=true&per_page=100&status=any`),
    wp<Order[]>(s, '/wc/v3/orders?per_page=8'),
    wp<WcProduct[]>(s, '/wc/v3/products?stock_status=outofstock&per_page=20&status=publish'),
  ]);
  const beirutDay = (d: Date) => d.toLocaleDateString('en-CA', { timeZone: 'Asia/Beirut' });
  const today = beirutDay(new Date(now));
  const counted = orders.filter(o => COUNTED.includes(o.status));
  const todays = counted.filter(o => beirutDay(new Date(o.date_created_gmt + 'Z')) === today);
  const sum = (l: Order[]) => l.reduce((t, o) => t + Number(o.total), 0);
  const toShip = orders.filter(o => o.status === 'processing').length;

  return (
    <>
      <header className="ad-head"><h1>Hello, {s.name.split(' ')[0]} 👋</h1><p>Here’s how the shop is doing.</p></header>
      <section className="ad-stats">
        <div><span>Orders today</span><b>{todays.length}</b><small>{money(sum(todays))}</small></div>
        <div><span>Last 7 days</span><b>{counted.length}</b><small>{money(sum(counted))}</small></div>
        <div><span>To prepare (processing)</span><b>{toShip}</b><small><Link href="/admin/orders?status=processing">See them →</Link></small></div>
        <div><span>Sold out products</span><b>{outOfStock.length}</b><small><Link href="/admin/products?stock=outofstock">See them →</Link></small></div>
      </section>
      <section className="ad-card">
        <div className="ad-card-head"><h2>Latest orders</h2><Link href="/admin/orders">All orders →</Link></div>
        <table className="ad-table">
          <thead><tr><th>Order</th><th>Customer</th><th>Date</th><th>Status</th><th className="num">Total</th></tr></thead>
          <tbody>
            {latest.map(o => (
              <tr key={o.id}>
                <td><Link href={`/admin/orders/${o.id}`}>#{o.number}</Link></td>
                <td>{o.billing.first_name} {o.billing.last_name}</td>
                <td>{when(o.date_created_gmt)}</td>
                <td><span className={`ad-status st-${o.status}`}>{STATUS_LABEL[o.status] ?? o.status}</span></td>
                <td className="num">{money(o.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      {outOfStock.length > 0 && (
        <section className="ad-card">
          <h2>Sold out</h2>
          <ul className="ad-chips">{outOfStock.map(p => <li key={p.id}><Link href={`/admin/products/${p.id}`}>{p.name}</Link></li>)}</ul>
        </section>
      )}
    </>
  );
}
