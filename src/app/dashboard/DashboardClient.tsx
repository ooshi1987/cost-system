'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import StoreSelector from '@/components/StoreSelector';
import DesktopAdminPanel from './DesktopAdminPanel';

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
  monthSalesTotal: number;
  monthExpenseTotal: number;
  reviewCount: number;
}

interface Me {
  name: string | null;
  storeName: string | null;
}

export interface TrendMonth {
  label: string;
  sales: number;
  purchase: number;
  expense: number;
  totalCost: number;
  profit: number;
  margin: number;
}

export interface CategoryItem {
  name: string;
  amount: number;
}

export interface RecentEntry {
  id: string;
  date: string;
  label: string;
  category: string;
  method: string;
  amount: number;
  type: 'sale' | 'expense' | 'purchase';
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

export default function DashboardClient({
  stats,
  me,
  trend,
  categoryBreakdown,
  recentEntries,
}: {
  stats: Stats;
  me: Me;
  trend: TrendMonth[];
  categoryBreakdown: CategoryItem[];
  recentEntries: RecentEntry[];
}) {
  const router = useRouter();

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  };

  const costRate = stats.avgCostRate;
  const costColor =
    costRate === null ? 'var(--muted)'
    : costRate <= 30 ? '#16a34a'
    : costRate <= 40 ? 'var(--accent-2)'
    : 'var(--accent)';

  const today = formatDate(new Date());
  const displayName = me.name ? `${me.name}さん` : 'オーナーさん';
  const maxCostRate = stats.topCostItems[0]?.costRate ?? 50;

  return (
    <div style={{ minHeight: '100svh', background: 'var(--bg)', paddingBottom: 80 }}>
      <div className="dashboard-inner">

        <DesktopAdminPanel
          storeName={me.storeName ?? ''}
          trend={trend}
          categoryBreakdown={categoryBreakdown}
          recentEntries={recentEntries}
        />

        <div className="md:hidden">

        {/* ── ヘッダー ── */}
        <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
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
              {me.storeName ? `${me.storeName} ・ 本日` : 'ダッシュボード / 本日'}
            </div>
            <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: 'var(--ink)', lineHeight: 1.3 }}>
              {greetingWord()}、{displayName}
            </h1>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 500 }}>{today}</span>
            <Link href="/review" style={{ position: 'relative', display: 'flex', textDecoration: 'none' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.7 21a2 2 0 01-3.4 0" />
              </svg>
              {stats.reviewCount > 0 && (
                <span style={{
                  position: 'absolute', top: -4, right: -4,
                  width: 15, height: 15, borderRadius: '50%',
                  background: 'var(--accent)', color: '#fff',
                  fontSize: 9, fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {stats.reviewCount}
                </span>
              )}
            </Link>
          </div>
        </div>

        {/* ── 今月のざっくり ── */}
        {(() => {
          // 支出には Transaction 経費に加え、納品書経由の食材仕入も含める（純額を実態に合わせる）
          const totalExpense = stats.monthlyPurchaseTotal + stats.monthExpenseTotal;
          const net = stats.monthSalesTotal - totalExpense;
          const expenseRatio = stats.monthSalesTotal > 0
            ? Math.min(100, (totalExpense / stats.monthSalesTotal) * 100)
            : 100;
          const profitRatio = 100 - expenseRatio;
          return (
            <div style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 'var(--r-lg)', padding: 16, marginBottom: 12 }}>
              <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, marginBottom: 6 }}>
                今月のざっくり（{new Date().getMonth() + 1}月）
              </div>
              <div style={{ fontSize: 28, fontWeight: 700, lineHeight: 1, letterSpacing: '-0.02em', color: net >= 0 ? 'var(--success)' : 'var(--accent)' }}>
                {net >= 0 ? '+' : '−'}¥{Math.abs(net).toLocaleString('ja-JP')}
              </div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 6 }}>
                売上 ¥{stats.monthSalesTotal.toLocaleString('ja-JP')} / 支出 ¥{totalExpense.toLocaleString('ja-JP')}
              </div>
              <div style={{ display: 'flex', height: 9, borderRadius: 5, overflow: 'hidden', background: 'var(--line-2)', marginTop: 11 }}>
                <div style={{ width: `${expenseRatio}%`, background: 'var(--line)' }} />
                <div style={{ width: `${profitRatio}%`, background: 'var(--success)' }} />
              </div>
            </div>
          );
        })()}

        {/* ── 要確認バナー ── */}
        {stats.reviewCount > 0 && (
          <Link href="/review" style={{
            display: 'flex', alignItems: 'center', gap: 9,
            background: 'var(--warn-soft)', borderRadius: 13,
            padding: '11px 13px', marginBottom: 16, textDecoration: 'none',
          }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--warn)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 8v5M12 16.5v.5" /><circle cx="12" cy="12" r="9" />
            </svg>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--warn)' }}>要確認 {stats.reviewCount}件</div>
              <div style={{ fontSize: 10, color: 'var(--warn)', fontWeight: 600 }}>タップで修正</div>
            </div>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--warn)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 6l6 6-6 6" />
            </svg>
          </Link>
        )}

        {/* ── 記録する ── */}
        <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--muted)', margin: '2px 2px 8px' }}>記録する</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 24 }}>
          <Link href="/delivery" style={{
            gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: 11,
            background: 'var(--accent)', borderRadius: 13, padding: 13,
            color: '#fff', textDecoration: 'none',
          }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 8a2 2 0 012-2h2l1.5-2h7L18 6h1a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
              <circle cx="12" cy="12.5" r="3.2" />
            </svg>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700 }}>納品書・レシートを撮影</div>
              <div style={{ fontSize: 10, opacity: 0.85 }}>AIが金額・品目を自動で読み取り</div>
            </div>
          </Link>

          <Link href="/sales" style={{
            background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 13, padding: 12,
            display: 'flex', flexDirection: 'column', gap: 7, textDecoration: 'none',
          }}>
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 17l6-6 4 4 7-8" /><path d="M14 7h6v6" />
            </svg>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)' }}>売上を撮影</div>
            <div style={{ fontSize: 9.5, color: 'var(--muted)', lineHeight: 1.3 }}>AIレジの締め画面</div>
          </Link>

          <Link href="/petty-cash" style={{
            background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 13, padding: 12,
            display: 'flex', flexDirection: 'column', gap: 7, textDecoration: 'none',
          }}>
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="var(--ink-2)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="6" width="20" height="13" rx="2" /><circle cx="12" cy="12.5" r="2.6" />
            </svg>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)' }}>小口現金</div>
            <div style={{ fontSize: 9.5, color: 'var(--muted)', lineHeight: 1.3 }}>残高を記入・照合</div>
          </Link>

          <Link href="/expense" style={{
            gridColumn: '1 / -1', background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 13, padding: 12,
            display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 10, textDecoration: 'none',
          }}>
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)' }}>経費を手入力</div>
            <div style={{ fontSize: 9.5, color: 'var(--muted)' }}>少額・現金払い</div>
          </Link>
        </div>

        {/* ── 経営指標 ── */}
        <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--muted)', margin: '2px 2px 8px' }}>経営指標</div>

        {/* ── KPI 上段（3枚） ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 10 }}>
          <div style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 'var(--r-lg)', padding: '16px 12px' }}>
            <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 500, marginBottom: 8, lineHeight: 1.3 }}>平均原価率</div>
            <div style={{ fontSize: 28, fontWeight: 700, lineHeight: 1, color: costColor }}>
              {costRate !== null ? costRate : '—'}
              {costRate !== null && <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--muted)' }}>%</span>}
            </div>
          </div>

          <div style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 'var(--r-lg)', padding: '16px 12px' }}>
            <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 500, marginBottom: 8, lineHeight: 1.3 }}>仕入総額（月）</div>
            <div style={{ fontSize: 18, fontWeight: 700, lineHeight: 1, color: 'var(--ink)' }}>
              {formatYen(stats.monthlyPurchaseTotal)}
            </div>
          </div>

          <Link href="/menu" style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 'var(--r-lg)', padding: '16px 12px', textDecoration: 'none' }}>
            <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 500, marginBottom: 8, lineHeight: 1.3 }}>登録レシピ数</div>
            <div style={{ fontSize: 28, fontWeight: 700, lineHeight: 1, color: 'var(--ink)' }}>
              {stats.recipeCount}
              <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--muted)', marginLeft: 2 }}>品</span>
            </div>
          </Link>
        </div>

        {/* ── KPI 下段（2枚） ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
          <Link href="/delivery-history" style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 'var(--r-lg)', padding: '16px', textDecoration: 'none' }}>
            <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 500, marginBottom: 8 }}>未処理伝票</div>
            <div style={{ fontSize: 28, fontWeight: 700, lineHeight: 1, color: stats.unprocessedSlips > 0 ? 'var(--accent)' : 'var(--ink)' }}>
              {stats.unprocessedSlips}
              <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--muted)', marginLeft: 2 }}>枚</span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--accent)', marginTop: 6, fontWeight: 500 }}>→ 確認する</div>
          </Link>

          <Link href="/menu" style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 'var(--r-lg)', padding: '16px', textDecoration: 'none' }}>
            <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 500, marginBottom: 8 }}>メニュー数</div>
            <div style={{ fontSize: 28, fontWeight: 700, lineHeight: 1, color: 'var(--ink)' }}>
              {stats.menuItemCount}
              <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--muted)', marginLeft: 2 }}>品</span>
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

          {stats.topCostItems.length > 0 ? (
            stats.topCostItems.map((item, i) => {
              const barColor = item.costRate > 40 ? 'var(--accent)' : item.costRate > 30 ? 'var(--accent-2)' : '#16a34a';
              const barWidth = Math.min(100, (item.costRate / Math.max(maxCostRate, 1)) * 100);
              return (
                <div key={item.name} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: i < stats.topCostItems.length - 1 ? 12 : 0 }}>
                  <div style={{ width: 90, fontSize: 12, color: 'var(--ink-2)', fontWeight: 500, flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.name}
                  </div>
                  <div style={{ flex: 1, height: 6, background: 'var(--line-2)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ width: `${barWidth}%`, height: '100%', background: barColor, borderRadius: 3 }} />
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

        </div>

      </div>
    </div>
  );
}
