'use client';

import Image from 'next/image';
import { useState } from 'react';
import type { Img } from '@/lib/woo';

export default function Gallery({ images, name }: { images: Img[]; name: string }) {
  const [i, setI] = useState(0);
  const main = images[i] ?? images[0];
  if (!main) return <div className="gallery-main" />;
  return (
    <div className="gallery">
      <div className="gallery-main">
        <Image src={main.src} alt={main.alt || name} fill priority sizes="(max-width: 900px) 100vw, 50vw" />
      </div>
      {images.length > 1 && (
        <div className="thumbs">
          {images.map((img, n) => (
            <button key={img.src} type="button" aria-pressed={n === i} aria-label={`Show photo ${n + 1} of ${images.length}`} onClick={() => setI(n)}>
              <Image src={img.src} alt="" fill sizes="72px" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
