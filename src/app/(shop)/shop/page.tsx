import type { Metadata } from 'next';
import Crumbs from '@/components/Crumbs';
import ProductCard from '@/components/ProductCard';
import { getProducts } from '@/lib/woo';

export const metadata: Metadata = {
  title: 'Shop',
  description: 'Shop every ÀLara Line product: hair care, curl care, sets and offers, hair accessories and body care.',
  alternates: { canonical: '/shop' },
};

// Like the live /shop/: breadcrumb bar, then every product, oldest first, 5 across.
export default async function ShopPage() {
  const products = await getProducts({ sort: 'date-asc' });
  return (
    <>
      <Crumbs items={[{ label: 'Home', href: '/' }, { label: 'Shop' }]} />
      <h1 className="sr-only">Shop</h1>
      <section className="shop-all" aria-label="Products">
        <div className="wrap-wide grid">
          {products.map((p, i) => <ProductCard key={p.id} product={p} priority={i < 5} />)}
        </div>
      </section>
    </>
  );
}
