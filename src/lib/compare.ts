import { lean, type LeanProduct } from './lean';
import { decode, type Product, type Tab } from './woo';

// What the Compare table shows. Everything comes from the text the team wrote in wp-admin; nothing is made up.
// WooCommerce has no "size" field here, so the size is read from the product's own text ("(500 mL)") or, for a
// single product, from the line that names it inside a set ("Hydra Gloss Repair Shampoo (500 mL)").

export type CompareItem = LeanProduct & {
  size: string;          // "500 mL", "3 products" for a set, '' when the text doesn't say
  included: string[];    // a set's contents, as listed in its description: "Curl Boosting Cream (500 mL)"
  about: string;         // the product's own description, plain text
  group: 'Sets & offers' | 'Hair care' | 'Hair accessories';
};
export type CompareTabs = { ingredients: string; howTo: string; about: string };

/** HTML written in wp-admin, as plain text with its line breaks and list bullets kept. */
export function toText(html: string): string {
  return decode(html
    .replace(/<li[^>]*>/gi, '• ')
    .replace(/<br\s*\/?>|<\/(p|li|h\d|div|ul|ol)>/gi, '\n')
    .replace(/<[^>]+>/g, ' '))
    .replace(/[ \t ]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{2,}/g, '\n')
    .trim();
}

const UNIT = String.raw`(\d+(?:\.\d+)?)\s?(ml|g|gr|oz|capsules)\b`;
const unit = (n: string, u: string) => `${n} ${/^ml$/i.test(u) ? 'mL' : u.toLowerCase() === 'gr' ? 'g' : u.toLowerCase()}`;
const words = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').split(' ').filter(w => w && w !== 'the');

/** A set's contents: the "– Name (size): …" lines after "This set includes:". */
function contents(text: string): { name: string; size: string }[] {
  const at = text.search(/includes?\s*:/i);
  if (at < 0) return [];
  // a dash starts a new item only after a space or a full stop ("15–20 days" and "Pro-Edition" stay whole)
  return text.slice(at).split(/(?:^|[\s.:;])[–-]\s*(?=[A-ZÀ-Ý])/).slice(1)
    .map(chunk => {
      const m = chunk.match(/^\s*([^():\n]{2,60}?)\s*(\(([^)]*)\))?\s*(:|\n|$)/);
      if (!m || !(m[2] || m[4] === ':' || chunk.trim().length <= 60)) return null;
      const s = m[3]?.match(new RegExp(UNIT, 'i'));
      return { name: m[1].trim(), size: s ? unit(s[1], s[2]) : '' };
    })
    .filter((x): x is { name: string; size: string } => !!x && x.name.length > 2)
    // the short and the long description can both list the contents
    .filter((x, i, all) => all.findIndex(y => y.name.toLowerCase() === x.name.toLowerCase()) === i);
}

export function compareItems(products: Product[]): CompareItem[] {
  const plain = new Map(products.map(p => [p.id, toText(`${p.shortDescription}\n${p.description}`)]));
  const sets = new Map(products.map(p => [p.id, contents(plain.get(p.id) ?? '')]));
  // every "Name (size)" named inside a set, most specific name first
  const known = [...sets.values()].flat().filter(c => c.size)
    .map(c => ({ w: words(c.name), size: c.size }))
    .sort((a, b) => b.w.length - a.w.length);

  return products.map(p => {
    const text = plain.get(p.id) ?? '';
    const included = sets.get(p.id) ?? [];
    const isSet = included.length > 1 || p.categories.some(c => c.slug === 'offers');
    let size = '';
    if (included.length > 1) size = `${included.length} products`;
    else if (!isSet) {
      const own = text.match(new RegExp(UNIT, 'i'));
      if (own) size = unit(own[1], own[2]);
      else {
        const name = new Set(words(p.name));
        size = known.find(k => k.w.every(w => name.has(w)))?.size ?? '';
      }
    }
    // a set's description is mostly its contents list: keep only the words before it
    const intro = included.length ? text.slice(0, text.search(/(this (set|pouch|kit|collection)\s+)?includes?\s*:/i)).trim() : text;
    const about = intro.length > 30 && words(intro).length > words(p.name).length + 2 ? intro : '';
    const slugs = p.categories.map(c => c.slug);
    return {
      ...lean(p),
      size,
      included: included.map(c => c.size ? `${c.name} (${c.size})` : c.name),
      about,
      group: isSet ? 'Sets & offers' : slugs.includes('hair-accessories') ? 'Hair accessories' : 'Hair care',
    };
  });
}

/** The "Ingredients" and "How to Use" tabs (and a "Description" tab, used when the product has no description). */
export function compareTabs(tabs: Tab[]): CompareTabs {
  const find = (re: RegExp) => toText(tabs.find(t => re.test(t.title))?.content ?? '');
  return { ingredients: find(/ingredient/i), howTo: find(/how\s*to\s*use|usage|directions/i), about: find(/^description$/i) };
}
