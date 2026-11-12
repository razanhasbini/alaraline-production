'use client';

import BusyNotice from '@/components/BusyNotice';

// The shop's frame itself (header, menu) failed to load: the same friendly retry, without the header.
export default function RootError() {
  return <BusyNotice />;
}
