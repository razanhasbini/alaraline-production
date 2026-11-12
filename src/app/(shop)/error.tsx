'use client';

import BusyNotice from '@/components/BusyNotice';

// A page inside the shop failed (header and footer stay): a friendly retry instead of a server error screen.
export default function ShopError() {
  return <BusyNotice />;
}
