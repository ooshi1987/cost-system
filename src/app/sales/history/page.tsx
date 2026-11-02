'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { japanDateKey } from '@/lib/deliveryAmounts';
import SalesClosingReview from '@/app/review/SalesClosingReview';

interface ClosingSummary {
  id: string;
  date: string;
  statedTotal: number | null;
  itemsTotal: number;
  needsReview: boolean;
}

export default function SalesHistoryPage() {
  const [month, setMonth] = useState(() => japanDateKey().slice(0, 7));
  const [closings, setClosings] = useState<ClosingSummary[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let active = true;
    if (!month) { setLoading(false); return; }
    setLoading(true); setError(null);
    fetch(`/api/sales/close?month=${encodeURIComponent(month)}`)
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok || !Array.isArray(data.closings)) throw new Error(data.error || '履歴を読み込めませんでした');
        if (active) setClosings(data.closings);
      })
      .catch((err) => { if (active) setError(err instanceof Error ? err.message : '履歴を読み込めませんでした'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [month, reload]);

  if (selected) return <SalesClosingReview id={selected} backLabel="売上締め履歴に戻る" onBack={() => { setSelected(null); setReload((value) => value + 1); }} />;
  return (
    <div style={{ minHeight: '100svh', background: 'var(--bg)' }}>
      <div style={{ maxWidth: 480, margin: '0 auto', padding: '18px 16px 32px' }}>
        <Link href="/dashboard" style={{ color: 'var(--accent)', fontSize: 12, textDecoration: 'none' }}>← 今日へ戻る</Link>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: '14px 0 6px' }}>売上締め履歴</h1>
        <p style={{ color: 'var(--muted)', fontSize: 11, lineHeight: 1.6, margin: '0 0 14px' }}>新しい売上締めの記録を表示します。従来の売上記録は日次集計表で確認できます。</p>
        <label style={{ display: 'block', marginBottom: 14, fontSize: 12, fontWeight: 700 }}>表示する月
          <input type="month" value={month} onChange={(event) => setMonth(event.target.value)} style={{ display: 'block', marginTop: 5, padding: 9, borderRadius: 9, border: '1px solid var(--line)', background: 'var(--paper)' }} />
        </label>
        {loading && <p style={{ color: 'var(--muted)', fontSize: 12 }}>読み込み中…</p>}
        {error && <p role="alert" style={{ color: 'var(--warn)', fontSize: 12 }}>{error}</p>}
        {!loading && !error && !month && <p style={{ color: 'var(--warn)', fontSize: 12 }}>表示する月を選んでください。</p>}
        {!loading && !error && month && !closings.length && <p style={{ color: 'var(--muted)', fontSize: 12 }}>この月に新しい売上締めの記録はありません。</p>}
        {!loading && !error && month && <div style={{ display: 'grid', gap: 8 }}>
          {closings.map((closing) => <button type="button" key={closing.id} onClick={() => setSelected(closing.id)} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: 14, textAlign: 'left', border: '1px solid var(--line)', borderRadius: 13, background: 'var(--paper)', color: 'var(--ink)' }}>
            <span style={{ flex: 1 }}><strong style={{ display: 'block', fontSize: 13 }}>{closing.date} 売上締め</strong><small style={{ display: 'block', marginTop: 4, color: closing.needsReview ? 'var(--warn)' : 'var(--muted)' }}>{closing.needsReview ? '要確認' : '合計一致'}・タップして確認</small></span>
            <strong style={{ fontSize: 13 }}>{closing.statedTotal === null ? '合計未確認' : `¥${closing.statedTotal.toLocaleString()}`}</strong><span aria-hidden="true">›</span>
          </button>)}
        </div>}
        <Link href="/daily-ledger" style={{ display: 'block', marginTop: 18, color: 'var(--accent)', fontSize: 12, textDecoration: 'none' }}>日次集計表を見る →</Link>
      </div>
    </div>
  );
}
