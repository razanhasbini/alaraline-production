'use client';

import { useSyncExternalStore } from 'react';

// Wishlist and compare lists, kept in this browser (like the live wishlist for visitors who aren't logged in).
// Product ids only; the pages load the real product data from WooCommerce.

function listStore(key: string, max: number) {
  const listeners = new Set<() => void>();
  let cache: number[] | null = null;
  const read = (): number[] => {
    if (cache) return cache;
    try { cache = JSON.parse(localStorage.getItem(key) ?? '[]').filter((n: unknown) => typeof n === 'number'); } catch { cache = []; }
    return cache!;
  };
  const write = (ids: number[]) => {
    cache = ids.slice(-max);
    try { localStorage.setItem(key, JSON.stringify(cache)); } catch { /* storage unavailable: keep in memory */ }
    listeners.forEach(l => l());
  };
  const EMPTY: number[] = [];
  return {
    subscribe(l: () => void) {
      listeners.add(l);
      const onStorage = (e: StorageEvent) => { if (e.key === key) { cache = null; l(); } };
      addEventListener('storage', onStorage);
      return () => { listeners.delete(l); removeEventListener('storage', onStorage); };
    },
    get: read,
    server: () => EMPTY,
    toggle(id: number) { const ids = read(); write(ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id]); },
    remove(id: number) { write(read().filter(x => x !== id)); },
    clear() { write([]); },
  };
}

const wish = listStore('alara_wishlist', 100);
const compare = listStore('alara_compare', 4);

export function useWishlist() {
  const ids = useSyncExternalStore(wish.subscribe, wish.get, wish.server);
  return { ids, has: (id: number) => ids.includes(id), toggle: wish.toggle, remove: wish.remove, clear: wish.clear };
}

export function useCompare() {
  const ids = useSyncExternalStore(compare.subscribe, compare.get, compare.server);
  return { ids, has: (id: number) => ids.includes(id), toggle: compare.toggle, remove: compare.remove, clear: compare.clear };
}
