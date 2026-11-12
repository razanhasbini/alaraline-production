import type { Metadata } from 'next';
import Crumbs from '@/components/Crumbs';
import content from '@/data/pages.json';

export const metadata: Metadata = {
  title: 'FAQ',
  description: 'Answers about ÀLara Line: organic formulas, safety for kids and pregnancy, curly hair, cruelty-free, and choosing the right product.',
  alternates: { canonical: '/faqs' },
};

// Live /faqs/ (the menu's FAQ): the six ÀLara questions, first one open. The footer's /faq/ link (theme demo page) comes here too.
export default function FaqPage() {
  const f = content.faqs;
  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'FAQPage',
    mainEntity: f.items.map(i => ({ '@type': 'Question', name: i.title, acceptedAnswer: { '@type': 'Answer', text: i.content.replace(/<[^>]+>/g, '') } })),
  };
  return (
    <>
      <Crumbs items={[{ label: 'Home', href: '/' }, { label: 'FAQ' }]} />
      <section className="wrap faq">
        <h1>{f.title}</h1>
        <div className="faq-list">
          {f.items.map((i, n) => (
            <details key={i.title} open={n === 0}>
              <summary>{i.title}</summary>
              <div dangerouslySetInnerHTML={{ __html: i.content }} />
            </details>
          ))}
        </div>
      </section>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
    </>
  );
}
