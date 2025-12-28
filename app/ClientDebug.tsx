'use client';

import { useEffect } from 'react';

export default function ClientDebug() {
  useEffect(() => {
    // Only in development
    if (process.env.NODE_ENV === 'development') {
      import('@/utils/mobileDebug').catch(console.error);
    }
  }, []);

  return null;
}
