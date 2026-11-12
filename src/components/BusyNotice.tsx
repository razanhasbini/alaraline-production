'use client';

/** Shown instead of a server error page when the shop couldn't load a page (usually WordPress being busy). */
export default function BusyNotice() {
  return (
    <section className="busy" role="alert">
      <p className="busy-mark" aria-hidden="true">ÀLara</p>
      <h1>One moment, please</h1>
      <p>The shop is very busy right now and this page didn&apos;t load. Please try again in a few seconds.</p>
      <div className="busy-actions">
        <button type="button" className="btn" onClick={() => location.reload()}>Try again</button>
        {/* a full page load on purpose: after an error, start fresh rather than navigate inside the broken page */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a className="busy-home" href="/">Back to the home page</a>
      </div>
    </section>
  );
}
