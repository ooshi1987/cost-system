'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import StoreSelector from '@/components/StoreSelector';
import type { TodayStatus } from './DashboardClient';

function yen(amount: number): string {
  return `¥${amount.toLocaleString('ja-JP')}`;
}

export default function MobileToday({
  storeName,
  today,
  reviewCount,
  monthlySales,
  monthlyPurchase,
  monthlyExpense,
}: {
  storeName: string | null;
  today: TodayStatus;
  reviewCount: number;
  monthlySales: number;
  monthlyPurchase: number;
  monthlyExpense: number;
}) {
  const router = useRouter();

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  };

  return (
    <div className="mobile-today md:hidden">
      <header className="today-header">
        <Link href="/dashboard" className="today-brand">
          <svg width="23" height="23" viewBox="0 0 28 28" fill="none" aria-hidden="true">
            <circle cx="14" cy="14" r="13" stroke="var(--accent)" strokeWidth="1.5" />
            <path d="M9 14h10M14 9v10" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <span><strong>Costra</strong><small>{storeName ?? '店舗'}</small></span>
        </Link>
        <div className="today-header-actions">
          <Link href="/help/dashboard">使い方</Link>
          <Link href="/admin">設定</Link>
          <button type="button" onClick={handleLogout}>ログアウト</button>
        </div>
      </header>
      <StoreSelector />

      <p className="today-date">{today.dateLabel}</p>
      <h1>今日の締めを<br />終わらせましょう</h1>

      <section className="today-status" aria-labelledby="today-status-title">
        <div className="today-status-heading">
          <h2 id="today-status-title"><span aria-hidden="true" />今日の記録</h2>
          <span>{today.hasSales ? '売上の記録あり' : '売上の記録なし'}</span>
        </div>
        <div className="today-status-items">
          <span>売上 <strong>{today.hasSales ? '記録あり' : '未記録'}</strong></span>
          <span>伝票 <strong>{today.slipCount}枚</strong></span>
        </div>
        <p>記録の有無を表示しています。締めの完了・照合状態はまだ確認できません。</p>
      </section>

      <div className="today-actions">
        <Link href="/sales" className="today-action today-action-primary">
          <span className="today-action-icon" aria-hidden="true">¥</span>
          <span><strong>Airレジの締め画面を撮影</strong><small>売上を読み取って記録</small></span>
          <span className="today-action-arrow" aria-hidden="true">›</span>
        </Link>
        <Link href="/delivery" className="today-action">
          <span className="today-action-icon" aria-hidden="true">▤</span>
          <span><strong>伝票・レシートを追加</strong><small>今日の日付の伝票 {today.slipCount}枚</small></span>
          <span className="today-action-arrow" aria-hidden="true">›</span>
        </Link>
      </div>

      <Link href="/review" className={`today-review ${reviewCount > 0 ? 'has-review' : ''}`}>
        <span className="today-review-icon" aria-hidden="true">!</span>
        <span><strong>{reviewCount > 0 ? `今月の要確認の取引 ${reviewCount}件` : '今月の要確認の取引はありません'}</strong><small>取引の確認状況を見る</small></span>
        <span className="today-action-arrow" aria-hidden="true">›</span>
      </Link>

      <h2 className="today-section-label">今月の記録</h2>
      <div className="today-metrics">
        <div><span>売上累計</span><strong>{yen(monthlySales)}</strong></div>
        <div><span>仕入伝票</span><strong>{yen(monthlyPurchase)}</strong></div>
        <div><span>経費取引</span><strong>{yen(monthlyExpense)}</strong></div>
      </div>
      <p className="today-metrics-note">仕入伝票と経費取引には重複が含まれる場合があります。</p>
    </div>
  );
}
