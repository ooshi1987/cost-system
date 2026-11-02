'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { calculateReceiptAmounts, isNonNegativeAmount, isReceiptTaxBasis, isDocumentDate, TAX_BASIS_LABELS, type ReceiptTaxBasis } from '@/lib/deliveryAmounts';

interface EditableItem {
  name: string;
  quantity: string;
  unit: string;
  totalPrice: string;
  type: 'food' | 'seasoning';
  needsReview?: boolean;
  sourceQuantity?: string | null;
}

type PageState = 'capture' | 'processing' | 'reviewing' | 'saving' | 'saved';

export default function DeliveryPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const submissionIdRef = useRef<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [pageState, setPageState] = useState<PageState>('capture');
  const [editableItems, setEditableItems] = useState<EditableItem[]>([]);
  const [vendor, setVendor] = useState('');
  const [statedTotal, setStatedTotal] = useState<number | null>(null);
  const [externalTax, setExternalTax] = useState<number | null>(null);
  const [taxBasis, setTaxBasis] = useState<ReceiptTaxBasis>('unknown');
  const [savedCount, setSavedCount] = useState(0);
  const [priceNotUpdated, setPriceNotUpdated] = useState<string[]>([]);
  const [alreadySaved, setAlreadySaved] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState(false);
  const [duplicateAccepted, setDuplicateAccepted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // タップ編集用
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState<EditableItem | null>(null);
  const [documentDate, setDocumentDate] = useState('');

  const { itemsTotal, calculatedTotal, difference: totalDiff } = calculateReceiptAmounts(
    editableItems.map((item) => ({ totalPrice: parseFloat(item.totalPrice) || 0 })), statedTotal, externalTax,
  );
  const reviewCount = editableItems.filter((item) => item.needsReview).length;
  const reconciliationReady = totalDiff === 0 && taxBasis !== 'unknown';
  const canSave = confirmed && (!duplicateWarning || duplicateAccepted) && isDocumentDate(documentDate) && editableItems.length > 0 && editingIdx === null && reviewCount === 0 && reconciliationReady &&
    !(taxBasis === 'inclusive' && externalTax !== 0) &&
    isNonNegativeAmount(statedTotal) && isNonNegativeAmount(externalTax) &&
    editableItems.every((item) => item.name.trim() && item.unit.trim() &&
      isNonNegativeAmount(parseFloat(item.quantity)) && parseFloat(item.quantity) > 0 &&
      isNonNegativeAmount(parseFloat(item.totalPrice)));

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
        data.items.map((item: { name: string; sourceQuantity?: string | null; quantity: number | null; unit: string; totalPrice: number; type?: 'food' | 'seasoning'; needsReview?: boolean }) => ({
          name: item.name,
          sourceQuantity: item.sourceQuantity,
          quantity: typeof item.quantity === 'number' ? String(item.quantity) : '',
          unit: item.unit,
          totalPrice: String(item.totalPrice),
          type: item.type ?? 'food',
          needsReview: item.needsReview ?? false,
        }))
      );
      setVendor(data.vendor ?? '');
      setDocumentDate(isDocumentDate(data.documentDate) ? data.documentDate : '');
      setStatedTotal(data.statedTotal ?? null);
      setExternalTax(isNonNegativeAmount(data.externalTax) ? data.externalTax : null);
      setTaxBasis(isReceiptTaxBasis(data.taxBasis) ? data.taxBasis : 'unknown');
      submissionIdRef.current = crypto.randomUUID();
      setConfirmed(false);
      setDuplicateWarning(false);
      setDuplicateAccepted(false);
      setPageState('reviewing');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
      setPageState('capture');
    }
  };

  // ── 保存 ──
  const handleSave = async () => {
    if (!canSave) { setError('伝票の日付・明細・税区分・外税を確認し、税込合計を一致させてください'); return; }
    const validItems = editableItems;
    setPageState('saving');
    setError(null);
    try {
      const response = await fetch('/api/delivery-slips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendor: vendor.trim() || null,
          submissionId: submissionIdRef.current,
          allowDuplicate: duplicateAccepted,
          receipt: { statedTotal, externalTax, taxBasis, documentDate },
          items: validItems.map((item) => ({
            name: item.name.trim(),
            quantity: parseFloat(item.quantity),
            unit: item.unit.trim() || '個',
            totalPrice: parseFloat(item.totalPrice),
            type: item.type,
          })),
        }),
      });
      if (!response.ok) {
        const data = await response.json();
        if (data.code === 'POSSIBLE_DUPLICATE') { setDuplicateWarning(true); setDuplicateAccepted(false); }
        throw new Error(data.error || '保存に失敗しました');
      }
      const result = await response.json();
      setAlreadySaved(result.alreadySaved === true);
      setPriceNotUpdated(Array.isArray(result.priceNotUpdated) ? result.priceNotUpdated : []);
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
    setConfirmed(false);
    setDuplicateWarning(false); setDuplicateAccepted(false);
  };

  // タップ編集
  const startEdit = (idx: number) => {
    setEditingIdx(idx);
    setEditDraft({ ...editableItems[idx] });
    setConfirmed(false);
  };
  const cancelEdit = () => {
    setEditingIdx(null);
    setEditDraft(null);
    setConfirmed(false);
  };
  const saveEdit = () => {
    if (editingIdx === null || !editDraft) return;
    setEditableItems((prev) => prev.map((item, i) => (i === editingIdx ? { ...editDraft, needsReview: false } : item)));
    setEditingIdx(null);
    setEditDraft(null);
    setConfirmed(false);
    setDuplicateWarning(false); setDuplicateAccepted(false);
  };

  const resetToCapture = () => {
    setPreview(null);
    setEditableItems([]);
    setVendor('');
    setDocumentDate('');
    setStatedTotal(null);
    setExternalTax(null);
    setTaxBasis('unknown');
    submissionIdRef.current = null;
    setConfirmed(false);
    setAlreadySaved(false);
    setPriceNotUpdated([]);
    setDuplicateWarning(false);
    setDuplicateAccepted(false);
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
          <div onChangeCapture={(event) => {
            const id = (event.target as HTMLElement).id;
            if (id !== 'receipt-confirmation' && id !== 'receipt-duplicate-confirmation') { setConfirmed(false); setDuplicateWarning(false); setDuplicateAccepted(false); }
          }}>
            {preview && <img src={preview} alt="照合する伝票・レシートの原本" style={{ width: '100%', maxHeight: 240, objectFit: 'contain', borderRadius: 13, background: 'var(--ink)', marginBottom: 12 }} />}
            {/* 要確認 + 合計照合 */}
            <div style={{ display: 'flex', gap: 7, marginBottom: 11 }}>
              <div style={{ flex: 1, background: 'var(--warn-soft)', borderRadius: 11, padding: '9px 10px' }}>
                <div style={{ fontSize: 10, color: 'var(--warn)', fontWeight: 700 }}>要確認</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--warn)' }}>{reviewCount}件</div>
              </div>
              <div style={{ flex: 1.3, background: reconciliationReady ? 'var(--success-soft)' : 'var(--warn-soft)', borderRadius: 11, padding: '9px 10px' }}>
                <div style={{ fontSize: 10, color: reconciliationReady ? 'var(--success)' : 'var(--warn)', fontWeight: 700 }}>税込合計照合</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: reconciliationReady ? 'var(--success)' : 'var(--warn)' }}>
                  {taxBasis === 'unknown' ? '税区分を確認' : totalDiff === null ? '合計・外税を確認' : totalDiff === 0 ? '✓ 一致' : `差額 ${totalDiff > 0 ? '+' : ''}¥${totalDiff.toLocaleString()}`}
                </div>
              </div>
            </div>

            <label style={{ display: 'block', marginBottom: 10 }}>
              <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 700, marginBottom: 4 }}>伝票の日付（仕入の集計日）</div>
              <input type="date" value={documentDate} onChange={(e) => setDocumentDate(e.target.value)} disabled={pageState === 'saving'} required style={{ width: '100%', minWidth: 0, fontSize: 14, padding: '9px', borderRadius: 9, border: '1px solid var(--line)', background: 'var(--paper)' }} />
              <p style={{ fontSize: 10.5, color: 'var(--muted)', lineHeight: 1.6, marginTop: 4 }}>原本の日付を確認してください。この日付の月に集計します。登録日時は別に残ります。</p>
              {!isDocumentDate(documentDate) && <p style={{ fontSize: 11, color: 'var(--warn)', marginTop: 4 }}>原本を見て日付を入力してください。</p>}
            </label>

            {/* 取引先・税込の記載合計 */}
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
                <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 700, marginBottom: 3 }}>レシート記載合計（税込）</div>
                <input
                  type="number"
                  min="0"
                  value={statedTotal ?? ''}
                  onChange={(e) => setStatedTotal(e.target.value === '' ? null : parseFloat(e.target.value))}
                  placeholder="23300"
                  disabled={pageState === 'saving'}
                  style={{ width: '100%', fontSize: 12.5, padding: '8px 9px', borderRadius: 9, border: '1px solid var(--line)', background: 'var(--paper)' }}
                />
              </label>
            </div>

            <div style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 11, padding: 10, marginBottom: 10 }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <label style={{ flex: 1 }}>
                  <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 700, marginBottom: 3 }}>明細の税区分</div>
                  <select value={taxBasis} onChange={(e) => setTaxBasis(e.target.value as ReceiptTaxBasis)} disabled={pageState === 'saving'} style={{ width: '100%', padding: 8, border: '1px solid var(--line)', borderRadius: 9, background: 'var(--paper)', fontSize: 12 }}>
                    {Object.entries(TAX_BASIS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </label>
                <label style={{ flex: 1 }}>
                  <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 700, marginBottom: 3 }}>別途加算する外税（円）</div>
                  <input type="number" min="0" value={externalTax ?? ''} onChange={(e) => setExternalTax(e.target.value === '' ? null : Number(e.target.value))} disabled={pageState === 'saving'} placeholder="不明は空欄" style={{ width: '100%', padding: 8, border: '1px solid var(--line)', borderRadius: 9, background: 'var(--paper)', fontSize: 12 }} />
                </label>
              </div>
              <p style={{ fontSize: 10.5, color: 'var(--muted)', lineHeight: 1.6, margin: '7px 0 0' }}>明細金額・単価は原本のまま保存します。税抜明細には外税を加えて合計照合し、税込明細の内税は加算しません。</p>
              {taxBasis === 'inclusive' && <p style={{ fontSize: 10.5, color: 'var(--warn)', margin: '6px 0 0' }}>この伝票の明細・食材単価は税込です。税抜への自動換算は行いません。外税欄は0円にしてください。</p>}
            </div>

            {/* 明細（タップで修正） */}
            <div style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 14, padding: 12, marginBottom: 10 }}>
              <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--muted)', marginBottom: 9 }}>明細（タップで修正）</div>
              <p style={{ fontSize: 10.5, lineHeight: 1.6, color: 'var(--warn)', margin: '0 0 9px' }}>原本の数量と単位を必ず確認してください。kg・gなどを換算せず、そのまま保存します。</p>

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
                    {item.sourceQuantity && <div style={{ fontSize: 10, color: 'var(--muted)' }}>AIが読み取った数量表記: {item.sourceQuantity}</div>}
                  </button>
                );
              })}

              <button type="button" disabled={editingIdx !== null || pageState === 'saving'} onClick={() => {
                const draft: EditableItem = { name: '', quantity: '', unit: '', totalPrice: '', type: 'food', needsReview: true };
                setEditableItems((prev) => [...prev, draft]);
                setEditingIdx(editableItems.length);
                setEditDraft(draft);
                setConfirmed(false);
                setDuplicateWarning(false); setDuplicateAccepted(false);
              }} style={{ marginTop: 10, width: '100%', padding: 9, borderRadius: 8, background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--accent)', fontWeight: 700, fontSize: 12 }}>＋ 明細を追加</button>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 9, paddingTop: 9, borderTop: '2px solid var(--ink)' }}>
                <span style={{ fontSize: 11, fontWeight: 700 }}>明細合計</span>
                <span style={{ fontSize: 14, fontWeight: 700 }}>¥{itemsTotal.toLocaleString()}</span>
              </div>
            </div>

            {/* 合計照合 */}
            <div style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 13, padding: '11px 12px', marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--ink-2)', padding: '2px 0' }}>
                <span>明細合計（{TAX_BASIS_LABELS[taxBasis]}）</span>
                <span style={{ fontWeight: 700, color: 'var(--ink)' }}>¥{itemsTotal.toLocaleString()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--ink-2)', padding: '2px 0' }}>
                <span>別途加算する外税</span>
                <span>{externalTax !== null ? `¥${externalTax.toLocaleString()}` : '未確認'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 700, padding: '2px 0' }}>
                <span>計算した税込合計</span>
                <span>{calculatedTotal !== null ? `¥${calculatedTotal.toLocaleString()}` : '—'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--ink-2)', padding: '2px 0' }}>
                <span>レシート記載合計（税込）</span>
                <span style={{ fontWeight: 700, color: 'var(--ink)' }}>{statedTotal !== null ? `¥${statedTotal.toLocaleString()}` : '—'}</span>
              </div>
              {totalDiff === null && <p style={{ fontSize: 10.5, color: 'var(--warn)' }}>税込合計と外税を原本で確認してください。内税のみの伝票は外税0円です。</p>}
              {reconciliationReady && (
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
              {duplicateWarning && <div style={{ padding: 12, borderRadius: 10, background: 'var(--warn-soft)', color: 'var(--warn)', fontSize: 12, lineHeight: 1.5 }}>
                <p style={{ margin: '0 0 8px' }}>同じ内容の伝票が登録されています。<Link href="/delivery-history" target="_blank" rel="noreferrer" style={{ color: 'inherit', textDecoration: 'underline' }}>納品履歴</Link>で確認してください。</p>
                <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}><input id="receipt-duplicate-confirmation" type="checkbox" checked={duplicateAccepted} onChange={(e) => setDuplicateAccepted(e.target.checked)} /><span>別の伝票であることを確認しました</span></label>
              </div>}
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 12, lineHeight: 1.5, color: 'var(--ink-2)' }}>
                <input id="receipt-confirmation" type="checkbox" checked={confirmed} disabled={pageState === 'saving'} onChange={(e) => setConfirmed(e.target.checked)} style={{ marginTop: 3 }} />
                <span>伝票の日付・明細・税額・税込合計を原本と照合しました</span>
              </label>
              {!canSave && <p style={{ fontSize: 11, color: 'var(--warn)', margin: 0 }}>保存前に、原本との照合と各項目を確認してください。</p>}
              <button
                onClick={handleSave}
                disabled={pageState === 'saving' || !canSave}
                style={{
                  width: '100%', padding: '13px 0', borderRadius: 13, fontWeight: 700, fontSize: 14, border: 'none',
                  background: pageState === 'saving' || !canSave ? 'var(--line)' : 'var(--accent)', color: '#fff',
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
          </div>
        )}

        {/* ── 保存完了 ── */}
        {pageState === 'saved' && (
          <div style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 'var(--r-lg)', padding: 24, textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
            <p style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink)', marginBottom: 4 }}>{alreadySaved ? 'この伝票は保存済みです' : `${savedCount}件を保存しました`}</p>
            <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 20 }}>
              {alreadySaved ? '単価の状況は食材管理でご確認ください。' : priceNotUpdated.length ? `同日・より新しい記録や別の更新があるため、${priceNotUpdated.join('、')}の単価は変更していません。食材管理で確認してください。` : '食材の単価を更新しました。'}
            </p>
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
