'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import StoreSelector from './StoreSelector';

interface Me {
  name: string | null;
  email: string;
  storeName: string | null;
  role: string;
}

const NAV_ITEMS = [
  {
    href: '/dashboard',
    label: 'ダッシュボード',
    exact: true,
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.4"/>
        <circle cx="8" cy="8" r="3" fill="currentColor"/>
      </svg>
    ),
  },
  {
    href: '/delivery',
    label: '仕入れ',
    exact: true,
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <rect x="1.5" y="1.5" width="13" height="13" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
        <path d="M5 8h6M8 5v6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    href: '/ingredients',
    label: '食材・原価',
    exact: false,
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.4"/>
      </svg>
    ),
  },
  {
    href: '/menu',
    label: 'メニュー',
    exact: false,
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M8 1.5L14.5 12.5H1.5L8 1.5Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    href: '/reports',
    label: 'レポート',
    exact: false,
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M8 1.5L14.5 8L8 14.5L1.5 8L8 1.5Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    href: '/admin',
    label: '設定',
    exact: true,
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.41 1.41M11.54 11.54l1.41 1.41M3.05 12.95l1.41-1.41M11.54 4.46l1.41-1.41" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
        <circle cx="8" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.4"/>
      </svg>
    ),
  },
];

const HIDDEN_PATHS = ['/', '/login', '/signup', '/forgot-password', '/reset-password'];

export default function Sidebar() {
  const pathname = usePathname();
  const [me, setMe] = useState<Me | null>(null);

  const hidden =
    HIDDEN_PATHS.includes(pathname) ||
    pathname.startsWith('/design');

  useEffect(() => {
    if (hidden) return;
    fetch('/api/me')
      .then((r) => r.ok ? r.json() : null)
      .then((d) => d && setMe(d))
      .catch(() => {});
  }, [hidden]);

  if (hidden) return null;

  return (
    <aside className="sidebar">
      {/* ロゴ */}
      <div style={{ padding: '24px 20px 20px', borderBottom: '1px solid var(--line)' }}>
        <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
          <svg width="22" height="22" viewBox="0 0 28 28" fill="none">
            <circle cx="14" cy="14" r="13" stroke="var(--accent)" strokeWidth="1.5"/>
            <path d="M9 14h10M14 9v10" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink)', letterSpacing: '-0.02em' }}>Costra</span>
        </Link>
      </div>

      {/* 店舗セレクター */}
      <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid var(--line)' }}>
        <StoreSelector />
      </div>

      {/* ナビ */}
      <nav style={{ padding: '12px 10px', flex: 1 }}>
        {NAV_ITEMS.map(({ href, label, exact, icon }) => {
          const isActive = exact ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 12px',
                borderRadius: 'var(--r)',
                marginBottom: 2,
                fontSize: 13,
                fontWeight: isActive ? 700 : 500,
                color: isActive ? 'var(--accent)' : 'var(--ink-2)',
                background: isActive ? 'var(--accent-soft)' : 'transparent',
                textDecoration: 'none',
                transition: 'background .12s, color .12s',
              }}
            >
              <span style={{ color: isActive ? 'var(--accent)' : 'var(--muted)', flexShrink: 0 }}>{icon}</span>
              {label}
            </Link>
          );
        })}
      </nav>

      {/* ユーザー情報 */}
      {me && (
        <div style={{ padding: '14px 16px', borderTop: '1px solid var(--line)' }}>
          <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 500, marginBottom: 6, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            {me.role === 'tenant_admin' ? 'オーナー' : 'スタッフ'}
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {me.name ?? me.email}
          </div>
        </div>
      )}
    </aside>
  );
}
