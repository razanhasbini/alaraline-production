import ActionForm, { ConfirmSubmit, Submit } from '@/components/admin/ActionForm';
import { requireAdmin } from '@/lib/admin/session';
import { nowMs, type Coupon } from '@/lib/admin/types';
import { wp } from '@/lib/admin/wp';
import { createPromoCode, trashPromoCode, updatePromoCode } from '../../actions';

export const metadata = { title: 'Promo codes' };

const influencerOf = (c: Coupon) =>
  String(c.meta_data.find(m => m.key === '_alara_influencer_name')?.value ?? c.description.match(/Influencer:\s*([^|]+)/)?.[1] ?? '').trim();

export default async function PromoCodes({ searchParams }: PageProps<'/admin/promo-codes'>) {
  const s = await requireAdmin();
  const sp = await searchParams;
  const coupons = await wp<Coupon[]>(s, '/wc/v3/coupons?per_page=100&status=any&orderby=date&order=desc');
  const now = nowMs();
  return (
    <>
      <header className="ad-head">
        <h1>Promo codes</h1>
        <p>The shop’s promo codes{sp.trashed ? ' · moved to the trash (it can still be restored)' : ''}.</p>
      </header>
      <section className="ad-card">
        <h2>New influencer code</h2>
        <ActionForm action={createPromoCode} className="ad-form">
          <div className="ad-row">
            <label>Influencer name<input name="influencer" placeholder="Sara" required /></label>
            <label>Code <small>(leave empty for NAME + %)</small><input name="code" placeholder="SARA10" /></label>
            <label>Discount %<input name="percent" type="number" min={1} max={100} defaultValue={10} required /></label>
          </div>
          <div className="ad-row">
            <label>Expires on <small>(optional)</small><input name="expires" type="date" /></label>
            <label>Total uses allowed <small>(optional)</small><input name="usage_limit" type="number" min={1} /></label>
            <label>Uses per customer <small>(optional)</small><input name="per_user" type="number" min={1} /></label>
            <label>Minimum order US$ <small>(optional)</small><input name="minimum" type="number" min={0} step="0.01" /></label>
          </div>
          <div className="ad-checks">
            <label className="ad-check"><input type="checkbox" name="exclude_offers" defaultChecked /> Not valid on Limited Offers</label>
            <label className="ad-check"><input type="checkbox" name="exclude_sale" defaultChecked /> Not valid on sale items</label>
            <label className="ad-check"><input type="checkbox" name="individual" defaultChecked /> Can’t be combined with other codes</label>
          </div>
          <p className="ad-hint">These defaults are the same rules as your “ÀLara Influencer Coupons” plugin.</p>
          <Submit>Create code</Submit>
        </ActionForm>
      </section>
      <section className="ad-card">
        <h2>All codes</h2>
        <div className="ad-codes">
          {coupons.map(c => {
            const exp = c.date_expires_gmt ? new Date(c.date_expires_gmt + 'Z') : null; // for the 'expired' check (UTC)
            const expDay = c.date_expires?.slice(0, 10); // the day as set in WooCommerce (shop time)
            const expired = exp ? exp.getTime() < now : false;
            const usedUp = c.usage_limit !== null && c.usage_count >= c.usage_limit;
            const state = c.status !== 'publish' ? 'Off' : expired ? 'Expired' : usedUp ? 'Used up' : 'Active';
            return (
              <details key={c.id} className="ad-code">
                <summary>
                  <b>{c.code.toUpperCase()}</b>
                  <span>{c.discount_type === 'percent' ? `${Number(c.amount)}% off` : `US$${Number(c.amount)} off`}</span>
                  <span className="ad-muted">{influencerOf(c) || '—'}</span>
                  <span>{expDay ? `Until ${new Date(`${expDay}T12:00:00Z`).toLocaleDateString('en-GB', { timeZone: 'UTC', day: 'numeric', month: 'short', year: 'numeric' })}` : 'No expiry'}</span>
                  <span>Used {c.usage_count}{c.usage_limit ? ` / ${c.usage_limit}` : ''}</span>
                  <span className={`ad-status ${state === 'Active' ? 'st-completed' : 'st-cancelled'}`}>{state}</span>
                </summary>
                <ActionForm action={updatePromoCode} className="ad-form">
                  <input type="hidden" name="id" value={c.id} />
                  <div className="ad-row">
                    <label>Amount {c.discount_type === 'percent' ? '(%)' : '(US$)'}<input name="amount" type="number" step="0.01" defaultValue={c.amount} /></label>
                    <label>Expires on<input name="expires" type="date" defaultValue={c.date_expires?.slice(0, 10) ?? ''} /></label>
                    <label>Total uses allowed<input name="usage_limit" type="number" min={1} defaultValue={c.usage_limit ?? ''} /></label>
                    <label>Uses per customer<input name="per_user" type="number" min={1} defaultValue={c.usage_limit_per_user ?? ''} /></label>
                    <label>Status<select name="status" defaultValue={c.status === 'publish' ? 'publish' : 'draft'}><option value="publish">Active</option><option value="draft">Off</option></select></label>
                  </div>
                  <div className="ad-actions">
                    <Submit>Save</Submit>
                  </div>
                </ActionForm>
                <form action={trashPromoCode}>
                  <input type="hidden" name="id" value={c.id} />
                  <ConfirmSubmit question={`Delete the code ${c.code.toUpperCase()}? It moves to the trash and stops working.`} className="ad-link ad-danger-link">Delete code</ConfirmSubmit>
                </form>
              </details>
            );
          })}
          {coupons.length === 0 && <p className="ad-empty">No promo codes yet.</p>}
        </div>
      </section>
    </>
  );
}
