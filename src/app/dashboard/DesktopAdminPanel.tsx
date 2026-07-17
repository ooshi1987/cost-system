'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { TrendMonth, CategoryItem, RecentEntry } from './DashboardClient';

function formatYen(n: number): string {
  const rounded = Math.round(n);
  const sign = rounded < 0 ? '−' : '';
  return `${sign}¥${Math.abs(rounded).toLocaleString('ja-JP')}`;
}

function pctDelta(curr: number, prev: number): number | null {
  if (prev === 0) return null;
  return Math.round(((curr - prev) / Math.abs(prev)) * 1000) / 10;
}

function DeltaLabel({ curr, prev, invert }: { curr: number; prev: number; invert?: boolean }) {
  const delta = pctDelta(curr, prev);
  if (delta === null) return <div style={{ fontSize: 10.5, color: 'var(--muted)', fontWeight: 700, marginTop: 3 }}>前月データなし</div>;
  const isGood = invert ? delta <= 0 : delta >= 0;
  return (
    <div style={{ fontSize: 10.5, fontWeight: 700, marginTop: 3, color: isGood ? 'var(--success)' : 'var(--accent)' }}>
      {delta >= 0 ? '▲' : '▼'} 前月比 {Math.abs(delta)}%
    </div>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

type FilterTab = 'all' | 'expense' | 'sale';

export default function DesktopAdminPanel({
  storeName,
  trend,
  categoryBreakdown,
  recentEntries,
}: {
  storeName: string;
  trend: TrendMonth[];
  categoryBreakdown: CategoryItem[];
  recentEntries: RecentEntry[];
}) {
  const [filter, setFilter] = useState<FilterTab>('all');

  const current = trend[trend.length - 1];
  const prev = trend[trend.length - 2] ?? { sales: 0, purchase: 0, expense: 0, totalCost: 0, profit: 0, margin: 0, label: '' };
  const foodCostRate = current.sales > 0 ? Math.round((current.purchase / current.sales) * 1000) / 10 : null;
  const prevFoodCostRate = prev.sales > 0 ? Math.round((prev.purchase / prev.sales) * 1000) / 10 : null;

  const maxSales = Math.max(...trend.map((m) => m.sales), 1);
  const maxCategoryAmount = Math.max(...categoryBreakdown.map((c) => c.amount), 1);

  const filteredEntries = recentEntries.filter((e) => {
    if (filter === 'all') return true;
    if (filter === 'sale') return e.type === 'sale';
    return e.type === 'expense' || e.type === 'purchase';
  });

  // ── 損益推移チャート（棒: 売上/原価、折れ線: 利益率） ──
  const chartW = 520;
  const chartH = 172;
  const baseline = chartH - 4;
  const colW = chartW / trend.length;
  const maxMargin = Math.max(...trend.map((m) => Math.abs(m.margin)), 10);

  const linePoints = trend
    .map((m, i) => {
      const x = colW * i + colW / 2;
      const normalized = (m.margin / maxMargin + 1) / 2; // -max..max -> 0..1
      const y = baseline - normalized * (chartH - 24);
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <div className="hidden md:block" style={{ marginBottom: 24 }}>
      {/* ヘッダー */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.01em', color: 'var(--ink)' }}>ダッシュボード</div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 1 }}>
            {storeName || '店舗'} ・ {new Date().getFullYear()}年 {new Date().getMonth() + 1}月
          </div>
        </div>
        <Link
          href="/daily-ledger"
          style={{
            display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, fontWeight: 700, color: '#fff',
            background: 'var(--accent)', borderRadius: 9, padding: '9px 15px', textDecoration: 'none',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3v12M8 11l4 4 4-4M4 21h16" />
          </svg>
          日次集計表を開く
        </Link>
      </div>

      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 14 }}>
        <div style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 14, padding: 14 }}>
          <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600 }}>売上</div>
          <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.01em', marginTop: 3, color: 'var(--ink)' }}>{formatYen(current.sales)}</div>
          <DeltaLabel curr={current.sales} prev={prev.sales} />
        </div>
        <div style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 14, padding: 14 }}>
          <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600 }}>食材原価</div>
          <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.01em', marginTop: 3, color: 'var(--ink)' }}>{formatYen(current.purchase)}</div>
          <DeltaLabel curr={current.purchase} prev={prev.purchase} invert />
        </div>
        <div style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 14, padding: 14 }}>
          <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600 }}>営業利益</div>
          <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.01em', marginTop: 3, color: current.profit >= 0 ? 'var(--success)' : 'var(--accent)' }}>
            {formatYen(current.profit)}
          </div>
          <div style={{ fontSize: 10.5, fontWeight: 700, marginTop: 3, color: 'var(--success)' }}>利益率 {current.margin}%</div>
        </div>
        <div style={{ background: 'var(--ink)', color: '#fff', borderRadius: 14, padding: 14 }}>
          <div style={{ fontSize: 11, color: '#cbbfa9', fontWeight: 600 }}>食材原価率</div>
          <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.01em', marginTop: 3 }}>{foodCostRate !== null ? `${foodCostRate}%` : '—'}</div>
          {foodCostRate !== null && prevFoodCostRate !== null ? (
            <div style={{ fontSize: 10.5, fontWeight: 700, marginTop: 3, color: 'var(--accent-2)' }}>
              前月 {prevFoodCostRate}%
            </div>
          ) : (
            <div style={{ fontSize: 10.5, fontWeight: 700, marginTop: 3, color: 'var(--accent-2)' }}>目標 30% 以内</div>
          )}
        </div>
      </div>

      {/* charts row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.55fr 1fr', gap: 12, marginBottom: 14 }}>
        {/* 損益推移 */}
        <div style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 14, padding: 15 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>損益推移</span>
            <span style={{ display: 'flex', gap: 12, fontSize: 10, color: 'var(--muted)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 9, height: 9, borderRadius: 2, background: 'var(--line)' }} />売上</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 9, height: 9, borderRadius: 2, background: 'var(--accent)' }} />原価</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 14, height: 3, borderRadius: 2, background: 'var(--success)' }} />利益率</span>
            </span>
          </div>
          <div style={{ position: 'relative', height: chartH }}>
            <svg width="100%" height={chartH} viewBox={`0 0 ${chartW} ${chartH}`} preserveAspectRatio="none">
              <line x1="0" y1={chartH * 0.12} x2={chartW} y2={chartH * 0.12} stroke="var(--line-2)" strokeWidth="1" />
              <line x1="0" y1={chartH * 0.47} x2={chartW} y2={chartH * 0.47} stroke="var(--line-2)" strokeWidth="1" />
              <line x1="0" y1={chartH * 0.82} x2={chartW} y2={chartH * 0.82} stroke="var(--line-2)" strokeWidth="1" />
              {trend.map((m, i) => {
                const x = colW * i + colW * 0.28;
                const barW = colW * 0.44;
                const salesH = maxSales > 0 ? (m.sales / maxSales) * (chartH - 24) : 0;
                const costH = maxSales > 0 ? (m.totalCost / maxSales) * (chartH - 24) : 0;
                return (
                  <g key={m.label}>
                    <rect x={x} y={baseline - salesH} width={barW} height={salesH} rx="3" fill="var(--line)" />
                    <rect x={x} y={baseline - costH} width={barW} height={costH} rx="3" fill="var(--accent)" />
                  </g>
                );
              })}
              <polyline points={linePoints} fill="none" stroke="var(--success)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
              {trend.map((m, i) => {
                const x = colW * i + colW / 2;
                const normalized = (m.margin / maxMargin + 1) / 2;
                const y = baseline - normalized * (chartH - 24);
                return <circle key={m.label} cx={x} cy={y} r="3" fill="var(--success)" />;
              })}
            </svg>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--muted)', marginTop: 6, padding: '0 4px' }}>
            {trend.map((m) => <span key={m.label}>{m.label}</span>)}
          </div>
        </div>

        {/* 科目別支出 */}
        <div style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 14, padding: 15 }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, color: 'var(--ink)' }}>科目別の支出</div>
          {categoryBreakdown.length === 0 ? (
            <div style={{ fontSize: 12.5, color: 'var(--muted)', textAlign: 'center', padding: '24px 0' }}>データがありません</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
              {categoryBreakdown.map((c) => (
                <div key={c.name}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4, color: 'var(--ink-2)' }}>
                    <span>{c.name}</span>
                    <span style={{ fontWeight: 700, color: 'var(--ink)' }}>{formatYen(c.amount)}</span>
                  </div>
                  <div style={{ height: 7, borderRadius: 4, background: 'var(--line-2)' }}>
                    <div style={{ width: `${Math.max(4, (c.amount / maxCategoryAmount) * 100)}%`, height: 7, borderRadius: 4, background: c.name === '食材仕入' ? 'var(--accent)' : 'var(--ink-2)' }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 取引一覧 */}
      <div style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 14, padding: 15 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 11 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>取引一覧</span>
          <div style={{ display: 'flex', gap: 6 }}>
            {([['all', 'すべて'], ['expense', '支出'], ['sale', '売上']] as const).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                style={{
                  fontSize: 10.5, fontWeight: 700, borderRadius: 999, padding: '4px 11px', border: 'none', cursor: 'pointer', fontFamily: 'var(--sans)',
                  background: filter === key ? 'var(--ink)' : 'var(--bg-2)',
                  color: filter === key ? '#fff' : 'var(--muted)',
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {filteredEntries.length === 0 ? (
          <div style={{ fontSize: 12.5, color: 'var(--muted)', textAlign: 'center', padding: '24px 0' }}>該当する取引がありません</div>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '64px 1.4fr 1fr 90px 100px', fontSize: 10.5, fontWeight: 700, color: 'var(--muted)', padding: '0 6px 8px', borderBottom: '1px solid var(--line-2)' }}>
              <span>日付</span><span>取引先</span><span>科目</span><span>支払</span><span style={{ textAlign: 'right' }}>金額</span>
            </div>
            {filteredEntries.map((e) => (
              <div key={e.id} style={{ display: 'grid', gridTemplateColumns: '64px 1.4fr 1fr 90px 100px', fontSize: 11.5, padding: '9px 6px', borderBottom: '1px solid var(--bg-2)' }}>
                <span style={{ color: 'var(--muted)' }}>{formatDate(e.date)}</span>
                <span style={{ fontWeight: 600, color: 'var(--ink)' }}>{e.label}</span>
                <span style={{ color: 'var(--ink-2)' }}>{e.category}</span>
                <span style={{ color: 'var(--ink-2)' }}>{e.method}</span>
                <span style={{ textAlign: 'right', fontWeight: 700, color: e.type === 'sale' ? 'var(--success)' : 'var(--ink)' }}>
                  {e.type === 'sale' ? '+' : '−'}{formatYen(Math.abs(e.amount))}
                </span>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
