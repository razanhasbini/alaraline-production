import type { Metadata } from 'next';
import './admin.css';

// The admin panel never appears in search engines (also blocked in robots.txt).
export const metadata: Metadata = {
  title: { default: 'Admin', template: '%s · ÀLara Admin' },
  robots: { index: false, follow: false },
};

export default function AdminRoot({ children }: LayoutProps<'/admin'>) {
  return <div className="ad">{children}</div>;
}
