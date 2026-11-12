import Link from 'next/link';
import { notFound } from 'next/navigation';
import ActionForm, { ConfirmSubmit, Submit } from '@/components/admin/ActionForm';
import PhotoManager from '@/components/admin/PhotoManager';
import { requireAdmin } from '@/lib/admin/session';
import type { Variation, WcProduct } from '@/lib/admin/types';
import { wp, WpError } from '@/lib/admin/wp';
import { saveProduct, trashProduct } from '../../../actions';

export const metadata = { title: 'Product' };

const BADGES = [{ slug: 'just-restocked', label: 'Just Restocked!' }, { slug: 'limited', label: 'Limited' }];
const day = (iso: string | null) => (iso ? iso.slice(0, 10) : '');

export default async function ProductEdit({ params, searchParams }: PageProps<'/admin/products/[id]'>) {
  const s = await requireAdmin();
  const { id } = await params;
  const sp = await searchParams;
  const isNew = id === 'new';
  let p: WcProduct | null = null;
  if (!isNew) {
    try { p = await wp<WcProduct>(s, `/wc/v3/products/${Number(id)}`); } catch (e) { if (e instanceof WpError && e.status === 404) notFound(); throw e; }
  }
  const [categories, variations] = await Promise.all([
    wp<{ id: number; name: string }[]>(s, '/wc/v3/products/categories?per_page=100'),
    p?.type === 'variable' ? wp<Variation[]>(s, `/wc/v3/products/${p.id}/variations?per_page=50`) : Promise.resolve([] as Variation[]),
  ]);
  const tagSlugs = new Set(p?.tags.map(t => t.slug));
  const otherTags = (p?.tags ?? []).filter(t => !BADGES.some(b => b.slug === t.slug)).map(t => t.id).join(',');

  return (
    <>
      <header className="ad-head">
        <p><Link href="/admin/products">← Products</Link></p>
        <h1>{isNew ? 'Add a product' : p!.name}</h1>
        {p && <p><Link href={`/product/${p.slug}`} target="_blank">View on website ↗</Link></p>}
        {sp.saved && <p className="ad-msg is-ok" role="status">Saved in WooCommerce. The website shows the change now.</p>}
      </header>
      <ActionForm action={saveProduct} className="ad-form ad-grid2">
        <input type="hidden" name="id" value={isNew ? 'new' : p!.id} />
        <input type="hidden" name="type" value={p?.type ?? 'simple'} />
        <input type="hidden" name="otherTags" value={otherTags} />
        <div className="ad-stack">
          <section className="ad-card">
            <label>Name<input name="name" defaultValue={p?.name} required /></label>
            <label>Short description <small>(shown next to the price; HTML allowed)</small><textarea name="short_description" rows={5} defaultValue={p?.short_description} /></label>
            <label>Long description <small>(optional)</small><textarea name="description" rows={4} defaultValue={p?.description} /></label>
          </section>
          <section className="ad-card">
            <h2>Photos</h2>
            <PhotoManager initial={(p?.images ?? []).map(i => ({ id: i.id, src: i.src }))} />
          </section>
          {variations.length > 0 && (
            <section className="ad-card">
              <h2>Options &amp; prices</h2>
              <table className="ad-table">
                <thead><tr><th>Option</th><th>Regular price</th><th>Sale price</th><th>Stock</th></tr></thead>
                <tbody>
                  {variations.map(v => (
                    <tr key={v.id}>
                      <td>{v.attributes.map(a => `${a.name}: ${a.option || 'any'}`).join(' · ')}</td>
                      <td><input name={`var_${v.id}_regular`} defaultValue={v.regular_price} inputMode="decimal" /></td>
                      <td><input name={`var_${v.id}_sale`} defaultValue={v.sale_price} inputMode="decimal" /></td>
                      <td><select name={`var_${v.id}_stock`} defaultValue={v.stock_status}><option value="instock">In stock</option><option value="outofstock">Sold out</option></select></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}
        </div>
        <div className="ad-stack">
          <section className="ad-card">
            <label>Visibility<select name="status" defaultValue={p?.status ?? 'publish'}><option value="publish">Published (on the website)</option><option value="draft">Draft (hidden)</option></select></label>
            {(p?.type ?? 'simple') === 'simple' && (
              <>
                <div className="ad-row">
                  <label>Regular price (US$)<input name="regular_price" defaultValue={p?.regular_price} inputMode="decimal" /></label>
                  <label>Sale price (US$)<input name="sale_price" defaultValue={p?.sale_price} inputMode="decimal" /></label>
                </div>
                <div className="ad-row">
                  <label>Sale starts <small>(optional)</small><input type="date" name="sale_from" defaultValue={day(p?.date_on_sale_from ?? null)} /></label>
                  <label>Sale ends <small>(optional)</small><input type="date" name="sale_to" defaultValue={day(p?.date_on_sale_to ?? null)} /></label>
                </div>
              </>
            )}
            <label>Stock<select name="stock_status" defaultValue={p?.stock_status ?? 'instock'}><option value="instock">In stock</option><option value="outofstock">Sold out</option></select></label>
            <label className="ad-check"><input type="checkbox" name="manage_stock" defaultChecked={p?.manage_stock} /> Count stock</label>
            <label>Quantity in stock <small>(when counting)</small><input type="number" name="stock_quantity" min={0} defaultValue={p?.stock_quantity ?? ''} /></label>
          </section>
          <section className="ad-card">
            <h2>Categories</h2>
            <div className="ad-checks">{categories.map(c => <label key={c.id} className="ad-check"><input type="checkbox" name="categories" value={c.id} defaultChecked={p?.categories.some(x => x.id === c.id)} /> {c.name}</label>)}</div>
            <h2>Badges</h2>
            <div className="ad-checks">{BADGES.map(b => <label key={b.slug} className="ad-check"><input type="checkbox" name={`badge_${b.slug}`} defaultChecked={tagSlugs.has(b.slug)} /> {b.label}</label>)}</div>
            <p className="ad-hint">“New” appears automatically for 7 days after a product is added; “Sold Out” when stock is out.</p>
          </section>
          <Submit className="ad-btn ad-big">{isNew ? 'Create product' : 'Save changes'}</Submit>
        </div>
      </ActionForm>
      {p && (
        <form action={trashProduct} className="ad-danger-zone">
          <input type="hidden" name="id" value={p.id} />
          <ConfirmSubmit question={`Move “${p.name}” to the trash? It disappears from the website (it can still be restored).`}>Remove product</ConfirmSubmit>
        </form>
      )}
    </>
  );
}
