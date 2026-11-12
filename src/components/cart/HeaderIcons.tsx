'use client';

import Link from 'next/link';
import { BagIcon, HeartIcon, SearchIcon, UserIcon } from '../Icons';
import { useAuth } from '../account/AuthPopup';
import { useCart } from './CartProvider';
import { useWishlist } from './Wishlist';

/** Header icons with live counts: search, wishlist, shopping bag (opens the drawer), account. */
export default function HeaderIcons() {
  const { cart, setDrawer } = useCart();
  const { ids } = useWishlist();
  const auth = useAuth();
  return (
    <div className="header-actions">
      <Link className="icon-btn hide-phone" href="/search" aria-label="Search"><SearchIcon /></Link>
      <Link className="icon-btn" href="/wishlist" aria-label={`Wishlist, ${ids.length} items`}><HeartIcon /><span className="count">{ids.length}</span></Link>
      <button type="button" className="icon-btn" onClick={() => setDrawer(true)} aria-label={`Shopping bag, ${cart?.count ?? 0} items`}><BagIcon /><span className="count">{cart?.count ?? 0}</span></button>
      {auth.signedIn ? (
        <>
          <Link className="login-link" href="/my-account">My account</Link>
          <Link className="icon-btn hide-desktop" href="/my-account" aria-label="My account"><UserIcon /></Link>
        </>
      ) : (
        <>
          <button type="button" className="login-link" onClick={() => auth.open('login')}>Log in</button>
          <button type="button" className="icon-btn hide-desktop" onClick={() => auth.open('login')} aria-label="Log in"><UserIcon /></button>
        </>
      )}
    </div>
  );
}
