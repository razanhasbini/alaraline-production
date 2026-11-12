'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

// The ‹ › arrows of the Results Wall (same behaviour as the live plugin's results.js): one pair per click,
// disabled at either end, hidden when everything fits. Swiping works natively.
export default function WallTrack({ children }: { children: ReactNode }) {
  const track = useRef<HTMLDivElement>(null);
  const [state, setState] = useState({ atStart: true, atEnd: false, fits: false });

  useEffect(() => {
    const el = track.current!;
    const update = () => {
      const end = el.scrollWidth - el.clientWidth;
      setState({ atStart: el.scrollLeft < 4, atEnd: el.scrollLeft >= end - 4, fits: end < 5 });
    };
    update();
    el.addEventListener('scroll', update, { passive: true });
    addEventListener('resize', update, { passive: true });
    return () => { el.removeEventListener('scroll', update); removeEventListener('resize', update); };
  }, []);

  const move = (dir: number) => {
    const el = track.current!;
    const item = el.querySelector<HTMLElement>('.cr-pair');
    if (!item) return;
    const gap = parseFloat(getComputedStyle(el).columnGap) || 0;
    el.scrollBy({ left: dir * (item.getBoundingClientRect().width + gap), behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  };

  return (
    <div className="wall-frame">
      <button className="wall-arrow wall-prev" type="button" aria-label="Previous client results" onClick={() => move(-1)} disabled={state.atStart} hidden={state.fits}>‹</button>
      <div className="cr-grid" ref={track} role="list" tabIndex={0} aria-label="Swipe through before and after photos">{children}</div>
      <button className="wall-arrow wall-next" type="button" aria-label="Next client results" onClick={() => move(1)} disabled={state.atEnd} hidden={state.fits}>›</button>
    </div>
  );
}
