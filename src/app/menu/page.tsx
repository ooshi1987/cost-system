'use client';

import { useEffect, useState, useRef, useMemo } from 'react';
import Link from 'next/link';
import UpgradeModal from '@/components/UpgradeModal';

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

interface ReorderGroup {
  name: string;
  items: MenuItem[];
}

type ImportStep = 'idle' | 'uploading' | 'preview' | 'saving' | 'done';

export default function MenuPage() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);

  // 手動登録フォーム
  const [formData, setFormData] = useState({ name: '', sellingPrice: '', category: '' });
  const [submitting, setSubmitting] = useState(false);

  // 保存済みカテゴリー順
  const [savedCategoryOrder, setSavedCategoryOrder] = useState<string[]>([]);

  // カテゴリーフィルター
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const categories = useMemo(() => {
    const counts: Record<string, number> = {};
    menuItems.forEach((item) => {
      const cat = item.category || 'その他';
      counts[cat] = (counts[cat] || 0) + 1;
    });
    const allCats = Object.entries(counts).map(([name, count]) => ({ name, count }));
    if (savedCategoryOrder.length === 0) {
      return allCats.sort((a, b) => b.count - a.count);
    }
    // 保存済み順を適用し、未登録カテゴリーは末尾に追加
    const ordered: typeof allCats = [];
    const nameSet = new Set<string>();
    for (const name of savedCategoryOrder) {
      const found = allCats.find((c) => c.name === name);
      if (found) { ordered.push(found); nameSet.add(name); }
    }
    for (const cat of allCats) {
      if (!nameSet.has(cat.name)) ordered.push(cat);
    }
    return ordered;
  }, [menuItems, savedCategoryOrder]);

  const displayedItems = useMemo(
    () =>
      selectedCategory
        ? menuItems.filter((item) => (item.category || 'その他') === selectedCategory)
        : menuItems,
    [menuItems, selectedCategory]
  );

  // カテゴリー別にグループ化（通常表示用）
  const groupedDisplayItems = useMemo(() => {
    const targetItems = selectedCategory
      ? menuItems.filter((item) => (item.category || 'その他') === selectedCategory)
      : menuItems;

    const map = new Map<string, MenuItem[]>();
    for (const item of targetItems) {
      const cat = item.category || 'その他';
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(item);
    }
    // 保存済みカテゴリー順を適用
    const result: { name: string; items: MenuItem[] }[] = [];
    const seen = new Set<string>();
    for (const name of savedCategoryOrder) {
      if (map.has(name)) { result.push({ name, items: map.get(name)! }); seen.add(name); }
    }
    for (const [name, its] of map) {
      if (!seen.has(name)) result.push({ name, items: its });
    }
    return result;
  }, [menuItems, selectedCategory, savedCategoryOrder]);

  // ── 並び替えモード ──
  const [reorderMode, setReorderMode] = useState(false);
  const [reorderGroups, setReorderGroups] = useState<ReorderGroup[]>([]);
  const [reorderSaving, setReorderSaving] = useState(false);
  // カテゴリー名編集
  const [editingCatIdx, setEditingCatIdx] = useState<number | null>(null);
  const [editingCatName, setEditingCatName] = useState('');
  // カテゴリー移動モーダル
  const [movingItem, setMovingItem] = useState<{ catIdx: number; itemIdx: number } | null>(null);
  // drag state
  const dragRef = useRef<{ type: 'cat' | 'item'; catIdx: number; itemIdx?: number } | null>(null);
  const [dropTarget, setDropTarget] = useState<{ catIdx: number; itemIdx?: number } | null>(null);

  const buildReorderGroups = (items: MenuItem[], order: string[]): ReorderGroup[] => {
    const map = new Map<string, MenuItem[]>();
    for (const item of items) {
      const cat = item.category || 'その他';
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(item);
    }
    const result: ReorderGroup[] = [];
    const seen = new Set<string>();
    for (const name of order) {
      if (map.has(name)) { result.push({ name, items: map.get(name)! }); seen.add(name); }
    }
    for (const [name, its] of map) {
      if (!seen.has(name)) result.push({ name, items: its });
    }
    return result;
  };

  const enterReorderMode = () => {
    const groups = buildReorderGroups(menuItems, savedCategoryOrder);
    setReorderGroups(groups);
    setEditingCatIdx(null);
    setMovingItem(null);
    setReorderMode(true);
  };

  const cancelReorder = () => {
    setReorderMode(false);
    setDropTarget(null);
    setEditingCatIdx(null);
    setMovingItem(null);
    dragRef.current = null;
  };

  const saveReorder = async () => {
    setReorderSaving(true);
    try {
      // カテゴリー順を保存
      const catOrder = reorderGroups.map((g) => g.name);
      await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'category_order', value: catOrder }),
      });
      setSavedCategoryOrder(catOrder);

      // メニュー順＋カテゴリー名を一括保存
      const items: { id: string; sortOrder: number; category: string }[] = [];
      let order = 0;
      for (const group of reorderGroups) {
        for (const item of group.items) {
          items.push({ id: item.id, sortOrder: order++, category: group.name });
        }
      }
      await fetch('/api/menu-items/reorder', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      });

      await fetchMenuItems();
      setReorderMode(false);
    } catch { alert('保存に失敗しました'); }
    finally { setReorderSaving(false); }
  };

  // ── カテゴリー操作 ──
  const moveCatUp = (catIdx: number) => {
    if (catIdx === 0) return;
    const arr = reorderGroups.map((g) => ({ ...g, items: [...g.items] }));
    [arr[catIdx - 1], arr[catIdx]] = [arr[catIdx], arr[catIdx - 1]];
    setReorderGroups(arr);
  };
  const moveCatDown = (catIdx: number) => {
    if (catIdx === reorderGroups.length - 1) return;
    const arr = reorderGroups.map((g) => ({ ...g, items: [...g.items] }));
    [arr[catIdx], arr[catIdx + 1]] = [arr[catIdx + 1], arr[catIdx]];
    setReorderGroups(arr);
  };
  const startCatEdit = (catIdx: number) => {
    setEditingCatIdx(catIdx);
    setEditingCatName(reorderGroups[catIdx].name);
  };
  const saveCatName = () => {
    if (editingCatIdx === null) return;
    const newName = editingCatName.trim();
    if (!newName) { setEditingCatIdx(null); return; }
    setReorderGroups((prev) =>
      prev.map((g, i) => (i === editingCatIdx ? { ...g, name: newName } : g))
    );
    setEditingCatIdx(null);
  };

  // ── アイテム操作 ──
  const moveItemUp = (catIdx: number, itemIdx: number) => {
    if (itemIdx === 0) return;
    const arr = reorderGroups.map((g) => ({ ...g, items: [...g.items] }));
    [arr[catIdx].items[itemIdx - 1], arr[catIdx].items[itemIdx]] =
      [arr[catIdx].items[itemIdx], arr[catIdx].items[itemIdx - 1]];
    setReorderGroups(arr);
  };
  const moveItemDown = (catIdx: number, itemIdx: number) => {
    if (itemIdx === reorderGroups[catIdx].items.length - 1) return;
    const arr = reorderGroups.map((g) => ({ ...g, items: [...g.items] }));
    [arr[catIdx].items[itemIdx], arr[catIdx].items[itemIdx + 1]] =
      [arr[catIdx].items[itemIdx + 1], arr[catIdx].items[itemIdx]];
    setReorderGroups(arr);
  };
  const moveItemToCategory = (tgtCatName: string) => {
    if (!movingItem) return;
    const { catIdx: srcCatIdx, itemIdx: srcItemIdx } = movingItem;
    const arr = reorderGroups.map((g) => ({ ...g, items: [...g.items] }));
    const [moved] = arr[srcCatIdx].items.splice(srcItemIdx, 1);
    const tgtIdx = arr.findIndex((g) => g.name === tgtCatName);
    if (tgtIdx >= 0) arr[tgtIdx].items.push(moved);
    setReorderGroups(arr);
    setMovingItem(null);
  };

  // ── ドラッグ: カテゴリー ──
  const onCatDragStart = (e: React.DragEvent, catIdx: number) => {
    dragRef.current = { type: 'cat', catIdx };
    e.dataTransfer.effectAllowed = 'move';
  };
  const onCatDragOver = (e: React.DragEvent, catIdx: number) => {
    e.preventDefault();
    if (dragRef.current?.type !== 'cat') return;
    setDropTarget({ catIdx });
  };
  const onCatDrop = (e: React.DragEvent, targetIdx: number) => {
    e.preventDefault();
    if (dragRef.current?.type !== 'cat') return;
    const srcIdx = dragRef.current.catIdx;
    if (srcIdx !== targetIdx) {
      const arr = [...reorderGroups];
      const [moved] = arr.splice(srcIdx, 1);
      arr.splice(targetIdx > srcIdx ? targetIdx - 1 : targetIdx, 0, moved);
      setReorderGroups(arr);
    }
    dragRef.current = null;
    setDropTarget(null);
  };

  // ── ドラッグ: アイテム ──
  const onItemDragStart = (e: React.DragEvent, catIdx: number, itemIdx: number) => {
    e.stopPropagation();
    dragRef.current = { type: 'item', catIdx, itemIdx };
    e.dataTransfer.effectAllowed = 'move';
  };
  const onItemDragOver = (e: React.DragEvent, catIdx: number, itemIdx: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (dragRef.current?.type !== 'item') return;
    setDropTarget({ catIdx, itemIdx });
  };
  const onItemDrop = (e: React.DragEvent, tgtCatIdx: number, tgtItemIdx: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (dragRef.current?.type !== 'item') return;
    const { catIdx: srcCatIdx, itemIdx: srcItemIdx } = dragRef.current;
    if (srcItemIdx === undefined) return;
    const arr = reorderGroups.map((g) => ({ ...g, items: [...g.items] }));
    const [moved] = arr[srcCatIdx].items.splice(srcItemIdx, 1);
    const insertAt = srcCatIdx === tgtCatIdx && tgtItemIdx > srcItemIdx
      ? tgtItemIdx - 1 : tgtItemIdx;
    arr[tgtCatIdx].items.splice(insertAt, 0, moved);
    setReorderGroups(arr);
    dragRef.current = null;
    setDropTarget(null);
  };
  const onDragEnd = () => { dragRef.current = null; setDropTarget(null); };

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

  // アップグレードモーダル
  const [upgradeMessage, setUpgradeMessage] = useState<string | null>(null);

  // PDFインポート
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importStep, setImportStep] = useState<ImportStep>('idle');
  const [importError, setImportError] = useState<string | null>(null);
  const [extractedItems, setExtractedItems] = useState<ExtractedItem[]>([]);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number; fileName: string } | null>(null);
  const [uploadErrors, setUploadErrors] = useState<string[]>([]);

  useEffect(() => {
    fetchMenuItems();
    fetchSettings();
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

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.category_order)) {
          setSavedCategoryOrder(data.category_order);
        }
      }
    } catch { /* 設定取得失敗は無視 */ }
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
      } else {
        const data = await response.json();
        if (data.error === 'TRIAL_LIMIT') {
          setUpgradeMessage(data.message);
        }
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
          if (rawError === 'TRIAL_LIMIT' || rawError.includes('TRIAL_LIMIT')) {
            setUpgradeMessage(data.message);
            break; // これ以上処理しない
          } else if (rawError.includes('request_too_large') || rawError.includes('413')) {
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
      {upgradeMessage && (
        <UpgradeModal message={upgradeMessage} onClose={() => setUpgradeMessage(null)} />
      )}
      <div className="max-w-4xl mx-auto p-4 sm:p-8">
        <div className="mb-6">
          <Link href="/" className="text-amber-600 hover:text-amber-700">
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
                className="w-full border-2 border-dashed border-amber-400 rounded-lg py-8 text-center hover:border-amber-400 hover:bg-amber-50 transition"
              >
                <div className="text-4xl mb-2">📂</div>
                <div className="font-semibold text-amber-600">PDFまたは画像ファイルを選択</div>
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
                    className="h-full bg-amber-500 rounded-full transition-all duration-500"
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
                    <button onClick={() => toggleAll(true)} className="text-amber-600 font-medium">全選択</button>
                    <button onClick={() => toggleAll(false)} className="text-gray-400">全解除</button>
                  </div>
                )}
              </div>

              {importStep === 'preview' && (
                <div className="mb-3 flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 border border-amber-400 rounded-lg px-3 py-2">
                  ✏️ <span>商品名・価格・カテゴリーは直接クリックして編集できます</span>
                </div>
              )}

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
                        item.selected ? 'border-amber-400 bg-white' : 'bg-gray-50'
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
                                className="w-full font-semibold text-sm border-b border-transparent focus:border-amber-400 focus:outline-none bg-transparent mb-2" />
                              <div className="flex gap-2">
                                <div className="flex items-center gap-1">
                                  <span className="text-xs text-gray-400">¥</span>
                                  <input type="number" value={item.sellingPrice}
                                    onChange={(e) => updateExtractedItem(i, 'sellingPrice', parseFloat(e.target.value))}
                                    className="w-20 text-sm border rounded-lg px-2 py-1 focus:outline-none focus:border-amber-400" />
                                </div>
                                <input type="text" value={item.category}
                                  onChange={(e) => updateExtractedItem(i, 'category', e.target.value)}
                                  className="flex-1 text-xs border rounded-lg px-2 py-1 text-gray-500 focus:outline-none focus:border-amber-400" />
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
                      <th className="px-3 py-2 text-center w-20">状態</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {extractedItems.map((item, i) => {
                      const isDup = item.status === 'duplicate';
                      const canEdit = importStep === 'preview' && !isDup;
                      return (
                      <tr key={i}
                        className={
                          isDup                             ? 'bg-gray-50 opacity-50' :
                          item.status === 'batch-duplicate' ? 'bg-amber-50' :
                          item.status === 'saved'           ? 'bg-green-50' :
                          item.status === 'error'           ? 'bg-red-50' :
                          item.selected ? 'bg-white' : 'bg-gray-50 opacity-60'
                        }>
                        <td className="px-3 py-2 text-center">
                          <input type="checkbox"
                            checked={item.selected && !isDup}
                            disabled={isDup || importStep !== 'preview'}
                            onChange={() => toggleItem(i)} className="w-4 h-4" />
                        </td>
                        <td className="px-3 py-2">
                          {canEdit
                            ? <input
                                type="text"
                                value={item.name}
                                onChange={(e) => updateExtractedItem(i, 'name', e.target.value)}
                                className="w-full rounded-md px-2 py-1 bg-amber-50 border border-amber-400 hover:border-amber-400 focus:border-amber-400 focus:outline-none focus:bg-white text-sm transition"
                              />
                            : <span>{item.name}</span>}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {canEdit
                            ? <input
                                type="number"
                                value={item.sellingPrice}
                                onChange={(e) => updateExtractedItem(i, 'sellingPrice', parseFloat(e.target.value))}
                                className="w-24 rounded-md px-2 py-1 bg-amber-50 border border-amber-400 hover:border-amber-400 focus:border-amber-400 focus:outline-none focus:bg-white text-sm text-right transition"
                              />
                            : <span>¥{item.sellingPrice.toLocaleString()}</span>}
                        </td>
                        <td className="px-3 py-2">
                          {canEdit
                            ? <input
                                type="text"
                                value={item.category}
                                onChange={(e) => updateExtractedItem(i, 'category', e.target.value)}
                                className="w-full rounded-md px-2 py-1 bg-amber-50 border border-amber-400 hover:border-amber-400 focus:border-amber-400 focus:outline-none focus:bg-white text-sm transition"
                              />
                            : <span className="text-gray-600">{item.category}</span>}
                        </td>
                        <td className="px-3 py-2 text-center text-xs">
                          {isDup                             && <span className="text-gray-400">登録済</span>}
                          {item.status === 'batch-duplicate' && <span className="text-amber-600 font-medium">⚠️ 別ページに同名</span>}
                          {item.status === 'saved'           && <span className="text-green-600 font-semibold">✓ 完了</span>}
                          {item.status === 'error'           && <span className="text-red-500">エラー</span>}
                          {item.status === 'pending'         && importStep === 'saving' && <span className="text-gray-400">…</span>}
                          {canEdit && (
                            <button
                              onClick={() => setExtractedItems((prev) => prev.filter((_, idx) => idx !== i))}
                              className="ml-1 text-gray-300 hover:text-red-400 transition"
                              title="この行を削除"
                            >
                              ✕
                            </button>
                          )}
                        </td>
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {importStep === 'preview' && (
                <div className="flex gap-3">
                  <button onClick={handleImportSave} disabled={selectedCount === 0}
                    className="flex-1 bg-amber-500 text-white py-2.5 rounded-xl font-semibold hover:bg-amber-600 active:bg-amber-700 disabled:bg-gray-300">
                    {selectedCount}件を登録する
                  </button>
                  <button onClick={resetImport}
                    className="px-4 py-2.5 border rounded-xl text-gray-600 hover:bg-gray-50 active:bg-gray-100">
                    取消
                  </button>
                </div>
              )}
              {importStep === 'saving' && (
                <div className="text-center py-2 text-amber-600 font-semibold">登録中...</div>
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
                className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-400"
                required
              />
              <input
                type="number"
                value={formData.sellingPrice}
                onChange={(e) => setFormData({ ...formData, sellingPrice: e.target.value })}
                placeholder="販売価格（円）"
                className="w-full sm:w-36 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-400"
                required
              />
              <input
                type="text"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                placeholder="カテゴリー（任意）"
                className="w-full sm:w-36 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-400"
              />
              <button
                type="submit"
                disabled={submitting}
                className="bg-amber-500 text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-amber-600 disabled:bg-gray-400 whitespace-nowrap"
              >
                {submitting ? '登録中…' : '登録する'}
              </button>
            </div>
          </form>
        </div>

        {/* ===== 登録済みメニュー（全幅・大） ===== */}
        <div className="bg-white rounded-xl shadow p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-baseline gap-2">
              <h2 className="text-base font-bold sm:text-xl">登録済みメニュー</h2>
              <span className="text-sm text-gray-400">{menuItems.length}件</span>
            </div>
            <div className="flex items-center gap-2">
              {menuItems.length > 0 && !reorderMode && (
                <button
                  onClick={enterReorderMode}
                  className="text-xs text-amber-600 hover:text-amber-700 hover:bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-400 hover:border-amber-400 transition font-medium"
                >
                  編集
                </button>
              )}
            </div>
          </div>

          {menuItems.length === 0 ? (
            <p className="text-gray-500 text-sm">メニューがまだ登録されていません</p>
          ) : reorderMode ? (
            /* ===== 並び替えモード ===== */
            <>
              <div className="mb-3 flex flex-wrap gap-2 text-xs text-gray-500">
                <span className="bg-gray-100 rounded-full px-2.5 py-1">⠿ ドラッグで移動</span>
                <span className="bg-gray-100 rounded-full px-2.5 py-1">↑↓ ボタンで上下入れ替え</span>
                <span className="bg-amber-50 text-amber-600 rounded-full px-2.5 py-1">📁 カテゴリー移動</span>
                <span className="bg-gray-100 rounded-full px-2.5 py-1">✏️ カテゴリー名を変更</span>
              </div>

              <div className="space-y-3 mb-4" onDragOver={(e) => e.preventDefault()}>
                {reorderGroups.map((group, catIdx) => {
                  const isCatDropTarget = dropTarget?.catIdx === catIdx && dropTarget.itemIdx === undefined;
                  const isEditingThisCat = editingCatIdx === catIdx;
                  return (
                    <div
                      key={catIdx}
                      draggable={!isEditingThisCat}
                      onDragStart={(e) => !isEditingThisCat && onCatDragStart(e, catIdx)}
                      onDragOver={(e) => onCatDragOver(e, catIdx)}
                      onDrop={(e) => onCatDrop(e, catIdx)}
                      onDragEnd={onDragEnd}
                      className={`border-2 rounded-xl overflow-hidden transition-all ${
                        isCatDropTarget ? 'border-amber-400 shadow-md' : 'border-gray-200'
                      }`}
                    >
                      {/* カテゴリーヘッダー */}
                      <div className="flex items-center gap-1.5 px-3 py-2 bg-gray-50 border-b border-gray-200">
                        <span className="text-gray-400 text-lg select-none cursor-grab shrink-0">⠿</span>

                        {isEditingThisCat ? (
                          <input
                            autoFocus
                            value={editingCatName}
                            onChange={(e) => setEditingCatName(e.target.value)}
                            onBlur={saveCatName}
                            onKeyDown={(e) => { if (e.key === 'Enter') saveCatName(); if (e.key === 'Escape') setEditingCatIdx(null); }}
                            className="flex-1 text-sm font-semibold border border-amber-400 rounded-md px-2 py-0.5 bg-white focus:outline-none"
                          />
                        ) : (
                          <span className="font-semibold text-sm text-gray-700 flex-1 truncate">🏷 {group.name}</span>
                        )}

                        <span className="text-xs text-gray-400 shrink-0">{group.items.length}件</span>

                        {/* カテゴリー名編集 */}
                        <button
                          onClick={() => isEditingThisCat ? saveCatName() : startCatEdit(catIdx)}
                          className="p-1 text-gray-400 hover:text-amber-500 transition shrink-0"
                          title="カテゴリー名を変更"
                        >
                          {isEditingThisCat ? '✓' : '✏️'}
                        </button>

                        {/* カテゴリー上下移動 */}
                        <button
                          onClick={() => moveCatUp(catIdx)}
                          disabled={catIdx === 0}
                          className="p-1 text-gray-400 hover:text-amber-500 disabled:opacity-20 transition shrink-0 text-base leading-none"
                          title="上へ"
                        >↑</button>
                        <button
                          onClick={() => moveCatDown(catIdx)}
                          disabled={catIdx === reorderGroups.length - 1}
                          className="p-1 text-gray-400 hover:text-amber-500 disabled:opacity-20 transition shrink-0 text-base leading-none"
                          title="下へ"
                        >↓</button>
                      </div>

                      {/* アイテムリスト */}
                      <div className="divide-y divide-gray-100">
                        {group.items.map((item, itemIdx) => {
                          const isItemDropTarget =
                            dropTarget?.catIdx === catIdx && dropTarget.itemIdx === itemIdx;
                          return (
                            <div
                              key={item.id}
                              draggable
                              onDragStart={(e) => onItemDragStart(e, catIdx, itemIdx)}
                              onDragOver={(e) => onItemDragOver(e, catIdx, itemIdx)}
                              onDrop={(e) => onItemDrop(e, catIdx, itemIdx)}
                              onDragEnd={onDragEnd}
                              className={`flex items-center gap-1.5 px-3 py-2.5 transition-colors ${
                                isItemDropTarget ? 'bg-amber-100' : 'bg-white hover:bg-gray-50'
                              }`}
                            >
                              <span className="text-gray-300 select-none cursor-grab shrink-0">⠿</span>
                              <span className="flex-1 text-sm truncate min-w-0">{item.name}</span>
                              <span className="text-sm font-medium text-amber-600 shrink-0">
                                ¥{item.sellingPrice.toLocaleString()}
                              </span>

                              {/* アイテム上下移動 */}
                              <button
                                onClick={() => moveItemUp(catIdx, itemIdx)}
                                disabled={itemIdx === 0}
                                className="p-1 text-gray-300 hover:text-amber-500 disabled:opacity-20 transition shrink-0 text-base leading-none"
                                title="上へ"
                              >↑</button>
                              <button
                                onClick={() => moveItemDown(catIdx, itemIdx)}
                                disabled={itemIdx === group.items.length - 1}
                                className="p-1 text-gray-300 hover:text-amber-500 disabled:opacity-20 transition shrink-0 text-base leading-none"
                                title="下へ"
                              >↓</button>

                              {/* カテゴリー移動 */}
                              <button
                                onClick={() => setMovingItem({ catIdx, itemIdx })}
                                className="p-1 text-gray-300 hover:text-amber-500 transition shrink-0 text-sm"
                                title="カテゴリーを移動"
                              >📁</button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* 保存・キャンセル */}
              <div className="flex gap-3 mb-3">
                <button
                  onClick={saveReorder}
                  disabled={reorderSaving}
                  className="flex-1 bg-amber-500 text-white py-2.5 rounded-xl font-semibold hover:bg-amber-600 disabled:bg-gray-300 text-sm"
                >
                  {reorderSaving ? '保存中…' : '✓ 並び順を保存する'}
                </button>
                <button
                  onClick={cancelReorder}
                  disabled={reorderSaving}
                  className="px-4 py-2.5 border rounded-xl text-gray-600 hover:bg-gray-50 text-sm"
                >
                  キャンセル
                </button>
              </div>
              {/* 全件削除 */}
              <button
                onClick={async () => {
                  if (!confirm(`登録済みの${menuItems.length}件をすべて削除しますか？\nレシピ情報もすべて削除されます。`)) return;
                  await fetch('/api/menu-items', { method: 'DELETE' });
                  await fetchMenuItems();
                  setReorderMode(false);
                  setSelectedCategory(null);
                }}
                disabled={reorderSaving}
                className="w-full py-2 text-xs text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl border border-red-200 hover:border-red-300 transition disabled:opacity-30"
              >
                🗑️ 全件削除（{menuItems.length}件すべて削除）
              </button>

              {/* カテゴリー移動モーダル */}
              {movingItem && (
                <div
                  className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-4"
                  onClick={() => setMovingItem(null)}
                >
                  <div
                    className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="px-4 py-3 border-b bg-gray-50">
                      <p className="font-semibold text-sm text-gray-800">カテゴリーを移動</p>
                      <p className="text-xs text-gray-500 mt-0.5 truncate">
                        「{reorderGroups[movingItem.catIdx]?.items[movingItem.itemIdx]?.name}」
                      </p>
                    </div>
                    <div className="divide-y max-h-72 overflow-y-auto">
                      {reorderGroups.map((group, gi) => (
                        <button
                          key={gi}
                          onClick={() => moveItemToCategory(group.name)}
                          disabled={gi === movingItem.catIdx}
                          className={`w-full text-left px-4 py-3 text-sm transition ${
                            gi === movingItem.catIdx
                              ? 'bg-amber-50 text-amber-600 font-semibold cursor-default'
                              : 'hover:bg-gray-50 text-gray-700'
                          }`}
                        >
                          🏷 {group.name}
                          {gi === movingItem.catIdx && (
                            <span className="ml-2 text-xs font-normal text-blue-400">← 現在</span>
                          )}
                          <span className="float-right text-xs text-gray-400">{group.items.length}件</span>
                        </button>
                      ))}
                    </div>
                    <div className="p-3 bg-gray-50">
                      <button
                        onClick={() => setMovingItem(null)}
                        className="w-full py-2 border rounded-xl text-sm text-gray-600 hover:bg-gray-100 transition"
                      >
                        キャンセル
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              {/* ── カテゴリーフィルター ── */}
              <div className="flex gap-2 overflow-x-auto pb-2 mb-4 -mx-1 px-1">
                <button
                  onClick={() => setSelectedCategory(null)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition ${
                    selectedCategory === null
                      ? 'bg-amber-500 text-white'
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
                        ? 'bg-amber-500 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {name} ({count})
                  </button>
                ))}
              </div>

              <div className="space-y-4">
                {groupedDisplayItems.map((group) => (
                  <div key={group.name} className="border border-gray-200 rounded-xl overflow-hidden">
                    {/* カテゴリーヘッダー */}
                    <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 border-b border-gray-200">
                      <span className="font-semibold text-sm text-gray-700">🏷 {group.name}</span>
                      <span className="text-xs text-gray-400">{group.items.length}件</span>
                    </div>

                    {/* アイテムリスト */}
                    <div className="divide-y divide-gray-100">
                      {group.items.map((item) => {
                        const isEditing = editingId === item.id;

                        if (isEditing && editDraft) {
                          return (
                            <div key={item.id} className="px-4 py-3 bg-amber-50">
                              <div className="flex flex-col sm:flex-row gap-2 mb-2">
                                <input
                                  autoFocus
                                  value={editDraft.name}
                                  onChange={(e) => setEditDraft({ ...editDraft, name: e.target.value })}
                                  className="flex-1 font-semibold text-sm border rounded-lg px-3 py-1.5 focus:border-amber-400 focus:outline-none bg-white"
                                  placeholder="商品名"
                                />
                                <div className="flex items-center gap-1">
                                  <span className="text-sm text-gray-400">¥</span>
                                  <input
                                    type="number"
                                    value={editDraft.sellingPrice}
                                    onChange={(e) => setEditDraft({ ...editDraft, sellingPrice: e.target.value })}
                                    className="w-28 border rounded-lg px-2 py-1.5 text-sm text-right focus:outline-none focus:border-amber-400 bg-white"
                                  />
                                </div>
                                <input
                                  value={editDraft.category}
                                  onChange={(e) => setEditDraft({ ...editDraft, category: e.target.value })}
                                  placeholder="カテゴリー"
                                  className="w-full sm:w-36 text-sm border rounded-lg px-2 py-1.5 focus:outline-none focus:border-amber-400 bg-white"
                                />
                              </div>
                              <div className="flex gap-2">
                                <button onClick={saveEdit} disabled={editSaving}
                                  className="flex-1 bg-amber-500 text-white py-1.5 rounded-lg text-sm font-semibold hover:bg-amber-600 disabled:bg-gray-300">
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
                          <div key={item.id} className="flex items-center gap-2 px-4 py-3 hover:bg-gray-50 transition group">
                            <Link href={`/menu/${item.id}/recipe`} className="flex-1 min-w-0 flex items-center gap-4">
                              <span className="flex-1 text-sm font-medium truncate">{item.name}</span>
                              <span className="text-sm font-semibold text-amber-600 shrink-0">
                                ¥{item.sellingPrice.toLocaleString()}
                              </span>
                              <span className="text-xs text-gray-400 shrink-0 hidden sm:inline">
                                レシピ {item.recipeItems.length}件
                              </span>
                            </Link>
                            <button
                              onClick={() => startEdit(item)}
                              disabled={editingId !== null}
                              className="text-gray-300 hover:text-amber-500 disabled:opacity-20 disabled:cursor-not-allowed p-1 shrink-0 transition-colors opacity-0 group-hover:opacity-100"
                              title="編集"
                            >
                              ✏️
                            </button>
                            <button
                              onClick={() => deleteItem(item.id)}
                              disabled={editingId !== null}
                              className="text-gray-300 hover:text-red-400 disabled:opacity-20 disabled:cursor-not-allowed p-1 shrink-0 transition-colors opacity-0 group-hover:opacity-100"
                              title="削除"
                            >
                              🗑️
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
