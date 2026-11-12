import type { Metadata } from 'next';
import Image from 'next/image';
import ContactForm from '@/components/ContactForm';
import Crumbs from '@/components/Crumbs';
import content from '@/data/pages.json';
import { footer } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Contact',
  description: 'Questions or feedback? Contact ÀLara Line: +961 81 624 204, Info@alaraline.co.',
  alternates: { canonical: '/contact' },
};

// Live /contact/: coconut icon, "Keep in touch with us", Address / Phone Number / Email, then the "Sent a message" form.
export default function ContactPage() {
  const c = content.contact;
  return (
    <>
      <Crumbs items={[{ label: 'Home', href: '/' }, { label: 'Contact' }]} />
      <section className="contact-top">
        <div className="wrap">
          <Image className="contact-icon" src={c.icon} alt="" width={338} height={273} sizes="100px" />
          <h1>{c.title}</h1>
          <p className="contact-intro">{c.intro}</p>
          <div className="contact-boxes">
            <div className="cbox">
              <svg viewBox="0 0 48 48" aria-hidden="true"><path d="M17 8 4 13v27l13-5 14 5 13-5V8l-13 5Z" /><path d="M31 13v27M17 8v27" /><path d="M31 6a6 6 0 0 0-6 6c0 5 6 11 6 11s6-6 6-11a6 6 0 0 0-6-6Z" fill="#fff" /><circle cx="31" cy="12" r="2" /></svg>
              <div><h2>Address</h2><p>Beirut, Lebanon</p></div>
            </div>
            <div className="cbox">
              <svg viewBox="0 0 48 48" aria-hidden="true"><path d="M14 5 8 7c-2 6 1 15 9 23s17 11 23 9l2-6-9-5-4 4c-4-2-9-7-11-11l4-4Z" /></svg>
              <div><h2>Phone Number</h2><p><a href={`tel:${footer.contact.tel}`}>{footer.contact.phone}</a></p></div>
            </div>
            <div className="cbox">
              <svg viewBox="0 0 48 48" aria-hidden="true"><rect x="5" y="10" width="38" height="28" rx="3" /><path className="env-flap" d="m7 13 17 13 17-13" /></svg>
              <div><h2>Email</h2><p><a href={`mailto:${footer.contact.email}`}>{footer.contact.email}</a></p></div>
            </div>
          </div>
        </div>
      </section>
      <section className="contact-form-wrap" aria-labelledby="contact-form-title">
        <div className="contact-card">
          <h2 id="contact-form-title">{c.formTitle}</h2>
          <ContactForm />
        </div>
      </section>
    </>
  );
}
