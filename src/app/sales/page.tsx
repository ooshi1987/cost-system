'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';

interface EditableSalesItem {
  method: string;
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
  const [error, setError] = useState<string | null>(null);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState<EditableSalesItem | null>(null);

  const itemsTotal = items.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
  const reviewCount = items.filter((item) => item.needsReview).length;
  const totalDiff = statedTotal !== null ? Math.round((statedTotal - itemsTotal) * 100) / 100 : null;

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
      setItems(
        data.items.map((item: { method: string; label: string; amount: number; needsReview?: boolean }) => ({
          method: item.method,
          label: item.label,
          amount: String(item.amount),
          needsReview: item.needsReview ?? false,
        }))
      );
      setCustomerCount(data.customerCount ?? null);
      setStatedTotal(data.statedTotal ?? null);
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
    setItems((prev) => prev.map((item, i) => (i === editingIdx ? { ...editDraft, needsReview: false } : item)));
    setEditingIdx(null);
    setEditDraft(null);
  };
  const removeItem = (idx: number) => {
    setItems((prev) => prev.filter((_, i) => i !== idx));
    setEditingIdx(null);
    setEditDraft(null);
  };

  const handleSave = async () => {
    const validItems = items.filter((item) => item.label.trim() && parseFloat(item.amount) >= 0);
    if (validItems.length === 0) { setError('保存できる内訳がありません'); return; }
    setPageState('saving');
    setError(null);
    try {
      const today = new Date().toISOString();
      for (const [idx, item] of validItems.entries()) {
        const response = await fetch('/api/transactions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'sale',
            date: today,
            amount: parseFloat(item.amount),
            method: item.method,
            vendor: item.label,
            source: 'ocr',
            needsReview: item.needsReview ?? false,
            statedTotal: statedTotal ?? null,
            memo: idx === 0 && customerCount ? `客数 ${customerCount}名` : null,
          }),
        });
        if (!response.ok) throw new Error('保存に失敗しました');
      }
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
            <div style={{ fontSize: 10, color: 'var(--muted)' }}>AIレジの締め画面から</div>
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
                  <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 16 }}>AIレジの締め画面を撮影またはアップロード</p>
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
            <div style={{ height: 96, borderRadius: 13, background: 'linear-gradient(135deg,#3a352e,#22201c)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12, position: 'relative' }}>
              <span style={{ fontSize: 11, color: '#c9bfa8' }}>📷 レジ締め画面を読取済み</span>
              <span style={{ position: 'absolute', top: 8, right: 9, fontSize: 9, fontWeight: 700, color: '#fff', background: 'var(--success)', borderRadius: 999, padding: '2px 8px' }}>AI読取</span>
            </div>

            {/* 要確認 + 合計照合 */}
            <div style={{ display: 'flex', gap: 7, marginBottom: 11 }}>
              <div style={{ flex: 1, background: 'var(--warn-soft)', borderRadius: 11, padding: '9px 10px' }}>
                <div style={{ fontSize: 10, color: 'var(--warn)', fontWeight: 700 }}>要確認</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--warn)' }}>{reviewCount}件</div>
              </div>
              <div style={{ flex: 1.3, background: totalDiff === null || totalDiff === 0 ? 'var(--success-soft)' : 'var(--warn-soft)', borderRadius: 11, padding: '9px 10px' }}>
                <div style={{ fontSize: 10, color: totalDiff === null || totalDiff === 0 ? 'var(--success)' : 'var(--warn)', fontWeight: 700 }}>合計照合</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: totalDiff === null || totalDiff === 0 ? 'var(--success)' : 'var(--warn)' }}>
                  {totalDiff === null ? '✓ 記載なし' : totalDiff === 0 ? '✓ 一致' : `差額 ${totalDiff > 0 ? '+' : ''}¥${totalDiff.toLocaleString()}`}
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
                <span style={{ fontSize: 11, fontWeight: 700 }}>売上合計</span>
                <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--success)' }}>¥{itemsTotal.toLocaleString()}</span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button
                onClick={handleSave}
                disabled={pageState === 'saving' || items.length === 0 || editingIdx !== null}
                style={{
                  width: '100%', padding: '13px 0', borderRadius: 13, fontWeight: 700, fontSize: 14, border: 'none',
                  background: pageState === 'saving' || items.length === 0 ? 'var(--line)' : 'var(--accent)', color: '#fff',
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
            <p style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink)', marginBottom: 4 }}>売上を保存しました</p>
            <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 20 }}>¥{itemsTotal.toLocaleString('ja-JP')}</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
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
