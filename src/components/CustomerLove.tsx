'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import reviews from '@/data/reviews.json';
import { wpImage } from '@/lib/wp-image';

// "Customer Love": the 11 reviews from the live Elementor testimonial widget, 3 per view on desktop,
// 2 on tablets, 1 on phones, moving every 6 seconds (live: 3, too quick to read a review) (paused on hover/focus and with reduced motion), with dots.
// Arrows like the Results Wall: only the right one at the start (with a small nudge), the left one once it has moved.
// Swiping works on touch screens; once the visitor moves it themselves, it stops moving on its own.
export default function CustomerLove() {
  const [index, setIndex] = useState(0);
  const [perView, setPerView] = useState(3);
  const paused = useRef(false);
  const touched = useRef(false);
  const startX = useRef<number | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const pages = Math.max(1, reviews.length - perView + 1);

  useEffect(() => {
    const mq = [matchMedia('(max-width: 760px)'), matchMedia('(max-width: 1080px)')];
    const update = () => setPerView(mq[0].matches ? 1 : mq[1].matches ? 2 : 3);
    update();
    mq.forEach(m => m.addEventListener('change', update));
    return () => mq.forEach(m => m.removeEventListener('change', update));
  }, []);

  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const id = setInterval(() => { if (!paused.current && !touched.current) setIndex(i => (i + 1) % pages); }, 6000);
    return () => clearInterval(id);
  }, [pages]);

  const current = Math.min(index, pages - 1);
  const go = (i: number) => { touched.current = true; setIndex(Math.max(0, Math.min(pages - 1, i))); };
  const showPrev = current > 0;
  const showNext = current < pages - 1;
  const arrow = (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9.5 5.5 16 12l-6.5 6.5" />
    </svg>
  );

  return (
    <section className="love" aria-labelledby="love-title">
      <div className="wrap">
        {/* the theme's comment icon, tinted pink like on live */}
        <span className="love-ic" aria-hidden="true" />
        <h2 id="love-title" className="love-title">Customer Love</h2>
        <p className="love-sub">Over 80K Positive Reviews</p>
        <div className="love-frame">
        <button className={`wall-arrow wall-prev love-arrow${showPrev ? '' : ' is-off'}`} type="button" aria-label="Previous reviews"
          onClick={() => go(current - 1)} tabIndex={showPrev ? 0 : -1} aria-hidden={!showPrev}>{arrow}</button>
        <div className="love-slider"
          onTouchStart={e => { startX.current = e.touches[0].clientX; }}
          onTouchEnd={e => {
            if (startX.current === null) return;
            const dx = e.changedTouches[0].clientX - startX.current;
            startX.current = null;
            if (Math.abs(dx) > 40) go(current + (dx < 0 ? 1 : -1));
          }}
          onMouseEnter={() => (paused.current = true)} onMouseLeave={() => (paused.current = false)}
          onFocus={() => (paused.current = true)} onBlur={() => (paused.current = false)}>
          <div className="love-track" style={{ transform: `translateX(-${(current * 100) / perView}%)` }}>
            {reviews.map((r, i) => (
              <figure key={r.name} className="love-card" aria-hidden={i < current || i >= current + perView}>
                <div className="love-stars" aria-label={`${r.rating} out of 5 stars`}>{'★'.repeat(r.rating)}</div>
                <blockquote dir="auto" className={open === r.name ? 'is-open' : undefined}>{r.text}</blockquote>
                {r.text.length > 230 && (
                  <button type="button" className="love-more" aria-expanded={open === r.name} onClick={() => { setOpen(o => (o === r.name ? null : r.name)); paused.current = open !== r.name; }}>
                    {open === r.name ? 'Show less' : 'Read more'}
                  </button>
                )}
                <figcaption>
                  <Image src={wpImage(r.avatar, 120)} alt="" width={60} height={60} sizes="60px" />
                  <cite>{r.name}</cite>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
        <button className={`wall-arrow wall-next love-arrow${showNext ? '' : ' is-off'}${current === 0 ? ' is-hint' : ''}`} type="button" aria-label="Next reviews"
          onClick={() => go(current + 1)} tabIndex={showNext ? 0 : -1} aria-hidden={!showNext}>{arrow}</button>
        </div>
        <div className="love-dots" role="tablist" aria-label="Reviews">
          {Array.from({ length: pages }, (_, i) => (
            <button key={i} type="button" role="tab" aria-selected={i === current} aria-label={`Show reviews ${i + 1}`} onClick={() => go(i)} />
          ))}
        </div>
      </div>
    </section>
  );
}
