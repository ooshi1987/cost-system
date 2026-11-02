import Link from 'next/link';

export interface OwnerDashboardData {
  dateLabel: string;
  monthlySales: number;
  monthlyPurchase: number;
  monthlyExpense: number;
  reviewCount: number;
  receiptDifferences: number;
  dailyRecords: { date: string; salesTotal: number; hasSales: boolean; needsReview: boolean }[];
}

function yen(amount: number): string {
  return `${amount < 0 ? '−' : ''}¥${Math.abs(amount).toLocaleString('ja-JP')}`;
}

function dateLabel(key: string): string {
  return `${Number(key.slice(5, 7))}月${Number(key.slice(8, 10))}日`;
}

export default function DesktopAdminPanel({ storeName, data }: { storeName: string | null; data: OwnerDashboardData }) {
  const today = data.dailyRecords[0];
  const hasAlerts = data.reviewCount > 0 || data.receiptDifferences > 0;

  return (
    <div className="owner-dashboard hidden md:block">
      <header className="owner-header">
        <div><p>{data.dateLabel}・{storeName ?? '店舗'}</p><h1>今日の状況</h1></div>
        <Link href="/daily-ledger">日次集計表を開く <span aria-hidden="true">→</span></Link>
      </header>

      <div className="owner-metrics">
        <div className="owner-metric"><span>今日の売上</span><strong>{today?.hasSales ? yen(today.salesTotal) : '—'}</strong><small>{today?.hasSales ? '売上の登録額' : '売上は未記録'}</small></div>
        <div className="owner-metric"><span>今月の仕入伝票</span><strong>{yen(data.monthlyPurchase)}</strong><small>経費取引 {yen(data.monthlyExpense)}</small><small>合算していません</small></div>
        <div className="owner-metric"><span>今月の入出金差引</span><strong>{yen(data.monthlySales - data.monthlyExpense)}</strong><small>売上−経費取引。伝票は含まれません</small><small>利益ではありません</small></div>
        <Link href="/review" className="owner-metric owner-metric-link"><span>要確認の取引</span><strong>{data.reviewCount}件</strong><small>今月の取引一覧を見る →</small></Link>
      </div>
      <p className="owner-footnote">仕入伝票と経費取引には重複が含まれる場合があるため、合算していません。入出金差引・日次集計表は取引を基にし、仕入伝票は含みません。</p>

      <div className="owner-panels">
        <section className="owner-panel">
          <div className="owner-panel-heading"><div><h2>日次の売上記録</h2><p>直近7日・締めの完了状態ではありません</p></div><Link href="/daily-ledger">集計表を見る →</Link></div>
          <div className="owner-table" role="table" aria-label="直近7日の売上記録">
            <div className="owner-row owner-row-head" role="row"><span role="columnheader">日付</span><span role="columnheader">売上</span><span role="columnheader">記録状況</span></div>
            {data.dailyRecords.map((row) => (
              <div className="owner-row" role="row" key={row.date}>
                <span role="cell">{dateLabel(row.date)}</span>
                <strong role="cell">{row.hasSales ? yen(row.salesTotal) : '—'}</strong>
                <span role="cell"><span className={`owner-badge ${row.needsReview ? 'warn' : ''}`}>{row.needsReview ? '要確認の取引あり' : row.hasSales ? '売上記録あり' : '売上未記録'}</span></span>
              </div>
            ))}
          </div>
        </section>
        <section className="owner-panel">
          <div className="owner-panel-heading"><div><h2>確認が必要な項目</h2><p>今月の記録</p></div></div>
          <div className="owner-alerts">
            {data.reviewCount > 0 && <Link href="/review"><strong>要確認の取引 {data.reviewCount}件</strong><small>内容を確認する →</small></Link>}
            {data.receiptDifferences > 0 && <Link href="/delivery-history"><strong>伝票の金額に差額 {data.receiptDifferences}件</strong><small>納品履歴を確認する →</small></Link>}
            {!hasAlerts && <p className="owner-empty">表示できる要確認項目はありません。</p>}
          </div>
          <p className="owner-panel-note">締めの完了、売上合計との照合、材料価格の変化はまだ判定できません。</p>
        </section>
      </div>
    </div>
  );
}
