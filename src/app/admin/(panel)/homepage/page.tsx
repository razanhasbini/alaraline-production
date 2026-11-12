import ActionForm, { ConfirmSubmit, Submit } from '@/components/admin/ActionForm';
import { requireAdmin } from '@/lib/admin/session';
import { wp, WpError } from '@/lib/admin/wp';
import { saveBundles, savePackaging, saveResult, trashResult } from '../../actions';

export const metadata = { title: 'Homepage' };

type BundleSlot = { id: number; product_name: string; image: string; image2: string; details: string; shampoo_scents: string; mist_scents: string };
type Bundles = { enabled: boolean; items: BundleSlot[] };
type Packaging = { bag_image: string; box_image: string; box_open_image: string };
type ResultRow = { id: number; title: string; status: string; before: number; before_url: string; after: number; after_url: string; hair: string; time: string; handle: string; featured: boolean; order: number };

// eslint-disable-next-line @next/next/no-img-element -- small admin previews of WordPress images
const Thumb = ({ src }: { src: string }) => (src ? <img className="ad-prev" src={src} alt="" /> : <span className="ad-prev ad-prev-empty">No photo</span>);

export default async function HomepageAdmin({ searchParams }: PageProps<'/admin/homepage'>) {
  const s = await requireAdmin();
  const sp = await searchParams;
  let bundles: Bundles, packaging: Packaging, results: ResultRow[], products: { id: number; name: string }[];
  try {
    [bundles, packaging, results, products] = await Promise.all([
      wp<Bundles>(s, '/wc-alara/v1/admin/bundles'),
      wp<Packaging>(s, '/wc-alara/v1/admin/packaging'),
      wp<ResultRow[]>(s, '/wc-alara/v1/admin/results'),
      wp<{ id: number; name: string }[]>(s, '/wc/v3/products?per_page=100&status=publish&_fields=id,name&orderby=title&order=asc'),
    ]);
  } catch (e) {
    if (e instanceof WpError && (e.status === 404 || e.status === 401 || e.status === 403)) {
      return (
        <>
          <header className="ad-head"><h1>Homepage</h1></header>
          <section className="ad-card">
            <p><b>This page needs the “ÀLara Headless API” plugin, version 1.2 or newer, on the shop server.</b></p>
            <p>Install <code>alara-headless-api-1.2.0.zip</code> on the shop server (once), then come back.</p>
          </section>
        </>
      );
    }
    throw e;
  }

  return (
    <>
      <header className="ad-head"><h1>Homepage</h1><p>Changes appear on the website right after saving. They’re saved in the shop, so the old site shows the same.</p></header>

      <section className="ad-card" id="bundles">
        <div className="ad-card-head"><h2>Christmas bundles</h2></div>
        <ActionForm action={saveBundles} className="ad-form">
          <label className="ad-check"><input type="checkbox" name="enabled" defaultChecked={bundles.enabled} /> Show the Christmas bundles section on the homepage</label>
          <div className="ad-slots">
            {bundles.items.map((b, i) => (
              <fieldset key={i} className="ad-slot">
                <legend>Bundle {i + 1}</legend>
                <label>Product<select name={`slot${i}_id`} defaultValue={b.id || ''}><option value="">— Empty —</option>{products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
                <div className="ad-row">
                  <div><Thumb src={b.image} /><label>Photo 1<input name={`slot${i}_image`} defaultValue={b.image} placeholder="https://…" /></label><input type="file" name={`slot${i}_image_file`} accept="image/*" /></div>
                  <div><Thumb src={b.image2} /><label>Photo 2 <small>(shown on hover)</small><input name={`slot${i}_image2`} defaultValue={b.image2} placeholder="https://…" /></label><input type="file" name={`slot${i}_image2_file`} accept="image/*" /></div>
                </div>
                <label>Popup text <small>(lines starting with “-” become a list)</small><textarea name={`slot${i}_details`} rows={4} defaultValue={b.details} /></label>
                <div className="ad-row">
                  <label>Shampoo / conditioner scents <small>(separate with |)</small><input name={`slot${i}_shampoo`} defaultValue={b.shampoo_scents} placeholder="Oh Honey | Tropical Vanilla" /></label>
                  <label>Hair mist scents <small>(separate with |)</small><input name={`slot${i}_mist`} defaultValue={b.mist_scents} /></label>
                </div>
              </fieldset>
            ))}
          </div>
          <Submit className="ad-btn ad-big">Save Christmas bundles</Submit>
        </ActionForm>
      </section>

      <section className="ad-card" id="results">
        <div className="ad-card-head"><h2>The Results Wall</h2></div>
        {sp.trashed && <p className="ad-msg is-ok">Moved to the trash (it can still be restored).</p>}
        <details className="ad-new">
          <summary className="ad-btn">+ Add a before &amp; after</summary>
          <ResultForm />
        </details>
        <div className="ad-results">
          {results.map(r => (
            <details key={r.id} className="ad-result">
              <summary><Thumb src={r.before_url} /><Thumb src={r.after_url} /><span>#{r.order} {r.hair || r.title}{r.time ? ` · ${r.time}` : ''}</span>{r.status === 'draft' && <span className="ad-status st-cancelled">Hidden</span>}</summary>
              <ResultForm r={r} />
              <form action={trashResult}><input type="hidden" name="id" value={r.id} /><ConfirmSubmit question="Remove this before & after from the Results Wall? (moves to the trash)" className="ad-link ad-danger-link">Remove</ConfirmSubmit></form>
            </details>
          ))}
        </div>
      </section>

      <section className="ad-card" id="packaging">
        <div className="ad-card-head"><h2>Packaging photos (checkout)</h2></div>
        <ActionForm action={savePackaging} className="ad-form">
          <div className="ad-row">
            {([['bag_image', 'Brand bag'], ['box_image', 'PR box (closed)'], ['box_open_image', 'PR box (opened)']] as const).map(([k, label]) => (
              <div key={k}><Thumb src={packaging[k]} /><label>{label}<input name={k} defaultValue={packaging[k]} /></label><input type="file" name={`${k}_file`} accept="image/*" /></div>
            ))}
          </div>
          <p className="ad-hint">The PR box price (US$25) and how it’s charged stay in the packaging plugin; only the photos change here.</p>
          <Submit>Save packaging photos</Submit>
        </ActionForm>
      </section>
    </>
  );
}

function ResultForm({ r }: { r?: ResultRow }) {
  return (
    <ActionForm action={saveResult} className="ad-form">
      <input type="hidden" name="id" value={r?.id ?? ''} />
      <input type="hidden" name="before" value={r?.before ?? ''} />
      <input type="hidden" name="after" value={r?.after ?? ''} />
      <div className="ad-row">
        <label>Before photo<input type="file" name="before_file" accept="image/*" required={!r} /></label>
        <label>After photo<input type="file" name="after_file" accept="image/*" required={!r} /></label>
      </div>
      <div className="ad-row">
        <label>Hair type <small>(optional)</small><input name="hair" defaultValue={r?.hair} placeholder="Curly hair" /></label>
        <label>Time <small>(optional)</small><input name="time" defaultValue={r?.time} placeholder="6 weeks" /></label>
        <label>Client handle <small>(optional)</small><input name="handle" defaultValue={r?.handle} placeholder="@client" /></label>
        <label>Order <small>(smaller = first)</small><input name="order" type="number" defaultValue={r?.order ?? 10} /></label>
      </div>
      <div className="ad-row">
        <label>Your own label <small>(not shown on the site)</small><input name="title" defaultValue={r?.title} /></label>
        <label>Visibility<select name="status" defaultValue={r?.status ?? 'publish'}><option value="publish">Shown</option><option value="draft">Hidden</option></select></label>
      </div>
      <label className="ad-check"><input type="checkbox" name="featured" defaultChecked={r?.featured} /> Featured</label>
      <Submit>{r ? 'Save' : 'Add to the Results Wall'}</Submit>
    </ActionForm>
  );
}
