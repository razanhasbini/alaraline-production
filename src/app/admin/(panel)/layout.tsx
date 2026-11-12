import Link from 'next/link';
import { Suspense } from 'react';
import { requireAdmin } from '@/lib/admin/session';
import { logout } from '../actions';

const NAV = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/orders', label: 'Orders' },
  { href: '/admin/products', label: 'Products' },
  { href: '/admin/promo-codes', label: 'Promo codes' },
  { href: '/admin/homepage', label: 'Homepage' },
  { href: '/admin/notifications', label: 'Notifications' },
];

export default function PanelLayout({ children }: LayoutProps<'/admin'>) {
  return (
    <div className="ad-shell">
      <aside className="ad-side">
        <Link href="/admin" className="ad-brand">ÀLara <span>Admin</span></Link>
        <nav aria-label="Admin">
          {NAV.map(n => <Link key={n.href} href={n.href}>{n.label}</Link>)}
        </nav>
        <div className="ad-side-foot">
          <Link href="/" target="_blank">View website ↗</Link>
          <Suspense fallback={null}><Who /></Suspense>
        </div>
      </aside>
      <main className="ad-main">
        {/* each page streams behind its own boundary: see loading.tsx next to this file */}
        {children}
      </main>
    </div>
  );
}

async function Who() {
  const s = await requireAdmin();
  return (
    <form action={logout} className="ad-who">
      <span>Signed in as <b>{s.name}</b></span>
      <button type="submit">Sign out</button>
    </form>
  );
}
