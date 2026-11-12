'use client';

import { useState } from 'react';

type Result = { status: string; message: string; invalid?: { field: string; message: string }[] };

// The Contact Form 7 form "Contact Us": same fields, labels and messages. It is sent to WordPress (see /api/contact),
// which validates it and emails it exactly as before.
export default function ContactForm() {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const errorFor = (f: string) => result?.invalid?.find(i => i.field === f)?.message;

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setBusy(true); setResult(null);
    try {
      const res = await fetch('/api/contact', { method: 'POST', body: new FormData(form) });
      const data = (await res.json()) as Result;
      setResult(data);
      if (data.status === 'mail_sent') form.reset();
    } catch {
      setResult({ status: 'mail_failed', message: 'There was an error trying to send your message. Please try again later.' });
    } finally { setBusy(false); }
  }

  const field = (name: string, label: string, el: React.ReactNode) => (
    <label className="cf-field">
      <span>{label}</span>
      {el}
      {errorFor(name) && <em className="cf-error" role="alert">{errorFor(name)}</em>}
    </label>
  );

  return (
    <form className="cf" onSubmit={submit} noValidate>
      {field('your-name', 'Your name', <input name="your-name" autoComplete="name" required aria-invalid={!!errorFor('your-name')} />)}
      {field('your-email', 'Your email', <input name="your-email" type="email" autoComplete="email" required aria-invalid={!!errorFor('your-email')} />)}
      {field('your-subject', 'Subject', <input name="your-subject" required aria-invalid={!!errorFor('your-subject')} />)}
      {field('your-message', 'Your message (optional)', <textarea name="your-message" rows={5} />)}
      {/* honeypot: real people never see or fill this */}
      <input className="hp" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" />
      <button className="cf-submit" type="submit" disabled={busy}>{busy ? 'Sending…' : 'Submit'}</button>
      {result && <p className={`cf-response${result.status === 'mail_sent' ? ' is-ok' : ''}`} role="status">{result.message}</p>}
    </form>
  );
}
