"use client";

import dynamic from 'next/dynamic';

const AdminContentJournalsClient = dynamic(() => import('./AdminContentJournalsClient'), { ssr: false });

export default function Page() {
  return <AdminContentJournalsClient />;
}
