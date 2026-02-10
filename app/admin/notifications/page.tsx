"use client";

import dynamic from 'next/dynamic';

const AdminNotificationsClient = dynamic(() => import('./AdminNotificationsClient'), { ssr: false });

export default function Page() {
  return <AdminNotificationsClient />;
}
