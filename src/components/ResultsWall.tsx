import Image from 'next/image';
import { getResults, type ResultPhoto } from '@/lib/alara';
import WallTrack from './WallTrack';
import { wpImage } from '@/lib/wp-image';

// "The Results Wall": same markup and polaroid styling as the live Alara Client Results plugin (v1.2.0).
// Entries are managed in wp-admin → Client Results. Only the visible photos load; the rest load as you scroll.
export default async function ResultsWall() {
  const items = await getResults();
  if (!items?.length) return null;
  const photo = (p: ResultPhoto, cls: string) => (
    <Image className={cls} src={wpImage(p.src, 520)} alt={p.alt || ''} width={p.width ?? 400} height={p.height ?? 500}
      sizes="(max-width: 760px) 65vw, (max-width: 1080px) 30vw, 18vw" />
  );
  return (
    <section className="clients" aria-labelledby="results-title">
      <div className="lwrap">
        <header className="cr-head">
          <p className="cr-eyebrow">Our clients</p>
          <h2 className="title squiggle" id="results-title">The Results Wall</h2>
          <p className="cr-sub">Before and after, shared with us by our clients.</p>
        </header>
        <WallTrack>
          {items.map(e => (
            <article key={e.id} className="cr-pair" role="listitem">
              <div className="pol-stage">
                <figure className="pol-card pol-before">
                  <span className="pol-tape" aria-hidden="true" />
                  {photo({ ...e.before, alt: e.before.alt || 'before' }, 'pol-img')}
                  <figcaption>Before</figcaption>
                </figure>
                <figure className="pol-card pol-after">
                  <span className="pol-clip" aria-hidden="true" />
                  {photo({ ...e.after, alt: e.after.alt || 'after' }, 'pol-img')}
                  <figcaption>After</figcaption>
                </figure>
              </div>
            </article>
          ))}
        </WallTrack>
      </div>
    </section>
  );
}
