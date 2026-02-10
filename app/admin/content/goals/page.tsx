"use client";

import dynamic from 'next/dynamic';

const AdminContentGoalsClient = dynamic(() => import('./AdminContentGoalsClient'), { ssr: false });

export default function Page() {
  return <AdminContentGoalsClient />;
}
