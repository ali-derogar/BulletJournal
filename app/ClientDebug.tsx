'use client';

import { useEffect } from 'react';

export default function ClientDebug() {
  useEffect(() => {
    // Load mobile debug in both dev and production for mobile debugging
    import('@/utils/mobileDebug').catch(console.error);
  }, []);

  return null;
}
