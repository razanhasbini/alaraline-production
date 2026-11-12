import type { Metadata } from 'next';
import Image from 'next/image';
import Crumbs from '@/components/Crumbs';
import content from '@/data/pages.json';

export const metadata: Metadata = {
  title: 'Ingredients',
  description: 'The natural ingredients in ÀLara Line haircare: honey, coconut butter, African shea butter, mango butter, rosemary oil, argan oil and biotin.',
  alternates: { canonical: '/ingredients' },
};

// Live /ingredients/: one row per ingredient, photo on the left, name and text on the right.
export default function IngredientsPage() {
  return (
    <>
      <Crumbs items={[{ label: 'Home', href: '/' }, { label: 'Ingredients' }]} />
      <h1 className="sr-only">Ingredients</h1>
      <div className="wrap ingredients">
        {content.ingredients.map((i, n) => (
          <section key={i.name} className="ingredient" aria-labelledby={`ing-${n}`}>
            <div className="ingredient-img"><Image src={i.image} alt={i.name} fill sizes="(max-width: 760px) 100vw, 345px" priority={n === 0} /></div>
            <div>
              <h2 id={`ing-${n}`}>{i.name}</h2>
              <div dangerouslySetInnerHTML={{ __html: i.html }} />
            </div>
          </section>
        ))}
      </div>
    </>
  );
}
