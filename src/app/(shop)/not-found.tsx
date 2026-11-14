import Link from 'next/link';

// Page not found, inside the shop (header, menu, bag and footer stay), with the ways back.
export default function NotFound() {
  return (
    <section className="busy" aria-labelledby="nf-title">
      <p className="busy-mark" aria-hidden="true">ÀLara</p>
      <h1 id="nf-title">We couldn&apos;t find that page</h1>
      <p>The link may be old or mistyped. Everything from the shop is still here.</p>
      <div className="busy-actions">
        <Link className="btn" href="/shop">Go to the shop</Link>
        <Link className="busy-home" href="/">Back to the home page</Link>
      </div>
    </section>
  );
}
