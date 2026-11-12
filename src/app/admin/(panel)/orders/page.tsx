import Link from 'next/link';
import { requireAdmin } from '@/lib/admin/session';
import { money, STATUS_LABEL, when, type Order } from '@/lib/admin/types';
import { wpList } from '@/lib/admin/wp';

export const metadata = { title: 'Orders' };
const FILTERS = ['any', 'processing', 'on-hold', 'pending', 'completed', 'cancelled'];

export default async function OrdersPage({ searchParams }: PageProps<'/admin/orders'>) {
  const s = await requireAdmin();
  const sp = await searchParams;
  const status = FILTERS.includes(String(sp.status)) ? String(sp.status) : 'any';
  const page = Math.max(1, Number(sp.page) || 1);
  const q = String(sp.q ?? '').trim();
  const { items, total, pages } = await wpList<Order>(s, `/wc/v3/orders?per_page=25&page=${page}&status=${status}${q ? `&search=${encodeURIComponent(q)}` : ''}`);
  const link = (extra: Record<string, string | number>) => {
    const p = new URLSearchParams({ ...(status !== 'any' ? { status } : {}), ...(q ? { q } : {}), ...Object.fromEntries(Object.entries(extra).map(([k, v]) => [k, String(v)])) });
    return `/admin/orders${p.size ? `?${p}` : ''}`;
  };
  return (
    <>
      <header className="ad-head"><h1>Orders</h1><p>{total} {total === 1 ? 'order' : 'orders'}</p></header>
      <div className="ad-toolbar">
        <nav className="ad-tabs">{FILTERS.map(f => <Link key={f} href={`/admin/orders${f === 'any' ? '' : `?status=${f}`}`} aria-current={f === status ? 'page' : undefined}>{f === 'any' ? 'All' : STATUS_LABEL[f]}</Link>)}</nav>
        <form className="ad-search"><input name="q" defaultValue={q} placeholder="Search name, phone, order #" />{status !== 'any' && <input type="hidden" name="status" value={status} />}<button className="ad-btn ad-ghost">Search</button></form>
      </div>
      <section className="ad-card">
        <table className="ad-table">
          <thead><tr><th>Order</th><th>Customer</th><th>Phone</th><th>Date</th><th>Items</th><th>Status</th><th className="num">Total</th></tr></thead>
          <tbody>
            {items.map(o => (
              <tr key={o.id}>
                <td><Link href={`/admin/orders/${o.id}`}>#{o.number}</Link></td>
                <td>{o.billing.first_name} {o.billing.last_name}</td>
                <td>{o.billing.phone}</td>
                <td>{when(o.date_created_gmt)}</td>
                <td>{o.line_items.reduce((n, l) => n + l.quantity, 0)}</td>
                <td><span className={`ad-status st-${o.status}`}>{STATUS_LABEL[o.status] ?? o.status}</span></td>
                <td className="num">{money(o.total)}</td>
              </tr>
            ))}
            {items.length === 0 && <tr><td colSpan={7} className="ad-empty">No orders here.</td></tr>}
          </tbody>
        </table>
      </section>
      {pages > 1 && <nav className="ad-pager">{page > 1 && <Link href={link({ page: page - 1 })}>← Newer</Link>}<span>Page {page} of {pages}</span>{page < pages && <Link href={link({ page: page + 1 })}>Older →</Link>}</nav>}
    </>
  );
}
