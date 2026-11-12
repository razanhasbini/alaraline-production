'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import type { Bundle } from '@/lib/alara';
import BundlePhotos from './BundlePhotos';
import { useCart } from './cart/CartProvider';

type Props = { items: Bundle[]; symbol: string; prBoxPrice: number | null };

const money = (symbol: string, value: string) => `${symbol}${Number(value).toFixed(2)}`;

// Same look as the live "ÀLara Christmas Bundles" section: photo opens the details, rectangular burgundy
// "Add to cart". Bundles that need scents open the details first; the others go straight into the cart.
// The cart is WooCommerce's: it checks the scents, price, stock and adds the PR box fee itself.
export default function BundleGrid({ items, symbol, prBoxPrice }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const { call, busy } = useCart();
  const [notice, setNotice] = useState<{ slot: number; text: string; ok: boolean } | null>(null);
  const quickAdd = async (b: Bundle) => {
    const d = await call({ action: 'bundle', slot: b.slot, choices: {} });
    setNotice({ slot: b.slot, ok: d.ok, text: d.ok ? 'Added to cart ✓' : d.message ?? 'Could not add this bundle.' });
  };
  const [open, setOpen] = useState<Bundle | null>(null);
  const show = (b: Bundle) => { setOpen(b); dialog.current?.showModal(); };
  const close = () => dialog.current?.close();

  return (
    <>
      <div className="xb-grid">
        {items.map(b => (
          <article key={b.slot} className="xb-card">
            <BundlePhotos b={b} className="xb-photo" sizes="(max-width: 760px) 45vw, 300px" auto hover onOpen={() => show(b)} />
            <div className="xb-info">
              <h3 className="xb-name">{b.name}</h3>
              <BundlePrice b={b} symbol={symbol} />
              {b.choices.length > 0
                ? <button type="button" className="xb-add" onClick={() => show(b)}>Add to cart</button>
                : <button type="button" className="xb-add" disabled={busy} onClick={() => quickAdd(b)}>Add to cart</button>}
              {notice?.slot === b.slot && <p className={`xb-note-inline${notice.ok ? ' is-ok' : ''}`} role="status">{notice.text}</p>}
            </div>
          </article>
        ))}
      </div>

      <dialog ref={dialog} className="xb-dialog" aria-labelledby="xb-dialog-title" onClose={() => setOpen(null)}
        onClick={e => { if (e.target === e.currentTarget) close(); }}>
        {open && <BundleDetails b={open} symbol={symbol} prBoxPrice={prBoxPrice} onClose={close} />}
      </dialog>
    </>
  );
}

function BundlePrice({ b, symbol }: { b: Bundle; symbol: string }) {
  return (
    <div className="xb-price">
      {b.on_sale && Number(b.regular_price) > Number(b.price) && (
        <del><span className="sr-only">Original price was: </span>{money(symbol, b.regular_price)}</del>
      )}
      <ins><span className="sr-only">Current price is: </span>{money(symbol, b.price)}</ins>
    </div>
  );
}

function BundleDetails({ b, symbol, prBoxPrice, onClose }: { b: Bundle; symbol: string; prBoxPrice: number | null; onClose: () => void }) {
  const { call, busy, cart } = useCart();
  const router = useRouter();
  const [pr, setPr] = useState(cart?.packaging === 'pr');
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const next = ((e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null)?.value ?? 'cart';
    if (!form.reportValidity()) return;
    const choices = Object.fromEntries(b.choices.map(c => [c.key, String(new FormData(form).get(`choices[${c.key}]`) ?? '')]));
    setStatus({ ok: true, text: 'Adding to cart…' });
    if (prBoxPrice !== null && (pr ? 'pr' : 'bag') !== cart?.packaging) await call({ action: 'packaging', selection: pr ? 'pr' : 'bag' });
    const d = await call({ action: 'bundle', slot: b.slot, choices });
    if (!d.ok) { setStatus({ ok: false, text: d.message ?? 'Could not add this bundle.' }); return; }
    if (next === 'checkout') { onClose(); router.push('/checkout'); return; }
    setStatus({ ok: true, text: 'Added to cart ✓' });
  };
  return (
    <div className="xb-sheet">
      <button type="button" className="xb-close" onClick={onClose} aria-label="Close preview">×</button>
      <div className="xb-sheet-photos">
        <BundlePhotos b={b} className="xb-sheet-media" sizes="(max-width: 760px) 90vw, 370px" eager />
      </div>
      <div className="xb-sheet-body">
        <h3 id="xb-dialog-title">{b.name}</h3>
        <BundlePrice b={b} symbol={symbol} />
        <Details text={b.details} />
        <form className="xb-form" onSubmit={submit}>
          {b.choices.map(c => (
            <label key={c.key} className="xb-field">
              <span>Choose {c.label.toLowerCase()}</span>
              <select name={`choices[${c.key}]`} required defaultValue="">
                <option value="" disabled>Select a scent</option>
                {c.options.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </label>
          ))}
          {prBoxPrice !== null && (
            <label className={`xb-pr${pr ? ' is-selected' : ''}`}>
              <input type="checkbox" name="packaging" value="pr" checked={pr} onChange={e => setPr(e.target.checked)} className="sr-only" />
              <span className="xb-plus" aria-hidden="true">{pr ? '✓' : '+'}</span>
              <span className="xb-pr-copy">Wrapped in a pretty PR box</span>
              <span className="xb-pr-price">+{symbol}{prBoxPrice}</span>
            </label>
          )}
          <div className="xb-actions">
            <button className="xb-btn xb-btn-ghost" name="next" value="cart" disabled={busy}>Add to cart</button>
            <button className="xb-btn" name="next" value="checkout" disabled={busy}>Buy now</button>
          </div>
          {status && <p className={`xb-note-inline${status.ok ? ' is-ok' : ''}`} role="status">{status.text}</p>}
        </form>
      </div>
    </div>
  );
}

/** The popup text is typed in wp-admin as plain lines: "Heading:" lines, "- item" lists and paragraphs (as the live plugin renders it). */
function Details({ text }: { text: string }) {
  const blocks: React.ReactNode[] = [];
  let list: string[] = [];
  const flush = () => { if (list.length) { blocks.push(<ul key={blocks.length}>{list.map((l, i) => <li key={i}>{l}</li>)}</ul>); list = []; } };
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const bullet = line.match(/^(?:[-–—•*]\s*|\d+[.)]\s+)(.+)$/);
    if (bullet) { list.push(bullet[1]); continue; }
    flush();
    blocks.push(line.endsWith(':') ? <h4 key={blocks.length}>{line}</h4> : <p key={blocks.length}>{line}</p>);
  }
  flush();
  return <div className="xb-details">{blocks}</div>;
}
