import type { Metadata } from 'next';
import Image from 'next/image';
import Crumbs from '@/components/Crumbs';
import MembershipForm from '@/components/MembershipForm';
import content from '@/data/pages.json';
import { getProducts } from '@/lib/woo';
import './membership.css';

export const metadata: Metadata = {
  title: 'Membership',
  description: 'Join The ÀLara Club: be first to discover new launches, early access to products and offers, events, birthday surprises and member gifts.',
  alternates: { canonical: '/membership' },
};

const PERKS = [
  'Be among the first to discover our newest launches.',
  'Enjoy early access to selected products and special offers.',
  'Stay in the loop about our events and get exclusive opportunities to join us.',
  'Celebrate your birthday with special discounts and little surprises.',
  'Enjoy exclusive member offers and delightful gifts.',
];

// "Become A Member": the welcome (the ÀLara team's own words) next to the club photo, then the sign-up form,
// which still goes to the same Forminator form on WordPress.
export default async function MembershipPage() {
  // each favourite shows the product as it is in the shop today (current name and packaging photo)
  const products = await getProducts().catch(() => []);
  const favorites = content.membershipForm.favorites.map(o => {
    const p = products.find(x => x.id === o.productId);
    return { value: o.value, label: p?.name ?? o.label, image: p?.images[0]?.src ?? o.image };
  });
  return (
    <>
      <Crumbs items={[{ label: 'Home', href: '/' }, { label: 'Membership' }]} />

      <section className="club" aria-labelledby="club-title">
        <div className="wrap club-grid">
          <div className="club-copy">
            <h1 id="club-title">Hello, beauty!<br />Welcome to The ÀLara Club</h1>
            <p className="club-lead">
              Your <em>hair</em> deserves a little extra love and <strong>so do you!</strong> Become
              a <strong>member</strong> of the <em>ÀLara Line family</em> and enjoy sweet little perks along the way:
            </p>
            <ul className="club-perks">
              {PERKS.map(p => <li key={p}>{p}</li>)}
            </ul>
            <p className="club-close">A little more care, a little more magic, and a whole lot of <em>bee-autiful</em> hair days.</p>
            <p className="club-belong"><strong>Join the club, YOU belong here!</strong> <span aria-hidden="true">♡</span></p>
            <a className="club-cta" href="#join">Become a member</a>
          </div>
          <figure className="club-photo">
            <Image src="/img/membership/club.webp" alt="ÀLara Line Hydra Gloss shampoo, Leave-in Hair Cream, The Miracle Pro-Edition, Intense Hydration conditioner and Buttered Up Mask on the pink ÀLara box" fill priority sizes="(max-width: 900px) 100vw, 50vw" />
          </figure>
        </div>
      </section>

      <section id="join" className="club-join" aria-labelledby="join-title">
        <div className="wrap club-join-grid">
          <div className="club-join-head">
            <h2 id="join-title">Join the club</h2>
            <p>Tell us a little about you and your hair. It takes about a minute.</p>
          </div>
          <MembershipForm favorites={favorites} />
        </div>
      </section>
    </>
  );
}
