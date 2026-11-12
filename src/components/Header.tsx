import Image from 'next/image';
import Link from 'next/link';
import { nav } from '@/lib/site';
import HeaderIcons from './cart/HeaderIcons';
import { Caret } from './Icons';
import MenuToggle from './MenuToggle';

// Same menu, logo, icons and links as the live Makeaholic header. Only the phone menu button runs in the browser.
export default function Header() {
  return (
    <header className="site-header">
      <div className="header-row">
        <MenuToggle>
          {nav.map(item => (
            <div key={item.label} className={item.children ? 'has-sub' : undefined}>
              <NavLink href={item.href}><span>{item.label}</span>{item.children && <Caret />}</NavLink>
              {item.children && (
                <div className="sub">
                  {item.children.map(c => <NavLink key={c.label} href={c.href}>{c.label}</NavLink>)}
                </div>
              )}
            </div>
          ))}
        </MenuToggle>
        <Link className="logo" href="/" aria-label="ÀLara Line home">
          <Image src="/img/brand/alara-logo.png" alt="ÀLara Line" width={800} height={412} priority sizes="(min-width: 1200px) 110px, 66px" />
        </Link>
        <HeaderIcons />
      </div>
    </header>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return href.startsWith('/') ? <Link href={href}>{children}</Link> : <a href={href}>{children}</a>;
}
