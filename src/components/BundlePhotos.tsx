'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import type { Bundle } from '@/lib/alara';

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
  const startX = useRef<number | null>(null);
  const swiped = useRef(false);

  useEffect(() => {
    if (!auto || photos.length < 2 || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const id = setInterval(() => { if (!document.hidden) setIndex(i => (i + 1) % photos.length); }, 30000);
    return () => clearInterval(id);
  }, [auto, photos.length]);

  const go = (i: number) => setIndex((i + photos.length) % photos.length);
  // hovering shows "the other" photo, then goes back
  const shown = hovering && photos.length > 1 ? (index + 1) % photos.length : index;

  return (
    <>
      <button type="button" className={className} aria-label={`View ${b.name} details`}
        onClick={() => { if (swiped.current) { swiped.current = false; return; } onOpen?.(); }}
        onPointerEnter={e => { if (hover && e.pointerType === 'mouse') setHovering(true); }}
        onPointerLeave={() => setHovering(false)}
        onPointerDown={e => { startX.current = e.clientX; }}
        onPointerUp={e => {
          if (startX.current === null || photos.length < 2) return;
          const dx = e.clientX - startX.current; startX.current = null;
          if (Math.abs(dx) > 40) { swiped.current = true; go(index + (dx < 0 ? 1 : -1)); }
        }}>
        <span className="xb-media">
          {photos.map((p, i) => (
            <span key={p.src} className={`xb-slide${i === shown ? ' is-active' : ''}`} aria-hidden={i !== shown}>
              <Image src={p.src} alt={`${b.name} photo ${i + 1}`} fill sizes={sizes} draggable={false} loading={eager ? 'eager' : 'lazy'} />
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
