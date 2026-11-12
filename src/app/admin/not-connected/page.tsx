import type { Metadata } from 'next';
import { logout } from '../actions';

export const metadata: Metadata = { title: 'Not connected' };

// Shown when this copy of the website has no admin key for the shop (WC_ADMIN_KEY / WC_ADMIN_SECRET).
export default function NotConnected() {
  return (
    <div className="ad-login">
      <div className="ad-login-card ad-notice">
        <p className="ad-brand">ÀLara <span>Admin</span></p>
        <h1>Not connected to the shop yet</h1>
        <p>This copy of the website has no admin key for the shop, so the panel can’t read or change orders, products or promo codes here.</p>
        <p>To test the panel safely, use the copy connected to the test shop. To use it on the real shop, add a Read/Write WooCommerce key as <code>WC_ADMIN_KEY</code> and <code>WC_ADMIN_SECRET</code>.</p>
        <form action={logout}><button type="submit" className="ad-btn">Sign out</button></form>
      </div>
    </div>
  );
}
