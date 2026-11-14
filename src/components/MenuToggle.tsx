'use client';

import Link from 'next/link';
import { useEffect, useId, useState, type ReactNode } from 'react';
import { Caret } from './Icons';

/**
 * A menu item with sub-links (Shop). On desktop: a link with a hover dropdown. On phones the row starts closed and
 * opens on tap, with "Shop all" first, so the menu doesn't open as one long list.
 */
export function SubMenu({ label, href, items }: { label: string; href: string; items: { label: string; href: string }[] }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <div className={`has-sub${open ? ' is-expanded' : ''}`}>
      <Link className="nav-desk" href={href}><span>{label}</span><Caret /></Link>
      <button type="button" className="sub-toggle" aria-expanded={open} aria-controls={id} onClick={() => setOpen(o => !o)}>
        <span>{label}</span><Caret />
      </button>
      <div className="sub" id={id}>
        <Link className="nav-mob" href={href}>{label} all</Link>
        {items.map(c => <Link key={c.label} href={c.href}>{c.label}</Link>)}
      </div>
    </div>
  );
}

// The only header code that runs in the browser: opens/closes the menu on phones and tablets,
// closes it when a link is chosen and on Escape. The links themselves are server-rendered children.
export default function MenuToggle({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <>
      <button className="menu-btn" type="button" aria-expanded={open} aria-controls="main-nav" onClick={() => setOpen(o => !o)}>
        <span /><span /><span /><span className="sr-only">Menu</span>
      </button>
      <nav id="main-nav" className={`nav${open ? ' is-open' : ''}`} aria-label="Main"
        onClick={e => { if ((e.target as HTMLElement).closest('a')) setOpen(false); }}>
        {children}
      </nav>
    </>
  );
}
