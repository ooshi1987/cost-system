'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { calculateReceiptAmounts, getDeliveryDocumentDate, japanDateKey, readReceiptMetadata } from '@/lib/deliveryAmounts';
import SalesClosingReview from './SalesClosingReview';

interface Category {
  id: string;
  name: string;
  kind: string;
}

interface Transaction {
  id: string;
  type: string;
  date: string;
  amount: number;
  categoryId: string | null;
  vendor: string | null;
  memo: string | null;
  source: string;
  category: Category | null;
}

interface EditDraft {
  amount: string;
  categoryId: string;
  memo: string;
}

interface Receipt {
  id: string;
  vendor: string | null;
  ocrRawData: string | null;
  createdAt: string;
  deliveryItems: { totalPrice: number }[];
}

function formatDate(iso: string): string {
  const key = japanDateKey(iso);
  return `${Number(key.slice(5, 7))}/${Number(key.slice(8, 10))}`;
}

export default function ReviewPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<EditDraft | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [closingId, setClosingId] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [receipts, setReceipts] = useState<Receipt[]>([]);

  useEffect(() => {
    setLoading(true);
    setError(null);
    Promise.all([
      fetch('/api/transactions?needsReview=1').then((res) => { if (!res.ok) throw new Error('取引を取得できませんでした'); return res.json(); }),
      fetch('/api/categories').then((res) => { if (!res.ok) throw new Error('科目を取得できませんでした'); return res.json(); }),
      fetch('/api/delivery-slips').then((res) => { if (!res.ok) throw new Error('伝票を取得できませんでした'); return res.json(); }),
    ])
      .then(([txData, catData, slipData]) => {
        if (!Array.isArray(txData.transactions) || !Array.isArray(catData) || !Array.isArray(slipData)) throw new Error('一覧の形式を確認できませんでした');
        setTransactions(txData.transactions);
        setCategories(catData);
        setReceipts(slipData);
      })
      .catch(() => setError('データの取得に失敗しました'))
      .finally(() => setLoading(false));
  }, [reloadKey]);

  const startEdit = (tx: Transaction) => {
    setEditingId(tx.id);
    setEditDraft({ amount: String(tx.amount), categoryId: tx.categoryId ?? '', memo: tx.memo ?? '' });
  };
  const cancelEdit = () => {
    setEditingId(null);
    setEditDraft(null);
  };

  const confirmTransaction = async (tx: Transaction, draft: EditDraft) => {
    setSavingId(tx.id);
    setError(null);
    try {
      const response = await fetch(`/api/transactions/${tx.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: parseFloat(draft.amount),
          categoryId: draft.categoryId || null,
          memo: draft.memo.trim() || null,
          needsReview: false,
        }),
      });
      if (!response.ok) throw new Error('更新に失敗しました');
      setTransactions((prev) => prev.filter((t) => t.id !== tx.id));
      setEditingId(null);
      setEditDraft(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
    } finally {
      setSavingId(null);
    }
  };

  const categoriesForType = (type: string) =>
    categories.filter((c) => c.kind === (type === 'sale' ? 'income' : 'expense'));

  if (closingId) return <SalesClosingReview id={closingId} onBack={() => { setClosingId(null); setReloadKey((key) => key + 1); }} />;

  const seen = new Set<string>();
  const displayedTransactions = transactions.filter((tx) => {
    const group = tx.source === 'sales_closing_v1' ? tx.id.match(/^(sc1_[0-9a-f]{64}_)/)?.[1] : undefined;
    if (!group) return true;
    if (seen.has(group)) return false;
    seen.add(group);
    return true;
  });
  const thisMonth = japanDateKey().slice(0, 7);
  const receiptDifferences = receipts.flatMap((receipt) => {
    const metadata = readReceiptMetadata(receipt.ocrRawData);
    if (!metadata || getDeliveryDocumentDate(receipt).slice(0, 7) !== thisMonth) return [];
    const difference = calculateReceiptAmounts(receipt.deliveryItems, metadata.statedTotal, metadata.externalTax).difference;
    return difference === null || difference === 0 ? [] : [{ ...receipt, difference }];
  });

  return (
    <div style={{ minHeight: '100svh', background: 'var(--bg)' }}>
      <div style={{ maxWidth: 440, margin: '0 auto', padding: '14px 16px 24px' }}>
        <header style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 16 }}>
          <Link href="/dashboard" style={{ display: 'flex', color: 'var(--muted)' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 5l-7 7 7 7" />
            </svg>
          </Link>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>今月の要確認 {displayedTransactions.length + receiptDifferences.length}件</div>
        </header>
        <p style={{ margin: '0 0 14px', fontSize: 11, color: 'var(--muted)', lineHeight: 1.6 }}>
          今月の要確認取引と、税込合計・税額を記録した伝票の差額を表示します。未登録の伝票や、税額が未記録の過去の伝票は対象外です。
        </p>

        {error && (
          <div style={{ background: 'var(--warn-soft)', color: 'var(--warn)', borderRadius: 10, padding: '10px 12px', fontSize: 13, marginBottom: 12 }}>
            {error}
          </div>
        )}

        {loading && <p style={{ fontSize: 13, color: 'var(--muted)', textAlign: 'center', padding: 24 }}>読み込み中…</p>}

        {!loading && !error && displayedTransactions.length === 0 && receiptDifferences.length === 0 && (
          <div style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 'var(--r-lg)', padding: 24, textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>✓</div>
            <p style={{ fontSize: 13, color: 'var(--muted)' }}>表示できる要確認項目はありません</p>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {receiptDifferences.map((receipt) => (
            <Link key={receipt.id} href={`/delivery-history#receipt-${receipt.id}`} style={{ display: 'block', textDecoration: 'none', background: 'var(--warn-soft)', borderRadius: 13, padding: '11px 13px', color: 'var(--ink)' }}>
              <strong style={{ display: 'block', fontSize: 12.5 }}>伝票の差額 {receipt.difference > 0 ? '+' : ''}¥{receipt.difference.toLocaleString()}</strong>
              <span style={{ display: 'block', fontSize: 10.5, color: 'var(--warn)', marginTop: 3 }}>{getDeliveryDocumentDate(receipt)} ・ {receipt.vendor || '仕入伝票'} ・ 納品履歴を確認 →</span>
            </Link>
          ))}
          {displayedTransactions.map((tx) => {
            const isEditing = editingId === tx.id;
            if (isEditing && editDraft) {
              return (
                <div key={tx.id} style={{ background: 'var(--accent-soft)', border: '2px solid var(--accent)', borderRadius: 13, padding: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontSize: 11, color: 'var(--muted)' }}>{formatDate(tx.date)} ・ {tx.type === 'sale' ? '売上' : '経費'}</span>
                    <span style={{ fontSize: 11, color: 'var(--warn)', fontWeight: 700 }}>要確認</span>
                  </div>
                  {tx.source === 'sales_closing_v1' && tx.memo?.includes('売上合計と決済内訳の差額') && (
                    <p style={{ margin: '0 0 10px', fontSize: 11, color: 'var(--warn)', lineHeight: 1.5 }}>
                      {tx.memo}。確認済みにしても差額は自動では解消されません。
                    </p>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                    <span style={{ fontSize: 13, color: 'var(--muted)' }}>¥</span>
                    <input
                      type="number"
                      value={editDraft.amount}
                      onChange={(e) => setEditDraft({ ...editDraft, amount: e.target.value })}
                      style={{ flex: 1, fontSize: 15, fontWeight: 700, background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 8, padding: '6px 8px', textAlign: 'right' }}
                    />
                  </div>
                  <select
                    value={editDraft.categoryId}
                    onChange={(e) => setEditDraft({ ...editDraft, categoryId: e.target.value })}
                    style={{ width: '100%', fontSize: 12.5, padding: '7px 8px', borderRadius: 8, border: '1px solid var(--line)', background: 'var(--paper)', marginBottom: 8 }}
                  >
                    <option value="">科目未選択</option>
                    {categoriesForType(tx.type).map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                  <input
                    value={editDraft.memo}
                    onChange={(e) => setEditDraft({ ...editDraft, memo: e.target.value })}
                    placeholder="メモ"
                    style={{ width: '100%', fontSize: 12.5, padding: '7px 8px', borderRadius: 8, border: '1px solid var(--line)', background: 'var(--paper)', marginBottom: 10 }}
                  />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => confirmTransaction(tx, editDraft)}
                      disabled={savingId === tx.id}
                      style={{ flex: 1, background: 'var(--accent)', color: '#fff', padding: '9px 0', borderRadius: 9, fontWeight: 700, fontSize: 13, border: 'none' }}
                    >
                      {savingId === tx.id ? '保存中…' : '確認済みにする'}
                    </button>
                    <button onClick={cancelEdit} style={{ padding: '9px 16px', borderRadius: 9, fontSize: 13, background: 'var(--paper)', border: '1px solid var(--line)', color: 'var(--muted)' }}>
                      取消
                    </button>
                  </div>
                </div>
              );
            }
            return (
              <button
                key={tx.id}
                onClick={() => tx.source === 'sales_closing_v1' ? setClosingId(tx.id) : startEdit(tx)}
                style={{
                  width: '100%', textAlign: 'left', background: 'var(--warn-soft)', borderRadius: 13,
                  padding: '11px 13px', border: 'none', cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--ink)' }}>
                      {tx.source === 'sales_closing_v1' ? '売上締め' : tx.vendor || tx.category?.name || (tx.type === 'sale' ? '売上' : '経費')}
                    </div>
                    <div style={{ fontSize: 10.5, color: 'var(--warn)', fontWeight: 600, marginTop: 2 }}>
                      {formatDate(tx.date)} ・ タップで修正
                    </div>
                    {tx.source === 'sales_closing_v1' && tx.memo?.includes('売上合計と決済内訳の差額') && (
                      <div style={{ fontSize: 10.5, color: 'var(--warn)', marginTop: 4, lineHeight: 1.5 }}>{tx.memo}</div>
                    )}
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>{tx.source === 'sales_closing_v1' ? '›' : `¥${tx.amount.toLocaleString('ja-JP')}`}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
