'use client';

import { useState } from 'react';

type Photo = { id: number; src: string };

/** Product photos: the first one is the main photo. Move, remove, and add new ones (uploaded to the WordPress Media Library on save). */
export default function PhotoManager({ initial }: { initial: Photo[] }) {
  const [photos, setPhotos] = useState(initial);
  const [previews, setPreviews] = useState<string[]>([]);
  const move = (i: number, d: number) => setPhotos(p => {
    const n = [...p]; const j = i + d;
    if (j < 0 || j >= n.length) return p;
    [n[i], n[j]] = [n[j], n[i]]; return n;
  });
  return (
    <div className="ad-photos">
      <input type="hidden" name="images" value={photos.map(p => p.id).join(',')} />
      <ul>
        {photos.map((p, i) => (
          <li key={p.id}>
            {/* eslint-disable-next-line @next/next/no-img-element -- admin thumbnails from WordPress */}
            <img src={p.src} alt="" />
            {i === 0 && <span className="ad-tag">Main photo</span>}
            <div>
              <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move left">←</button>
              <button type="button" onClick={() => move(i, 1)} disabled={i === photos.length - 1} aria-label="Move right">→</button>
              <button type="button" onClick={() => setPhotos(ps => ps.filter(x => x.id !== p.id))} aria-label="Remove photo">✕</button>
            </div>
          </li>
        ))}
        {previews.map(src => (
          <li key={src} className="is-new">
            {/* eslint-disable-next-line @next/next/no-img-element -- local preview */}
            <img src={src} alt="" />
            <span className="ad-tag">New</span>
          </li>
        ))}
      </ul>
      <label className="ad-file">
        <span>Add photos</span>
        <input type="file" name="newImages" accept="image/*" multiple onChange={e => setPreviews([...(e.target.files ?? [])].map(f => URL.createObjectURL(f)))} />
      </label>
      <p className="ad-hint">Removing a photo here only takes it off this product; it stays in the shop’s photo library.</p>
    </div>
  );
}
