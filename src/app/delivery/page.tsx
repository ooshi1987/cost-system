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
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto p-4 sm:p-8">
        <div className="mb-5 flex items-center justify-between">
          <Link href="/dashboard" className="text-[var(--accent)] hover:text-[var(--accent-h)] text-sm">
            ← ダッシュボードに戻る
          </Link>
          <Link
            href="/help/delivery"
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-[var(--accent)] px-2.5 py-1.5 rounded-lg hover:bg-[var(--accent-soft)] transition-colors border border-gray-200 hover:border-[var(--accent-soft)]"
          >
            <span>？</span>
            <span>使い方</span>
          </Link>
        </div>

        <h1 className="text-2xl sm:text-3xl font-bold mb-5">納品書をスキャン</h1>

        {/* ─── 撮影・選択画面 ─── */}
        {pageState === 'capture' && (
          <div className="bg-white rounded-2xl shadow p-4 sm:p-6">
            <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 sm:p-10 text-center">
              {preview ? (
                <>
                  <img src={preview} alt="Preview" className="max-w-full max-h-72 mx-auto mb-4 rounded-lg" />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="text-[var(--accent)] text-sm font-medium"
                  >
                    別の画像を選ぶ
                  </button>
                </>
              ) : (
                <>
                  <div className="text-5xl mb-4">📸</div>
                  <p className="text-gray-500 mb-5 text-sm">納品書・レシートを撮影またはアップロード</p>
                  <div className="flex flex-col sm:flex-row gap-2 justify-center">
                    <button
                      onClick={() => {
                        fileInputRef.current?.setAttribute('capture', 'environment');
                        fileInputRef.current?.click();
                      }}
                      className="bg-[var(--accent)] text-white px-6 py-3 rounded-xl font-semibold hover:bg-[var(--accent-h)]"
                    >
                      📷 カメラで撮影
                    </button>
                    <button
                      onClick={() => {
                        fileInputRef.current?.removeAttribute('capture');
                        fileInputRef.current?.click();
                      }}
                      className="bg-gray-100 text-gray-700 px-6 py-3 rounded-xl font-semibold hover:bg-gray-200"
                    >
                      🖼️ ファイルを選択
                    </button>
                  </div>
                </>
              )}
            </div>

            {preview && (
              <button
                onClick={handleOcr}
                className="mt-4 w-full bg-[var(--accent)] text-white py-3.5 rounded-xl font-bold text-base hover:bg-[var(--accent-h)]"
              >
                読み取り開始
              </button>
            )}

            {error && (
              <div className="mt-3 bg-red-50 border border-red-200 rounded-xl p-3 text-red-700 text-sm">
                {error}
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>
        )}

        {/* ─── OCR処理中 ─── */}
        {pageState === 'processing' && (
          <div className="bg-white rounded-2xl shadow p-8 text-center">
            <div className="text-4xl mb-4 animate-spin">⚙️</div>
            <p className="font-bold text-gray-700 text-lg">読み取り中…</p>
            <p className="text-sm text-gray-400 mt-1">Claudeが解析しています</p>
          </div>
        )}

        {/* ─── 確認・編集画面 ─── */}
        {isReviewing && (
          <div className="bg-white rounded-2xl shadow p-4 sm:p-6">
            <div className="flex items-center justify-between mb-3">
              <p className="font-bold text-gray-700">{editableItems.length}件を読み取りました</p>
              <p className="text-xs text-gray-400">間違いはタップして修正</p>
            </div>

            {/* ── 要確認 + 合計照合 ── */}
            <div className="flex gap-2 mb-4">
              <div className="flex-1 bg-[var(--warn-soft)] rounded-xl px-3 py-2.5">
                <div className="text-[10px] font-bold text-[var(--warn)]">要確認</div>
                <div className="text-base font-bold text-[var(--warn)]">{reviewCount}件</div>
              </div>
              <div className={`flex-[1.3] rounded-xl px-3 py-2.5 ${totalDiff === null ? 'bg-gray-50' : totalDiff === 0 ? 'bg-[var(--success-soft)]' : 'bg-[var(--warn-soft)]'}`}>
                <div className={`text-[10px] font-bold ${totalDiff === null ? 'text-gray-400' : totalDiff === 0 ? 'text-[var(--success)]' : 'text-[var(--warn)]'}`}>合計照合</div>
                <div className={`text-sm font-bold ${totalDiff === null ? 'text-gray-400' : totalDiff === 0 ? 'text-[var(--success)]' : 'text-[var(--warn)]'}`}>
                  {totalDiff === null ? '記載金額なし' : totalDiff === 0 ? '✓ 一致' : `差額 ${totalDiff > 0 ? '+' : ''}¥${totalDiff.toLocaleString()}`}
                </div>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-xs font-semibold mb-1 text-gray-600">取引先名（任意）</label>
              <input
                value={vendor}
                onChange={(e) => setVendor(e.target.value)}
                placeholder="例：〇〇食品株式会社"
                disabled={pageState === 'saving'}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--accent)]"
              />
            </div>

            <div className="mb-4">
              <label className="block text-xs font-semibold mb-1 text-gray-600">レシート記載合計（任意）</label>
              <input
                type="number"
                value={statedTotal ?? ''}
                onChange={(e) => setStatedTotal(e.target.value === '' ? null : parseFloat(e.target.value))}
                placeholder="例：23300"
                disabled={pageState === 'saving'}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--accent)]"
              />
            </div>

            {/* ── スマホ: カード ── */}
            <div className="sm:hidden space-y-2 mb-5">
              {editableItems.map((item, idx) => {
                const isEditing = editingIdx === idx;
                const qty = parseFloat(isEditing ? editDraft!.quantity : item.quantity);
                const price = parseFloat(isEditing ? editDraft!.totalPrice : item.totalPrice);
                const unitPrice = qty > 0 ? (price / qty).toFixed(2) : '-';

                if (isEditing && editDraft) {
                  // ── 編集中カード ──
                  return (
                    <div key={idx} className="border-2 border-[var(--accent)] rounded-xl p-3 bg-[var(--accent-soft)]">
                      <div className="flex items-center gap-2 mb-2">
                        <input
                          value={editDraft.name}
                          onChange={(e) => setEditDraft({ ...editDraft, name: e.target.value })}
                          autoFocus
                          placeholder="食材名"
                          className="flex-1 font-bold text-base border-b-2 border-[var(--accent)] focus:border-[var(--accent-h)] focus:outline-none bg-transparent"
                        />
                        <button onClick={() => removeItem(idx)} className="text-red-300 hover:text-red-500 text-xl leading-none">×</button>
                      </div>
                      {/* 種別トグル（編集中） */}
                      <div className="flex gap-1 mb-2">
                        <button
                          type="button"
                          onClick={() => setEditDraft({ ...editDraft, type: 'food' })}
                          className={`flex-1 py-1.5 rounded-lg text-sm font-semibold border transition-colors ${editDraft.type === 'food' ? 'bg-green-500 text-white border-green-500' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}`}
                        >
                          🥦 食材
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditDraft({ ...editDraft, type: 'seasoning' })}
                          className={`flex-1 py-1.5 rounded-lg text-sm font-semibold border transition-colors ${editDraft.type === 'seasoning' ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}`}
                        >
                          🧂 調味料
                        </button>
                      </div>
                      <div className="flex items-center gap-2 mb-2">
                        <label className="flex items-center gap-1">
                          <span className="text-xs text-gray-500">数量</span>
                          <input type="number" value={editDraft.quantity}
                            onChange={(e) => setEditDraft({ ...editDraft, quantity: e.target.value })}
                            className="w-16 text-sm border rounded-lg px-2 py-1.5 text-right focus:outline-none focus:border-[var(--accent)] bg-white" />
                        </label>
                        <label className="flex items-center gap-1">
                          <span className="text-xs text-gray-500">単位</span>
                          <input value={editDraft.unit}
                            onChange={(e) => setEditDraft({ ...editDraft, unit: e.target.value })}
                            className="w-14 text-sm border rounded-lg px-2 py-1.5 text-center focus:outline-none focus:border-[var(--accent)] bg-white" />
                        </label>
                        <label className="flex items-center gap-1 ml-auto">
                          <span className="text-xs text-gray-500">¥</span>
                          <input type="number" value={editDraft.totalPrice}
                            onChange={(e) => setEditDraft({ ...editDraft, totalPrice: e.target.value })}
                            className="w-24 text-sm border rounded-lg px-2 py-1.5 text-right focus:outline-none focus:border-[var(--accent)] bg-white" />
                        </label>
                      </div>
                      <div className="text-right text-xs text-gray-400 mb-2">単価 ¥{unitPrice}</div>
                      <div className="flex gap-2">
                        <button onClick={saveEdit}
                          className="flex-1 bg-[var(--accent)] text-white py-1.5 rounded-lg text-sm font-semibold hover:bg-[var(--accent-h)]">
                          保存
                        </button>
                        <button onClick={cancelEdit}
                          className="px-4 py-1.5 rounded-lg text-sm bg-white border text-gray-500 hover:bg-gray-50">
                          取消
                        </button>
                      </div>
                    </div>
                  );
                }

                // ── 通常表示カード（タップで編集） ──
                return (
                  <button
                    key={idx}
                    onClick={() => editingIdx === null && pageState !== 'saving' && startEdit(idx)}
                    disabled={editingIdx !== null || pageState === 'saving'}
                    className={`w-full text-left rounded-xl px-4 py-3 hover:bg-[var(--accent-soft)] active:bg-[var(--accent-soft)] disabled:opacity-60 disabled:cursor-default transition-colors ${item.needsReview ? 'bg-[var(--warn-soft)]' : 'bg-gray-50'}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${item.type === 'seasoning' ? 'bg-orange-100 text-orange-600' : 'bg-green-100 text-green-600'}`}>
                          {item.type === 'seasoning' ? '🧂 調味料' : '🥦 食材'}
                        </span>
                        <span className="font-bold text-base">
                          {item.needsReview && <span className="text-[var(--warn)]">要確認 </span>}
                          {item.name}
                        </span>
                      </div>
                      <span className="font-bold text-base">¥{parseFloat(item.totalPrice).toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-sm text-gray-500">{item.quantity} {item.unit}</span>
                      <span className="text-xs text-gray-400">単価 ¥{unitPrice}</span>
                    </div>
                  </button>
                );
              })}
              <div className="flex items-center justify-between pt-2 border-t-2 border-[var(--ink)]">
                <span className="text-sm font-bold">明細合計</span>
                <span className="text-base font-bold">¥{itemsTotal.toLocaleString()}</span>
              </div>
            </div>

            {/* ── PC: テーブル ── */}
            <div className="hidden sm:block border rounded-xl overflow-hidden mb-5">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-3 py-2 text-left w-28">種別</th>
                    <th className="px-3 py-2 text-left">食材名</th>
                    <th className="px-3 py-2 text-right w-20">数量</th>
                    <th className="px-3 py-2 w-16">単位</th>
                    <th className="px-3 py-2 text-right w-28">合計金額</th>
                    <th className="px-3 py-2 text-right w-24 text-gray-400">単価</th>
                    <th className="px-3 py-2 w-16 text-center">修正</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {editableItems.map((item, idx) => {
                    const isEditing = editingIdx === idx;
                    const qty = parseFloat(isEditing ? editDraft!.quantity : item.quantity);
                    const price = parseFloat(isEditing ? editDraft!.totalPrice : item.totalPrice);
                    const unitPrice = qty > 0 ? (price / qty).toFixed(2) : '-';

                    return (
                      <tr key={idx} className={isEditing ? 'bg-[var(--accent-soft)]' : item.needsReview ? 'bg-[var(--warn-soft)] hover:bg-[var(--warn-soft)]' : 'hover:bg-gray-50'}>
                        {/* 種別トグル */}
                        <td className="px-3 py-2">
                          {isEditing && editDraft ? (
                            <div className="flex gap-1">
                              <button
                                type="button"
                                onClick={() => setEditDraft({ ...editDraft, type: 'food' })}
                                className={`flex-1 px-1.5 py-1 rounded text-xs font-semibold border transition-colors ${editDraft.type === 'food' ? 'bg-green-500 text-white border-green-500' : 'bg-white text-gray-400 border-gray-200 hover:bg-gray-50'}`}
                              >🥦 食材</button>
                              <button
                                type="button"
                                onClick={() => setEditDraft({ ...editDraft, type: 'seasoning' })}
                                className={`flex-1 px-1.5 py-1 rounded text-xs font-semibold border transition-colors ${editDraft.type === 'seasoning' ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-gray-400 border-gray-200 hover:bg-gray-50'}`}
                              >🧂 調味料</button>
                            </div>
                          ) : (
                            <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full ${item.type === 'seasoning' ? 'bg-orange-100 text-orange-600' : 'bg-green-100 text-green-600'}`}>
                              {item.type === 'seasoning' ? '🧂 調味料' : '🥦 食材'}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          {isEditing && editDraft ? (
                            <input autoFocus value={editDraft.name}
                              onChange={(e) => setEditDraft({ ...editDraft, name: e.target.value })}
                              className="w-full border-b border-[var(--accent)] focus:outline-none bg-transparent" />
                          ) : item.name}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {isEditing && editDraft ? (
                            <input type="number" value={editDraft.quantity}
                              onChange={(e) => setEditDraft({ ...editDraft, quantity: e.target.value })}
                              className="w-16 border-b border-[var(--accent)] focus:outline-none bg-transparent text-right" />
                          ) : item.quantity}
                        </td>
                        <td className="px-3 py-2 text-center">
                          {isEditing && editDraft ? (
                            <input value={editDraft.unit}
                              onChange={(e) => setEditDraft({ ...editDraft, unit: e.target.value })}
                              className="w-12 border-b border-[var(--accent)] focus:outline-none bg-transparent text-center" />
                          ) : item.unit}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {isEditing && editDraft ? (
                            <input type="number" value={editDraft.totalPrice}
                              onChange={(e) => setEditDraft({ ...editDraft, totalPrice: e.target.value })}
                              className="w-24 border-b border-[var(--accent)] focus:outline-none bg-transparent text-right" />
                          ) : `¥${parseFloat(item.totalPrice).toLocaleString()}`}
                        </td>
                        <td className="px-3 py-2 text-right text-gray-400 text-xs">¥{unitPrice}</td>
                        <td className="px-3 py-2 text-center">
                          {isEditing ? (
                            <div className="flex gap-1 justify-center">
                              <button onClick={saveEdit}
                                className="bg-[var(--accent)] text-white px-2 py-1 rounded text-xs font-semibold hover:bg-[var(--accent-h)]">保存</button>
                              <button onClick={cancelEdit}
                                className="bg-gray-200 text-gray-600 px-2 py-1 rounded text-xs hover:bg-gray-300">取消</button>
                            </div>
                          ) : (
                            <button onClick={() => editingIdx === null && startEdit(idx)}
                              disabled={editingIdx !== null || pageState === 'saving'}
                              className="text-gray-300 hover:text-[var(--accent)] disabled:opacity-20 p-1">✏️</button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-[var(--ink)]">
                    <td colSpan={4} className="px-3 py-2 text-right font-bold text-sm">明細合計</td>
                    <td className="px-3 py-2 text-right font-bold">¥{itemsTotal.toLocaleString()}</td>
                    <td colSpan={2}></td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {error && (
              <div className="mb-3 bg-red-50 border border-red-200 rounded-xl p-3 text-red-700 text-sm">{error}</div>
            )}

            <div className="space-y-2">
              <button
                onClick={handleSave}
                disabled={pageState === 'saving' || editableItems.length === 0 || editingIdx !== null}
                className="w-full bg-[var(--accent)] text-white py-3.5 rounded-xl font-bold text-base hover:bg-[var(--accent-h)] disabled:bg-gray-300"
              >
                {pageState === 'saving' ? '保存中…' : `✓ ${editableItems.length}件を保存する`}
              </button>
              <button
                onClick={resetToCapture}
                disabled={pageState === 'saving'}
                className="w-full bg-gray-100 text-gray-600 py-3 rounded-xl font-semibold hover:bg-gray-200 disabled:opacity-40"
              >
                撮り直す
              </button>
            </div>
          </div>
        )}

        {/* ─── 保存完了 ─── */}
        {pageState === 'saved' && (
          <div className="bg-white rounded-2xl shadow p-6 text-center">
            <div className="text-5xl mb-4">✅</div>
            <p className="text-xl font-bold text-gray-800 mb-1">{savedCount}件を保存しました</p>
            <p className="text-sm text-gray-400 mb-6">食材の単価が更新されました</p>
            <div className="space-y-2">
              <button
                onClick={resetToCapture}
                className="w-full bg-[var(--accent)] text-white py-3.5 rounded-xl font-bold hover:bg-[var(--accent-h)]"
              >
                続けてスキャン
              </button>
              <Link
                href="/dashboard"
                className="block text-center bg-gray-100 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-200"
              >
                ダッシュボードへ
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
