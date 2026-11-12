import Countdown from './Countdown';

// The two bars above the header on alaraline.co:
// 1. HashBar announcement #6478 (burgundy): "Enjoy our Limited Offers NOW! ✨  Offer ends in: 18h 3m 36s",
//    counting down to the next 08:00 Beirut time (the "Hashbar Loop" snippet).
// 2. The theme's top bar (pink): "Happy Holidays ✨".
export default function TopBars() {
  return (
    <>
      <div className="hashbar" role="region" aria-label="Announcement">
        <p className="hashbar-msg">Enjoy our Limited Offers NOW! ✨</p>
        <p className="hashbar-timer"><span>Offer ends in:</span> <Countdown /></p>
      </div>
      <div className="topbar"><p>Happy Holidays ✨</p></div>
    </>
  );
}
