'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import StoreSelector from '@/components/StoreSelector';
import MultiStoreLink from '@/components/MultiStoreLink';

interface Stats {
  menuItemCount: number;
  foodCount: number;
  seasoningCount: number;
  avgCostRate: number | null;
}

export default function Dashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats>({
    menuItemCount: 0,
    foodCount: 0,
    seasoningCount: 0,
    avgCostRate: null,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/dashboard/stats')
      .then((r) => r.json())
      .then((data) => { setStats(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  };

  const costColor =
    stats.avgCostRate === null ? 'var(--muted)'
    : stats.avgCostRate <= 30 ? '#16a34a'
    : stats.avgCostRate <= 40 ? 'var(--accent-2)'
    : 'var(--accent)';

  const kpiCards = [
    { label: 'メニュー',   value: stats.menuItemCount, unit: '品', icon: '📋', href: '/menu' },
    { label: '食材・調味料', value: stats.foodCount + stats.seasoningCount, unit: '種', icon: '🥦', href: '/ingredients' },
    {
      label: '平均原価率',
      value: stats.avgCostRate !== null ? stats.avgCostRate : '—',
      unit: stats.avgCostRate !== null ? '%' : '',
      icon: '📊',
      href: null,
      valueColor: costColor,
    },
  ];

  const subActions = [
    { href: '/menu',                  icon: '📋', label: 'メニュー',  sub: '価格・原価確認' },
    { href: '/ingredients',           icon: '🥦', label: '食材',     sub: '原価・単価管理' },
    { href: '/delivery-history',      icon: '📦', label: '納品履歴', sub: '過去の納品確認' },
    { href: '/ingredients?type=seasoning', icon: '🧂', label: '調味料', sub: '調味料の単価管理' },
  ];

  return (
    <div style={{ minHeight: '100svh', background: 'var(--bg)' }}>
      <div style={{ maxWidth: '480px', margin: '0 auto', padding: '20px 16px 32px' }}>

        {/* ── ヘッダー ── */}
        <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
            <svg width="24" height="24" viewBox="0 0 28 28" fill="none">
              <circle cx="14" cy="14" r="13" stroke="var(--accent)" strokeWidth="1.5"/>
              <path d="M9 14h10M14 9v10" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <span style={{ fontSize: '16px', fontWeight: 700, color: 'var(--ink)', letterSpacing: '-0.02em' }}>Costra</span>
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
            <Link href="/help/dashboard" style={{ fontSize: '12px', color: 'var(--muted)', padding: '6px 10px', borderRadius: 'var(--r-sm)', textDecoration: 'none' }}>
              ？使い方
            </Link>
            <Link href="/admin" style={{ fontSize: '12px', color: 'var(--muted)', padding: '6px 10px', borderRadius: 'var(--r-sm)', textDecoration: 'none' }}>
              ⚙️ 設定
            </Link>
            <button
              onClick={handleLogout}
              style={{ fontSize: '12px', color: 'var(--muted)', padding: '6px 10px', borderRadius: 'var(--r-sm)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--sans)' }}
            >
              ログアウト
            </button>
          </div>
        </header>

        {/* 店舗切替 */}
        <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <StoreSelector />
          <MultiStoreLink />
        </div>

        {/* ── KPI カード ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '10px', marginBottom: '20px' }}>
          {kpiCards.map((card) => {
            const inner = (
              <div style={{
                background: 'var(--paper)',
                border: '1px solid var(--line)',
                borderRadius: 'var(--r-lg)',
                padding: '14px 8px',
                textAlign: 'center',
              }}>
                <div style={{ fontSize: '22px', marginBottom: '6px', lineHeight: 1 }}>{card.icon}</div>
                <div style={{ fontSize: '26px', fontWeight: 700, lineHeight: 1, color: (card as { valueColor?: string }).valueColor ?? 'var(--ink)' }}>
                  {loading
                    ? <span style={{ display: 'inline-block', width: '32px', height: '22px', background: 'var(--line-2)', borderRadius: '4px' }} />
                    : card.value}
                  {!loading && card.unit && (
                    <span style={{ fontSize: '11px', fontWeight: 400, marginLeft: '2px', color: 'var(--muted)' }}>{card.unit}</span>
                  )}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '4px', fontWeight: 500 }}>{card.label}</div>
              </div>
            );
            return card.href ? (
              <Link key={card.label} href={card.href} style={{ textDecoration: 'none' }}>{inner}</Link>
            ) : (
              <div key={card.label}>{inner}</div>
            );
          })}
        </div>

        {/* ── メイン CTA：スキャン ── */}
        <Link
          href="/delivery"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            background: 'var(--accent)',
            color: '#fff',
            borderRadius: 'var(--r-lg)',
            padding: '16px',
            fontSize: '16px',
            fontWeight: 700,
            textDecoration: 'none',
            marginBottom: '12px',
            boxShadow: '0 4px 16px rgba(200,74,31,.25)',
          }}
        >
          <span style={{ fontSize: '20px' }}>📸</span>
          <span>納品書をスキャン</span>
        </Link>

        {/* ── サブアクション ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          {subActions.map((a) => (
            <Link
              key={a.href}
              href={a.href}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                background: 'var(--paper)',
                border: '1px solid var(--line)',
                borderRadius: 'var(--r-lg)',
                padding: '14px 16px',
                textDecoration: 'none',
              }}
            >
              <span style={{ fontSize: '22px' }}>{a.icon}</span>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink)' }}>{a.label}</div>
                <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '1px' }}>{a.sub}</div>
              </div>
            </Link>
          ))}
        </div>

      </div>
    </div>
  );
}
