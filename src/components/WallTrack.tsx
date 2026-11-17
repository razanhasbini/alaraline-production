'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

// The Results Wall's arrows, on every screen (phones too) so people can see the wall moves sideways.
// At the start only the right arrow shows, with a small nudge. Once the visitor swipes or clicks forward,
// the left arrow appears so they can go back. The right arrow goes away at the end, and both go away
// when every photo fits on the screen. Swiping still works as before.
export default function WallTrack({ children }: { children: ReactNode }) {
  const track = useRef<HTMLDivElement>(null);
  const [state, setState] = useState({ atStart: true, atEnd: false, fits: false });

  useEffect(() => {
    const el = track.current!;
    const update = () => {
      // snapping parks the first and last pair at the track's side padding, so count that as the start or end
      const end = el.scrollWidth - el.clientWidth;
      const cs = getComputedStyle(el);
      const padL = parseFloat(cs.paddingLeft) || 0, padR = parseFloat(cs.paddingRight) || 0;
      setState({ atStart: el.scrollLeft <= padL + 4, atEnd: el.scrollLeft >= end - padR - 4, fits: end < 5 });
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

  const showPrev = !state.fits && !state.atStart;
  const showNext = !state.fits && !state.atEnd;
  const arrow = (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 12h15M13.5 6.5 19 12l-5.5 5.5" />
    </svg>
  );

  return (
    <div className="wall-frame">
      <button className={`wall-arrow wall-prev${showPrev ? '' : ' is-off'}`} type="button" aria-label="Previous client results"
        onClick={() => move(-1)} tabIndex={showPrev ? 0 : -1} aria-hidden={!showPrev}>{arrow}</button>
      <div className="cr-grid" ref={track} role="list" tabIndex={0} aria-label="Swipe through before and after photos">{children}</div>
      <button className={`wall-arrow wall-next${showNext ? '' : ' is-off'}${state.atStart ? ' is-hint' : ''}`} type="button" aria-label="Next client results"
        onClick={() => move(1)} tabIndex={showNext ? 0 : -1} aria-hidden={!showNext}>{arrow}</button>
    </div>
  );
}
