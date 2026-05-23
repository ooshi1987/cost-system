'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';

interface MenuItem {
  id: string;
  name: string;
  sellingPrice: number;
  category?: string;
  recipeItems: { id: string }[];
}

interface ExtractedItem {
  name: string;
  sellingPrice: number;
  category: string;
  selected: boolean;
  // インポート後の状態
  status?: 'pending' | 'saved' | 'duplicate' | 'error';
}

type ImportStep = 'idle' | 'uploading' | 'preview' | 'saving' | 'done';

export default function MenuPage() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);

  // 手動登録フォーム
  const [formData, setFormData] = useState({ name: '', sellingPrice: '', category: '' });
  const [submitting, setSubmitting] = useState(false);

  // PDFインポート
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importStep, setImportStep] = useState<ImportStep>('idle');
  const [importError, setImportError] = useState<string | null>(null);
  const [extractedItems, setExtractedItems] = useState<ExtractedItem[]>([]);
  const [fileName, setFileName] = useState('');

  useEffect(() => {
    fetchMenuItems();
  }, []);

  const fetchMenuItems = async () => {
    try {
      const response = await fetch('/api/menu-items');
      if (response.ok) {
        const data = await response.json();
        setMenuItems(data);
      }
    } catch (error) {
      console.error('Error fetching menu items:', error);
    } finally {
      setLoading(false);
    }
  };

  // --- 手動登録 ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.sellingPrice) return;
    setSubmitting(true);
    try {
      const response = await fetch('/api/menu-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          sellingPrice: parseFloat(formData.sellingPrice),
          category: formData.category || null,
        }),
      });
      if (response.ok) {
        setFormData({ name: '', sellingPrice: '', category: '' });
        await fetchMenuItems();
      }
    } finally {
      setSubmitting(false);
    }
  };

  // --- PDFインポート ---
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // ── ファイルサイズチェック (最大15MB) ──
    const maxBytes = 15 * 1024 * 1024;
    if (file.size > maxBytes) {
      setImportError(
        `ファイルが大きすぎます（${(file.size / 1024 / 1024).toFixed(1)}MB）。\n` +
        '15MB以下にしてください。PDFの場合は特定のページを画像（JPG/PNG）で保存してアップロードするとより小さくなります。'
      );
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setFileName(file.name);
    setImportError(null);
    setImportStep('uploading');

    try {
      const fd = new FormData();
      fd.append('file', file);

      const response = await fetch('/api/menu-items/import', {
        method: 'POST',
        body: fd,
      });

      const data = await response.json();

      if (!response.ok) {
        // Anthropic 413 / ファイルサイズ超過エラーを日本語に変換
        const rawError: string = typeof data.error === 'string' ? data.error : JSON.stringify(data.error);
        if (rawError.includes('request_too_large') || rawError.includes('413')) {
          throw new Error('ファイルが大きすぎてAIが処理できませんでした。\nPDFの場合はページを画像（JPG/PNG）で保存してからアップロードしてください。');
        }
        throw new Error(data.error || '読み取りに失敗しました');
      }

      // すでに登録済みの商品名リスト
      const existingNames = new Set(menuItems.map((m) => m.name));

      setExtractedItems(
        data.items.map((item: { name: string; sellingPrice: number; category: string }) => ({
          ...item,
          selected: !existingNames.has(item.name), // 既存と重複していたらデフォルトOFF
          status: existingNames.has(item.name) ? 'duplicate' : 'pending',
        }))
      );
      setImportStep('preview');
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'エラーが発生しました');
      setImportStep('idle');
    } finally {
      // inputをリセット（同じファイルを再度選択できるように）
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const toggleItem = (index: number) => {
    setExtractedItems((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, selected: !item.selected } : item
      )
    );
  };

  const toggleAll = (value: boolean) => {
    setExtractedItems((prev) =>
      prev.map((item) =>
        item.status !== 'duplicate' ? { ...item, selected: value } : item
      )
    );
  };

  const updateExtractedItem = (
    index: number,
    field: 'name' | 'sellingPrice' | 'category',
    value: string | number
  ) => {
    setExtractedItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  };

  const handleImportSave = async () => {
    const itemsToSave = extractedItems.filter(
      (item) => item.selected && item.status !== 'duplicate'
    );
    if (itemsToSave.length === 0) return;

    setImportStep('saving');

    // 1件ずつ登録してステータスを更新
    const updated = [...extractedItems];
    for (let i = 0; i < updated.length; i++) {
      if (!updated[i].selected || updated[i].status === 'duplicate') continue;
      try {
        const response = await fetch('/api/menu-items', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: updated[i].name,
            sellingPrice: updated[i].sellingPrice,
            category: updated[i].category || null,
          }),
        });
        updated[i].status = response.ok ? 'saved' : 'error';
      } catch {
        updated[i].status = 'error';
      }
      setExtractedItems([...updated]);
    }

    await fetchMenuItems();
    setImportStep('done');
  };

  const resetImport = () => {
    setImportStep('idle');
    setExtractedItems([]);
    setImportError(null);
    setFileName('');
  };

  const selectedCount = extractedItems.filter(
    (i) => i.selected && i.status !== 'duplicate'
  ).length;

  if (loading) return <div className="p-8">読み込み中...</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-4 sm:p-8">
        <div className="mb-6">
          <Link href="/" className="text-blue-600 hover:text-blue-700">
            ← ダッシュボードに戻る
          </Link>
        </div>

        <h1 className="text-2xl sm:text-4xl font-bold mb-6 sm:mb-8">メニュー管理</h1>

        {/* ===== PDFインポート ===== */}
        <div className="bg-white rounded-lg shadow p-4 sm:p-6 mb-6">
          <h2 className="text-xl font-bold mb-1">📄 メニュー表から一括インポート</h2>
          <p className="text-sm text-gray-500 mb-4">PDF・画像をアップロードするとClaudeが自動で読み取ります</p>

          {importStep === 'idle' && (
            <>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full border-2 border-dashed border-blue-300 rounded-lg py-8 text-center hover:border-blue-500 hover:bg-blue-50 transition"
              >
                <div className="text-4xl mb-2">📂</div>
                <div className="font-semibold text-blue-600">PDFまたは画像ファイルを選択</div>
                <div className="text-xs text-gray-400 mt-1">PDF・JPG・PNG対応</div>
              </button>
              {importError && (
                <div className="mt-3 text-red-600 bg-red-50 rounded p-3 text-sm">
                  ❌ {importError}
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf,image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </>
          )}

          {importStep === 'uploading' && (
            <div className="py-10 text-center">
              <div className="text-3xl mb-3 animate-spin">⚙️</div>
              <p className="font-semibold text-gray-700">「{fileName}」を解析中…</p>
              <p className="text-sm text-gray-400 mt-1">Claudeがメニューを読み取っています</p>
            </div>
          )}

          {(importStep === 'preview' || importStep === 'saving' || importStep === 'done') && (
            <>
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm text-gray-500">
                  <span className="font-bold text-gray-800">{extractedItems.length}件</span> を検出
                </div>
                {importStep === 'preview' && (
                  <div className="flex gap-3 text-sm">
                    <button onClick={() => toggleAll(true)} className="text-blue-600 font-medium">全選択</button>
                    <button onClick={() => toggleAll(false)} className="text-gray-400">全解除</button>
                  </div>
                )}
              </div>

              {/* ── スマホ: カードリスト ── */}
              <div className="sm:hidden space-y-2 mb-4">
                {extractedItems.map((item, i) => {
                  const isDuplicate = item.status === 'duplicate';
                  return (
                    <div key={i}
                      className={`border rounded-xl p-3 ${
                        isDuplicate ? 'opacity-40 bg-gray-50' :
                        item.status === 'saved' ? 'border-green-300 bg-green-50' :
                        item.status === 'error' ? 'border-red-300 bg-red-50' :
                        item.selected ? 'border-blue-200 bg-white' : 'bg-gray-50'
                      }`}>
                      <div className="flex items-start gap-3">
                        <input type="checkbox"
                          checked={item.selected && !isDuplicate}
                          disabled={isDuplicate || importStep !== 'preview'}
                          onChange={() => toggleItem(i)}
                          className="mt-1 w-5 h-5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          {importStep === 'preview' ? (
                            <>
                              <input type="text" value={item.name}
                                onChange={(e) => updateExtractedItem(i, 'name', e.target.value)}
                                className="w-full font-semibold text-sm border-b border-transparent focus:border-blue-400 focus:outline-none bg-transparent mb-2" />
                              <div className="flex gap-2">
                                <div className="flex items-center gap-1">
                                  <span className="text-xs text-gray-400">¥</span>
                                  <input type="number" value={item.sellingPrice}
                                    onChange={(e) => updateExtractedItem(i, 'sellingPrice', parseFloat(e.target.value))}
                                    className="w-20 text-sm border rounded-lg px-2 py-1 focus:outline-none focus:border-blue-400" />
                                </div>
                                <input type="text" value={item.category}
                                  onChange={(e) => updateExtractedItem(i, 'category', e.target.value)}
                                  className="flex-1 text-xs border rounded-lg px-2 py-1 text-gray-500 focus:outline-none focus:border-blue-400" />
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="font-semibold text-sm">{item.name}</div>
                              <div className="text-xs text-gray-500 mt-0.5">
                                ¥{item.sellingPrice.toLocaleString()} · {item.category}
                              </div>
                            </>
                          )}
                        </div>
                        <div className="text-xs flex-shrink-0">
                          {isDuplicate && <span className="text-gray-400">登録済</span>}
                          {item.status === 'saved' && <span className="text-green-600 font-bold">✓</span>}
                          {item.status === 'error' && <span className="text-red-500">エラー</span>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* ── PC: テーブル ── */}
              <div className="hidden sm:block border rounded-xl overflow-hidden mb-4">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-3 py-2 w-8"></th>
                      <th className="px-3 py-2 text-left">商品名</th>
                      <th className="px-3 py-2 text-right">価格</th>
                      <th className="px-3 py-2 text-left">カテゴリー</th>
                      <th className="px-3 py-2 text-center w-16">状態</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {extractedItems.map((item, i) => (
                      <tr key={i}
                        className={
                          item.status === 'duplicate' ? 'bg-gray-50 opacity-50' :
                          item.status === 'saved' ? 'bg-green-50' :
                          item.status === 'error' ? 'bg-red-50' :
                          item.selected ? 'bg-white' : 'bg-gray-50 opacity-60'
                        }>
                        <td className="px-3 py-2 text-center">
                          <input type="checkbox"
                            checked={item.selected && item.status !== 'duplicate'}
                            disabled={item.status === 'duplicate' || importStep !== 'preview'}
                            onChange={() => toggleItem(i)} className="w-4 h-4" />
                        </td>
                        <td className="px-3 py-2">
                          {importStep === 'preview'
                            ? <input type="text" value={item.name} onChange={(e) => updateExtractedItem(i, 'name', e.target.value)} className="w-full border-b border-transparent hover:border-gray-300 focus:border-blue-400 focus:outline-none bg-transparent" />
                            : <span>{item.name}</span>}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {importStep === 'preview'
                            ? <input type="number" value={item.sellingPrice} onChange={(e) => updateExtractedItem(i, 'sellingPrice', parseFloat(e.target.value))} className="w-20 border-b border-transparent hover:border-gray-300 focus:border-blue-400 focus:outline-none bg-transparent text-right" />
                            : <span>¥{item.sellingPrice.toLocaleString()}</span>}
                        </td>
                        <td className="px-3 py-2">
                          {importStep === 'preview'
                            ? <input type="text" value={item.category} onChange={(e) => updateExtractedItem(i, 'category', e.target.value)} className="w-full border-b border-transparent hover:border-gray-300 focus:border-blue-400 focus:outline-none bg-transparent text-sm" />
                            : <span className="text-gray-600">{item.category}</span>}
                        </td>
                        <td className="px-3 py-2 text-center text-xs">
                          {item.status === 'duplicate' && <span className="text-gray-400">登録済</span>}
                          {item.status === 'saved' && <span className="text-green-600 font-semibold">✓ 完了</span>}
                          {item.status === 'error' && <span className="text-red-500">エラー</span>}
                          {item.status === 'pending' && importStep === 'saving' && <span className="text-gray-400">…</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {importStep === 'preview' && (
                <div className="flex gap-3">
                  <button onClick={handleImportSave} disabled={selectedCount === 0}
                    className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl font-semibold hover:bg-blue-700 active:bg-blue-800 disabled:bg-gray-300">
                    {selectedCount}件を登録する
                  </button>
                  <button onClick={resetImport}
                    className="px-4 py-2.5 border rounded-xl text-gray-600 hover:bg-gray-50 active:bg-gray-100">
                    取消
                  </button>
                </div>
              )}
              {importStep === 'saving' && (
                <div className="text-center py-2 text-blue-600 font-semibold">登録中...</div>
              )}
              {importStep === 'done' && (
                <div className="flex gap-3">
                  <div className="flex-1 bg-green-50 border border-green-200 rounded-xl p-3 text-center text-green-700 font-semibold text-sm">
                    ✅ {extractedItems.filter((i) => i.status === 'saved').length}件の登録が完了しました
                  </div>
                  <button onClick={resetImport}
                    className="px-4 py-2 border rounded-xl text-gray-600 hover:bg-gray-50">
                    閉じる
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* ===== 手動登録 + 登録済みリスト ===== */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          <div className="bg-white rounded-xl shadow p-4 sm:p-6">
            <h2 className="text-base font-bold mb-4 sm:text-xl">✏️ 手動で1件登録</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-1">商品名</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="例：鶏ニラ炒め"
                  className="w-full border rounded px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">販売価格（円）</label>
                <input
                  type="number"
                  value={formData.sellingPrice}
                  onChange={(e) => setFormData({ ...formData, sellingPrice: e.target.value })}
                  placeholder="例：800"
                  className="w-full border rounded px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">カテゴリー（任意）</label>
                <input
                  type="text"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  placeholder="例：豚肉料理"
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-blue-600 text-white py-2 rounded font-semibold hover:bg-blue-700 disabled:bg-gray-400"
              >
                {submitting ? '登録中...' : '登録する'}
              </button>
            </form>
          </div>

          <div className="bg-white rounded-xl shadow p-4 sm:p-6">
            <h2 className="text-base font-bold mb-4 sm:text-xl">登録済みメニュー（{menuItems.length}件）</h2>
            {menuItems.length === 0 ? (
              <p className="text-gray-500 text-sm">メニューがまだ登録されていません</p>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {menuItems.map((item) => (
                  <Link
                    key={item.id}
                    href={`/menu/${item.id}/recipe`}
                    className="block p-3 border rounded-lg hover:bg-gray-50 active:bg-gray-100 transition"
                  >
                    <div className="font-semibold text-sm">{item.name}</div>
                    <div className="text-xs text-gray-600">
                      ¥{item.sellingPrice.toLocaleString()}
                      {item.category && ` • ${item.category}`}
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      レシピ {item.recipeItems.length}件
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
