'use client';

import { useEffect, useRef } from 'react';

// The live light falling snow (homepage widget "__alaraSnowV8"): same sizes, speeds and density, full strength
// over the hero too (on live the hero dimming targets the hidden #brown-slider, so it never applies). No snow piles on product photos. Off with reduced motion; pauses in background tabs.
export default function Snow() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const canvas = ref.current!;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    type Flake = { x: number; y: number; depth: number; r: number; speed: number; opacity: number; drift: number; phase: number };
    let W = 0, H = 0, flakes: Flake[] = [], raf = 0, last = 0;
    const rand = (a: number, b: number) => a + Math.random() * (b - a);
    const make = (initial: boolean): Flake => {
      const depth = Math.random();
      return {
        x: rand(-20, W + 20), y: initial ? rand(-10, H + 10) : rand(-90, -10), depth,
        r: depth < .18 ? rand(2.2, 4.6) : depth < .77 ? rand(1.25, 2.8) : rand(.65, 1.35),
        speed: depth < .18 ? rand(32, 56) : depth < .77 ? rand(55, 91) : rand(78, 118),
        opacity: depth < .18 ? rand(.22, .43) : depth < .77 ? rand(.63, .92) : rand(.5, .8),
        drift: rand(-12, 12), phase: rand(0, 6.283),
      };
    };
    const resize = () => {
      // phones fire "resize" while scrolling (the address bar shows/hides): only the height changes then, so the
      // flakes are kept (no jump, no rebuild mid-scroll); everything is rebuilt only when the width changes
      const widthChanged = innerWidth !== W;
      if (!widthChanged && Math.abs(innerHeight - H) < 2) return;
      W = innerWidth; H = innerHeight;
      const d = Math.min(devicePixelRatio || 1, 1.8);
      canvas.width = Math.max(1, Math.round(W * d)); canvas.height = Math.max(1, Math.round(H * d));
      ctx.setTransform(d, 0, 0, d, 0, 0);
      if (!widthChanged && flakes.length) return;
      const mobile = W < 768;
      const count = Math.round(Math.min(mobile ? 115 : 230, Math.max(mobile ? 70 : 155, W / (mobile ? 3.8 : 4.1))));
      flakes = Array.from({ length: count }, () => make(true));
    };
    const draw = (p: Flake) => {
      if (p.depth < .18) {
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 3.1);
        g.addColorStop(0, `rgba(255,252,255,${p.opacity})`);
        g.addColorStop(.35, `rgba(255,252,255,${p.opacity * .48})`);
        g.addColorStop(1, 'rgba(255,252,255,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 3.1, 0, Math.PI * 2); ctx.fill();
      } else {
        ctx.fillStyle = `rgba(255,252,255,${p.opacity})`; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
      }
    };
    const frame = (t: number) => {
      raf = 0;
      const dt = Math.min(.045, (t - last) / 1000 || .016); last = t;
      ctx.clearRect(0, 0, W, H);
      const wind = 16 * Math.sin(t * .00021) + 10 * Math.sin(t * .00063);
      for (const p of flakes) {
        p.y += p.speed * dt;
        p.x += (wind + (p.drift + Math.sin(t * .001 + p.phase) * 8)) * (.65 + p.depth * .6) * dt;
        if (p.y > H + 18) Object.assign(p, make(false));
        if (p.x > W + 20) p.x = -20;
        if (p.x < -20) p.x = W + 20;
        draw(p);
      }
      if (!document.hidden) raf = requestAnimationFrame(frame);
    };
    const onVisible = () => { if (!document.hidden && !raf) { last = performance.now(); raf = requestAnimationFrame(frame); } };
    resize();
    raf = requestAnimationFrame(frame);
    addEventListener('resize', resize, { passive: true });
    document.addEventListener('visibilitychange', onVisible);
    return () => { cancelAnimationFrame(raf); removeEventListener('resize', resize); document.removeEventListener('visibilitychange', onVisible); };
  }, []);

  return <canvas ref={ref} className="snow" aria-hidden="true" />;
}
