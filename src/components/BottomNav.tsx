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

  if (
    pathname === '/' ||
    pathname === '/login' ||
    pathname === '/signup' ||
    pathname === '/forgot-password' ||
    pathname === '/reset-password' ||
    pathname.startsWith('/super-admin')
  ) return null;

  return (
    <nav
      data-bottom-nav
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        background: 'rgba(250,247,241,0.97)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderTop: '1px solid var(--line)',
        zIndex: 50,
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      <div style={{ maxWidth: '480px', margin: '0 auto', display: 'flex' }}>
        {NAV_ITEMS.map(({ href, label, icon, exact }) => {
          const isActive = exact ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: '10px 0 8px',
                gap: '2px',
                fontSize: '11px',
                fontWeight: 500,
                color: isActive ? 'var(--accent)' : 'var(--muted)',
                textDecoration: 'none',
                position: 'relative',
              }}
            >
              <span style={{ fontSize: '20px', lineHeight: 1, transform: isActive ? 'scale(1.1)' : 'scale(1)', transition: 'transform .15s' }}>
                {icon}
              </span>
              <span>{label}</span>
              {isActive && (
                <span style={{
                  position: 'absolute',
                  bottom: 0,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: '24px',
                  height: '2px',
                  background: 'var(--accent)',
                  borderRadius: '1px',
                }} />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
