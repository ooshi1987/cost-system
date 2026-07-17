'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';

interface EditableItem {
  name: string;
  quantity: string;
  unit: string;
  totalPrice: string;
  type: 'food' | 'seasoning';
  needsReview?: boolean;
}

type PageState = 'capture' | 'processing' | 'reviewing' | 'saving' | 'saved';

export default function DeliveryPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [pageState, setPageState] = useState<PageState>('capture');
  const [editableItems, setEditableItems] = useState<EditableItem[]>([]);
  const [vendor, setVendor] = useState('');
  const [statedTotal, setStatedTotal] = useState<number | null>(null);
  const [savedCount, setSavedCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  // タップ編集用
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState<EditableItem | null>(null);

  const itemsTotal = editableItems.reduce((sum, item) => sum + (parseFloat(item.totalPrice) || 0), 0);
  const reviewCount = editableItems.filter((item) => item.needsReview).length;
  const totalDiff = statedTotal !== null ? Math.round((statedTotal - itemsTotal) * 100) / 100 : null;

  // ── 画像圧縮 ──
  const compressImage = async (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let { width, height } = img;
          const maxSize = 2000;
          if (width > height ? width > maxSize : height > maxSize) {
            if (width > height) { height = Math.round((height * maxSize) / width); width = maxSize; }
            else { width = Math.round((width * maxSize) / height); height = maxSize; }
          }
          canvas.width = width;
          canvas.height = height;
          canvas.getContext('2d')?.drawImage(img, 0, 0, width, height);
          canvas.toBlob((blob) => {
            if (blob) resolve(blob);
            else reject(new Error('画像変換に失敗しました'));
          }, 'image/jpeg', 0.7);
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  // ── ファイル選択 ──
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const compressedBlob = await compressImage(file);
      const compressedFile = new File([compressedBlob], file.name, { type: 'image/jpeg' });
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreview(e.target?.result as string);
        setError(null);
        setPageState('capture');
      };
      reader.readAsDataURL(compressedFile);
      if (fileInputRef.current) {
        const dt = new DataTransfer();
        dt.items.add(compressedFile);
        fileInputRef.current.files = dt.files;
      }
    } catch {
      setError('画像の読み込みに失敗しました');
    }
  };

  // ── OCR実行（保存はしない） ──
  const handleOcr = async () => {
    if (!fileInputRef.current?.files?.[0]) { setError('ファイルを選択してください'); return; }
    setPageState('processing');
    setError(null);
    try {
      const formData = new FormData();
      formData.append('image', fileInputRef.current.files[0]);
      const response = await fetch('/api/delivery-slips/ocr', { method: 'POST', body: formData });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'OCRに失敗しました');
      }
      const data = await response.json();
      setEditableItems(
        data.items.map((item: { name: string; quantity: number; unit: string; totalPrice: number; type?: 'food' | 'seasoning'; needsReview?: boolean }) => ({
          name: item.name,
          quantity: String(item.quantity),
          unit: item.unit,
          totalPrice: String(item.totalPrice),
          type: item.type ?? 'food',
          needsReview: item.needsReview ?? false,
        }))
      );
      setVendor(data.vendor ?? '');
      setStatedTotal(data.statedTotal ?? null);
      setPreview(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setPageState('reviewing');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
      setPageState('capture');
    }
  };

  // ── 保存 ──
  const handleSave = async () => {
    const validItems = editableItems.filter(
      (item) => item.name.trim() && parseFloat(item.quantity) > 0 && parseFloat(item.totalPrice) >= 0
    );
    if (validItems.length === 0) { setError('保存できるアイテムがありません'); return; }
    setPageState('saving');
    setError(null);
    try {
      const response = await fetch('/api/delivery-slips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendor: vendor.trim() || null,
          items: validItems.map((item) => ({
            name: item.name.trim(),
            quantity: parseFloat(item.quantity),
            unit: item.unit.trim() || '個',
            totalPrice: parseFloat(item.totalPrice),
            type: item.type,
          })),
        }),
      });
      if (!response.ok) throw new Error('保存に失敗しました');
      setSavedCount(validItems.length);
      setPageState('saved');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
      setPageState('reviewing');
    }
  };

  // ── アイテム操作 ──
  const removeItem = (idx: number) => {
    setEditableItems((prev) => prev.filter((_, i) => i !== idx));
    setEditingIdx(null);
    setEditDraft(null);
  };

  // タップ編集
  const startEdit = (idx: number) => {
    setEditingIdx(idx);
    setEditDraft({ ...editableItems[idx] });
  };
  const cancelEdit = () => {
    setEditingIdx(null);
    setEditDraft(null);
  };
  const saveEdit = () => {
    if (editingIdx === null || !editDraft) return;
    setEditableItems((prev) => prev.map((item, i) => (i === editingIdx ? { ...editDraft, needsReview: false } : item)));
    setEditingIdx(null);
    setEditDraft(null);
  };

  const resetToCapture = () => {
    setPreview(null);
    setEditableItems([]);
    setVendor('');
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
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>
              {isReviewing || pageState === 'saved' ? '納品書の読取結果' : '納品書をスキャン'}
            </div>
            <div style={{ fontSize: 10, color: 'var(--muted)' }}>
              {isReviewing ? (vendor.trim() || '取引先未入力') : '納品書・レシートをAIが自動で読み取り'}
            </div>
          </div>
          <Link
            href="/help/delivery"
            style={{ fontSize: 11, color: 'var(--muted)', padding: '6px 8px', borderRadius: 'var(--r-sm)', textDecoration: 'none' }}
          >
            ？使い方
          </Link>
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
                  <div style={{ fontSize: 40, marginBottom: 12 }}>📸</div>
                  <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 16 }}>納品書・レシートを撮影またはアップロード</p>
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
            {/* 要確認 + 合計照合 */}
            <div style={{ display: 'flex', gap: 7, marginBottom: 11 }}>
              <div style={{ flex: 1, background: 'var(--warn-soft)', borderRadius: 11, padding: '9px 10px' }}>
                <div style={{ fontSize: 10, color: 'var(--warn)', fontWeight: 700 }}>要確認</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--warn)' }}>{reviewCount}件</div>
              </div>
              <div style={{ flex: 1.3, background: totalDiff === null || totalDiff === 0 ? 'var(--success-soft)' : 'var(--warn-soft)', borderRadius: 11, padding: '9px 10px' }}>
                <div style={{ fontSize: 10, color: totalDiff === null || totalDiff === 0 ? 'var(--success)' : 'var(--warn)', fontWeight: 700 }}>合計照合</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: totalDiff === null || totalDiff === 0 ? 'var(--success)' : 'var(--warn)' }}>
                  {totalDiff === null ? '記載金額なし' : totalDiff === 0 ? '✓ 一致' : `差額 ${totalDiff > 0 ? '+' : ''}¥${totalDiff.toLocaleString()}`}
                </div>
              </div>
            </div>

            {/* 取引先・記載合計（任意入力） */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
              <label style={{ flex: 1.2 }}>
                <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 700, marginBottom: 3 }}>取引先名</div>
                <input
                  value={vendor}
                  onChange={(e) => setVendor(e.target.value)}
                  placeholder="〇〇食品株式会社"
                  disabled={pageState === 'saving'}
                  style={{ width: '100%', fontSize: 12.5, padding: '8px 9px', borderRadius: 9, border: '1px solid var(--line)', background: 'var(--paper)' }}
                />
              </label>
              <label style={{ flex: 1 }}>
                <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 700, marginBottom: 3 }}>レシート記載合計</div>
                <input
                  type="number"
                  value={statedTotal ?? ''}
                  onChange={(e) => setStatedTotal(e.target.value === '' ? null : parseFloat(e.target.value))}
                  placeholder="23300"
                  disabled={pageState === 'saving'}
                  style={{ width: '100%', fontSize: 12.5, padding: '8px 9px', borderRadius: 9, border: '1px solid var(--line)', background: 'var(--paper)' }}
                />
              </label>
            </div>

            {/* 明細（タップで修正） */}
            <div style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 14, padding: 12, marginBottom: 10 }}>
              <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--muted)', marginBottom: 9 }}>明細（タップで修正）</div>

              {editableItems.map((item, idx) => {
                const isEditing = editingIdx === idx;
                const qty = parseFloat(isEditing ? editDraft!.quantity : item.quantity);
                const price = parseFloat(isEditing ? editDraft!.totalPrice : item.totalPrice);
                const unitPrice = qty > 0 ? (price / qty).toFixed(2) : '-';

                if (isEditing && editDraft) {
                  return (
                    <div key={idx} style={{ border: '2px solid var(--accent)', background: 'var(--accent-soft)', borderRadius: 10, padding: 10, marginBottom: 8 }}>
                      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                        <input
                          value={editDraft.name}
                          onChange={(e) => setEditDraft({ ...editDraft, name: e.target.value })}
                          autoFocus
                          placeholder="品目名"
                          style={{ flex: 1, fontSize: 13, fontWeight: 700, background: 'transparent', border: 'none', borderBottom: '2px solid var(--accent)', outline: 'none' }}
                        />
                        <button onClick={() => removeItem(idx)} style={{ color: '#e0655a', background: 'none', border: 'none', fontSize: 18, lineHeight: 1 }}>×</button>
                      </div>

                      <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                        <button
                          type="button"
                          onClick={() => setEditDraft({ ...editDraft, type: 'food' })}
                          style={{
                            flex: 1, padding: '6px 0', borderRadius: 8, fontSize: 12, fontWeight: 700, border: '1px solid',
                            borderColor: editDraft.type === 'food' ? 'var(--success)' : 'var(--line)',
                            background: editDraft.type === 'food' ? 'var(--success)' : 'var(--paper)',
                            color: editDraft.type === 'food' ? '#fff' : 'var(--muted)',
                          }}
                        >
                          🥦 食材
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditDraft({ ...editDraft, type: 'seasoning' })}
                          style={{
                            flex: 1, padding: '6px 0', borderRadius: 8, fontSize: 12, fontWeight: 700, border: '1px solid',
                            borderColor: editDraft.type === 'seasoning' ? 'var(--accent-2)' : 'var(--line)',
                            background: editDraft.type === 'seasoning' ? 'var(--accent-2)' : 'var(--paper)',
                            color: editDraft.type === 'seasoning' ? '#fff' : 'var(--muted)',
                          }}
                        >
                          🧂 調味料
                        </button>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span style={{ fontSize: 11, color: 'var(--muted)' }}>数量</span>
                          <input
                            type="number"
                            value={editDraft.quantity}
                            onChange={(e) => setEditDraft({ ...editDraft, quantity: e.target.value })}
                            style={{ width: 60, fontSize: 12.5, textAlign: 'right', background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 8, padding: '6px 7px' }}
                          />
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span style={{ fontSize: 11, color: 'var(--muted)' }}>単位</span>
                          <input
                            value={editDraft.unit}
                            onChange={(e) => setEditDraft({ ...editDraft, unit: e.target.value })}
                            style={{ width: 48, fontSize: 12.5, textAlign: 'center', background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 8, padding: '6px 7px' }}
                          />
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 'auto' }}>
                          <span style={{ fontSize: 11, color: 'var(--muted)' }}>¥</span>
                          <input
                            type="number"
                            value={editDraft.totalPrice}
                            onChange={(e) => setEditDraft({ ...editDraft, totalPrice: e.target.value })}
                            style={{ width: 80, fontSize: 12.5, textAlign: 'right', background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 8, padding: '6px 7px' }}
                          />
                        </label>
                      </div>
                      <div style={{ textAlign: 'right', fontSize: 10.5, color: 'var(--muted)', marginBottom: 8 }}>単価 ¥{unitPrice}</div>

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
                      width: '100%', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 3,
                      padding: item.needsReview ? '8px 9px' : '7px 2px', marginBottom: item.needsReview ? 4 : 0,
                      borderRadius: item.needsReview ? 9 : 0,
                      background: item.needsReview ? 'var(--warn-soft)' : 'transparent',
                      border: 'none', borderBottom: item.needsReview ? 'none' : '1px solid var(--line-2)',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{
                        fontSize: 9.5, fontWeight: 700, padding: '2px 7px', borderRadius: 999,
                        background: item.type === 'seasoning' ? 'var(--accent-soft)' : 'var(--success-soft)',
                        color: item.type === 'seasoning' ? 'var(--accent-2)' : 'var(--success)',
                      }}>
                        {item.type === 'seasoning' ? '🧂 調味料' : '🥦 食材'}
                      </span>
                      <span style={{ flex: 1, fontSize: 12.5, fontWeight: 700, color: item.needsReview ? 'var(--warn)' : 'var(--ink)' }}>
                        {item.needsReview && '要確認 '}{item.name}
                      </span>
                      <span style={{ fontSize: 12.5, fontWeight: 700, color: item.needsReview ? 'var(--warn)' : 'var(--ink)' }}>
                        ¥{(parseFloat(item.totalPrice) || 0).toLocaleString()}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingLeft: 2 }}>
                      <span style={{ fontSize: 10.5, color: 'var(--muted)' }}>{item.quantity} {item.unit}</span>
                      <span style={{ fontSize: 10, color: 'var(--muted)' }}>単価 ¥{unitPrice}</span>
                    </div>
                  </button>
                );
              })}

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 9, paddingTop: 9, borderTop: '2px solid var(--ink)' }}>
                <span style={{ fontSize: 11, fontWeight: 700 }}>明細合計</span>
                <span style={{ fontSize: 14, fontWeight: 700 }}>¥{itemsTotal.toLocaleString()}</span>
              </div>
            </div>

            {/* 合計照合 */}
            <div style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 13, padding: '11px 12px', marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--ink-2)', padding: '2px 0' }}>
                <span>レシート記載</span>
                <span style={{ fontWeight: 700, color: 'var(--ink)' }}>{statedTotal !== null ? `¥${statedTotal.toLocaleString()}` : '—'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--ink-2)', padding: '2px 0' }}>
                <span>明細合計</span>
                <span style={{ fontWeight: 700, color: 'var(--ink)' }}>¥{itemsTotal.toLocaleString()}</span>
              </div>
              {totalDiff === 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, fontSize: 11, fontWeight: 700, color: 'var(--success)', background: 'var(--success-soft)', borderRadius: 8, padding: '7px 9px' }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12l5 5 9-11" />
                  </svg>
                  <span>✓ 一致</span>
                </div>
              )}
              {totalDiff !== null && totalDiff !== 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, fontSize: 10.5, color: 'var(--warn)', background: 'var(--warn-soft)', borderRadius: 8, padding: '7px 9px' }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--warn)" strokeWidth="2.2" strokeLinecap="round">
                    <path d="M12 8v5M12 16v.5" /><circle cx="12" cy="12" r="9" />
                  </svg>
                  <span>差額 {totalDiff > 0 ? '+' : ''}¥{totalDiff.toLocaleString()} — 明細を確認してください</span>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button
                onClick={handleSave}
                disabled={pageState === 'saving' || editableItems.length === 0 || editingIdx !== null}
                style={{
                  width: '100%', padding: '13px 0', borderRadius: 13, fontWeight: 700, fontSize: 14, border: 'none',
                  background: pageState === 'saving' || editableItems.length === 0 ? 'var(--line)' : 'var(--accent)', color: '#fff',
                }}
              >
                {pageState === 'saving' ? '保存中…' : `✓ ${editableItems.length}件を保存する`}
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
            <p style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink)', marginBottom: 4 }}>{savedCount}件を保存しました</p>
            <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 20 }}>食材の単価が更新されました</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button
                onClick={resetToCapture}
                style={{ width: '100%', background: 'var(--accent)', color: '#fff', padding: '14px 0', borderRadius: 13, fontWeight: 700, fontSize: 14, border: 'none' }}
              >
                続けてスキャン
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
