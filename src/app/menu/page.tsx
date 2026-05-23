'use client';

import { useEffect, useState, useRef, useMemo } from 'react';
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
  order?: number;       // メニュー表での掲載順
  selected: boolean;
  // インポート後の状態
  // duplicate      = DBに既存（選択不可）
  // batch-duplicate = 今回のバッチ内で別ファイルに同名あり（選択可・デフォルトOFF）
  status?: 'pending' | 'saved' | 'duplicate' | 'batch-duplicate' | 'error';
}

type ImportStep = 'idle' | 'uploading' | 'preview' | 'saving' | 'done';

export default function MenuPage() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);

  // 手動登録フォーム
  const [formData, setFormData] = useState({ name: '', sellingPrice: '', category: '' });
  const [submitting, setSubmitting] = useState(false);

  // カテゴリーフィルター
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const categories = useMemo(() => {
    const counts: Record<string, number> = {};
    menuItems.forEach((item) => {
      const cat = item.category || 'その他';
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1]) // 件数が多い順
      .map(([name, count]) => ({ name, count }));
  }, [menuItems]);

  const displayedItems = useMemo(
    () =>
      selectedCategory
        ? menuItems.filter((item) => (item.category || 'その他') === selectedCategory)
        : menuItems,
    [menuItems, selectedCategory]
  );

  // 登録済みメニュー編集
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<{ name: string; sellingPrice: string; category: string } | null>(null);
  const [editSaving, setEditSaving] = useState(false);

  const startEdit = (item: MenuItem) => {
    setEditingId(item.id);
    setEditDraft({ name: item.name, sellingPrice: String(item.sellingPrice), category: item.category || '' });
  };
  const cancelEdit = () => { setEditingId(null); setEditDraft(null); };

  const saveEdit = async () => {
    if (!editingId || !editDraft) return;
    setEditSaving(true);
    try {
      const res = await fetch(`/api/menu-items/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editDraft.name,
          sellingPrice: parseFloat(editDraft.sellingPrice),
          category: editDraft.category || null,
        }),
      });
      if (!res.ok) throw new Error('更新失敗');
      await fetchMenuItems();
      cancelEdit();
    } catch { alert('更新に失敗しました'); }
    finally { setEditSaving(false); }
  };

  const deleteItem = async (id: string) => {
    if (!confirm('この商品を削除しますか？レシピ情報も削除されます。')) return;
    try {
      await fetch(`/api/menu-items/${id}`, { method: 'DELETE' });
      await fetchMenuItems();
      if (editingId === id) cancelEdit();
    } catch { alert('削除に失敗しました'); }
  };

  // PDFインポート
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importStep, setImportStep] = useState<ImportStep>('idle');
  const [importError, setImportError] = useState<string | null>(null);
  const [extractedItems, setExtractedItems] = useState<ExtractedItem[]>([]);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number; fileName: string } | null>(null);
  const [uploadErrors, setUploadErrors] = useState<string[]>([]);

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

  // --- PDFインポート（複数ファイル対応・1枚ずつ処理）---
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // ── 全ファイルのサイズチェック ──
    const maxBytes = 15 * 1024 * 1024;
    const oversized = files.filter((f) => f.size > maxBytes);
    if (oversized.length > 0) {
      setImportError(
        oversized.map((f) => `「${f.name}」が大きすぎます（${(f.size / 1024 / 1024).toFixed(1)}MB）`).join('\n') +
        '\n15MB以下のファイルのみアップロードできます。'
      );
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setImportError(null);
    setUploadErrors([]);
    setImportStep('uploading');

    const allItems: ExtractedItem[] = [];
    const errors: string[] = [];
    const existingNames = new Set(menuItems.map((m) => m.name));

    // ── 1枚ずつ順番に処理 ──
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setUploadProgress({ current: i + 1, total: files.length, fileName: file.name });

      try {
        const fd = new FormData();
        fd.append('file', file);

        const response = await fetch('/api/menu-items/import', {
          method: 'POST',
          body: fd,
        });

        const data = await response.json();

        if (!response.ok) {
          const rawError: string = typeof data.error === 'string' ? data.error : JSON.stringify(data.error);
          if (rawError.includes('request_too_large') || rawError.includes('413')) {
            errors.push(`「${file.name}」: ファイルが大きすぎてAIが処理できませんでした`);
          } else {
            errors.push(`「${file.name}」: ${data.error || '読み取り失敗'}`);
          }
          continue; // このファイルはスキップして次へ
        }

        // 重複チェック：DBに既存 vs バッチ内で別ファイルに同名あり で分けて管理
        const collectedNames = new Set(allItems.map((item) => item.name));
        for (const item of data.items as { name: string; sellingPrice: number; category: string; order?: number }[]) {
          const isDbDuplicate = existingNames.has(item.name);
          const isBatchDuplicate = !isDbDuplicate && collectedNames.has(item.name);
          const status = isDbDuplicate ? 'duplicate' : isBatchDuplicate ? 'batch-duplicate' : 'pending';
          allItems.push({
            ...item,
            selected: status === 'pending',
            status,
          });
          collectedNames.add(item.name);
        }
      } catch {
        errors.push(`「${file.name}」: エラーが発生しました`);
      }
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
    setUploadProgress(null);

    if (allItems.length === 0) {
      setImportError(
        errors.length > 0
          ? errors.join('\n')
          : 'メニューを読み取れませんでした。別のファイルをお試しください。'
      );
      setImportStep('idle');
      return;
    }

    setUploadErrors(errors);
    setExtractedItems(allItems);
    setImportStep('preview');
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

    // 1件ずつ登録してステータスを更新（batch-duplicate も selected なら保存する）
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
            sortOrder: updated[i].order ?? null,
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
    setUploadProgress(null);
    setUploadErrors([]);
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
                <div className="text-xs text-blue-400 mt-1">📷 画像は複数まとめて選択できます</div>
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
                multiple
                onChange={handleFileChange}
                className="hidden"
              />
            </>
          )}

          {importStep === 'uploading' && uploadProgress && (
            <div className="py-10 text-center">
              <div className="text-3xl mb-3 animate-spin">⚙️</div>
              <p className="font-semibold text-gray-700">
                {uploadProgress.total > 1
                  ? `${uploadProgress.current} / ${uploadProgress.total}枚目を解析中…`
                  : '解析中…'}
              </p>
              <p className="text-sm text-gray-500 mt-1">「{uploadProgress.fileName}」</p>
              <p className="text-xs text-gray-400 mt-1">Claudeがメニューを読み取っています</p>
              {uploadProgress.total > 1 && (
                <div className="mt-4 mx-auto w-56 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full transition-all duration-500"
                    style={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }}
                  />
                </div>
              )}
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

              {/* 一部ファイルでエラーがあった場合 */}
              {uploadErrors.length > 0 && (
                <div className="mb-3 bg-yellow-50 border border-yellow-200 rounded-xl p-3 text-xs text-yellow-800">
                  ⚠️ 一部のファイルを読み取れませんでした：
                  <ul className="mt-1 space-y-0.5 list-disc list-inside">
                    {uploadErrors.map((err, i) => <li key={i}>{err}</li>)}
                  </ul>
                </div>
              )}

              {/* ── スマホ: カードリスト ── */}
              <div className="sm:hidden space-y-2 mb-4">
                {extractedItems.map((item, i) => {
                  const isDbDup = item.status === 'duplicate';
                  const isBatchDup = item.status === 'batch-duplicate';
                  return (
                    <div key={i}
                      className={`border rounded-xl p-3 ${
                        isDbDup   ? 'opacity-40 bg-gray-50' :
                        isBatchDup ? 'border-amber-300 bg-amber-50' :
                        item.status === 'saved' ? 'border-green-300 bg-green-50' :
                        item.status === 'error' ? 'border-red-300 bg-red-50' :
                        item.selected ? 'border-blue-200 bg-white' : 'bg-gray-50'
                      }`}>
                      <div className="flex items-start gap-3">
                        <input type="checkbox"
                          checked={item.selected && !isDbDup}
                          disabled={isDbDup || importStep !== 'preview'}
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
                        <div className="text-xs flex-shrink-0 text-right">
                          {isDbDup   && <span className="text-gray-400">登録済</span>}
                          {isBatchDup && <span className="text-amber-600">⚠️<br/>別ページ<br/>に同名</span>}
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
                          item.status === 'duplicate'       ? 'bg-gray-50 opacity-50' :
                          item.status === 'batch-duplicate' ? 'bg-amber-50' :
                          item.status === 'saved'           ? 'bg-green-50' :
                          item.status === 'error'           ? 'bg-red-50' :
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
                          {item.status === 'duplicate'       && <span className="text-gray-400">登録済</span>}
                          {item.status === 'batch-duplicate' && <span className="text-amber-600 font-medium">⚠️ 別ページに同名</span>}
                          {item.status === 'saved'           && <span className="text-green-600 font-semibold">✓ 完了</span>}
                          {item.status === 'error'           && <span className="text-red-500">エラー</span>}
                          {item.status === 'pending'         && importStep === 'saving' && <span className="text-gray-400">…</span>}
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

        {/* ===== 手動登録（コンパクト横並び） ===== */}
        <div className="bg-white rounded-xl shadow p-4 sm:p-5 mb-4 sm:mb-6">
          <h2 className="text-sm font-bold mb-3 text-gray-600">✏️ 手動で1件追加</h2>
          <form onSubmit={handleSubmit}>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="商品名"
                className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
                required
              />
              <input
                type="number"
                value={formData.sellingPrice}
                onChange={(e) => setFormData({ ...formData, sellingPrice: e.target.value })}
                placeholder="販売価格（円）"
                className="w-full sm:w-36 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
                required
              />
              <input
                type="text"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                placeholder="カテゴリー（任意）"
                className="w-full sm:w-36 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
              />
              <button
                type="submit"
                disabled={submitting}
                className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:bg-gray-400 whitespace-nowrap"
              >
                {submitting ? '登録中…' : '登録する'}
              </button>
            </div>
          </form>
        </div>

        {/* ===== 登録済みメニュー（全幅・大） ===== */}
        <div className="bg-white rounded-xl shadow p-4 sm:p-6">
          <div className="flex items-baseline gap-2 mb-4">
            <h2 className="text-base font-bold sm:text-xl">登録済みメニュー</h2>
            <span className="text-sm text-gray-400">{menuItems.length}件</span>
          </div>

          {menuItems.length === 0 ? (
            <p className="text-gray-500 text-sm">メニューがまだ登録されていません</p>
          ) : (
            <>
              {/* ── カテゴリーフィルター ── */}
              <div className="flex gap-2 overflow-x-auto pb-2 mb-4 -mx-1 px-1">
                <button
                  onClick={() => setSelectedCategory(null)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition ${
                    selectedCategory === null
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  全て ({menuItems.length})
                </button>
                {categories.map(({ name, count }) => (
                  <button
                    key={name}
                    onClick={() => setSelectedCategory(selectedCategory === name ? null : name)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition ${
                      selectedCategory === name
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {name} ({count})
                  </button>
                ))}
              </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {displayedItems.map((item) => {
                const isEditing = editingId === item.id;

                if (isEditing && editDraft) {
                  return (
                    <div key={item.id} className="border-2 border-blue-400 rounded-xl p-4 bg-blue-50">
                      <div className="space-y-2 mb-3">
                        <input
                          autoFocus
                          value={editDraft.name}
                          onChange={(e) => setEditDraft({ ...editDraft, name: e.target.value })}
                          className="w-full font-bold text-base border-b-2 border-blue-300 focus:border-blue-500 focus:outline-none bg-transparent"
                          placeholder="商品名"
                        />
                        <div className="flex items-center gap-1">
                          <span className="text-sm text-gray-400">¥</span>
                          <input
                            type="number"
                            value={editDraft.sellingPrice}
                            onChange={(e) => setEditDraft({ ...editDraft, sellingPrice: e.target.value })}
                            className="w-28 border rounded-lg px-2 py-1 text-sm text-right focus:outline-none focus:border-blue-400 bg-white"
                          />
                        </div>
                        <input
                          value={editDraft.category}
                          onChange={(e) => setEditDraft({ ...editDraft, category: e.target.value })}
                          placeholder="カテゴリー"
                          className="w-full text-sm border rounded-lg px-2 py-1 focus:outline-none focus:border-blue-400 bg-white"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button onClick={saveEdit} disabled={editSaving}
                          className="flex-1 bg-blue-600 text-white py-1.5 rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:bg-gray-300">
                          {editSaving ? '…' : '保存'}
                        </button>
                        <button onClick={cancelEdit} disabled={editSaving}
                          className="px-3 py-1.5 rounded-lg text-sm border bg-white text-gray-600 hover:bg-gray-50">
                          取消
                        </button>
                        <button onClick={() => deleteItem(item.id)} disabled={editSaving}
                          className="px-2 py-1.5 rounded-lg text-sm text-red-300 hover:text-red-500 hover:bg-red-50 disabled:opacity-30">
                          🗑️
                        </button>
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={item.id} className="border rounded-xl p-4 hover:border-gray-300 hover:shadow-sm transition group">
                    <div className="flex items-start justify-between gap-2">
                      <Link href={`/menu/${item.id}/recipe`} className="flex-1 min-w-0">
                        <div className="font-bold text-base mb-1 truncate">{item.name}</div>
                        <div className="text-lg font-semibold text-blue-600">
                          ¥{item.sellingPrice.toLocaleString()}
                        </div>
                        {item.category && (
                          <div className="text-xs text-gray-400 mt-1">{item.category}</div>
                        )}
                        <div className="text-xs text-gray-400 mt-1">
                          レシピ {item.recipeItems.length}件
                        </div>
                      </Link>
                      <button
                        onClick={() => startEdit(item)}
                        disabled={editingId !== null}
                        className="text-gray-300 hover:text-blue-500 disabled:opacity-20 disabled:cursor-not-allowed p-1 shrink-0 transition-colors"
                        title="編集"
                      >
                        ✏️
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
