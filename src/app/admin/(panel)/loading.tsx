// Shown the moment an admin link is clicked, while the page checks the sign-in and loads its data from the shop.
// Next.js wraps every admin page in its own <Suspense> with this as the fallback, so navigation never freezes.
export default function AdminLoading() {
  return (
    <div className="ad-skeleton" role="status" aria-live="polite">
      <span className="sr-only">Loading…</span>
      <div className="ad-sk ad-sk-title" />
      <div className="ad-sk ad-sk-line" />
      <div className="ad-sk ad-sk-card" />
      <div className="ad-sk ad-sk-card" />
    </div>
  );
}
