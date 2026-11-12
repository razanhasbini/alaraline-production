import { NextResponse } from 'next/server';

// The Contact page form, sent to the same Contact Form 7 form on WordPress ("Contact Us", id 8), so the email,
// its recipient and the validation messages stay exactly as configured in wp-admin.
const WC = process.env.WC_URL ?? 'https://alaraline.co';
const FORM_ID = 8, PAGE_ID = 733;

export async function POST(req: Request) {
  const input = await req.formData();
  if (String(input.get('website') ?? '')) return NextResponse.json({ status: 'spam', message: 'There was an error trying to send your message. Please try again later.' }, { status: 400 });

  const body = new FormData();
  for (const key of ['your-name', 'your-email', 'your-subject', 'your-message']) body.set(key, String(input.get(key) ?? '').slice(0, 5000));
  body.set('_wpcf7', String(FORM_ID));
  body.set('_wpcf7_locale', 'en_US');
  body.set('_wpcf7_unit_tag', `wpcf7-f${FORM_ID}-p${PAGE_ID}-o1`);
  body.set('_wpcf7_container_post', String(PAGE_ID));

  try {
    const res = await fetch(`${WC}/wp-json/contact-form-7/v1/contact-forms/${FORM_ID}/feedback`, {
      method: 'POST', body, headers: { 'X-Forwarded-For': req.headers.get('x-forwarded-for') ?? '' },
    });
    const data = (await res.json()) as { status: string; message: string; invalid_fields?: { field: string; message: string }[] };
    return NextResponse.json({ status: data.status, message: data.message, invalid: (data.invalid_fields ?? []).map(f => ({ field: f.field, message: f.message })) }, { status: res.ok ? 200 : 502 });
  } catch {
    return NextResponse.json({ status: 'mail_failed', message: 'There was an error trying to send your message. Please try again later.' }, { status: 502 });
  }
}
