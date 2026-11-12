'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import reviews from '@/data/reviews.json';

// "Customer Love": the 11 reviews from the live Elementor testimonial widget, 3 per view on desktop,
// 2 on tablets, 1 on phones, moving every 6 seconds (live: 3, too quick to read a review) (paused on hover/focus and with reduced motion), with dots.
export default function CustomerLove() {
  const [index, setIndex] = useState(0);
  const [perView, setPerView] = useState(3);
  const paused = useRef(false);
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
    const id = setInterval(() => { if (!paused.current) setIndex(i => (i + 1) % pages); }, 6000);
    return () => clearInterval(id);
  }, [pages]);

  const current = Math.min(index, pages - 1);

  return (
    <section className="love" aria-labelledby="love-title">
      <div className="wrap">
        {/* the theme's comment icon, tinted pink like on live */}
        <span className="love-ic" aria-hidden="true" />
        <h2 id="love-title" className="love-title">Customer Love</h2>
        <p className="love-sub">Over 79K Positive Reviews</p>
        <div className="love-slider" onMouseEnter={() => (paused.current = true)} onMouseLeave={() => (paused.current = false)}
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
                  <Image src={r.avatar} alt="" width={60} height={60} sizes="60px" />
                  <cite>{r.name}</cite>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
        <div className="love-dots" role="tablist" aria-label="Reviews">
          {Array.from({ length: pages }, (_, i) => (
            <button key={i} type="button" role="tab" aria-selected={i === current} aria-label={`Show reviews ${i + 1}`} onClick={() => setIndex(i)} />
          ))}
        </div>
      </div>
    </section>
  );
}
