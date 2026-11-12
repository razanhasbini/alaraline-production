'use client';

import { useState } from 'react';
import type { Review } from '@/lib/woo';

// The live "Customer Reviews | Questions" block: summary card (average, star bars, WRITE A REVIEW / ASK A QUESTION)
// and the reviews. Writing a review or a question happens on WordPress, which checks the customer bought the product.
export default function Reviews({ rating, count, reviews, writeUrl }: { rating: number; count: number; reviews: Review[]; writeUrl: string }) {
  const [tab, setTab] = useState<'reviews' | 'questions'>('reviews');
  const bars = [5, 4, 3, 2, 1].map(s => ({ s, pct: reviews.length ? Math.round((reviews.filter(r => Math.round(r.rating) === s).length / reviews.length) * 100) : 0 }));
  return (
    <section className="pdp-reviews" aria-label="Customer reviews and questions">
      <div className="wrap">
        <div className="ptabs" role="tablist">
          <button type="button" role="tab" aria-selected={tab === 'reviews'} onClick={() => setTab('reviews')}>Customer Reviews</button>
          <button type="button" role="tab" aria-selected={tab === 'questions'} onClick={() => setTab('questions')}>Questions</button>
        </div>
        <div className="rv-layout">
          <div className="rv-card">
            <p className="rv-avg">{rating ? rating.toFixed(1).replace(/\.0$/, '') : 0}</p>
            <p className="rv-stars" aria-label={`${rating} out of 5`}>{'★★★★★'}</p>
            <p className="rv-count">{count} Reviews, 0 Q&amp;As</p>
            <ul className="rv-bars">
              {bars.map(b => (
                <li key={b.s}><span>{b.s} {b.s === 1 ? 'star' : 'stars'}</span><i><b style={{ width: `${b.pct}%` }} /></i><span>{b.pct}%</span></li>
              ))}
            </ul>
            <a className="rv-btn" href={writeUrl}>✎ Write a review</a>
            <a className="rv-btn" href={writeUrl}>💬 Ask a question</a>
          </div>
          <div className="rv-list">
            {tab === 'reviews' ? (
              <>
                <p>Only logged in customers who have purchased this product may leave a review.</p>
                {reviews.length === 0 ? <p>There are no reviews yet.</p> : reviews.map(r => (
                  <article key={r.id} className="rv-item">
                    <p className="rv-stars" aria-label={`${r.rating} out of 5`}>{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</p>
                    <h3>{r.reviewer}</h3>
                    <div dangerouslySetInnerHTML={{ __html: r.review }} />
                  </article>
                ))}
              </>
            ) : (
              <h3 className="rv-q">0 Questions</h3>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
