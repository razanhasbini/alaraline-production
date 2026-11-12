'use server';

import { refresh, updateTag } from 'next/cache';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { checkAdmin, endSession, loginBlocked, requireAdmin, startSession, type AdminSession } from '@/lib/admin/session';
import { wp, WpError } from '@/lib/admin/wp';

// Every admin change goes through WooCommerce's own REST API (with the panel's server-side key), so WooCommerce
// keeps doing the real work (stock, emails, coupon rules). Nothing is stored on this site.

export type Result = { ok: boolean; message: string };
const fail = (e: unknown): Result => ({ ok: false, message: e instanceof WpError || e instanceof Error ? e.message : 'Something went wrong.' });
const str = (fd: FormData, k: string) => String(fd.get(k) ?? '').trim();

/* ------------------------------------------------------------------ sign in / out */

export async function login(_: Result | null, fd: FormData): Promise<Result> {
  const user = str(fd, 'user'), pass = String(fd.get('pass') ?? '');
  if (!user || !pass) return { ok: false, message: 'Enter your username and password.' };
  const ip = ((await headers()).get('x-forwarded-for') ?? 'local').split(',')[0].trim();
  const keys = [`u:${user.toLowerCase()}`, `ip:${ip}`];
  if (loginBlocked(keys)) return { ok: false, message: 'Too many wrong tries. Please wait 15 minutes and try again.' };
  const me = checkAdmin(user, pass, keys);
  if (!me) return { ok: false, message: 'Wrong username or password.' };
  await startSession({ user: me.user, name: me.name });
  redirect('/admin');
}

export async function logout() {
  await endSession();
  redirect('/admin/login');
}

/* ------------------------------------------------------------------ media */

async function upload(s: AdminSession, file: File): Promise<{ id: number; url: string }> {
  if (!file.type.startsWith('image/')) throw new Error(`${file.name} is not an image.`);
  if (file.size > 10 * 1024 * 1024) throw new Error(`${file.name} is larger than 10 MB.`);
  const safe = file.name.replace(/[^\w.\-]+/g, '-').toLowerCase();
  const form = new FormData();
  form.append('file', new Blob([await file.arrayBuffer()], { type: file.type }), safe);
  const m = await wp<{ id: number; url: string }>(s, '/wc-alara/v1/admin/media', { method: 'POST', body: form });
  return { id: m.id, url: m.url };
}
const files = (fd: FormData, k: string) => fd.getAll(k).filter((f): f is File => f instanceof File && f.size > 0);

/* ------------------------------------------------------------------ orders */

const ORDER_STATUSES = ['pending', 'processing', 'on-hold', 'completed', 'cancelled', 'refunded', 'failed'];

export async function setOrderStatus(_: Result | null, fd: FormData): Promise<Result> {
  const s = await requireAdmin();
  const id = Number(str(fd, 'id')), status = str(fd, 'status');
  if (!id || !ORDER_STATUSES.includes(status)) return { ok: false, message: 'Choose a valid status.' };
  try {
    await wp(s, `/wc/v3/orders/${id}`, { method: 'PUT', json: { status } });
    refresh();
    return { ok: true, message: `Order #${id} is now “${status.replace('-', ' ')}”. WooCommerce sent its usual emails.` };
  } catch (e) { return fail(e); }
}

export async function addOrderNote(_: Result | null, fd: FormData): Promise<Result> {
  const s = await requireAdmin();
  const id = Number(str(fd, 'id')), note = str(fd, 'note');
  if (!id || !note) return { ok: false, message: 'Write a note first.' };
  try {
    await wp(s, `/wc/v3/orders/${id}/notes`, { method: 'POST', json: { note, customer_note: fd.get('customer') === 'on', added_by_user: true } });
    refresh();
    return { ok: true, message: fd.get('customer') === 'on' ? 'Note added and emailed to the customer.' : 'Private note added.' };
  } catch (e) { return fail(e); }
}

/* ------------------------------------------------------------------ products */

async function tagIds(s: AdminSession, slugs: string[]): Promise<{ id: number }[]> {
  const out: { id: number }[] = [];
  for (const slug of slugs) {
    const found = await wp<{ id: number }[]>(s, `/wc/v3/products/tags?slug=${encodeURIComponent(slug)}`);
    if (found[0]) out.push({ id: found[0].id });
    else out.push({ id: (await wp<{ id: number }>(s, '/wc/v3/products/tags', { method: 'POST', json: { name: slug === 'just-restocked' ? 'just-restocked' : slug, slug } })).id });
  }
  return out;
}

export async function saveProduct(_: Result | null, fd: FormData): Promise<Result> {
  const s = await requireAdmin();
  const id = str(fd, 'id');
  const isNew = id === 'new';
  let savedId = 0, slug = '';
  try {
    // photos: keep the ordered list of existing ones, then add new uploads
    const kept = str(fd, 'images').split(',').map(Number).filter(Boolean);
    const added = [];
    for (const f of files(fd, 'newImages')) added.push((await upload(s, f)).id);
    const images = [...kept, ...added].map(i => ({ id: i }));

    // badges are product tags, like on the live site; other tags are kept
    const otherTags = str(fd, 'otherTags').split(',').map(Number).filter(Boolean).map(t => ({ id: t }));
    const badgeTags = await tagIds(s, ['just-restocked', 'limited'].filter(b => fd.get(`badge_${b}`) === 'on'));

    const type = isNew ? 'simple' : str(fd, 'type');
    const body: Record<string, unknown> = {
      name: str(fd, 'name'),
      status: str(fd, 'status') || 'publish',
      short_description: str(fd, 'short_description'),
      description: str(fd, 'description'),
      categories: fd.getAll('categories').map(c => ({ id: Number(c) })),
      tags: [...otherTags, ...badgeTags],
      images,
      stock_status: str(fd, 'stock_status') || 'instock',
    };
    if (fd.get('manage_stock') === 'on') { body.manage_stock = true; body.stock_quantity = Number(str(fd, 'stock_quantity') || 0); }
    else body.manage_stock = false;
    if (type === 'simple') {
      body.regular_price = str(fd, 'regular_price');
      body.sale_price = str(fd, 'sale_price');
      body.date_on_sale_from = str(fd, 'sale_from') || null;
      body.date_on_sale_to = str(fd, 'sale_to') ? `${str(fd, 'sale_to')}T23:59:59` : null;
    }
    if (!body.name) return { ok: false, message: 'Give the product a name.' };

    const p = await wp<{ id: number; slug: string }>(s, isNew ? '/wc/v3/products' : `/wc/v3/products/${id}`, { method: isNew ? 'POST' : 'PUT', json: body });
    savedId = p.id; slug = p.slug;

    // variation prices (e.g. scents)
    for (const key of fd.keys()) {
      const m = key.match(/^var_(\d+)_regular$/);
      if (!m) continue;
      const vid = m[1];
      await wp(s, `/wc/v3/products/${savedId}/variations/${vid}`, { method: 'PUT', json: {
        regular_price: str(fd, `var_${vid}_regular`), sale_price: str(fd, `var_${vid}_sale`), stock_status: str(fd, `var_${vid}_stock`) || 'instock',
      } });
    }
  } catch (e) { return fail(e); }
  updateTag('products');
  if (slug) updateTag(`product:${slug}`);
  redirect(`/admin/products/${savedId}?saved=1`);
}

export async function trashProduct(fd: FormData) {
  const s = await requireAdmin();
  const id = Number(str(fd, 'id'));
  if (id) await wp(s, `/wc/v3/products/${id}`, { method: 'DELETE' }); // to the WordPress trash (restorable)
  updateTag('products');
  redirect('/admin/products?trashed=1');
}

/* ------------------------------------------------------------------ promo codes */

async function offersCategoryId(s: AdminSession): Promise<number | null> {
  const c = await wp<{ id: number }[]>(s, '/wc/v3/products/categories?slug=offers');
  return c[0]?.id ?? null;
}

export async function createPromoCode(_: Result | null, fd: FormData): Promise<Result> {
  const s = await requireAdmin();
  const influencer = str(fd, 'influencer');
  const percent = Number(str(fd, 'percent') || 10);
  if (!influencer) return { ok: false, message: 'Enter the influencer’s name.' };
  if (!(percent >= 1 && percent <= 100)) return { ok: false, message: 'The discount must be between 1 and 100 %.' };
  // same rule as the live ÀLara Influencer Coupons plugin: NAME + percent (e.g. SARA10), unless a code is typed
  let code = str(fd, 'code').toLowerCase();
  if (!code) code = `${influencer.normalize('NFD').replace(/[^A-Za-z0-9]/g, '').slice(0, 32) || 'creator'}${percent}`.toLowerCase();
  if (!/^[a-z0-9_-]{3,60}$/.test(code)) return { ok: false, message: 'Codes can use letters, numbers, - and _ (3 to 60 characters).' };
  try {
    const exists = await wp<unknown[]>(s, `/wc/v3/coupons?code=${encodeURIComponent(code)}`);
    if (exists.length) return { ok: false, message: `The code “${code.toUpperCase()}” already exists. Choose another one.` };
    const excludeOffers = fd.get('exclude_offers') === 'on';
    const offers = excludeOffers ? await offersCategoryId(s) : null;
    const expires = str(fd, 'expires');
    await wp(s, '/wc/v3/coupons', { method: 'POST', json: {
      code, discount_type: 'percent', amount: String(percent),
      date_expires: expires ? `${expires}T23:59:59` : null,
      individual_use: fd.get('individual') === 'on',
      exclude_sale_items: fd.get('exclude_sale') === 'on',
      excluded_product_categories: offers ? [offers] : [],
      usage_limit: str(fd, 'usage_limit') ? Number(str(fd, 'usage_limit')) : null,
      usage_limit_per_user: str(fd, 'per_user') ? Number(str(fd, 'per_user')) : null,
      minimum_amount: str(fd, 'minimum') || '',
      description: `Influencer: ${influencer} | ÀLara promotion.${excludeOffers ? ' Excludes Limited Offers.' : ''}${fd.get('exclude_sale') === 'on' ? ' Excludes sale items.' : ''}`,
      meta_data: [{ key: '_alara_influencer_name', value: influencer }],
    } });
    refresh();
    return { ok: true, message: `Created ${code.toUpperCase()} (${percent}% off) for ${influencer}.` };
  } catch (e) { return fail(e); }
}

export async function updatePromoCode(_: Result | null, fd: FormData): Promise<Result> {
  const s = await requireAdmin();
  const id = Number(str(fd, 'id'));
  const expires = str(fd, 'expires');
  try {
    await wp(s, `/wc/v3/coupons/${id}`, { method: 'PUT', json: {
      amount: str(fd, 'amount'),
      date_expires: expires ? `${expires}T23:59:59` : null,
      usage_limit: str(fd, 'usage_limit') ? Number(str(fd, 'usage_limit')) : null,
      usage_limit_per_user: str(fd, 'per_user') ? Number(str(fd, 'per_user')) : null,
      status: str(fd, 'status') === 'draft' ? 'draft' : 'publish',
    } });
    refresh();
    return { ok: true, message: 'Saved.' };
  } catch (e) { return fail(e); }
}

export async function trashPromoCode(fd: FormData) {
  const s = await requireAdmin();
  const id = Number(str(fd, 'id'));
  if (id) await wp(s, `/wc/v3/coupons/${id}`, { method: 'DELETE' }); // WordPress trash (restorable)
  redirect('/admin/promo-codes?trashed=1');
}

/* ------------------------------------------------------------------ homepage (ÀLara Headless API ≥ 1.1) */

export async function saveBundles(_: Result | null, fd: FormData): Promise<Result> {
  const s = await requireAdmin();
  try {
    const items = [];
    for (let i = 0; i < 8; i++) {
      const photo = async (field: string, current: string) => {
        const f = files(fd, `slot${i}_${field}_file`)[0];
        return f ? (await upload(s, f)).url : current;
      };
      items.push({
        id: Number(str(fd, `slot${i}_id`) || 0),
        image: await photo('image', str(fd, `slot${i}_image`)),
        image2: await photo('image2', str(fd, `slot${i}_image2`)),
        details: String(fd.get(`slot${i}_details`) ?? ''),
        shampoo_scents: str(fd, `slot${i}_shampoo`),
        mist_scents: str(fd, `slot${i}_mist`),
      });
    }
    await wp(s, '/wc-alara/v1/admin/bundles', { method: 'POST', json: { enabled: fd.get('enabled') === 'on', items } });
  } catch (e) { return fail(e); }
  updateTag('bundles');
  refresh();
  return { ok: true, message: 'Christmas bundles saved. The website shows them now.' };
}

export async function savePackaging(_: Result | null, fd: FormData): Promise<Result> {
  const s = await requireAdmin();
  try {
    const body: Record<string, string> = {};
    for (const k of ['bag_image', 'box_image', 'box_open_image']) {
      const f = files(fd, `${k}_file`)[0];
      body[k] = f ? (await upload(s, f)).url : str(fd, k);
    }
    await wp(s, '/wc-alara/v1/admin/packaging', { method: 'POST', json: body });
  } catch (e) { return fail(e); }
  updateTag('packaging');
  refresh();
  return { ok: true, message: 'Packaging photos saved.' };
}

export async function saveResult(_: Result | null, fd: FormData): Promise<Result> {
  const s = await requireAdmin();
  const id = str(fd, 'id');
  try {
    const att = async (k: 'before' | 'after') => {
      const f = files(fd, `${k}_file`)[0];
      return f ? (await upload(s, f)).id : Number(str(fd, k) || 0);
    };
    const before = await att('before'), after = await att('after');
    if (!before || !after) return { ok: false, message: 'Add both a Before and an After photo.' };
    await wp(s, `/wc-alara/v1/admin/results${id ? `/${id}` : ''}`, { method: 'POST', json: {
      title: str(fd, 'title') || 'Client result', status: str(fd, 'status') === 'draft' ? 'draft' : 'publish',
      before, after, hair: str(fd, 'hair'), time: str(fd, 'time'), handle: str(fd, 'handle'),
      featured: fd.get('featured') === 'on', order: Number(str(fd, 'order') || 10),
    } });
  } catch (e) { return fail(e); }
  updateTag('results');
  refresh();
  return { ok: true, message: id ? 'Result updated.' : 'Result added to the Results Wall.' };
}

export async function trashResult(fd: FormData) {
  const s = await requireAdmin();
  const id = Number(str(fd, 'id'));
  if (id) await wp(s, `/wc-alara/v1/admin/results/${id}`, { method: 'DELETE' });
  updateTag('results');
  redirect('/admin/homepage?trashed=1#results');
}

/* ------------------------------------------------------------------ notifications */

export async function saveOrderEmails(_: Result | null, fd: FormData): Promise<Result> {
  const s = await requireAdmin();
  const list = str(fd, 'recipient').split(/[,\s]+/).filter(Boolean);
  const bad = list.find(e => !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e));
  if (!list.length || bad) return { ok: false, message: bad ? `“${bad}” is not a valid email address.` : 'Add at least one email address.' };
  try {
    await wp(s, '/wc/v3/settings/email_new_order/recipient', { method: 'PUT', json: { value: list.join(', ') } });
    await wp(s, '/wc/v3/settings/email_new_order/enabled', { method: 'PUT', json: { value: fd.get('enabled') === 'on' ? 'yes' : 'no' } });
    return { ok: true, message: `New-order emails go to ${list.join(', ')}.` };
  } catch (e) { return fail(e); }
}
