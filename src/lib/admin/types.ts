// The parts of WooCommerce's REST responses the admin panel uses.

export type Meta = { id?: number; key: string; value: unknown; display_key?: string; display_value?: string };
export type Address = { first_name: string; last_name: string; address_1: string; address_2: string; city: string; state: string; country: string; phone?: string; email?: string; postcode?: string };

export type Order = {
  id: number; number: string; status: string; date_created: string; date_created_gmt: string; total: string; currency: string;
  payment_method_title: string; customer_note: string;
  billing: Address; shipping: Address;
  line_items: { id: number; name: string; quantity: number; total: string; image?: { src: string } | null; meta_data: Meta[] }[];
  fee_lines: { name: string; total: string }[];
  shipping_lines: { method_title: string; total: string }[];
  coupon_lines: { code: string; discount: string }[];
  meta_data: Meta[];
};

export type WcProduct = {
  id: number; name: string; slug: string; type: string; status: string; permalink: string;
  price: string; regular_price: string; sale_price: string; date_on_sale_from: string | null; date_on_sale_to: string | null;
  stock_status: string; manage_stock: boolean; stock_quantity: number | null;
  short_description: string; description: string;
  categories: { id: number; name: string; slug: string }[];
  tags: { id: number; name: string; slug: string }[];
  images: { id: number; src: string }[];
  variations: number[];
  total_sales?: number;
};

export type Variation = { id: number; attributes: { name: string; option: string }[]; regular_price: string; sale_price: string; stock_status: string };

export type Coupon = {
  id: number; code: string; amount: string; discount_type: string; status: string; date_expires: string | null; date_expires_gmt: string | null;
  usage_count: number; usage_limit: number | null; usage_limit_per_user: number | null; description: string;
  meta_data: Meta[]; exclude_sale_items: boolean; individual_use: boolean; minimum_amount: string;
};

export const money = (v: string | number, c = 'US$') => `${c}${Number(v || 0).toFixed(2)}`;
/** WooCommerce *_gmt dates (UTC, no Z) shown in Beirut time. */
export const when = (iso: string) => new Date(iso + (iso.endsWith('Z') ? '' : 'Z')).toLocaleString('en-GB', { timeZone: 'Asia/Beirut', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
export const STATUS_LABEL: Record<string, string> = {
  pending: 'Pending payment', processing: 'Processing', 'on-hold': 'On hold', completed: 'Completed',
  cancelled: 'Cancelled', refunded: 'Refunded', failed: 'Failed', draft: 'Draft',
};

/** The current time (kept out of components so rendering stays pure). */
export const nowMs = () => Date.now();
