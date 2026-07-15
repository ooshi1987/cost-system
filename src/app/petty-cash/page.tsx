'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import NumericKeypad from '@/components/NumericKeypad';

type PageState = 'loading' | 'entry' | 'saving' | 'saved';

function formatDate(d: Date): string {
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

export default function PettyCashPage() {
  const [pageState, setPageState] = useState<PageState>('loading');
  const [bookBalance, setBookBalance] = useState(0);
  const [actualBalance, setActualBalance] = useState('');
  const [memo, setMemo] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [savedDifference, setSavedDifference] = useState(0);

  useEffect(() => {
    fetch('/api/petty-cash')
      .then((res) => res.json())
      .then((data: { bookBalance: number }) => {
        setBookBalance(data.bookBalance);
        setPageState('entry');
      })
      .catch(() => {
        setError('帳簿残高の取得に失敗しました');
        setPageState('entry');
      });
  }, []);

  const actualValue = actualBalance === '' ? null : parseFloat(actualBalance);
  const difference = actualValue !== null ? Math.round((actualValue - bookBalance) * 100) / 100 : null;

  const handleSave = async () => {
    if (actualValue === null) return;
    setPageState('saving');
    setError(null);
    try {
      const response = await fetch('/api/petty-cash', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actualBalance: actualValue, memo: memo.trim() || null }),
      });
      if (!response.ok) throw new Error('保存に失敗しました');
      setSavedDifference(difference ?? 0);
      setPageState('saved');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
      setPageState('entry');
    }
  };

  if (pageState === 'saved') {
    return (
      <div style={{ minHeight: '100svh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ maxWidth: 400, width: '100%', padding: 20, textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
          <p style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink)', marginBottom: 4 }}>
            残高を記録しました
          </p>
          <p style={{ fontSize: 13, color: 'var(--muted)' }}>
            {savedDifference === 0 ? '差額なし' : `差額 ${savedDifference > 0 ? '+' : ''}¥${savedDifference.toLocaleString('ja-JP')}`}
          </p>
          <div style={{ marginTop: 24 }}>
            <Link
              href="/dashboard"
              style={{ display: 'block', textAlign: 'center', background: 'var(--accent)', color: '#fff', padding: '14px 0', borderRadius: 'var(--r-lg)', fontWeight: 700, textDecoration: 'none' }}
            >
              ホームへ
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100svh', background: 'var(--bg)' }}>
      <div style={{ maxWidth: 440, margin: '0 auto', padding: '14px 16px 24px' }}>
        <header style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 16 }}>
          <Link href="/dashboard" style={{ display: 'flex', color: 'var(--muted)' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 5l-7 7 7 7" />
            </svg>
          </Link>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>小口現金の残高</div>
            <div style={{ fontSize: 10, color: 'var(--muted)' }}>{formatDate(new Date())} 締め</div>
          </div>
        </header>

        {error && (
          <div style={{ background: 'var(--warn-soft)', color: 'var(--warn)', borderRadius: 10, padding: '10px 12px', fontSize: 13, marginBottom: 12 }}>
            {error}
          </div>
        )}

        {/* 帳簿上の残高 */}
        <div style={{ background: 'var(--ink)', borderRadius: 'var(--r-lg)', padding: 15, color: '#f4efe5', marginBottom: 11 }}>
          <div style={{ fontSize: 10.5, color: '#b4aca0', fontWeight: 600 }}>帳簿上の残高</div>
          <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em', marginTop: 2 }}>
            {pageState === 'loading' ? '—' : `¥${bookBalance.toLocaleString('ja-JP')}`}
          </div>
        </div>

        {/* 実際の残高 */}
        <div style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 'var(--r-lg)', padding: 14, marginBottom: 11 }}>
          <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 700, marginBottom: 7 }}>実際の残高を記入</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, borderBottom: '2px solid var(--ink)', paddingBottom: 8 }}>
            <span style={{ fontSize: 18, color: 'var(--muted)' }}>¥</span>
            <span style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.01em', color: 'var(--ink)' }}>
              {actualBalance || '0'}
            </span>
            <span style={{ width: 2, height: 26, background: 'var(--accent)', marginLeft: 2 }} />
          </div>
        </div>

        {/* 照合 */}
        {difference !== null && difference !== 0 && (
          <div style={{ background: 'var(--warn-soft)', borderRadius: 13, padding: 12, marginBottom: 11 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, fontWeight: 700, color: 'var(--warn)' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--warn)" strokeWidth="2.2" strokeLinecap="round">
                <path d="M12 8v5M12 16v.5" /><circle cx="12" cy="12" r="9" />
              </svg>
              差額 {difference > 0 ? '+' : ''}¥{difference.toLocaleString('ja-JP')}
            </div>
            <div style={{ fontSize: 10, color: 'var(--warn)', marginTop: 4 }}>
              {difference < 0 ? '帳簿より実残高が少ないです。原因を記録できます。' : '帳簿より実残高が多いです。原因を記録できます。'}
            </div>
            <textarea
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="原因メモ（任意）"
              rows={2}
              style={{ width: '100%', marginTop: 8, fontSize: 12, padding: 8, borderRadius: 8, border: '1px solid var(--line)', background: 'var(--paper)', resize: 'none' }}
            />
          </div>
        )}

        {difference === 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 11, color: 'var(--success)', background: 'var(--success-soft)', borderRadius: 10, padding: '10px 11px', marginBottom: 11, fontWeight: 700 }}>
            ✓ 一致
          </div>
        )}

        <NumericKeypad value={actualBalance} onChange={setActualBalance} />

        <button
          onClick={handleSave}
          disabled={actualValue === null || pageState === 'saving'}
          style={{
            width: '100%', marginTop: 14, padding: '13px 0', borderRadius: 'var(--r-lg)',
            background: actualValue === null ? 'var(--line)' : 'var(--accent)',
            color: '#fff', fontWeight: 700, fontSize: 14, border: 'none',
            cursor: actualValue === null ? 'default' : 'pointer',
          }}
        >
          {pageState === 'saving' ? '保存中…' : '保存する'}
        </button>
      </div>
    </div>
  );
}
