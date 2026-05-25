'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { href: '/dashboard',         label: 'ホーム',   icon: '🏠', exact: true  },
  { href: '/menu',              label: 'メニュー', icon: '📋', exact: false },
  { href: '/delivery',          label: 'スキャン', icon: '📸', exact: true  },
  { href: '/ingredients',       label: '食材',     icon: '🥦', exact: false },
  { href: '/delivery-history',  label: '履歴',     icon: '📦', exact: false },
];

export default function BottomNav() {
  const pathname = usePathname();

  // LP・ログイン・サインアップ・スーパー管理者ページでは非表示
  if (pathname === '/' || pathname === '/login' || pathname === '/signup' || pathname.startsWith('/super-admin')) return null;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur border-t border-gray-100 z-50"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="max-w-xl mx-auto flex">
        {NAV_ITEMS.map(({ href, label, icon, exact }) => {
          const isActive = exact ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex-1 flex flex-col items-center py-2.5 gap-0.5 text-[11px] font-medium transition-colors ${
                isActive ? 'text-amber-600' : 'text-gray-400 hover:text-gray-500'
              }`}
            >
              <span className={`text-xl leading-none transition-transform ${isActive ? 'scale-110' : ''}`}>
                {icon}
              </span>
              <span>{label}</span>
              {isActive && (
                <span className="absolute bottom-0 w-6 h-0.5 bg-amber-500 rounded-full" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
