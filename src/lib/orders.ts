// Shapes of an order and a customer as the ÀLara Headless API returns them (safe to import in the browser).

export type Address = Record<'first_name' | 'last_name' | 'company' | 'address_1' | 'address_2' | 'city' | 'state' | 'postcode' | 'country' | 'phone', string> & { email?: string };

export type OrderSummary = { id: number; number: string; status: string; status_label: string; date: string; total: string; currency: string; item_count: number };

export type OrderFull = OrderSummary & {
  items: { name: string; quantity: number; total: string; meta: { key: string; value: string }[]; slug: string }[];
  fees: { name: string; total: string }[];
  shipping: { method: string; total: string };
  discount: string;
  coupons: string[];
  subtotal: number | string;
  payment: string;
  packaging: string;
  note: string;
  billing: Address;
  shipping_address: Address;
};

export type Customer = { id: number; email: string; first_name: string; last_name: string; display_name: string; billing: Address; shipping: Address };

export const usd = (v: number | string) => `US$${Number(v || 0).toFixed(2)}`;

export const orderDate = (iso: string) =>
  iso ? new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'Asia/Beirut' }) : '';

export function addressLines(a: Partial<Address> | undefined): string[] {
  if (!a) return [];
  const name = [a.first_name, a.last_name].filter(Boolean).join(' ');
  const country = a.country === 'LB' ? 'Lebanon' : a.country;
  return [name, a.company, a.address_1, a.address_2, [a.city, a.postcode].filter(Boolean).join(' '), country].filter((x): x is string => !!x && x.trim() !== '');
}
