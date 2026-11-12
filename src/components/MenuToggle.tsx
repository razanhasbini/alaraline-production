'use client';

import { useEffect, useState, type ReactNode } from 'react';

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
