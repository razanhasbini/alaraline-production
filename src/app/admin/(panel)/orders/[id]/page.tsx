import Link from 'next/link';
import { notFound } from 'next/navigation';
import ActionForm, { Submit } from '@/components/admin/ActionForm';
import { requireAdmin } from '@/lib/admin/session';
import { money, STATUS_LABEL, when, type Order } from '@/lib/admin/types';
import { wp, WpError } from '@/lib/admin/wp';
import { addOrderNote, setOrderStatus } from '../../../actions';

export const metadata = { title: 'Order' };

export default async function OrderPage({ params }: PageProps<'/admin/orders/[id]'>) {
  const s = await requireAdmin();
  const { id } = await params;
  let o: Order;
  try { o = await wp<Order>(s, `/wc/v3/orders/${Number(id)}`); } catch (e) { if (e instanceof WpError && e.status === 404) notFound(); throw e; }
  const notes = await wp<{ id: number; note: string; date_created_gmt: string; customer_note: boolean; author: string }[]>(s, `/wc/v3/orders/${o.id}/notes`);
  const packaging = o.meta_data.find(m => m.key === 'Packaging')?.value as string | undefined;
  const phone = (o.billing.phone || '').replace(/[^\d+]/g, '');
  const wa = phone ? `https://wa.me/${phone.startsWith('+') ? phone.slice(1) : phone.startsWith('961') ? phone : `961${phone.replace(/^0/, '')}`}` : null;
  const addr = (a: Order['billing']) => [a.address_1, a.address_2, a.city, a.state, a.country].filter(Boolean).join(', ');

  return (
    <>
      <header className="ad-head">
        <p><Link href="/admin/orders">← Orders</Link></p>
        <h1>Order #{o.number} <span className={`ad-status st-${o.status}`}>{STATUS_LABEL[o.status] ?? o.status}</span></h1>
        <p>{when(o.date_created_gmt)} · {o.payment_method_title}</p>
      </header>
      <div className="ad-grid2">
        <section className="ad-card">
          <h2>Items</h2>
          <ul className="ad-items">
            {o.line_items.map(l => (
              <li key={l.id}>
                {/* eslint-disable-next-line @next/next/no-img-element -- product thumbnail from WordPress */}
                {l.image?.src && <img src={l.image.src} alt="" />}
                <div>
                  <b>{l.name}</b> × {l.quantity}
                  {l.meta_data.filter(m => !m.key.startsWith('_')).map(m => <small key={m.key}>{m.display_key ?? m.key}: {String(m.display_value ?? m.value).replace(/<[^>]+>/g, '')}</small>)}
                </div>
                <span>{money(l.total)}</span>
              </li>
            ))}
          </ul>
          <dl className="ad-totals">
            {o.fee_lines.map(f => <div key={f.name}><dt>{f.name}</dt><dd>{money(f.total)}</dd></div>)}
            {o.coupon_lines.map(c => <div key={c.code}><dt>Promo code {c.code.toUpperCase()}</dt><dd>−{money(c.discount)}</dd></div>)}
            {o.shipping_lines.map(sl => <div key={sl.method_title}><dt>{sl.method_title}</dt><dd>{money(sl.total)}</dd></div>)}
            <div className="ad-total"><dt>Total</dt><dd>{money(o.total)}</dd></div>
          </dl>
          {packaging && <p className="ad-pack">🎁 Packaging: <b>{packaging}</b></p>}
          {o.customer_note && <p className="ad-note-c">Customer note: “{o.customer_note}”</p>}
        </section>
        <div className="ad-stack">
          <section className="ad-card">
            <h2>Customer</h2>
            <p><b>{o.billing.first_name} {o.billing.last_name}</b></p>
            {o.billing.phone && <p><a href={`tel:${phone}`}>{o.billing.phone}</a>{wa && <> · <a href={wa} target="_blank" rel="noopener noreferrer">WhatsApp ↗</a></>}</p>}
            {o.billing.email && <p><a href={`mailto:${o.billing.email}`}>{o.billing.email}</a></p>}
            <p className="ad-muted">{addr(o.shipping.address_1 ? o.shipping : o.billing)}</p>
          </section>
          <section className="ad-card">
            <h2>Status</h2>
            <ActionForm action={setOrderStatus} className="ad-form ad-inline">
              <input type="hidden" name="id" value={o.id} />
              <select name="status" defaultValue={o.status}>{Object.entries(STATUS_LABEL).filter(([k]) => k !== 'draft').map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
              <Submit>Update</Submit>
            </ActionForm>
          </section>
          <section className="ad-card">
            <h2>Notes</h2>
            <ActionForm action={addOrderNote} className="ad-form">
              <input type="hidden" name="id" value={o.id} />
              <textarea name="note" rows={2} placeholder="Add a note…" />
              <label className="ad-check"><input type="checkbox" name="customer" /> Send to the customer by email</label>
              <Submit>Add note</Submit>
            </ActionForm>
            <ul className="ad-notes">{notes.map(n => <li key={n.id} className={n.customer_note ? 'is-customer' : undefined}><p dangerouslySetInnerHTML={{ __html: n.note }} /><small>{when(n.date_created_gmt)} · {n.author}{n.customer_note ? ' · sent to customer' : ''}</small></li>)}</ul>
          </section>
        </div>
      </div>
    </>
  );
}
