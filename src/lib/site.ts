// Site-wide content and helpers that both server and browser code use. No product data lives here:
// products, prices and categories always come from WooCommerce (src/lib/woo.ts).

/** The WordPress/WooCommerce site. Cart, checkout and account pages stay there until the headless cart ships. */
export const WC_PUBLIC = process.env.NEXT_PUBLIC_WC_URL ?? 'https://alaraline.co';

// Menus exactly as on alaraline.co (7 Nov 2026). Cart, checkout, account and wishlist stay on WordPress.
export const nav: { label: string; href: string; children?: { label: string; href: string }[] }[] = [
  { label: 'Home', href: '/' },
  {
    label: 'Shop', href: '/shop',
    children: [
      { label: 'Limited Offers', href: '/product-category/offers' },
      { label: 'Hair Care', href: '/product-category/hair-care' },
      { label: 'Curls On Collection', href: '/product-category/curls-on-collection' },
      { label: 'Hair Accessories', href: '/product-category/hair-accessories' },
    ],
  },
  { label: 'Our Story', href: '/about' },
  { label: 'Ingredients', href: '/ingredients' },
  { label: 'Contact', href: '/contact' },
  { label: 'FAQ', href: '/faqs' },
  { label: 'Shipping Policy', href: '/shipping-policy' },
  { label: 'Become A Member', href: '/membership' },
];

export const footer = {
  // Each goes to its own category page. (Body Care was discontinued; old links redirect to /shop.)
  shop: [
    { label: 'Hair Care', href: '/product-category/hair-care' },
    { label: 'Limited Offers', href: '/product-category/offers' },
    { label: 'Hair Accessories', href: '/product-category/hair-accessories' },
  ],
  quick: [
    { label: 'FAQ', href: '/faqs' },
    { label: 'Contact', href: '/contact' },
    { label: 'Shipping Policy', href: '/shipping-policy' },
    { label: 'Our Story', href: '/about' },
    { label: 'Ingredients', href: '/ingredients' },
    // "Hair Scan" (/features/) is left out until that page exists: it returns 404 on WordPress.
  ],
  contact: { email: 'Info@alaraline.co', phone: '+961 81 624 204', tel: '+96181624204', place: 'Baabda, Lebanon' },
  socials: [
    { label: 'Facebook', href: 'https://www.facebook.com/Alaralineofficial' },
    { label: 'Instagram', href: 'https://www.instagram.com/alaraline_lb/' },
    { label: 'TikTok', href: 'https://www.tiktok.com/search?q=alaraline' },
    { label: 'WhatsApp', href: 'https://wa.me/96181624204' },
  ],
};

/** Home page "Your Hair Essentials" tiles: same images and links as the live homepage (photos updated on live, Nov 2026). */
export const essentials = [
  { slug: 'hair-care', name: 'Hair Care', img: 'https://alaraline.co/wp-content/uploads/2026/11/IMG_1313.jpeg' },
  { slug: 'offers', name: 'Limited Offers', img: 'https://alaraline.co/wp-content/uploads/2026/11/IMG_1312.jpeg' },
  { slug: 'hair-accessories', name: 'Hair Accessories', img: 'https://alaraline.co/wp-content/uploads/2026/11/FDBFFB12-5AC4-4DDD-BF87-62C6DED89707.jpeg' },
  { slug: 'curls-on-collection', name: 'Curls On Collection', img: 'https://alaraline.co/wp-content/uploads/2026/10/categ3.jpeg' },
];

export function formatPrice(n: number, currency = 'US$'): string {
  return `${currency}${n.toFixed(2)}`;
}

/**
 * Until the headless cart is built, buying hands off to the real WooCommerce cart on alaraline.co.
 * WooCommerce checks the product, variation and price itself, so nothing is trusted from the browser.
 */
export function addToCartUrl(productId: number, variation?: { id: number; attributes: Record<string, string> }, opts: { quantity?: number; checkout?: boolean } = {}): string {
  const q = new URLSearchParams({ 'add-to-cart': String(productId) });
  if (opts.quantity && opts.quantity > 1) q.set('quantity', String(opts.quantity));
  if (variation) {
    q.set('variation_id', String(variation.id));
    for (const [name, value] of Object.entries(variation.attributes)) q.set(`attribute_${slugify(name)}`, value);
  }
  // "Buy now" lands on the checkout instead of the cart (WooCommerce adds the item on any page).
  return `${WC_PUBLIC}/${opts.checkout ? 'checkout' : 'cart'}/?${q}`;
}

const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
