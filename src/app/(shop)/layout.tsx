import './shop.css';
import AuthProvider from '@/components/account/AuthPopup';
import CartDrawer from '@/components/cart/CartDrawer';
import CartProvider from '@/components/cart/CartProvider';
import Footer from '@/components/Footer';
import Header from '@/components/Header';
import { WhatsAppIcon } from '@/components/Icons';
import Snow from '@/components/Snow';
import TopBars from '@/components/TopBars';
import { footer } from '@/lib/site';

// Who ÀLara Line is, for Google (Organization + WebSite structured data), on every shop page.
const org = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization', '@id': 'https://alaraline.co/#organization', name: 'ÀLara Line', url: 'https://alaraline.co/',
      logo: 'https://alaraline.co/img/brand/alara-logo.png',
      founder: { '@type': 'Person', name: 'Lara Ammar' },
      email: footer.contact.email, telephone: '+961 81 624 204',
      address: { '@type': 'PostalAddress', addressLocality: 'Baabda', addressCountry: 'LB' },
      sameAs: footer.socials.filter(s => s.label !== 'WhatsApp' && !s.href.includes('search?')).map(s => s.href),
      contactPoint: { '@type': 'ContactPoint', telephone: '+961 81 624 204', contactType: 'customer service', areaServed: 'LB', availableLanguage: ['English', 'Arabic'] },
    },
    { '@type': 'WebSite', '@id': 'https://alaraline.co/#website', url: 'https://alaraline.co/', name: 'ÀLara Line', publisher: { '@id': 'https://alaraline.co/#organization' } },
  ],
};

export default function ShopLayout({ children }: LayoutProps<'/'>) {
  return (
    <AuthProvider>
    <CartProvider>
      <a className="skip" href="#main">Skip to content</a>
      <TopBars />
      <Header />
      <main id="main">{children}</main>
      <Footer />
      <a className="whatsapp" href={footer.socials.find(s => s.label === 'WhatsApp')!.href} target="_blank" rel="noopener noreferrer" aria-label="Chat with ÀLara on WhatsApp">
        <WhatsAppIcon />
      </a>
      <Snow />
      <CartDrawer />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(org).replace(/</g, '\\u003c') }} />
    </CartProvider>
    </AuthProvider>
  );
}
