"use client";

import dynamic from 'next/dynamic';

const AdminUsersClient = dynamic(() => import('./AdminUsersClient'), { ssr: false });

export default function Page() {
  return <AdminUsersClient />;
}
