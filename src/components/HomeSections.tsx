import Image from 'next/image';
import Link from 'next/link';
import { essentials } from '@/lib/site';
import { wpImage } from '@/lib/wp-image';

// Static homepage sections, with the same text, images and links as the live Elementor page.

export function Essentials() {
  return (
    <section className="ess" aria-labelledby="ess-title">
      <div className="wrap">
        <h2 id="ess-title" className="title">Your Hair Essentials</h2>
        <div className="cats">
          {essentials.map(c => (
            <Link key={c.slug} className="cat" href={`/product-category/${c.slug}`}>
              <span className="cat-img"><Image src={wpImage(c.img, 640)} alt="" fill sizes="(max-width: 1080px) 45vw, 300px" /></span>
              <h5>{c.name}</h5>
            </Link>
          ))}
        </div>
        <p className="center"><Link className="btn" href="/shop">View all products</Link></p>
      </div>
    </section>
  );
}

export function Elevate() {
  return (
    <section className="elevate" aria-labelledby="elevate-title">
      <div className="elevate-copy">
        <Image className="elevate-bee" src={wpImage('https://alaraline.co/wp-content/uploads/2026/07/IMG_5814-1.png', 280)} alt="" width={138} height={138} sizes="138px" />
        <h2 id="elevate-title" className="title">Elevate Your Haircare Routine with ÀLara Line</h2>
        <p>ÀLara Line Exclusive Lineup of Dreamy Hair Essentials!</p>
        <Link className="btn" href="/about">Explore more</Link>
      </div>
      <div className="elevate-media">
        <Image className="elevate-img" src="/img/home/elevate-buttered-up-mask.webp" alt="" width={1414} height={1235} sizes="(max-width: 1080px) 90vw, 50vw" />
      </div>
    </section>
  );
}

const FEATURES = [
  { icon: 'https://alaraline.co/wp-content/uploads/2021/04/shipping-icon.svg', w: 77, h: 80, title: 'Available Delivery', text: 'We deliver all over Lebanon' },
  { icon: 'https://alaraline.co/wp-content/uploads/2021/04/natural-icon.svg', w: 48, h: 76, title: 'Naturally derived', text: 'Natural & organic hair products' },
  { icon: 'https://alaraline.co/wp-content/uploads/2021/04/payment-icon.svg', w: 81, h: 66, title: 'Cash On Delivery', text: 'Different payment options available' },
];

export function Features() {
  return (
    <section className="features" aria-label="Why shop with us">
      <div className="wrap features-row">
        {FEATURES.map(f => (
          <div key={f.title} className="feature">
            {/* eslint-disable-next-line @next/next/no-img-element -- tiny SVG icons from WordPress */}
            <img src={f.icon} alt="" width={f.w} height={f.h} loading="lazy" />
            <div><h3>{f.title}</h3><p>{f.text}</p></div>
          </div>
        ))}
      </div>
    </section>
  );
}
