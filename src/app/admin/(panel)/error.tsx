'use client';

// If a page can't load (the shop didn't answer, a key was refused…), say so and offer a retry,
// instead of a blank screen.
export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <section className="ad-card ad-notice" role="alert">
      <h1>This page couldn’t load</h1>
      <p>The shop didn’t answer in time or refused the request. Your data is safe; nothing was changed.</p>
      {process.env.NODE_ENV !== 'production' && error.message && <p className="ad-muted"><code>{error.message}</code></p>}
      <button type="button" className="ad-btn" onClick={() => reset()}>Try again</button>
    </section>
  );
}
