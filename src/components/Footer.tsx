import Image from 'next/image';
import Link from 'next/link';
import { footer } from '@/lib/site';
import NewsForm from './NewsForm';

const ICONS: Record<string, React.ReactNode> = {
  Facebook: <path d="M14 22V12h4l.6-4H14V6c0-1.2.4-2 2-2h2V1a24 24 0 0 0-3-.2C12 .8 10 2.7 10 6v2H7v4h3v10" />,
  Instagram: <><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="1" /></>,
  TikTok: <path d="M14 3v11a5 5 0 1 1-5-5M14 5c1.2 2.8 3 4.1 6 4.3" />,
  WhatsApp: <><path d="M20.5 11.7a8.5 8.5 0 0 1-12.4 7.5L3 21l1.8-5.1a8.5 8.5 0 1 1 15.7-4.2Z" strokeLinejoin="round" /><path d="M8.5 7.8c-.4 0-.8.2-1 .7-.4.8-.4 1.6 0 2.4 1 2.2 2.8 4 5 5 .8.4 1.7.4 2.4 0l1-.8c.2-.2.2-.5 0-.7l-2-1c-.2-.1-.4 0-.5.1l-.8.9c-1.3-.6-2.5-1.8-3.1-3.1l.9-.8c.2-.1.2-.3.1-.5l-1-2c-.1-.2-.3-.3-.5-.3Z" strokeLinecap="round" strokeLinejoin="round" /></>,
};

function NavA({ href, children }: { href: string; children: React.ReactNode }) {
  return href.startsWith('/') ? <Link href={href}>{children}</Link> : <a href={href}>{children}</a>;
}

// The live sitewide footer (Code Snippet #11 "ALARA SITEWIDE FOOTER"), rebuilt once for every page.
export default function Footer() {
  const { contact } = footer;
  return (
    <footer className="site-footer">
      <svg className="footer-curve" viewBox="0 0 1440 44" preserveAspectRatio="none" aria-hidden="true">
        <path fill="#fff" d="M0 0H1440V18C1310 40 1240 38 1110 22 985 7 875 8 740 28 607 45 505 41 377 22 237 2 127 8 0 28Z" />
      </svg>
      <div className="ar-wrap">
        <div className="ar-grid">
          <div className="ar-brand">
            <Image className="ar-logo" src="/img/brand/alara-logo.png" alt="ÀLara Line" width={800} height={412} sizes="140px" />
            <p>Made using clean, non-toxic ingredients, our products are designed for everyone.</p>
            <p className="ar-greet">Merry Christmas from the hive.</p>
            <div className="ar-socials">
              {footer.socials.map(s => (
                <a key={s.label} aria-label={s.label} href={s.href} target="_blank" rel="noopener noreferrer"><svg viewBox="0 0 24 24">{ICONS[s.label]}</svg></a>
              ))}
            </div>
          </div>
          <div className="ar-col">
            <h3>Get In Touch</h3>
            <a href={`mailto:${contact.email}`}>✉ &nbsp; {contact.email}</a>
            <a href={`tel:${contact.tel}`}>♧ &nbsp; {contact.phone}</a>
            <span>⌖ &nbsp; {contact.place}</span>
          </div>
          <div className="ar-col">
            <h3>Shop</h3>
            {footer.shop.map(l => <NavA key={l.label} href={l.href}>{l.label}</NavA>)}
          </div>
          <div className="ar-col">
            <h3>Quick Links</h3>
            {footer.quick.map(l => <NavA key={l.label} href={l.href}>{l.label}</NavA>)}
          </div>
          <div className="ar-news">
            <h3>Join the hive</h3>
            <p>Hair rituals, new launches and offers — straight to your inbox.</p>
            <NewsForm />
          </div>
        </div>
        <div className="ar-base"><span>ÀLara Line | 2026</span><span>Website By Blue Boost Agency</span></div>
      </div>
    </footer>
  );
}
