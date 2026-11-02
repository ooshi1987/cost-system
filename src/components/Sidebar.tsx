'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import StoreSelector from './StoreSelector';

interface Me {
  name: string | null;
  email: string;
  storeName: string | null;
  role: string;
}

const NAV_ITEMS = [
  { href: '/dashboard', label: '今日の状況', icon: '○', paths: ['/dashboard'] },
  { href: '/daily-ledger', label: '日次締め', icon: '≡', paths: ['/daily-ledger', '/sales'] },
  { href: '/delivery', label: '仕入・経費', icon: '▤', paths: ['/delivery', '/delivery-history', '/expense'] },
  { href: '/review', label: '要確認', icon: '!', paths: ['/review'] },
  { href: '/daily-ledger?view=monthly', label: '月次・出力', icon: '▥', paths: ['/daily-ledger'] },
  { href: '/admin', label: '設定', icon: '⚙', paths: ['/admin', '/billing'] },
];

const OTHER_LINKS = [
  { href: '/delivery-history', label: '納品履歴' },
  { href: '/expense', label: '経費を手入力' },
  { href: '/petty-cash', label: '小口現金' },
  { href: '/ingredients', label: '食材管理' },
  { href: '/menu', label: 'メニュー・レシピ' },
  { href: '/reports', label: '従来のレポート' },
];

const HIDDEN_PATHS = ['/', '/login', '/signup', '/forgot-password', '/reset-password'];

const SUPER_ADMIN_NAV = [
  {
    href: '/super-admin?tab=overview',
    label: '事業概要',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <rect x="1.5" y="8.5" width="3" height="6" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
        <rect x="6.5" y="5.5" width="3" height="9" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
        <rect x="11.5" y="2.5" width="3" height="12" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    href: '/super-admin?tab=tenants',
    label: 'テナント一覧',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M2 13V6l6-4 6 4v7H2Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
        <rect x="6" y="9" width="4" height="4" stroke="currentColor" strokeWidth="1.4"/>
      </svg>
    ),
  },
  {
    href: '/super-admin?tab=inquiries',
    label: '問い合わせ',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M2 3h12v8H9l-3 2.5V11H2V3Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
      </svg>
    ),
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [me, setMe] = useState<Me | null>(null);

  const searchParams = useSearchParams();
  const searchTab = searchParams.get('tab') ?? 'overview';
  const isSuperAdmin = pathname.startsWith('/super-admin');
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
    <aside className="sidebar print:hidden">
      {/* ロゴ */}
      <div style={{ padding: '24px 20px 20px', borderBottom: '1px solid var(--line)' }}>
        <Link href={isSuperAdmin ? '/super-admin' : '/dashboard'} style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
          <svg width="22" height="22" viewBox="0 0 28 28" fill="none">
            <circle cx="14" cy="14" r="13" stroke="var(--accent)" strokeWidth="1.5"/>
            <path d="M9 14h10M14 9v10" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink)', letterSpacing: '-0.02em' }}>Costra</span>
        </Link>
        {isSuperAdmin && (
          <span style={{ display: 'block', marginTop: 6, fontSize: 10, fontWeight: 700, color: '#7c3aed', background: '#ede9fe', borderRadius: 999, padding: '2px 8px', width: 'fit-content' }}>
            運営管理
          </span>
        )}
      </div>

      {/* 店舗セレクター（通常ページのみ） */}
      {!isSuperAdmin && (
        <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid var(--line)' }}>
          <StoreSelector />
        </div>
      )}

      {/* ナビ */}
      <nav style={{ padding: '12px 10px', flex: 1 }}>
        {(isSuperAdmin ? SUPER_ADMIN_NAV : NAV_ITEMS).map(({ href, label, icon }) => {
          const isActive = isSuperAdmin
            ? href.includes('?tab=') ? href === `/super-admin?tab=${searchTab}` : searchTab === 'overview' && href.includes('overview')
            : href === '/daily-ledger?view=monthly'
              ? pathname === '/daily-ledger' && searchParams.get('view') === 'monthly'
              : (href !== '/daily-ledger' || searchParams.get('view') !== 'monthly') &&
                (NAV_ITEMS.find((item) => item.href === href)?.paths.some((path) => pathname === path || pathname.startsWith(`${path}/`)) ?? false);
          return (
            <Link
              key={href}
              href={href}
              aria-current={isActive ? 'page' : undefined}
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
        {!isSuperAdmin && (
          <details className="sidebar-other" open={OTHER_LINKS.some(({ href }) => pathname === href || pathname.startsWith(`${href}/`)) || undefined}>
            <summary>その他の機能</summary>
            {OTHER_LINKS.map(({ href, label }) => (
              <Link key={href} href={href} aria-current={pathname === href || pathname.startsWith(`${href}/`) ? 'page' : undefined}>
                {label}
              </Link>
            ))}
          </details>
        )}
      </nav>

      {/* ユーザー情報 */}
      {me && (
        <div style={{ padding: '14px 16px', borderTop: '1px solid var(--line)' }}>
          <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 500, marginBottom: 6, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            {isSuperAdmin ? '運営管理者' : me.role === 'tenant_admin' ? 'オーナー' : 'スタッフ'}
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {me.name ?? me.email}
          </div>
        </div>
      )}
    </aside>
  );
}
