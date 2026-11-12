import Link from 'next/link';
import { requireAdmin } from '@/lib/admin/session';
import { money, type WcProduct } from '@/lib/admin/types';
import { wpList } from '@/lib/admin/wp';

export const metadata = { title: 'Products' };

export default async function ProductsPage({ searchParams }: PageProps<'/admin/products'>) {
  const s = await requireAdmin();
  const sp = await searchParams;
  const q = String(sp.q ?? '').trim();
  const stock = sp.stock === 'outofstock' ? 'outofstock' : '';
  const page = Math.max(1, Number(sp.page) || 1);
  const { items, total, pages } = await wpList<WcProduct>(s, `/wc/v3/products?per_page=50&page=${page}&status=any&orderby=date&order=desc${q ? `&search=${encodeURIComponent(q)}` : ''}${stock ? `&stock_status=${stock}` : ''}`);
  return (
    <>
      <header className="ad-head ad-head-row">
        <div><h1>Products</h1><p>{total} products{sp.trashed ? ' · moved to the trash (it can still be restored)' : ''}</p></div>
        <Link href="/admin/products/new" className="ad-btn">+ Add product</Link>
      </header>
      <div className="ad-toolbar">
        <nav className="ad-tabs"><Link href="/admin/products" aria-current={!stock ? 'page' : undefined}>All</Link><Link href="/admin/products?stock=outofstock" aria-current={stock ? 'page' : undefined}>Sold out</Link></nav>
        <form className="ad-search"><input name="q" defaultValue={q} placeholder="Search products" /><button className="ad-btn ad-ghost">Search</button></form>
      </div>
      <section className="ad-card">
        <table className="ad-table">
          <thead><tr><th></th><th>Product</th><th>Price</th><th>Stock</th><th>Categories</th><th>Status</th></tr></thead>
          <tbody>
            {items.map(p => (
              <tr key={p.id}>
                {/* eslint-disable-next-line @next/next/no-img-element -- admin thumbnail */}
                <td className="ad-thumb">{p.images[0] && <img src={p.images[0].src} alt="" />}</td>
                <td><Link href={`/admin/products/${p.id}`}><b>{p.name}</b></Link>{p.type === 'variable' && <small className="ad-muted"> · with options</small>}</td>
                <td>{p.sale_price ? <><del>{money(p.regular_price)}</del> {money(p.sale_price)}</> : p.price ? money(p.price) : '—'}</td>
                <td><span className={`ad-status ${p.stock_status === 'instock' ? 'st-completed' : 'st-cancelled'}`}>{p.stock_status === 'instock' ? (p.manage_stock ? `${p.stock_quantity} in stock` : 'In stock') : 'Sold out'}</span></td>
                <td className="ad-muted">{p.categories.map(c => c.name).join(', ')}</td>
                <td>{p.status === 'publish' ? 'Published' : p.status === 'draft' ? 'Draft (hidden)' : p.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      {pages > 1 && <nav className="ad-pager">{page > 1 && <Link href={`/admin/products?page=${page - 1}`}>← Previous</Link>}<span>Page {page} of {pages}</span>{page < pages && <Link href={`/admin/products?page=${page + 1}`}>Next →</Link>}</nav>}
    </>
  );
}
