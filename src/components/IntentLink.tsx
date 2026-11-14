'use client';

import Link from 'next/link';
import { useState, type ComponentProps } from 'react';

/**
 * A link that loads its page in advance only when the visitor shows intent (hover, touch, keyboard focus), not as
 * soon as it scrolls into view. The home page has dozens of links (menu, footer, product cards): loading them all
 * on arrival made ~30 extra requests per visit, competing with the photos and counting against the Workers quota.
 */
export default function IntentLink({ onMouseEnter, onTouchStart, onFocus, ...props }: ComponentProps<typeof Link>) {
  const [intent, setIntent] = useState(false);
  return (
    <Link
      {...props}
      prefetch={intent ? null : false}
      onMouseEnter={e => { setIntent(true); onMouseEnter?.(e); }}
      onTouchStart={e => { setIntent(true); onTouchStart?.(e); }}
      onFocus={e => { setIntent(true); onFocus?.(e); }}
    />
  );
}
