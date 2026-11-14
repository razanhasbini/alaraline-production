import { NextResponse } from 'next/server';
import { compareTabs, type CompareTabs } from '@/lib/compare';
import { getProducts, getProductTabs } from '@/lib/woo';

// Ingredients and How to Use for the products in the Compare table (at most 4). Each product's tabs are the same
// cached read the product page uses, so this rarely reaches WordPress. Only ids of real products are looked up.
export async function GET(req: Request) {
  const asked = (new URL(req.url).searchParams.get('ids') ?? '').split(',').map(Number).filter(n => Number.isInteger(n) && n > 0);
  try {
    const known = new Set((await getProducts()).map(p => p.id));
    const ids = [...new Set(asked)].filter(id => known.has(id)).slice(0, 4);
    const out: Record<number, CompareTabs> = {};
    await Promise.all(ids.map(async id => { out[id] = compareTabs(await getProductTabs(id)); }));
    return NextResponse.json({ ok: true, tabs: out }, { headers: { 'Cache-Control': 'private, max-age=600' } });
  } catch (e) {
    console.error(JSON.stringify({ t: new Date().toISOString(), wp: 'compare route', error: String((e as Error)?.message ?? e).slice(0, 160) }));
    return NextResponse.json({ ok: false }, { status: 503 });
  }
}
