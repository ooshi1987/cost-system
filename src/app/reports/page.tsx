'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface MonthlyData {
  label: string;
  total: number;
}

interface MenuProfit {
  id: string;
  name: string;
  category: string;
  sellingPrice: number;
  costPrice: number;
  profit: number;
  costRate: number;
}

interface ReportData {
  monthlyData: MonthlyData[];
  menuProfits: MenuProfit[];
}

function formatYen(n: number): string {
  return `¥${Math.round(n).toLocaleString('ja-JP')}`;
}

type Tab = 'monthly' | 'menu';

export default function ReportsPage() {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('monthly');
  const [sortKey, setSortKey] = useState<'costRate' | 'profit' | 'sellingPrice'>('costRate');

  useEffect(() => {
    fetch('/api/reports')
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d) setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const maxTotal = data ? Math.max(...data.monthlyData.map((m) => m.total), 1) : 1;

  const sortedMenus = data
    ? [...data.menuProfits].sort((a, b) => {
        if (sortKey === 'costRate') return b.costRate - a.costRate;
        if (sortKey === 'profit') return b.profit - a.profit;
        return b.sellingPrice - a.sellingPrice;
      })
    : [];

  const Skeleton = ({ w = 60, h = 16 }: { w?: number; h?: number }) => (
    <span style={{ display: 'inline-block', width: w, height: h, background: 'var(--line-2)', borderRadius: 4 }} />
  );

  const tabStyle = (t: Tab): React.CSSProperties => ({
    padding: '8px 20px',
    fontSize: 13,
    fontWeight: 600,
    borderRadius: 'var(--r)',
    border: 'none',
    cursor: 'pointer',
    fontFamily: 'var(--sans)',
    background: tab === t ? 'var(--ink)' : 'transparent',
    color: tab === t ? '#fff' : 'var(--muted)',
    transition: 'background .15s, color .15s',
  });

  return (
    <div style={{ minHeight: '100svh', background: 'var(--bg)' }}>
      <div className="reports-inner">

        {/* ヘッダー */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 500, marginBottom: 4 }}>
            ダッシュボード / レポート
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0, color: 'var(--ink)' }}>レポート</h1>
            <Link href="/help" style={{ fontSize: 12, color: 'var(--muted)', textDecoration: 'none' }}>？使い方</Link>
          </div>
        </div>

        {/* タブ */}
        <div style={{ display: 'flex', gap: 4, background: 'var(--line-2)', borderRadius: 'var(--r)', padding: 4, marginBottom: 28, width: 'fit-content' }}>
          <button style={tabStyle('monthly')} onClick={() => setTab('monthly')}>月次コスト推移</button>
          <button style={tabStyle('menu')} onClick={() => setTab('menu')}>メニュー別利益分析</button>
        </div>

        {/* ── 月次コスト推移 ── */}
        {tab === 'monthly' && (
          <div>
            <div style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 'var(--r-lg)', padding: '24px 20px' }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)', marginBottom: 24 }}>
                月次仕入総額（過去6ヶ月）
              </div>

              {loading ? (
                <div style={{ height: 180, background: 'var(--line-2)', borderRadius: 'var(--r)', animation: 'pulse 1.5s ease infinite' }} />
              ) : data?.monthlyData.every((m) => m.total === 0) ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--muted)', fontSize: 13 }}>
                  納品書を登録するとここにグラフが表示されます
                </div>
              ) : (
                <>
                  {/* バーチャート */}
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, height: 160, marginBottom: 12 }}>
                    {data!.monthlyData.map((m) => {
                      const h = maxTotal > 0 ? (m.total / maxTotal) * 140 : 0;
                      return (
                        <div key={m.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-2)' }}>
                            {m.total > 0 ? `¥${Math.round(m.total / 1000)}K` : ''}
                          </div>
                          <div style={{ width: '100%', height: Math.max(h, m.total > 0 ? 4 : 0), background: 'var(--accent)', borderRadius: '4px 4px 0 0', opacity: 0.85, transition: 'height .4s ease', minHeight: m.total > 0 ? 4 : 0 }} />
                        </div>
                      );
                    })}
                  </div>
                  {/* 月ラベル */}
                  <div style={{ display: 'flex', gap: 12, borderTop: '1px solid var(--line-2)', paddingTop: 8 }}>
                    {data!.monthlyData.map((m) => (
                      <div key={m.label} style={{ flex: 1, textAlign: 'center', fontSize: 12, color: 'var(--muted)', fontWeight: 500 }}>
                        {m.label}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* 月次サマリー */}
            {!loading && data && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginTop: 12 }}>
                {(() => {
                  const totals = data.monthlyData.map((m) => m.total);
                  const thisMonth = totals[5] ?? 0;
                  const lastMonth = totals[4] ?? 0;
                  const avg = totals.reduce((s, v) => s + v, 0) / totals.filter((v) => v > 0).length || 0;
                  const diff = thisMonth - lastMonth;
                  return [
                    { label: '今月の仕入総額', value: formatYen(thisMonth) },
                    { label: '先月比', value: diff === 0 ? '—' : `${diff > 0 ? '+' : ''}${formatYen(diff)}`, color: diff > 0 ? 'var(--accent)' : diff < 0 ? '#16a34a' : 'var(--ink)' },
                    { label: '6ヶ月平均', value: formatYen(avg) },
                  ].map(({ label, value, color }) => (
                    <div key={label} style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 'var(--r-lg)', padding: '14px 12px' }}>
                      <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 6, fontWeight: 500 }}>{label}</div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: color ?? 'var(--ink)' }}>{value}</div>
                    </div>
                  ));
                })()}
              </div>
            )}
          </div>
        )}

        {/* ── メニュー別利益分析 ── */}
        {tab === 'menu' && (
          <div>
            {/* ソート */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 500 }}>並び替え：</span>
              {([['costRate', '原価率（高）'], ['profit', '利益額（高）'], ['sellingPrice', '売価（高）']] as const).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setSortKey(key)}
                  style={{
                    fontSize: 12, fontWeight: 600, padding: '5px 12px',
                    borderRadius: 'var(--r-sm)', border: '1px solid',
                    borderColor: sortKey === key ? 'var(--accent)' : 'var(--line)',
                    background: sortKey === key ? 'var(--accent-soft)' : 'transparent',
                    color: sortKey === key ? 'var(--accent)' : 'var(--ink-2)',
                    cursor: 'pointer', fontFamily: 'var(--sans)',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

            {loading ? (
              <div style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 'var(--r-lg)', padding: 20 }}>
                {[0,1,2,3,4].map((i) => (
                  <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '12px 0', borderBottom: i < 4 ? '1px solid var(--line-2)' : 'none' }}>
                    <Skeleton w={100} h={14} /><Skeleton w={60} h={14} /><Skeleton w={60} h={14} /><Skeleton w={50} h={14} />
                  </div>
                ))}
              </div>
            ) : sortedMenus.length === 0 ? (
              <div style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 'var(--r-lg)', padding: '40px 20px', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
                レシピを登録したメニューがあると、ここに利益分析が表示されます
              </div>
            ) : (
              <div style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 'var(--r-lg)', overflow: 'hidden' }}>
                {/* ヘッダー行 */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 80px 80px 90px', gap: 8, padding: '10px 16px', background: 'var(--bg-2)', fontSize: 11, fontWeight: 600, color: 'var(--muted)', borderBottom: '1px solid var(--line)' }}>
                  <span>メニュー名</span>
                  <span style={{ textAlign: 'right' }}>売価</span>
                  <span style={{ textAlign: 'right' }}>原価</span>
                  <span style={{ textAlign: 'right' }}>利益</span>
                  <span style={{ textAlign: 'right' }}>原価率</span>
                </div>
                {sortedMenus.map((item, i) => {
                  const rateColor = item.costRate > 40 ? 'var(--accent)' : item.costRate > 30 ? 'var(--accent-2)' : '#16a34a';
                  return (
                    <div
                      key={item.id}
                      style={{
                        display: 'grid', gridTemplateColumns: '1fr 80px 80px 80px 90px',
                        gap: 8, padding: '12px 16px', alignItems: 'center',
                        borderBottom: i < sortedMenus.length - 1 ? '1px solid var(--line-2)' : 'none',
                      }}
                    >
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{item.category}</div>
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--ink-2)', textAlign: 'right' }}>{formatYen(item.sellingPrice)}</div>
                      <div style={{ fontSize: 13, color: 'var(--ink-2)', textAlign: 'right' }}>{formatYen(item.costPrice)}</div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: item.profit >= 0 ? 'var(--ink)' : 'var(--accent)', textAlign: 'right' }}>{formatYen(item.profit)}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end' }}>
                        <div style={{ width: 40, height: 5, background: 'var(--line-2)', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{ width: `${Math.min(100, item.costRate)}%`, height: '100%', background: rateColor, borderRadius: 3 }} />
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 700, color: rateColor, minWidth: 40, textAlign: 'right' }}>{item.costRate}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
