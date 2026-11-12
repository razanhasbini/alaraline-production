import { NextResponse } from 'next/server';

// "Become a member" (The ÀLara Club), sent to the same Forminator form on WordPress (id 6648), so entries,
// notification emails and validation stay where they are today. A fresh security token is read from the
// live membership page for every submission, exactly as the page itself would send it.
const WC = process.env.WC_URL ?? 'https://alaraline.co';
const FORM_ID = '6648', PAGE_ID = '6642';
const FAIL = 'Something went wrong. Please try again in a moment.';

export async function POST(req: Request) {
  const input = await req.formData();
  if (String(input.get('website') ?? '')) return NextResponse.json({ success: false, message: FAIL }, { status: 400 });

  let nonce = '';
  try {
    const page = await (await fetch(`${WC}/membership/`, { cache: 'no-store', headers: { 'User-Agent': 'AlaraStorefront/1.0' } })).text();
    nonce = page.match(/name="forminator_nonce" value="([^"]+)"/)?.[1] ?? '';
  } catch { /* handled below */ }
  if (!nonce) return NextResponse.json({ success: false, message: FAIL }, { status: 502 });

  const body = new FormData();
  const text = (k: string, max = 500) => String(input.get(k) ?? '').slice(0, max);
  body.set('name-1', text('name-1'));
  body.set('email-1', text('email-1'));
  body.set('phone-1', text('phone-1', 40));
  // The form's date picker uses "mm/dd/yy" (jQuery UI) = MM/DD/YYYY; the browser's date input gives YYYY-MM-DD.
  const iso = text('date-1', 20).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  body.set('date-1', iso ? `${iso[2]}/${iso[3]}/${iso[1]}` : text('date-1', 20));
  if (input.get('radio-1')) body.set('radio-1', text('radio-1', 100));
  for (const v of input.getAll('checkbox-1[]')) body.append('checkbox-1[]', String(v).slice(0, 100));
  body.set('textarea-1', text('textarea-1', 3000));
  for (const v of input.getAll('checkbox-2[]')) body.append('checkbox-2[]', String(v).slice(0, 100));
  body.set('referer_url', '');
  body.set('forminator_nonce', nonce);
  body.set('_wp_http_referer', '/membership/');
  body.set('form_id', FORM_ID);
  body.set('page_id', PAGE_ID);
  body.set('form_type', 'default');
  body.set('current_url', `${WC}/membership/`);
  body.set('render_id', '0');
  body.set('action', 'forminator_submit_form_custom-forms');

  try {
    const res = await fetch(`${WC}/wp-admin/admin-ajax.php`, {
      method: 'POST', body, headers: { 'User-Agent': 'AlaraStorefront/1.0', 'X-Forwarded-For': req.headers.get('x-forwarded-for') ?? '' },
    });
    const data = (await res.json()) as { success: boolean; data?: { message?: string; errors?: Record<string, string>[] } };
    const errors = Object.assign({}, ...(data.data?.errors ?? [])) as Record<string, string>;
    return NextResponse.json({ success: !!data.success, message: stripTags(data.data?.message ?? (data.success ? '' : FAIL)), errors });
  } catch {
    return NextResponse.json({ success: false, message: FAIL }, { status: 502 });
  }
}

const stripTags = (s: string) => s.replace(/<[^>]+>/g, '').trim();
