"use client";

import dynamic from 'next/dynamic';

const AdminContentReportsClient = dynamic(() => import('./AdminContentReportsClient'), { ssr: false });

export default function Page() {
  return <AdminContentReportsClient />;
}
