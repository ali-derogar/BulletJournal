"use client";

import dynamic from 'next/dynamic';

const AdminContentOverviewClient = dynamic(() => import('./AdminContentOverviewClient'), { ssr: false });

export default function Page() {
  return <AdminContentOverviewClient />;
}
