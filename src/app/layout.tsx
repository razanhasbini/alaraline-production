import type { Metadata, Viewport } from 'next';
import { DM_Sans, PT_Serif } from 'next/font/google';
import localFont from 'next/font/local';
import './globals.css';

// Fonts are self-hosted by Next.js (no request to Google at runtime) and swap in without layout shift.
const butler = localFont({
  src: [
    { path: './fonts/Butler-Regular.otf', weight: '400' },
    { path: './fonts/Butler-Medium.otf', weight: '500' },
  ],
  variable: '--font-butler',
  display: 'swap',
});
const dmSans = DM_Sans({ subsets: ['latin'], variable: '--font-dm-sans', display: 'swap' });
const ptSerif = PT_Serif({ subsets: ['latin'], weight: ['400', '700'], style: ['normal', 'italic'], variable: '--font-pt-serif', display: 'swap' });

const DESCRIPTION = 'ÀLara Line: natural haircare from Lebanon. Treatment sets, hair growth care, curl care, masks and hair mists made with clean, non-toxic ingredients. Cash on delivery across Lebanon.';

export const metadata: Metadata = {
  metadataBase: new URL('https://alaraline.co'),
  title: { default: 'ÀLara Line | Natural Haircare from Lebanon', template: '%s | ÀLara Line' },
  description: DESCRIPTION,
  applicationName: 'ÀLara Line',
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website', siteName: 'ÀLara Line', locale: 'en_US', url: '/',
    title: 'ÀLara Line | Natural Haircare from Lebanon', description: DESCRIPTION,
    images: [{ url: 'https://alaraline.co/wp-content/uploads/2026/07/IMG_5831.png', width: 724, height: 1024, alt: 'ÀLara Line haircare and honey' }],
  },
  twitter: { card: 'summary_large_image', title: 'ÀLara Line | Natural Haircare from Lebanon', description: DESCRIPTION },
};

export const viewport: Viewport = { themeColor: '#ffffff', width: 'device-width', initialScale: 1 };

// Shared by the shop (src/app/(shop)/layout.tsx) and the admin panel (src/app/admin/layout.tsx).
export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" className={`${butler.variable} ${dmSans.variable} ${ptSerif.variable}`}>
      <body>{children}</body>
    </html>
  );
}
