import type { Product } from '@/lib/woo';
import { formatPrice } from '@/lib/site';

// Displays the price WooCommerce returned. It is never used to charge: the cart and checkout recalculate on the server.
export default function Price({ product: p }: { product: Product }) {
  const now = formatPrice(p.price, p.currency);
  if (p.maxPrice) return <div className="price">{now} – {formatPrice(p.maxPrice, p.currency)}</div>;
  if (p.onSale && p.regularPrice > p.price) {
    return (
      <div className="price">
        <del><span className="sr-only">Original price: </span>{formatPrice(p.regularPrice, p.currency)}</del>
        <ins><span className="sr-only">Sale price: </span>{now}</ins>
      </div>
    );
  }
  return <div className="price">{now}</div>;
}
