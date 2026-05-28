'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import StoreSelector from '@/components/StoreSelector';

interface TopCostItem {
  name: string;
  costRate: number;
}

interface Stats {
  menuItemCount: number;
  foodCount: number;
  seasoningCount: number;
  avgCostRate: number | null;
  recipeCount: number;
  monthlyPurchaseTotal: number;
  unprocessedSlips: number;
  topCostItems: TopCostItem[];
}

interface Me {
  name: string | null;
  storeName: string | null;
}

function formatYen(n: number): string {
  if (n >= 1_000_000) return `¥${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 10_000) return `¥${Math.round(n / 1_000)}K`;
  return `¥${n.toLocaleString('ja-JP')}`;
}

function formatDate(d: Date): string {
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

function greetingWord(): string {
  const h = new Date().getHours();
  if (h < 11) return 'おはようございます';
  if (h < 18) return 'こんにちは';
  return 'こんばんは';
}

export default function Dashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/dashboard/stats').then((r) => r.ok ? r.json() : null),
      fetch('/api/me').then((r) => r.ok ? r.json() : null),
    ]).then(([s, m]) => {
      if (s) setStats(s);
      if (m) setMe(m);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  };

  const costRate = stats?.avgCostRate ?? null;
  const costColor =
    costRate === null ? 'var(--muted)'
    : costRate <= 30 ? '#16a34a'
    : costRate <= 40 ? 'var(--accent-2)'
    : 'var(--accent)';

  const today = formatDate(new Date());
  const displayName = me?.name ? `${me.name}さん` : 'オーナーさん';

  const Skeleton = ({ w = 48, h = 28 }: { w?: number; h?: number }) => (
    <span style={{ display: 'inline-block', width: w, height: h, background: 'var(--line-2)', borderRadius: 4 }} />
  );

  const maxCostRate = stats?.topCostItems?.[0]?.costRate ?? 50;

  return (
    <div style={{ minHeight: '100svh', background: 'var(--bg)', paddingBottom: 80 }}>
      <div style={{ maxWidth: 480, margin: '0 auto', padding: '20px 16px 0' }}>

        {/* ── ヘッダー ── */}
        <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
            <svg width="22" height="22" viewBox="0 0 28 28" fill="none">
              <circle cx="14" cy="14" r="13" stroke="var(--accent)" strokeWidth="1.5"/>
              <path d="M9 14h10M14 9v10" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)', letterSpacing: '-0.02em' }}>Costra</span>
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Link href="/help/dashboard" style={{ fontSize: 12, color: 'var(--muted)', padding: '6px 8px', borderRadius: 'var(--r-sm)', textDecoration: 'none' }}>？使い方</Link>
            <Link href="/admin" style={{ fontSize: 12, color: 'var(--muted)', padding: '6px 8px', borderRadius: 'var(--r-sm)', textDecoration: 'none' }}>⚙ 設定</Link>
            <button onClick={handleLogout} style={{ fontSize: 12, color: 'var(--muted)', padding: '6px 8px', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--sans)', borderRadius: 'var(--r-sm)' }}>
              ログアウト
            </button>
          </div>
        </header>

        {/* 店舗切替 */}
        <div style={{ marginBottom: 20 }}>
          <StoreSelector />
        </div>

        {/* ── グリーティング + 日付 ── */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 2, fontWeight: 500 }}>
              ダッシュボード / 本日
            </div>
            <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: 'var(--ink)', lineHeight: 1.3 }}>
              {greetingWord()}、{loading ? '…' : displayName}
            </h1>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 500 }}>{today}</span>
            <Link
              href="/delivery"
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: 'var(--accent)', color: '#fff',
                padding: '8px 14px', borderRadius: 'var(--r)',
                fontSize: 13, fontWeight: 700, textDecoration: 'none',
                whiteSpace: 'nowrap',
              }}
            >
              + 伝票を追加
            </Link>
          </div>
        </div>

        {/* ── KPI 上段（3枚） ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 10 }}>
          {/* 平均原価率 */}
          <div style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 'var(--r-lg)', padding: '16px 12px' }}>
            <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 500, marginBottom: 8, lineHeight: 1.3 }}>平均原価率</div>
            <div style={{ fontSize: 28, fontWeight: 700, lineHeight: 1, color: costColor }}>
              {loading ? <Skeleton w={40} h={26} /> : costRate !== null ? costRate : '—'}
              {!loading && costRate !== null && <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--muted)' }}>%</span>}
            </div>
          </div>

          {/* 仕入総額（月） */}
          <div style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 'var(--r-lg)', padding: '16px 12px' }}>
            <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 500, marginBottom: 8, lineHeight: 1.3 }}>仕入総額（月）</div>
            <div style={{ fontSize: 18, fontWeight: 700, lineHeight: 1, color: 'var(--ink)' }}>
              {loading ? <Skeleton w={44} h={22} /> : formatYen(stats?.monthlyPurchaseTotal ?? 0)}
            </div>
          </div>

          {/* レシピ登録数 */}
          <Link href="/menu" style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 'var(--r-lg)', padding: '16px 12px', textDecoration: 'none' }}>
            <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 500, marginBottom: 8, lineHeight: 1.3 }}>登録レシピ数</div>
            <div style={{ fontSize: 28, fontWeight: 700, lineHeight: 1, color: 'var(--ink)' }}>
              {loading ? <Skeleton w={32} h={26} /> : (stats?.recipeCount ?? 0)}
              {!loading && <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--muted)', marginLeft: 2 }}>品</span>}
            </div>
          </Link>
        </div>

        {/* ── KPI 下段（2枚） ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
          {/* 未処理伝票 */}
          <Link href="/delivery-history" style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 'var(--r-lg)', padding: '16px', textDecoration: 'none' }}>
            <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 500, marginBottom: 8 }}>未処理伝票</div>
            <div style={{ fontSize: 28, fontWeight: 700, lineHeight: 1, color: (stats?.unprocessedSlips ?? 0) > 0 ? 'var(--accent)' : 'var(--ink)' }}>
              {loading ? <Skeleton w={28} h={26} /> : (stats?.unprocessedSlips ?? 0)}
              {!loading && <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--muted)', marginLeft: 2 }}>枚</span>}
            </div>
            <div style={{ fontSize: 11, color: 'var(--accent)', marginTop: 6, fontWeight: 500 }}>→ 確認する</div>
          </Link>

          {/* メニュー数 */}
          <Link href="/menu" style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 'var(--r-lg)', padding: '16px', textDecoration: 'none' }}>
            <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 500, marginBottom: 8 }}>メニュー数</div>
            <div style={{ fontSize: 28, fontWeight: 700, lineHeight: 1, color: 'var(--ink)' }}>
              {loading ? <Skeleton w={32} h={26} /> : (stats?.menuItemCount ?? 0)}
              {!loading && <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--muted)', marginLeft: 2 }}>品</span>}
            </div>
            <div style={{ fontSize: 11, color: 'var(--accent)', marginTop: 6, fontWeight: 500 }}>→ 管理する</div>
          </Link>
        </div>

        {/* ── TOP5 原価率の高いメニュー ── */}
        <div style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 'var(--r-lg)', padding: '18px 16px', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>原価率の高いメニュー TOP 5</div>
            <Link href="/menu" style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 600, textDecoration: 'none' }}>
              すべて見る →
            </Link>
          </div>

          {loading ? (
            [0,1,2,3,4].map((i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: i < 4 ? 14 : 0 }}>
                <div style={{ width: 80, height: 12, background: 'var(--line-2)', borderRadius: 4, flexShrink: 0 }} />
                <div style={{ flex: 1, height: 6, background: 'var(--line-2)', borderRadius: 3 }} />
                <div style={{ width: 36, height: 12, background: 'var(--line-2)', borderRadius: 4, flexShrink: 0 }} />
              </div>
            ))
          ) : stats?.topCostItems && stats.topCostItems.length > 0 ? (
            stats.topCostItems.map((item, i) => {
              const barColor = item.costRate > 40 ? 'var(--accent)' : item.costRate > 30 ? 'var(--accent-2)' : '#16a34a';
              const barWidth = Math.min(100, (item.costRate / Math.max(maxCostRate, 1)) * 100);
              return (
                <div key={item.name} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: i < stats.topCostItems.length - 1 ? 12 : 0 }}>
                  <div style={{ width: 90, fontSize: 12, color: 'var(--ink-2)', fontWeight: 500, flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.name}
                  </div>
                  <div style={{ flex: 1, height: 6, background: 'var(--line-2)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ width: `${barWidth}%`, height: '100%', background: barColor, borderRadius: 3, transition: 'width .6s ease' }} />
                  </div>
                  <div style={{ width: 40, fontSize: 12, fontWeight: 700, color: barColor, textAlign: 'right', flexShrink: 0 }}>
                    {item.costRate}%
                  </div>
                </div>
              );
            })
          ) : (
            <div style={{ fontSize: 13, color: 'var(--muted)', textAlign: 'center', padding: '12px 0' }}>
              レシピを登録するとここに表示されます
            </div>
          )}
        </div>

        {/* ── クイックアクション ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
          <Link href="/ingredients" style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 'var(--r-lg)', padding: '14px 16px', textDecoration: 'none' }}>
            <span style={{ fontSize: 20 }}>🥦</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>食材</div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 1 }}>原価・単価管理</div>
            </div>
          </Link>
          <Link href="/delivery-history" style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 'var(--r-lg)', padding: '14px 16px', textDecoration: 'none' }}>
            <span style={{ fontSize: 20 }}>📦</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>納品履歴</div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 1 }}>過去の納品確認</div>
            </div>
          </Link>
        </div>

      </div>
    </div>
  );
}
