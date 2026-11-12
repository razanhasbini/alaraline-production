'use client';

import { useEffect, useState } from 'react';

/** Milliseconds until the next 08:00 in Beirut (handles daylight saving through Intl). */
function untilNextBeirut8(now = new Date()): number {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Beirut', hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })
      .formatToParts(now).map(p => [p.type, p.value]),
  );
  const h = Number(parts.hour), m = Number(parts.minute), s = Number(parts.second);
  const secondsToday = h * 3600 + m * 60 + s;
  const target = 8 * 3600;
  const diff = secondsToday < target ? target - secondsToday : 86400 - secondsToday + target;
  return diff * 1000;
}

function format(ms: number) {
  const t = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(t / 86400), h = Math.floor((t % 86400) / 3600), m = Math.floor((t % 3600) / 60), s = t % 60;
  return `${d ? `${d}d ` : ''}${h}h ${m}m ${s}s`;
}

export default function Countdown() {
  const [left, setLeft] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setLeft(untilNextBeirut8());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  // Rendered empty on the server so the static page never shows a stale time.
  return <span className="hashbar-count" suppressHydrationWarning>{left === null ? ' ' : format(left)}</span>;
}
