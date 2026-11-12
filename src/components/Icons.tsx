// Line icons in the style of the live header (Phosphor-like, 1.4 stroke).
const base = { width: 24, height: 24, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.4, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true };

export const SearchIcon = () => <svg {...base}><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></svg>;
export const HeartIcon = () => (
  <svg {...base}><path d="M12 20s-7.5-4.6-9.3-9.2C1.4 7.4 3.6 4 7 4c2.1 0 3.6 1.2 5 3 1.4-1.8 2.9-3 5-3 3.4 0 5.6 3.4 4.3 6.8C19.5 15.4 12 20 12 20Z" /></svg>
);
export const BagIcon = () => (
  <svg {...base}><path d="M3.5 7h17l-1.3 12.2a1 1 0 0 1-1 .8H5.8a1 1 0 0 1-1-.8L3.5 7Z" /><path d="M8.5 11a3.5 3.5 0 0 0 7 0" /><path d="M8 7V6a4 4 0 0 1 8 0v1" /></svg>
);
export const CompareIcon = () => <svg {...base}><path d="M4 8h15m-4-4 4 4-4 4M20 16H5m4-4-4 4 4 4" /></svg>;
export const EyeIcon = () => <svg {...base}><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></svg>;
export const TikTokIcon = () => <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 3v11a5 5 0 1 1-5-5M14 5c1.2 2.8 3 4.1 6 4.3" fill="none" stroke="currentColor" strokeWidth="1.8" /></svg>;
export const UserIcon =() => <svg {...base}><circle cx="12" cy="8" r="4" /><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" /></svg>;
export const Caret = () => (
  <svg width="8" height="8" viewBox="0 0 10 10" aria-hidden="true"><path d="m2 3.5 3 3 3-3" fill="none" stroke="currentColor" strokeWidth="1.2" /></svg>
);
export const Arrow = () => <span aria-hidden="true" className="arrow">→</span>;

export const FacebookIcon = () => <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 8h3V4h-3c-2.2 0-4 1.8-4 4v2H8v4h2v8h4v-8h3l1-4h-4V8.5c0-.3.2-.5.5-.5Z" fill="none" stroke="currentColor" strokeWidth="1.4" /></svg>;
export const InstagramIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="3.5" width="17" height="17" rx="5" fill="none" stroke="currentColor" strokeWidth="1.4" /><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth="1.4" /><circle cx="17.2" cy="6.8" r="1" fill="currentColor" /></svg>
);
export const WhatsAppIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20l1.2-4A8 8 0 1 1 8 19Z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" /><path d="M9 8.5c0 3.5 3 6.5 6.5 6.5l1-1.6-2-1-1 .9a5 5 0 0 1-2.8-2.8l.9-1-1-2Z" fill="currentColor" /></svg>
);
