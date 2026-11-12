'use client';

// Last resort (the root layout itself failed): a self-contained page in the shop's colours.
export default function GlobalError() {
  return (
    <html lang="en">
      <body style={{ margin: 0, minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#fff7fa', color: '#2a1219', fontFamily: 'Georgia, serif', textAlign: 'center', padding: '24px' }}>
        <main role="alert" style={{ maxWidth: 440, display: 'grid', gap: 16 }}>
          <p style={{ margin: 0, color: '#e85c9c', fontSize: 28 }}>ÀLara</p>
          <h1 style={{ margin: 0, fontWeight: 400, fontSize: 30 }}>One moment, please</h1>
          <p style={{ margin: 0, fontFamily: 'system-ui, sans-serif', lineHeight: 1.6 }}>The shop is very busy right now and this page didn&apos;t load. Please try again in a few seconds.</p>
          <p style={{ margin: 0 }}>
            <button type="button" onClick={() => location.reload()} style={{ font: '600 15px system-ui, sans-serif', padding: '12px 32px', border: 0, background: '#e85c9c', color: '#fff', cursor: 'pointer' }}>Try again</button>
          </p>
        </main>
      </body>
    </html>
  );
}
