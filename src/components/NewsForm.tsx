'use client';

import { useState } from 'react';

// Same as live: the signup isn't connected to a mailing list yet, so it says so instead of pretending.
export default function NewsForm() {
  const [message, setMessage] = useState('');
  return (
    <form className="ar-news-form" onSubmit={e => { e.preventDefault(); setMessage('The newsletter signup is not connected yet. Please contact Info@alaraline.co.'); }}>
      <input type="email" placeholder="Your email" aria-label="Email address" required />
      <button type="submit">Subscribe</button>
      <p className="ar-form-message" role="status">{message}</p>
    </form>
  );
}
