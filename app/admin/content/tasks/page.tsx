"use client";

import dynamic from 'next/dynamic';

const AdminContentTasksClient = dynamic(() => import('./AdminContentTasksClient'), { ssr: false });

export default function Page() {
  return <AdminContentTasksClient />;
}
