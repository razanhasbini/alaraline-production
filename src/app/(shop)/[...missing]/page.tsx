import { notFound } from 'next/navigation';

// Any address no other page claims lands here, so the shop's own "not found" page (with header and footer) shows,
// with a real 404 status. More specific routes (pages, /api, /admin, /wp-content) always win over this one.
export default function Missing() {
  notFound();
}
