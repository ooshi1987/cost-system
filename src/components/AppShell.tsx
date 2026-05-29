'use client';

import { Suspense } from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from './Sidebar';
import BottomNav from './BottomNav';

const NO_SHELL_PATHS = ['/login', '/signup', '/forgot-password', '/reset-password'];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthPage = NO_SHELL_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'));

  if (isAuthPage) {
    return <main>{children}</main>;
  }

  return (
    <>
      <Suspense fallback={null}><Sidebar /></Suspense>
      <main className="app-main">{children}</main>
      <BottomNav />
    </>
  );
}
