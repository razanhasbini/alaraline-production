import type { Metadata } from 'next';
import Image from 'next/image';
import Crumbs from '@/components/Crumbs';
import content from '@/data/pages.json';

export const metadata: Metadata = {
  title: 'Our Story',
  description: 'ÀLara Line was born from the heart of South Lebanon. Founded by Lara Ammar, pharmacist and nutritionist, to redefine hair care with nature-powered formulas.',
  alternates: { canonical: '/about' },
};

// "Our Story" (live /about/), same text and photos as the Elementor page.
export default function AboutPage() {
  const a = content.about;
  return (
    <>
      <Crumbs items={[{ label: 'Home', href: '/' }, { label: 'Our Story' }]} />
      <section className="about-intro">
        <div className="wrap">
          <h2 className="about-mission">{a.mission}</h2>
          <div className="about-story">
            <Image className="about-portrait" src={a.portrait} alt="Lara Ammar, founder of ÀLara Line" width={1600} height={2133} sizes="(max-width: 900px) 100vw, 470px" priority />
            <div>
              <h1>{a.storyTitle}</h1>
              <div className="about-text" dangerouslySetInnerHTML={{ __html: a.storyHtml }} />
            </div>
          </div>
        </div>
      </section>
      <section className="about-promise">
        <div className="wrap about-promise-grid">
          <div className="about-left">
            <blockquote className="about-quote">
              <span className="about-quote-mark" aria-hidden="true">“</span>
              <p>{a.quote}</p>
              <footer><cite>{a.quoteAuthor}</cite><span>– {a.quotePosition}</span></footer>
            </blockquote>
            <Image src={a.promiseImage1} alt="" width={1024} height={1536} sizes="(max-width: 900px) 100vw, 360px" />
          </div>
          <div className="about-right">
            <h2>{a.promiseTitle}</h2>
            <div className="about-text" dangerouslySetInnerHTML={{ __html: a.promiseHtml }} />
            <Image src={a.promiseImage2} alt="" width={1200} height={1600} sizes="(max-width: 900px) 100vw, 580px" />
          </div>
        </div>
        <p className="about-closing">{a.closing}</p>
      </section>
    </>
  );
}
