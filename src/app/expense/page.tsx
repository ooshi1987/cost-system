'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import NumericKeypad from '@/components/NumericKeypad';
import { METHOD_LABELS } from '@/lib/dailyLedger';

interface Category {
  id: string;
  name: string;
}

type PageState = 'entry' | 'saving' | 'saved';

export default function ExpensePage() {
  const [amount, setAmount] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState<string>('');
  const [method, setMethod] = useState('cash');
  const [memo, setMemo] = useState('');
  const [pageState, setPageState] = useState<PageState>('entry');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/categories?kind=expense')
      .then((res) => res.json())
      .then((data: Category[]) => {
        setCategories(data);
        if (data.length > 0) setCategoryId(data[0].id);
      })
      .catch(() => setError('科目の取得に失敗しました'));
  }, []);

  const amountValue = parseFloat(amount || '0');
  const canSave = amountValue > 0 && pageState === 'entry';

  const handleSave = async () => {
    if (!canSave) return;
    setPageState('saving');
    setError(null);
    try {
      const response = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'expense',
          date: new Date().toISOString(),
          amount: amountValue,
          categoryId: categoryId || null,
          method,
          memo: memo.trim() || null,
          source: 'manual',
        }),
      });
      if (!response.ok) throw new Error('保存に失敗しました');
      setPageState('saved');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
      setPageState('entry');
    }
  };

  const resetForm = () => {
    setAmount('');
    setMemo('');
    setError(null);
    setPageState('entry');
  };

  if (pageState === 'saved') {
    return (
      <div style={{ minHeight: '100svh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ maxWidth: 400, width: '100%', padding: 20, textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
          <p style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink)', marginBottom: 4 }}>¥{amountValue.toLocaleString('ja-JP')} を保存しました</p>
          <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button
              onClick={resetForm}
              style={{ width: '100%', background: 'var(--accent)', color: '#fff', padding: '14px 0', borderRadius: 'var(--r-lg)', fontWeight: 700, fontSize: 15, border: 'none' }}
            >
              続けて入力
            </button>
            <Link
              href="/dashboard"
              style={{ display: 'block', textAlign: 'center', background: 'var(--paper)', border: '1px solid var(--line)', color: 'var(--ink-2)', padding: '12px 0', borderRadius: 'var(--r-lg)', fontWeight: 600, textDecoration: 'none' }}
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
        {/* ヘッダー */}
        <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <Link href="/dashboard" style={{ display: 'flex', color: 'var(--muted)' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </Link>
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>経費を手入力</span>
          <button
            onClick={handleSave}
            disabled={!canSave}
            style={{
              fontSize: 12, fontWeight: 700, background: 'none', border: 'none',
              color: canSave ? 'var(--accent)' : 'var(--line)',
              cursor: canSave ? 'pointer' : 'default',
            }}
          >
            {pageState === 'saving' ? '保存中…' : '保存'}
          </button>
        </header>

        {/* 金額表示 */}
        <div style={{ textAlign: 'center', marginBottom: 14 }}>
          <div style={{ fontSize: 10.5, color: 'var(--muted)', fontWeight: 600 }}>金額</div>
          <div style={{ fontSize: 34, fontWeight: 700, letterSpacing: '-0.02em', marginTop: 2, color: 'var(--ink)' }}>
            ¥{amountValue.toLocaleString('ja-JP')}
          </div>
        </div>

        {error && (
          <div style={{ background: 'var(--warn-soft)', color: 'var(--warn)', borderRadius: 10, padding: '10px 12px', fontSize: 13, marginBottom: 12 }}>
            {error}
          </div>
        )}

        {/* 科目・支払・メモ */}
        <div style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 'var(--r-lg)', overflow: 'hidden', marginBottom: 12 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '12px 13px', borderBottom: '1px solid var(--line-2)' }}>
            <span style={{ fontSize: 12, color: 'var(--muted)', width: 52 }}>科目</span>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              style={{ flex: 1, fontSize: 12.5, fontWeight: 600, color: 'var(--ink)', background: 'none', border: 'none', outline: 'none' }}
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '12px 13px', borderBottom: '1px solid var(--line-2)' }}>
            <span style={{ fontSize: 12, color: 'var(--muted)', width: 52 }}>支払</span>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              style={{ flex: 1, fontSize: 12.5, fontWeight: 600, color: 'var(--ink)', background: 'none', border: 'none', outline: 'none' }}
            >
              {Object.entries(METHOD_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '12px 13px' }}>
            <span style={{ fontSize: 12, color: 'var(--muted)', width: 52 }}>メモ</span>
            <input
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="例：ふきん・洗剤"
              style={{ flex: 1, fontSize: 12.5, color: 'var(--ink)', background: 'none', border: 'none', outline: 'none' }}
            />
          </label>
        </div>

        <NumericKeypad value={amount} onChange={setAmount} />
      </div>
    </div>
  );
}
