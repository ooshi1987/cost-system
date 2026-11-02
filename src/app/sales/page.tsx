'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { isDocumentDate, japanDateKey } from '@/lib/deliveryAmounts';
import { isSalesAmount, salesDifference, type SalesClosingItem, type SalesMethod } from '@/lib/salesClosing';

interface EditableSalesItem {
  method: SalesMethod;
  label: string;
  amount: string;
  needsReview?: boolean;
}

type PageState = 'capture' | 'processing' | 'reviewing' | 'saving' | 'saved';

const METHOD_DOT_COLOR: Record<string, string> = {
  cash: 'var(--success)',
  cashless: 'var(--accent)',
  transfer: 'var(--ink-2)',
  other: 'var(--muted)',
};

export default function SalesPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [pageState, setPageState] = useState<PageState>('capture');
  const [items, setItems] = useState<EditableSalesItem[]>([]);
  const [customerCount, setCustomerCount] = useState<number | null>(null);
  const [statedTotal, setStatedTotal] = useState<number | null>(null);
  const [businessDate, setBusinessDate] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [savedWithReview, setSavedWithReview] = useState(false);
  const [alreadySaved, setAlreadySaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState<EditableSalesItem | null>(null);

  const parsedItems: SalesClosingItem[] = items.map((item) => ({ ...item, amount: item.amount.trim() ? Number(item.amount) : NaN, needsReview: item.needsReview ?? false }));
  const allItemsValid = parsedItems.length > 0 && parsedItems.every((item) => item.label.trim() && isSalesAmount(item.amount));
  const itemsTotal = parsedItems.reduce((sum, item) => sum + (isSalesAmount(item.amount) ? Math.round(item.amount * 100) : 0), 0) / 100;
  const reviewCount = items.filter((item) => item.needsReview).length;
  const totalDiff = statedTotal !== null && isSalesAmount(statedTotal) && allItemsValid ? salesDifference(statedTotal, parsedItems) : null;
  const canSave = pageState === 'reviewing' && editingIdx === null && isDocumentDate(businessDate) && businessDate <= japanDateKey() &&
    statedTotal !== null && isSalesAmount(statedTotal) && allItemsValid && confirmed;

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target?.result as string);
      setError(null);
    };
    reader.readAsDataURL(file);
  };

  const handleOcr = async () => {
    if (!fileInputRef.current?.files?.[0]) { setError('画像を選択してください'); return; }
    setPageState('processing');
    setError(null);
    try {
      const formData = new FormData();
      formData.append('image', fileInputRef.current.files[0]);
      const response = await fetch('/api/sales/ocr', { method: 'POST', body: formData });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || '読取に失敗しました');
      }
      const data = await response.json();
      if (!Array.isArray(data.items)) throw new Error('読み取り結果を確認できませんでした');
      setItems(
        data.items.map((item: { method: string; label: string; amount: number; needsReview?: boolean }) => ({
          method: (['cash', 'cashless', 'transfer', 'other'].includes(item.method) ? item.method : 'other') as SalesMethod,
          label: typeof item.label === 'string' ? item.label : '',
          amount: isSalesAmount(item.amount) ? String(item.amount) : '',
          needsReview: item.needsReview === true || !isSalesAmount(item.amount),
        }))
      );
      setCustomerCount(Number.isInteger(data.customerCount) && data.customerCount >= 0 && data.customerCount <= 1_000_000 ? data.customerCount : null);
      setStatedTotal(isSalesAmount(data.statedTotal) ? data.statedTotal : null);
      setBusinessDate('');
      setConfirmed(false);
      setPageState('reviewing');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
      setPageState('capture');
    }
  };

  const startEdit = (idx: number) => {
    setEditingIdx(idx);
    setEditDraft({ ...items[idx] });
  };
  const cancelEdit = () => {
    setEditingIdx(null);
    setEditDraft(null);
  };
  const saveEdit = () => {
    if (editingIdx === null || !editDraft) return;
    if (!editDraft.label.trim() || !editDraft.amount.trim() || !isSalesAmount(Number(editDraft.amount))) { setError('名前と金額を確認してください'); return; }
    setItems((prev) => prev.map((item, i) => (i === editingIdx ? { ...editDraft, needsReview: false } : item)));
    setConfirmed(false);
    setError(null);
    setEditingIdx(null);
    setEditDraft(null);
  };
  const removeItem = (idx: number) => {
    setItems((prev) => prev.filter((_, i) => i !== idx));
    setConfirmed(false);
    setEditingIdx(null);
    setEditDraft(null);
  };

  const handleSave = async () => {
    if (!canSave) { setError('営業日・原本の売上合計・決済内訳を確認してください'); return; }
    setPageState('saving');
    setError(null);
    try {
      const response = await fetch('/api/sales/close', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessDate, statedTotal, customerCount, confirmed, items: parsedItems }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || '保存に失敗しました');
      setSavedWithReview(result.needsReview === true);
      setAlreadySaved(result.status === 'already-saved');
      setPageState('saved');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
      setPageState('reviewing');
    }
  };

  const resetToCapture = () => {
    setPreview(null);
    setItems([]);
    setCustomerCount(null);
    setStatedTotal(null);
    setBusinessDate('');
    setConfirmed(false);
    setSavedWithReview(false);
    setAlreadySaved(false);
    setError(null);
    setPageState('capture');
    setEditingIdx(null);
    setEditDraft(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const isReviewing = pageState === 'reviewing' || pageState === 'saving';

  return (
    <div style={{ minHeight: '100svh', background: 'var(--bg)' }}>
      <div style={{ maxWidth: 440, margin: '0 auto', padding: '14px 16px 24px' }}>
        <header style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 14 }}>
          <Link href="/dashboard" style={{ display: 'flex', color: 'var(--muted)' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 5l-7 7 7 7" />
            </svg>
          </Link>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>売上を入力</div>
            <div style={{ fontSize: 10, color: 'var(--muted)' }}>Airレジの締め画面から</div>
          </div>
        </header>

        {error && (
          <div style={{ background: 'var(--warn-soft)', color: 'var(--warn)', borderRadius: 10, padding: '10px 12px', fontSize: 13, marginBottom: 12 }}>
            {error}
          </div>
        )}

        {/* ── 撮影 ── */}
        {pageState === 'capture' && (
          <div style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 'var(--r-lg)', padding: 16 }}>
            <div style={{ border: '2px dashed var(--line)', borderRadius: 13, padding: 24, textAlign: 'center' }}>
              {preview ? (
                <>
                  <img src={preview} alt="Preview" style={{ maxWidth: '100%', maxHeight: 220, margin: '0 auto 12px', borderRadius: 10, display: 'block' }} />
                  <button onClick={() => fileInputRef.current?.click()} style={{ color: 'var(--accent)', fontSize: 13, fontWeight: 600, background: 'none', border: 'none' }}>
                    別の画像を選ぶ
                  </button>
                </>
              ) : (
                <>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>📷</div>
                  <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 16 }}>Airレジの締め画面を撮影またはアップロード</p>
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                    <button
                      onClick={() => { fileInputRef.current?.setAttribute('capture', 'environment'); fileInputRef.current?.click(); }}
                      style={{ background: 'var(--accent)', color: '#fff', padding: '11px 18px', borderRadius: 11, fontWeight: 700, fontSize: 13, border: 'none' }}
                    >
                      📷 撮影
                    </button>
                    <button
                      onClick={() => { fileInputRef.current?.removeAttribute('capture'); fileInputRef.current?.click(); }}
                      style={{ background: 'var(--line-2)', color: 'var(--ink-2)', padding: '11px 18px', borderRadius: 11, fontWeight: 700, fontSize: 13, border: 'none' }}
                    >
                      画像を選択
                    </button>
                  </div>
                </>
              )}
            </div>

            {preview && (
              <button
                onClick={handleOcr}
                style={{ marginTop: 14, width: '100%', background: 'var(--accent)', color: '#fff', padding: '13px 0', borderRadius: 13, fontWeight: 700, fontSize: 14, border: 'none' }}
              >
                読み取り開始
              </button>
            )}

            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} style={{ display: 'none' }} />
          </div>
        )}

        {/* ── 処理中 ── */}
        {pageState === 'processing' && (
          <div style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 'var(--r-lg)', padding: 32, textAlign: 'center' }}>
            <div style={{ fontSize: 34, marginBottom: 12 }}>⚙️</div>
            <p style={{ fontWeight: 700, color: 'var(--ink)' }}>読み取り中…</p>
            <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>Claudeが解析しています</p>
          </div>
        )}

        {/* ── 確認・編集 ── */}
        {isReviewing && (
          <>
            {preview && <img src={preview} alt="照合するレジ締め画面の原本" style={{ width: '100%', maxHeight: 240, objectFit: 'contain', borderRadius: 13, background: 'var(--ink)', marginBottom: 12 }} />}

            <div style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 14, padding: 12, marginBottom: 10 }}>
              <label htmlFor="sales-date" style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>営業日 <span style={{ color: 'var(--accent)' }}>必須</span></label>
              <input id="sales-date" type="date" value={businessDate} max={japanDateKey()} disabled={pageState === 'saving'} onChange={(e) => { setBusinessDate(e.target.value); setConfirmed(false); }} style={{ width: '100%', minWidth: 0, padding: 9, border: '1px solid var(--line)', borderRadius: 8, background: 'var(--paper)' }} />
              <p style={{ margin: '6px 0 12px', color: 'var(--muted)', fontSize: 11 }}>深夜0時を過ぎた場合も、締め画面の営業日を入力してください。</p>
              <label htmlFor="sales-stated-total" style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>原本の売上合計 <span style={{ color: 'var(--accent)' }}>必須</span></label>
              <input id="sales-stated-total" type="number" min="0" step="0.01" inputMode="decimal" value={statedTotal ?? ''} disabled={pageState === 'saving'} onChange={(e) => { setStatedTotal(e.target.value === '' ? null : Number(e.target.value)); setConfirmed(false); }} style={{ width: '100%', minWidth: 0, padding: 9, border: '1px solid var(--line)', borderRadius: 8, background: 'var(--paper)', textAlign: 'right' }} />
              <p style={{ margin: '6px 0 0', color: 'var(--muted)', fontSize: 11 }}>読み取った金額を原本と照らし、必要なら修正してください。</p>
            </div>

            {/* 要確認 + 合計照合 */}
            <div style={{ display: 'flex', gap: 7, marginBottom: 11 }}>
              <div style={{ flex: 1, background: 'var(--warn-soft)', borderRadius: 11, padding: '9px 10px' }}>
                <div style={{ fontSize: 10, color: 'var(--warn)', fontWeight: 700 }}>要確認</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--warn)' }}>{reviewCount}件</div>
              </div>
              <div style={{ flex: 1.3, background: totalDiff === 0 ? 'var(--success-soft)' : 'var(--warn-soft)', borderRadius: 11, padding: '9px 10px' }}>
                <div style={{ fontSize: 10, color: totalDiff === 0 ? 'var(--success)' : 'var(--warn)', fontWeight: 700 }}>合計照合</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: totalDiff === 0 ? 'var(--success)' : 'var(--warn)' }}>
                  {totalDiff === null ? '合計・内訳を確認' : totalDiff === 0 ? '✓ 一致' : `差額 ${totalDiff > 0 ? '+' : ''}¥${totalDiff.toLocaleString()}`}
                </div>
              </div>
            </div>

            {/* 内訳リスト */}
            <div style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 14, padding: 12, marginBottom: 10 }}>
              {items.map((item, idx) => {
                const isEditing = editingIdx === idx;
                if (isEditing && editDraft) {
                  return (
                    <div key={idx} style={{ border: '2px solid var(--accent)', background: 'var(--accent-soft)', borderRadius: 10, padding: 10, marginBottom: 8 }}>
                      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                        <input
                          value={editDraft.label}
                          onChange={(e) => setEditDraft({ ...editDraft, label: e.target.value })}
                          autoFocus
                          style={{ flex: 1, fontSize: 13, fontWeight: 700, background: 'transparent', border: 'none', borderBottom: '2px solid var(--accent)', outline: 'none' }}
                        />
                        <button onClick={() => removeItem(idx)} style={{ color: '#e0655a', background: 'none', border: 'none', fontSize: 18, lineHeight: 1 }}>×</button>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                        <span style={{ fontSize: 12, color: 'var(--muted)' }}>¥</span>
                        <input
                          type="number"
                          value={editDraft.amount}
                          onChange={(e) => setEditDraft({ ...editDraft, amount: e.target.value })}
                          style={{ flex: 1, fontSize: 13, textAlign: 'right', background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 8, padding: '6px 8px' }}
                        />
                      </div>
                      <label style={{ display: 'block', color: 'var(--ink-2)', fontSize: 11, marginBottom: 8 }}>決済方法
                        <select value={editDraft.method} onChange={(e) => setEditDraft({ ...editDraft, method: e.target.value as SalesMethod })} style={{ display: 'block', width: '100%', marginTop: 4, padding: 8, border: '1px solid var(--line)', borderRadius: 8, background: 'var(--paper)' }}>
                          <option value="cash">現金</option><option value="cashless">カード・電子決済</option><option value="transfer">オンライン・振込</option><option value="other">その他</option>
                        </select>
                      </label>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={saveEdit} style={{ flex: 1, background: 'var(--accent)', color: '#fff', padding: '7px 0', borderRadius: 8, fontWeight: 700, fontSize: 12, border: 'none' }}>保存</button>
                        <button onClick={cancelEdit} style={{ padding: '7px 14px', borderRadius: 8, fontSize: 12, background: 'var(--paper)', border: '1px solid var(--line)', color: 'var(--muted)' }}>取消</button>
                      </div>
                    </div>
                  );
                }
                return (
                  <button
                    key={idx}
                    onClick={() => editingIdx === null && pageState !== 'saving' && startEdit(idx)}
                    disabled={editingIdx !== null || pageState === 'saving'}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: 9,
                      padding: '9px 8px', marginBottom: 2, borderRadius: 9,
                      background: item.needsReview ? 'var(--warn-soft)' : 'transparent',
                      border: 'none', textAlign: 'left', borderBottom: '1px solid var(--line-2)',
                      cursor: 'pointer',
                    }}
                  >
                    <span style={{ width: 8, height: 8, borderRadius: 2, background: METHOD_DOT_COLOR[item.method] ?? 'var(--muted)' }} />
                    <span style={{ flex: 1, fontSize: 12.5, color: item.needsReview ? 'var(--warn)' : 'var(--ink)' }}>
                      {item.needsReview && '要確認 '}{item.label}
                    </span>
                    <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--ink)' }}>¥{(parseFloat(item.amount) || 0).toLocaleString()}</span>
                  </button>
                );
              })}
              {customerCount !== null && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '9px 8px' }}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--muted)' }} />
                  <span style={{ flex: 1, fontSize: 12.5, color: 'var(--ink)' }}>客数</span>
                  <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--ink)' }}>{customerCount}名</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, paddingTop: 9, borderTop: '2px solid var(--ink)' }}>
                <span style={{ fontSize: 11, fontWeight: 700 }}>決済内訳の合計</span>
                <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--success)' }}>{allItemsValid ? `¥${itemsTotal.toLocaleString()}` : '—'}</span>
              </div>
              <button type="button" disabled={editingIdx !== null || pageState === 'saving' || items.length >= 100} onClick={() => { setItems((prev) => [...prev, { method: 'other', label: '', amount: '', needsReview: true }]); setEditingIdx(items.length); setEditDraft({ method: 'other', label: '', amount: '', needsReview: true }); setConfirmed(false); }} style={{ marginTop: 10, width: '100%', padding: 9, borderRadius: 8, background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--accent)', fontWeight: 700, fontSize: 12 }}>＋ 決済内訳を追加</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {totalDiff !== null && totalDiff !== 0 && <p style={{ margin: 0, color: 'var(--warn)', fontSize: 12, lineHeight: 1.5 }}>差額を確認してください。差額が残る場合は要確認として送信します。</p>}
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, color: 'var(--ink-2)', fontSize: 12, lineHeight: 1.5 }}>
                <input type="checkbox" checked={confirmed} disabled={pageState === 'saving'} onChange={(e) => setConfirmed(e.target.checked)} style={{ marginTop: 3 }} />
                <span>営業日・売上合計・決済内訳を原本と照合しました</span>
              </label>
              <button
                onClick={handleSave}
                disabled={!canSave}
                style={{
                  width: '100%', padding: '13px 0', borderRadius: 13, fontWeight: 700, fontSize: 14, border: 'none',
                  background: !canSave ? 'var(--line)' : 'var(--accent)', color: '#fff',
                }}
              >
                {pageState === 'saving' ? '保存中…' : 'この内容で保存'}
              </button>
              <button
                onClick={resetToCapture}
                disabled={pageState === 'saving'}
                style={{ width: '100%', padding: '11px 0', borderRadius: 13, fontWeight: 600, fontSize: 13, background: 'var(--line-2)', color: 'var(--ink-2)', border: 'none' }}
              >
                撮り直す
              </button>
            </div>
          </>
        )}

        {/* ── 保存完了 ── */}
        {pageState === 'saved' && (
          <div style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 'var(--r-lg)', padding: 24, textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
            <p style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink)', marginBottom: 4 }}>{alreadySaved ? 'この内容は保存済みです' : '売上を保存しました'}</p>
            <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 20 }}>¥{itemsTotal.toLocaleString('ja-JP')}</p>
            {savedWithReview && <p style={{ color: 'var(--warn)', fontSize: 12, marginBottom: 16 }}>差額または読取に要確認の項目があります。</p>}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Link href="/sales/history" style={{ display: 'block', textAlign: 'center', background: 'var(--paper)', border: '1px solid var(--line)', color: 'var(--ink-2)', padding: '12px 0', borderRadius: 13, fontWeight: 600, textDecoration: 'none' }}>売上締め履歴を見る</Link>
              <button
                onClick={resetToCapture}
                style={{ width: '100%', background: 'var(--accent)', color: '#fff', padding: '14px 0', borderRadius: 13, fontWeight: 700, border: 'none' }}
              >
                続けて撮影
              </button>
              <Link
                href="/dashboard"
                style={{ display: 'block', textAlign: 'center', background: 'var(--line-2)', color: 'var(--ink-2)', padding: '12px 0', borderRadius: 13, fontWeight: 600, textDecoration: 'none' }}
              >
                ホームへ
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
