import { getBundles, getPackaging } from '@/lib/alara';
import BundleGrid from './BundleGrid';

// Directly under Best Sellers (and only here, once). Managed in wp-admin → WooCommerce → ÀLara Christmas Bundles:
// the on/off switch, the eight products, photos, popup text and scent lists all come from there.
export default async function ChristmasBundles() {
  const [bundles, packaging] = await Promise.all([getBundles(), getPackaging()]);
  // Only bundles WooCommerce can actually sell right now (published, in stock, with a price).
  const items = (bundles?.items ?? []).filter(b => b.purchasable && b.in_stock && Number(b.price) > 0);
  if (!bundles?.enabled || items.length === 0) return null;
  return (
    <section className="xb" aria-labelledby="xb-title">
      <div className="wrap">
        <h2 id="xb-title" className="xb-title">Christmas Bundles <em>Wrapped with love</em></h2>
        <BundleGrid
          items={items}
          symbol={bundles.currency === 'USD' ? 'US$' : bundles.currency_symbol}
          prBoxPrice={packaging?.enabled ? packaging.pr_box_price : null}
        />
      </div>
    </section>
  );
}
