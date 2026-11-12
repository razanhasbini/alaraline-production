import Link from 'next/link';
import ChristmasBundles from '@/components/ChristmasBundles';
import CustomerLove from '@/components/CustomerLove';
import { Elevate, Essentials, Features } from '@/components/HomeSections';
import ProductCard from '@/components/ProductCard';
import ProductTabs from '@/components/ProductTabs';
import ResultsWall from '@/components/ResultsWall';
import ChristmasHero from '@/components/xmas/ChristmasHero';
import { getProducts } from '@/lib/woo';

export const metadata = { title: { absolute: 'ÀLara Line | Natural Haircare from Lebanon' }, alternates: { canonical: '/' } };

// The live homepage (Elementor page 1019), section for section and in the same order.
export default function Home() {
  return (
    <>
      <ChristmasHero />
      <BestSellers />
      <ChristmasBundles />
      <Essentials />
      <ResultsWall />
      <Elevate />
      <CategoryTabs />
      <Offers />
      <CustomerLove />
      <Features />
    </>
  );
}

// Theme "product tabs" widgets: category, newest first, the same counts as live (5 / 10 / 10 / 10).
async function BestSellers() {
  const products = await getProducts({ category: 'best-sellers', perPage: 5 });
  return (
    <section className="psec" id="alara-best-sellers">
      <div className="wrap">
        <ProductTabs id="best" titles={['Best Sellers']} panels={[<Grid key="b" products={products} />]} />
      </div>
    </section>
  );
}

async function CategoryTabs() {
  const tabs = [['Hair Care', 'hair-care'], ['Body Care', 'body-care'], ['Hair Accessories', 'hair-accessories']] as const;
  const lists = await Promise.all(tabs.map(([, slug]) => getProducts({ category: slug, perPage: 10 })));
  return (
    <section className="psec">
      <div className="wrap">
        <ProductTabs id="cats" titles={tabs.map(t => t[0])} panels={lists.map((l, i) => <Grid key={i} products={l} />)} />
        <p className="center"><Link className="btn" href="/shop">View all</Link></p>
      </div>
    </section>
  );
}

async function Offers() {
  const products = await getProducts({ category: 'offers', perPage: 10 });
  return (
    <section className="psec">
      <div className="wrap">
        <ProductTabs id="offers" titles={['Offers']} panels={[<Grid key="o" products={products} />]} />
      </div>
    </section>
  );
}

function Grid({ products }: { products: Awaited<ReturnType<typeof getProducts>> }) {
  return <div className="grid">{products.map(p => <ProductCard key={p.id} product={p} />)}</div>;
}
