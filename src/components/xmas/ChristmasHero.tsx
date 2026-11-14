'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import type { BoxProduct, BoxScene, Phase } from './boxScene';
import './hero.css';

// The live homepage hero (WordPress plugin "ÀLara Christmas 3D Hero", same source): the ÀLara PR box on burgundy.
// The words and button are in the HTML straight away; the 3D film (three.js) is downloaded only after the page
// is interactive, so it never delays the first paint. Reduced-motion users get the box without the film.

const PRODUCTS: BoxProduct[] = [
  { id: 'shampoo', name: 'Hydra Gloss Repair Shampoo' },
  { id: 'conditioner', name: 'Intense Hydration Conditioner' },
  { id: 'tube', name: 'Leave-in Hair Cream' },
  { id: 'miracle', name: 'The Miracle Pro-Edition' },
  { id: 'jar', name: 'Buttered Up Mask' },
];
// "Discover the box" opens the set that's in the box (shampoo, conditioner, leave-in, Miracle Pro-Edition, mask)
const BOX = '/product/full-treatment-set';

export default function ChristmasHero() {
  const stage = useRef<HTMLDivElement>(null);
  const tags = useRef<HTMLDivElement>(null);
  const scene = useRef<BoxScene | null>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [phase, setPhase] = useState<Phase>('turn');
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    const canvas = document.createElement('canvas');
    canvas.className = 'xh-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    stage.current!.prepend(canvas);
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
    import('./boxScene')
      .then(m => m.createBoxScene(canvas, { reducedMotion, products: PRODUCTS, tagLayer: tags.current!, onPhase: setPhase, onActive: setActive }))
      .then(s => { if (!alive) { s.dispose(); return; } scene.current = s; setReady(true); })
      .catch(() => alive && setFailed(true));
    return () => { alive = false; scene.current?.dispose(); scene.current = null; canvas.remove(); };
  }, []);

  const inside = phase === 'open' || phase === 'reveal' || phase === 'settle' || phase === 'rest';

  return (
    <section className={`xh${inside ? ' is-inside' : ''}${ready ? ' is-ready' : ''}`} aria-labelledby="xh-title">
      <div className="xh-stage" ref={stage}>
        {/* eslint-disable-next-line @next/next/no-img-element -- fallback only when WebGL is unavailable */}
        {failed && <img className="xh-fallback" src="/live/xmas/lid-bee.webp" alt="" width={1104} height={738} />}
        <div className="xh-tags" ref={tags} aria-hidden="true" />
      </div>

      <div className="xh-copy">
        <h1 id="xh-title" className="sr-only">ÀLara Line natural haircare from Lebanon: the ÀLara Christmas Box</h1>
        <div className="xh-words-wrap">
          <div className="xh-words" aria-hidden={inside}>
            <p className="xh-head">The ÀLara <em>Christmas</em> Box</p>
            <p className="xh-text">Pure Honey haircare in pink and gold, wrapped for the season.</p>
          </div>
          <div className="xh-words xh-words-inside" aria-hidden={!inside}>
            <p className="xh-head">Your bee-autiful hair journey <em>begins here</em></p>
            <ul className="xh-list" aria-label="In the box">
              {PRODUCTS.map(p => <li key={p.id} className={active === p.id ? 'is-active' : undefined}>{p.name}</li>)}
            </ul>
          </div>
        </div>
        <div className="xh-actions">
          <Link className="xh-btn" href={BOX}>Discover the box <span aria-hidden="true">→</span></Link>
          <button type="button" className="xh-link" onClick={() => scene.current?.replay()} disabled={!ready}>Replay</button>
        </div>
      </div>
    </section>
  );
}
