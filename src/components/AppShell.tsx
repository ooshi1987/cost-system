'use client';

import { usePathname } from 'next/navigation';
import Sidebar from './Sidebar';
import BottomNav from './BottomNav';

const NO_SHELL_PATHS = ['/login', '/signup', '/forgot-password', '/reset-password', '/super-admin'];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthPage = NO_SHELL_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'));

  if (isAuthPage) {
    return <main>{children}</main>;
  }

  return (
    <>
      <Sidebar />
      <main className="app-main">{children}</main>
      <BottomNav />
    </>
  );
}
