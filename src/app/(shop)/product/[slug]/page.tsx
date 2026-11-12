import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import BuyBox from '@/components/BuyBox';
import Crumbs from '@/components/Crumbs';
import Gallery from '@/components/Gallery';
import Price from '@/components/Price';
import ProductCard from '@/components/ProductCard';
import Reviews from '@/components/Reviews';
import { WC_PUBLIC } from '@/lib/site';
import { getProduct, getProducts, getProductTabs, getReviews } from '@/lib/woo';

// Same URLs as WordPress (/product/<slug>). All products are prerendered; new ones render on first visit.
export async function generateStaticParams() {
  const products = await getProducts();
  return products.map(p => ({ slug: p.slug }));
}

const plain = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

export async function generateMetadata({ params }: PageProps<'/product/[slug]'>): Promise<Metadata> {
  const { slug } = await params;
  const p = await getProduct(slug);
  if (!p) return {};
  const description = plain(p.shortDescription || p.description).slice(0, 155) || `${p.name} by ÀLara Line.`;
  return {
    title: p.name,
    description,
    alternates: { canonical: `/product/${p.slug}` },
    openGraph: { title: p.name, description, images: p.images[0] ? [{ url: p.images[0].src }] : undefined },
  };
}

export default function ProductPage({ params }: PageProps<'/product/[slug]'>) {
  return (
    <Suspense fallback={<div className="wrap pdp" style={{ minHeight: '70vh' }} />}>
      <ProductDetails params={params} />
    </Suspense>
  );
}

async function ProductDetails({ params }: Pick<PageProps<'/product/[slug]'>, 'params'>) {
  const { slug } = await params;
  const p = await getProduct(slug);
  if (!p) notFound();
  const [tabs, reviews] = await Promise.all([getProductTabs(p.id), p.reviewCount ? getReviews(p.id) : Promise.resolve([])]);
  const cat = p.categories[0];
  // Related products: from the same categories, like WooCommerce's "Related products".
  const related = cat
    ? (await Promise.all(p.categories.map(c => getProducts({ category: c.slug, sort: 'popularity' })))).flat()
        .filter((x, i, a) => x.id !== p.id && a.findIndex(y => y.id === x.id) === i).slice(0, 4)
    : [];
  const url = `https://alaraline.co/product/${p.slug}`;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: p.name,
    image: p.images.map(i => i.src),
    description: plain(p.shortDescription || p.description),
    brand: { '@type': 'Brand', name: 'ÀLara Line' },
    ...(p.sku ? { sku: p.sku } : {}),
    offers: {
      '@type': 'Offer', url, priceCurrency: 'USD', price: p.price.toFixed(2), itemCondition: 'https://schema.org/NewCondition',
      availability: p.inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      seller: { '@id': 'https://alaraline.co/#organization' },
      shippingDetails: { '@type': 'OfferShippingDetails', shippingDestination: { '@type': 'DefinedRegion', addressCountry: 'LB' }, shippingRate: { '@type': 'MonetaryAmount', value: 4, currency: 'USD' } },
    },
    ...(p.reviewCount > 0 ? { aggregateRating: { '@type': 'AggregateRating', ratingValue: p.rating, reviewCount: p.reviewCount } } : {}),
  };
  const breadcrumbLd = {
    '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: [
      { name: 'Home', item: 'https://alaraline.co/' },
      { name: 'Shop', item: 'https://alaraline.co/shop' },
      ...(cat ? [{ name: cat.name, item: `https://alaraline.co/product-category/${cat.slug}` }] : []),
      { name: p.name, item: url },
    ].map((b, i) => ({ '@type': 'ListItem', position: i + 1, ...b })),
  };

  return (
    <>
      <Crumbs items={[{ label: 'Home', href: '/' }, { label: 'Products', href: '/shop' }, ...(cat ? [{ label: cat.name, href: `/product-category/${cat.slug}` }] : []), { label: p.name }]} />
      <div className="wrap pdp">
        <Gallery images={p.images} name={p.name} />
        <div className="pdp-info">
          <Price product={p} />
          <h1>{p.name}</h1>
          <p className="pdp-rating"><span aria-hidden="true">★★★★★</span><span className="sr-only">Rated {p.rating} out of 5</span> <i>|</i> <a href="#reviews">{p.reviewCount} {p.reviewCount === 1 ? 'review' : 'reviews'}</a></p>
          {/* Text written by the ÀLara team in wp-admin, rendered as WordPress renders it. */}
          {p.shortDescription && <div className="pdp-short" dangerouslySetInnerHTML={{ __html: p.shortDescription }} />}
          <BuyBox id={p.id} name={p.name} image={p.images[0]?.src ?? ''} type={p.type} inStock={p.inStock} purchasable={p.purchasable} attributes={p.attributes} variations={p.variations} />
          <dl className="pdp-meta">
            {(p.sku || p.type === 'variable') && <><dt>Sku:</dt><dd>{p.sku || 'N/A'}</dd></>}
            {p.categories.length > 0 && <>
              <dt>Categories:</dt>
              <dd>{p.categories.map((c, i) => <span key={c.slug}>{i > 0 && ', '}<Link href={`/product-category/${c.slug}`}>{c.name}</Link></span>)}</dd>
            </>}
            <dt>Share:</dt>
            <dd className="share">
              <a href={`https://wa.me/?text=${encodeURIComponent(`${p.name} ${url}`)}`} target="_blank" rel="noopener noreferrer" aria-label="Share on WhatsApp">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.5 11.7a8.5 8.5 0 0 1-12.4 7.5L3 21l1.8-5.1a8.5 8.5 0 1 1 15.7-4.2Z" /></svg></a>
              <a href={`mailto:?subject=${encodeURIComponent(p.name)}&body=${encodeURIComponent(url)}`} aria-label="Share by email">
                <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></svg></a>
              <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`} target="_blank" rel="noopener noreferrer" aria-label="Share on Facebook">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 22V12h4l.6-4H14V6c0-1.2.4-2 2-2h2V1a24 24 0 0 0-3-.2C12 .8 10 2.7 10 6v2H7v4h3v10" /></svg></a>
            </dd>
          </dl>
          {(p.description || tabs.length > 0) && (
            <div className="tabs">
              {p.description && (
                <details>
                  <summary>Description</summary>
                  <div className="tab-body" dangerouslySetInnerHTML={{ __html: p.description }} />
                </details>
              )}
              {tabs.map(t => (
                <details key={t.title}>
                  <summary>{t.title}</summary>
                  <div className="tab-body" dangerouslySetInnerHTML={{ __html: t.content }} />
                </details>
              ))}
            </div>
          )}
        </div>
      </div>
      <div id="reviews">
        <Reviews rating={p.rating} count={p.reviewCount} reviews={reviews} writeUrl={`${WC_PUBLIC}/product/${p.slug}/#reviews`} />
      </div>
      {related.length > 0 && (
        <section className="related" aria-labelledby="related-title">
          <div className="wrap">
            <h2 id="related-title">Related products</h2>
            <div className="grid related-grid">{related.map(r => <ProductCard key={r.id} product={r} />)}</div>
          </div>
        </section>
      )}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify([jsonLd, breadcrumbLd]).replace(/</g, '\\u003c') }} />
    </>
  );
}
