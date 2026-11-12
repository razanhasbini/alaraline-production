'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import content from '@/data/pages.json';

type Result = { success: boolean; message: string; errors?: Record<string, string> };

// The Forminator form "The ÀLara Club" (id 6648): same fields, names, options and product photos, grouped into
// three short steps. It is sent to WordPress (see /api/membership), which validates it, stores the entry and
// sends the emails as before.
export default function MembershipForm({ favorites }: { favorites: { value: string; label: string; image: string }[] }) {
  const f = content.membershipForm;
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [first, setFirst] = useState('');
  const [noPhoto, setNoPhoto] = useState<Record<string, true>>({});
  const err = (k: string) => result?.errors?.[k];

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    // the browser's own checks first (required fields, email format), shown next to the field
    const bad = [...form.querySelectorAll<HTMLInputElement>('input[required]')].find(i => !i.checkValidity());
    if (bad) { bad.reportValidity(); return; }
    setBusy(true); setResult(null);
    setFirst(String(new FormData(form).get('name-1') ?? '').trim().split(/\s+/)[0] ?? '');
    try {
      const res = await fetch('/api/membership', { method: 'POST', body: new FormData(form) });
      const data = (await res.json()) as Result;
      setResult(data);
      if (data.success) { form.reset(); document.getElementById('join')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    } catch {
      setResult({ success: false, message: 'Something went wrong. Please try again in a moment.' });
    } finally { setBusy(false); }
  }

  if (result?.success) {
    return (
      <div className="mf-done" role="status">
        <p className="mf-done-title">Welcome to the club{first ? `, ${first}` : ''} <span aria-hidden="true">♡</span></p>
        <p>{result.message || 'Thank you! You are now part of The ÀLara Club.'}</p>
        <Link className="club-cta" href="/shop">Discover our products</Link>
      </div>
    );
  }

  const text = (name: string, label: string, props: React.InputHTMLAttributes<HTMLInputElement>, required = true) => (
    <label className="mf-field">
      <span>{label}{required && <i aria-hidden="true"> *</i>}</span>
      <input name={name} required={required} aria-invalid={!!err(name)} {...props} />
      {err(name) && <em className="mf-error" role="alert">{err(name)}</em>}
    </label>
  );

  return (
    <form className="mf" onSubmit={submit} noValidate>
      <fieldset className="mf-step">
        <legend>About you</legend>
        <div className="mf-pair">
          {text('name-1', f.labels.name, { autoComplete: 'name' })}
          {text('email-1', f.labels.email, { type: 'email', autoComplete: 'email' })}
          {text('phone-1', f.labels.phone, { type: 'tel', autoComplete: 'tel' })}
          <label className="mf-field">
            <span>{f.datePlaceholder} <small>(for your birthday surprise)</small></span>
            <input name="date-1" type="date" aria-label={f.labels.date} />
          </label>
        </div>
      </fieldset>

      <fieldset className="mf-step">
        <legend>{f.labels.favorite}</legend>
        <div className="mf-products">
          {favorites.map(o => (
            <label key={o.value} className="mf-product">
              <input type="radio" name="radio-1" value={o.value} />
              <span className="mf-product-img">
                {o.image && !noPhoto[o.value]
                  ? <Image src={o.image} alt="" fill sizes="(max-width: 600px) 30vw, 120px" onError={() => setNoPhoto(n => ({ ...n, [o.value]: true }))} />
                  : <span className="mf-product-mono" aria-hidden="true">{o.label.replace(/[^A-Za-zÀ-ÿ ]/g, '').split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('')}</span>}
              </span>
              <span className="mf-product-name">{o.label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="mf-step">
        <legend>{f.labels.surprises}</legend>
        <div className="mf-chips">
          {f.surprises.map(o => <label key={o.value} className="mf-chip"><input type="checkbox" name="checkbox-1[]" value={o.value} /><span>{o.label}</span></label>)}
        </div>
        <label className="mf-field mf-suggest">
          <span>{f.labels.suggestions}</span>
          <textarea name="textarea-1" rows={3} placeholder={f.suggestionsPlaceholder} />
        </label>
      </fieldset>

      <fieldset className="mf-step">
        <legend>{f.labels.contact}</legend>
        <div className="mf-ways">
          {f.contactPrefs.map(o => {
            const [way, ...rest] = o.label.split(' — ');
            return (
              <label key={o.value} className="mf-way">
                <input type="checkbox" name="checkbox-2[]" value={o.value} />
                <span><b>{way}</b>{rest.length > 0 && <small>{rest.join(' — ')}</small>}</span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <input className="hp" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" />
      {result && !result.success && <p className="mf-fail" role="alert">{result.message}</p>}
      <button className="club-cta mf-submit" type="submit" disabled={busy}>{busy ? 'Joining…' : 'Join the club'}</button>
    </form>
  );
}
