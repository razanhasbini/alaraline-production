'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import type { Bundle } from '@/lib/alara';
import { srcSetOf, wpImage } from '@/lib/wp-image';

/** The bundle's photos (1 or 2), deduplicated, as the live plugin does. */
export const photosOf = (b: Bundle) =>
  [b.image, b.image2].filter((p): p is NonNullable<typeof p> => !!p).filter((p, i, a) => a.findIndex(q => q.src === p.src) === i);

/**
 * Bundle photos: they cross-fade. On a computer, hovering the card shows the second photo;
 * on phones, swipe or tap the dots. On cards the next photo also comes in every 30 seconds
 * (like the live plugin), never with reduced motion or in a background tab.
 */
export default function BundlePhotos({ b, sizes, auto = false, eager = false, hover = false, onOpen, className }: {
  b: Bundle; sizes: string; auto?: boolean; eager?: boolean; hover?: boolean; onOpen?: () => void; className: string;
}) {
  const photos = photosOf(b);
  const [index, setIndex] = useState(0);
  const [hovering, setHovering] = useState(false);
  // The second photo is hidden until hover, swipe, a dot or the 30 s change: it downloads only then, or once the page
  // has finished loading, so it never competes with the photos people see first.
  const [armed, setArmed] = useState(eager);
  useEffect(() => {
    if (armed || photos.length < 2) return;
    let t: ReturnType<typeof setTimeout> | undefined;
    const later = () => { t = setTimeout(() => setArmed(true), 2500); };
    if (document.readyState === 'complete') later(); else addEventListener('load', later, { once: true });
    return () => { removeEventListener('load', later); clearTimeout(t); };
  }, [armed, photos.length]);
  const startX = useRef<number | null>(null);
  const swiped = useRef(false);

  useEffect(() => {
    if (!auto || photos.length < 2 || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const id = setInterval(() => { if (!document.hidden) setIndex(i => (i + 1) % photos.length); }, 30000);
    return () => clearInterval(id);
  }, [auto, photos.length]);

  const go = (i: number) => { setArmed(true); setIndex((i + photos.length) % photos.length); };
  // hovering shows "the other" photo, then goes back
  const shown = hovering && photos.length > 1 ? (index + 1) % photos.length : index;

  return (
    <>
      <button type="button" className={className} aria-label={`View ${b.name} details`}
        onClick={() => { if (swiped.current) { swiped.current = false; return; } onOpen?.(); }}
        onPointerEnter={e => { setArmed(true); if (hover && e.pointerType === 'mouse') setHovering(true); }}
        onPointerLeave={() => setHovering(false)}
        onPointerDown={e => { setArmed(true); startX.current = e.clientX; }}
        onPointerUp={e => {
          if (startX.current === null || photos.length < 2) return;
          const dx = e.clientX - startX.current; startX.current = null;
          if (Math.abs(dx) > 40) { swiped.current = true; go(index + (dx < 0 ? 1 : -1)); }
        }}>
        <span className="xb-media">
          {photos.map((p, i) => (
            <span key={p.src} className={`xb-slide${i === shown ? ' is-active' : ''}`} aria-hidden={i !== shown}>
              {(i === 0 || i === shown || armed) && (
                <Image src={wpImage(p.src, 900)} {...srcSetOf(p.src, 900)} alt={`${b.name} photo ${i + 1}`} fill sizes={sizes} draggable={false} loading={eager ? 'eager' : 'lazy'} />
              )}
            </span>
          ))}
        </span>
      </button>
      {photos.length > 1 && (
        <div className="xb-dots" role="group" aria-label={`${b.name} photos`}>
          {photos.map((_, i) => (
            <button key={i} type="button" className={i === shown ? 'is-active' : undefined} aria-pressed={i === shown}
              aria-label={`Show photo ${i + 1} of ${photos.length}`} onClick={() => go(i)} />
          ))}
        </div>
      )}
    </>
  );
}
