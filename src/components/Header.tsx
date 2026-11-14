import Image from 'next/image';
import Link from 'next/link';
import { nav } from '@/lib/site';
import HeaderIcons from './cart/HeaderIcons';
import MenuToggle, { SubMenu } from './MenuToggle';

// Same menu, logo, icons and links as the live Makeaholic header. Only the phone menu button runs in the browser.
export default function Header() {
  return (
    <header className="site-header">
      <div className="header-row">
        <MenuToggle>
          {nav.map(item => item.children
            ? <SubMenu key={item.label} label={item.label} href={item.href} items={item.children} />
            : <div key={item.label}><NavLink href={item.href}><span>{item.label}</span></NavLink></div>)}
        </MenuToggle>
        <Link className="logo" href="/" aria-label="ÀLara Line home">
          <Image src="/img/brand/alara-logo.webp" alt="ÀLara Line" width={440} height={227} priority unoptimized />
        </Link>
        <HeaderIcons />
      </div>
    </header>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return href.startsWith('/') ? <Link href={href}>{children}</Link> : <a href={href}>{children}</a>;
}
