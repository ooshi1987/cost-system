'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';

interface EditableItem {
  name: string;
  quantity: string;
  unit: string;
  totalPrice: string;
}

type PageState = 'capture' | 'processing' | 'reviewing' | 'saving' | 'saved';

export default function DeliveryPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [pageState, setPageState] = useState<PageState>('capture');
  const [editableItems, setEditableItems] = useState<EditableItem[]>([]);
  const [savedCount, setSavedCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

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
        data.items.map((item: { name: string; quantity: number; unit: string; totalPrice: number }) => ({
          name: item.name,
          quantity: String(item.quantity),
          unit: item.unit,
          totalPrice: String(item.totalPrice),
        }))
      );
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
          items: validItems.map((item) => ({
            name: item.name.trim(),
            quantity: parseFloat(item.quantity),
            unit: item.unit.trim() || '個',
            totalPrice: parseFloat(item.totalPrice),
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
  const updateItem = (idx: number, field: keyof EditableItem, value: string) => {
    setEditableItems((prev) => prev.map((item, i) => (i === idx ? { ...item, [field]: value } : item)));
  };
  const removeItem = (idx: number) => {
    setEditableItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const resetToCapture = () => {
    setPreview(null);
    setEditableItems([]);
    setError(null);
    setPageState('capture');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const isReviewing = pageState === 'reviewing' || pageState === 'saving';

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto p-4 sm:p-8">
        <div className="mb-5">
          <Link href="/" className="text-blue-600 hover:text-blue-700 text-sm">
            ← ダッシュボードに戻る
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
                    className="text-blue-500 text-sm font-medium"
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
                      className="bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700 active:bg-blue-800"
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
                className="mt-4 w-full bg-green-600 text-white py-3.5 rounded-xl font-bold text-base hover:bg-green-700 active:bg-green-800"
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
            <div className="flex items-center justify-between mb-4">
              <p className="font-bold text-gray-700">
                {editableItems.length}件を読み取りました
              </p>
              <p className="text-xs text-gray-400">内容を確認・修正してから保存してください</p>
            </div>

            {/* ── スマホ: カード ── */}
            <div className="sm:hidden space-y-3 mb-5">
              {editableItems.map((item, idx) => {
                const qty = parseFloat(item.quantity);
                const price = parseFloat(item.totalPrice);
                const unitPrice = qty > 0 ? (price / qty).toFixed(2) : '-';
                return (
                  <div key={idx} className="border border-gray-200 rounded-xl p-3 bg-gray-50">
                    {/* 食材名 + 削除 */}
                    <div className="flex items-center gap-2 mb-2.5">
                      <input
                        value={item.name}
                        onChange={(e) => updateItem(idx, 'name', e.target.value)}
                        disabled={pageState === 'saving'}
                        placeholder="食材名"
                        className="flex-1 font-bold text-base border-b-2 border-transparent focus:border-blue-400 focus:outline-none bg-transparent pb-0.5"
                      />
                      <button
                        onClick={() => removeItem(idx)}
                        disabled={pageState === 'saving'}
                        className="text-gray-300 hover:text-red-400 text-xl leading-none disabled:opacity-30"
                      >
                        ×
                      </button>
                    </div>
                    {/* 数量・単位・合計金額 */}
                    <div className="flex items-center gap-2">
                      <label className="flex items-center gap-1">
                        <span className="text-xs text-gray-400">数量</span>
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateItem(idx, 'quantity', e.target.value)}
                          disabled={pageState === 'saving'}
                          className="w-16 text-sm border rounded-lg px-2 py-1.5 text-right focus:outline-none focus:border-blue-400 bg-white disabled:bg-gray-100"
                        />
                      </label>
                      <label className="flex items-center gap-1">
                        <span className="text-xs text-gray-400">単位</span>
                        <input
                          value={item.unit}
                          onChange={(e) => updateItem(idx, 'unit', e.target.value)}
                          disabled={pageState === 'saving'}
                          className="w-14 text-sm border rounded-lg px-2 py-1.5 text-center focus:outline-none focus:border-blue-400 bg-white disabled:bg-gray-100"
                        />
                      </label>
                      <label className="flex items-center gap-1 ml-auto">
                        <span className="text-xs text-gray-400">¥</span>
                        <input
                          type="number"
                          value={item.totalPrice}
                          onChange={(e) => updateItem(idx, 'totalPrice', e.target.value)}
                          disabled={pageState === 'saving'}
                          className="w-24 text-sm border rounded-lg px-2 py-1.5 text-right focus:outline-none focus:border-blue-400 bg-white disabled:bg-gray-100"
                        />
                      </label>
                    </div>
                    {/* 単価 */}
                    <div className="text-right text-xs text-gray-400 mt-1.5">
                      単価 ¥{unitPrice}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ── PC: テーブル ── */}
            <div className="hidden sm:block border rounded-xl overflow-hidden mb-5">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-3 py-2 text-left">食材名</th>
                    <th className="px-3 py-2 text-right w-20">数量</th>
                    <th className="px-3 py-2 w-16">単位</th>
                    <th className="px-3 py-2 text-right w-28">合計金額</th>
                    <th className="px-3 py-2 text-right w-24 text-gray-400">単価</th>
                    <th className="px-3 py-2 w-8"></th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {editableItems.map((item, idx) => {
                    const qty = parseFloat(item.quantity);
                    const price = parseFloat(item.totalPrice);
                    const unitPrice = qty > 0 ? (price / qty).toFixed(2) : '-';
                    return (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-3 py-2">
                          <input
                            value={item.name}
                            onChange={(e) => updateItem(idx, 'name', e.target.value)}
                            disabled={pageState === 'saving'}
                            className="w-full border-b border-transparent hover:border-gray-300 focus:border-blue-400 focus:outline-none bg-transparent"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => updateItem(idx, 'quantity', e.target.value)}
                            disabled={pageState === 'saving'}
                            className="w-full border-b border-transparent hover:border-gray-300 focus:border-blue-400 focus:outline-none bg-transparent text-right"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            value={item.unit}
                            onChange={(e) => updateItem(idx, 'unit', e.target.value)}
                            disabled={pageState === 'saving'}
                            className="w-full border-b border-transparent hover:border-gray-300 focus:border-blue-400 focus:outline-none bg-transparent text-center"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            value={item.totalPrice}
                            onChange={(e) => updateItem(idx, 'totalPrice', e.target.value)}
                            disabled={pageState === 'saving'}
                            className="w-full border-b border-transparent hover:border-gray-300 focus:border-blue-400 focus:outline-none bg-transparent text-right"
                          />
                        </td>
                        <td className="px-3 py-2 text-right text-gray-400 text-xs">
                          ¥{unitPrice}
                        </td>
                        <td className="px-3 py-2 text-center">
                          <button
                            onClick={() => removeItem(idx)}
                            disabled={pageState === 'saving'}
                            className="text-gray-300 hover:text-red-400 disabled:opacity-30"
                          >
                            ×
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {error && (
              <div className="mb-3 bg-red-50 border border-red-200 rounded-xl p-3 text-red-700 text-sm">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <button
                onClick={handleSave}
                disabled={pageState === 'saving' || editableItems.length === 0}
                className="w-full bg-green-600 text-white py-3.5 rounded-xl font-bold text-base hover:bg-green-700 active:bg-green-800 disabled:bg-gray-300"
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
                className="w-full bg-blue-600 text-white py-3.5 rounded-xl font-bold hover:bg-blue-700 active:bg-blue-800"
              >
                続けてスキャン
              </button>
              <Link
                href="/"
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
