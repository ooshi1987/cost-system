'use client';

import { useEffect, useState, useRef, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import UpgradeModal from '@/components/UpgradeModal';

interface Ingredient {
  id: string;
  name: string;
  unit: string;
  costPerUnit: number;
  type: string;
  category?: string;
  sortOrder?: number;
  lastUpdated: string;
}

interface ReorderGroup {
  name: string;
  items: Ingredient[];
}

function IngredientsContent() {
  const searchParams = useSearchParams();
  const type = (searchParams.get('type') || 'food') as 'food' | 'seasoning';
  const pageTitle = type === 'food' ? '食材一覧' : '調味料一覧';
  const settingsKey = `ingredient_${type}_category_order`;

  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [savedCategoryOrder, setSavedCategoryOrder] = useState<string[]>([]);

  // 手動追加フォーム
  const [formData, setFormData] = useState({ name: '', unit: 'g', costPerUnit: '', category: '' });
  const [submitting, setSubmitting] = useState(false);
  const [upgradeMessage, setUpgradeMessage] = useState<string | null>(null);

  // カテゴリーフィルター
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // インライン編集
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<{ name: string; unit: string; costPerUnit: string; category: string } | null>(null);
  const [editSaving, setEditSaving] = useState(false);

  // 並び替えモード
  const [reorderMode, setReorderMode] = useState(false);
  const [reorderGroups, setReorderGroups] = useState<ReorderGroup[]>([]);
  const [reorderSaving, setReorderSaving] = useState(false);
  const [editingCatIdx, setEditingCatIdx] = useState<number | null>(null);
  const [editingCatName, setEditingCatName] = useState('');
  const [movingItem, setMovingItem] = useState<{ catIdx: number; itemIdx: number } | null>(null);
  const dragRef = useRef<{ type: 'cat' | 'item'; catIdx: number; itemIdx?: number } | null>(null);
  const [dropTarget, setDropTarget] = useState<{ catIdx: number; itemIdx?: number } | null>(null);

  useEffect(() => {
    fetchIngredients();
    fetchSettings();
    setSelectedCategory(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type]);

  const fetchIngredients = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/ingredients?type=${type}`);
      if (res.ok) setIngredients(await res.json());
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data[settingsKey])) setSavedCategoryOrder(data[settingsKey]);
        else setSavedCategoryOrder([]);
      }
    } catch { /* ignore */ }
  };

  // ── カテゴリー集計（保存済み順） ──
  const categories = useMemo(() => {
    const counts: Record<string, number> = {};
    ingredients.forEach((i) => {
      const cat = i.category || 'その他';
      counts[cat] = (counts[cat] || 0) + 1;
    });
    const allCats = Object.entries(counts).map(([name, count]) => ({ name, count }));
    if (savedCategoryOrder.length === 0) return allCats.sort((a, b) => b.count - a.count);
    const ordered: typeof allCats = [];
    const seen = new Set<string>();
    for (const name of savedCategoryOrder) {
      const found = allCats.find((c) => c.name === name);
      if (found) { ordered.push(found); seen.add(name); }
    }
    for (const cat of allCats) { if (!seen.has(cat.name)) ordered.push(cat); }
    return ordered;
  }, [ingredients, savedCategoryOrder]);

  // ── カテゴリー別グループ（通常表示用） ──
  const groupedDisplayItems = useMemo(() => {
    const targetItems = selectedCategory
      ? ingredients.filter((i) => (i.category || 'その他') === selectedCategory)
      : ingredients;
    const map = new Map<string, Ingredient[]>();
    for (const item of targetItems) {
      const cat = item.category || 'その他';
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(item);
    }
    const result: { name: string; items: Ingredient[] }[] = [];
    const seen = new Set<string>();
    for (const name of savedCategoryOrder) {
      if (map.has(name)) { result.push({ name, items: map.get(name)! }); seen.add(name); }
    }
    for (const [name, its] of map) { if (!seen.has(name)) result.push({ name, items: its }); }
    return result;
  }, [ingredients, selectedCategory, savedCategoryOrder]);

  // ── 手動追加 ──
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.costPerUnit) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/ingredients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          unit: formData.unit,
          costPerUnit: parseFloat(formData.costPerUnit),
          type,
          category: formData.category || null,
        }),
      });
      if (res.ok) {
        setFormData({ name: '', unit: 'g', costPerUnit: '', category: '' });
        await fetchIngredients();
      } else {
        const data = await res.json();
        if (data.error === 'TRIAL_LIMIT') {
          setUpgradeMessage(data.message ?? 'プランの上限に達しました。');
        }
      }
    } finally { setSubmitting(false); }
  };

  // ── インライン編集 ──
  const startEdit = (item: Ingredient) => {
    setEditingId(item.id);
    setEditDraft({ name: item.name, unit: item.unit, costPerUnit: String(item.costPerUnit), category: item.category || '' });
  };
  const cancelEdit = () => { setEditingId(null); setEditDraft(null); };
  const saveEdit = async () => {
    if (!editingId || !editDraft) return;
    setEditSaving(true);
    try {
      const res = await fetch(`/api/ingredients/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editDraft.name,
          unit: editDraft.unit,
          costPerUnit: parseFloat(editDraft.costPerUnit),
          category: editDraft.category || null,
        }),
      });
      if (!res.ok) throw new Error();
      await fetchIngredients();
      cancelEdit();
    } catch { alert('更新に失敗しました'); }
    finally { setEditSaving(false); }
  };
  const deleteItem = async (id: string) => {
    if (!confirm('この食材を削除しますか？レシピ情報にも影響します。')) return;
    try {
      await fetch(`/api/ingredients/${id}`, { method: 'DELETE' });
      await fetchIngredients();
      if (editingId === id) cancelEdit();
    } catch { alert('削除に失敗しました'); }
  };

  // ── 並び替えモード ──
  const buildGroups = (items: Ingredient[], order: string[]): ReorderGroup[] => {
    const map = new Map<string, Ingredient[]>();
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
    for (const [name, its] of map) { if (!seen.has(name)) result.push({ name, items: its }); }
    return result;
  };

  const enterReorderMode = () => {
    setReorderGroups(buildGroups(ingredients, savedCategoryOrder));
    setEditingCatIdx(null); setMovingItem(null);
    setReorderMode(true);
  };
  const cancelReorder = () => {
    setReorderMode(false); setDropTarget(null);
    setEditingCatIdx(null); setMovingItem(null);
    dragRef.current = null;
  };
  const saveReorder = async () => {
    setReorderSaving(true);
    try {
      const catOrder = reorderGroups.map((g) => g.name);
      await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: settingsKey, value: catOrder }),
      });
      setSavedCategoryOrder(catOrder);
      const items: { id: string; sortOrder: number; category: string }[] = [];
      let order = 0;
      for (const group of reorderGroups) {
        for (const item of group.items) {
          items.push({ id: item.id, sortOrder: order++, category: group.name });
        }
      }
      await fetch('/api/ingredients/reorder', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      });
      await fetchIngredients();
      setReorderMode(false);
    } catch { alert('保存に失敗しました'); }
    finally { setReorderSaving(false); }
  };

  // カテゴリー操作
  const moveCatUp = (i: number) => {
    if (i === 0) return;
    const arr = reorderGroups.map((g) => ({ ...g, items: [...g.items] }));
    [arr[i - 1], arr[i]] = [arr[i], arr[i - 1]];
    setReorderGroups(arr);
  };
  const moveCatDown = (i: number) => {
    if (i === reorderGroups.length - 1) return;
    const arr = reorderGroups.map((g) => ({ ...g, items: [...g.items] }));
    [arr[i], arr[i + 1]] = [arr[i + 1], arr[i]];
    setReorderGroups(arr);
  };
  const startCatEdit = (i: number) => { setEditingCatIdx(i); setEditingCatName(reorderGroups[i].name); };
  const saveCatName = () => {
    if (editingCatIdx === null) return;
    const newName = editingCatName.trim();
    if (!newName) { setEditingCatIdx(null); return; }
    setReorderGroups((prev) => prev.map((g, i) => i === editingCatIdx ? { ...g, name: newName } : g));
    setEditingCatIdx(null);
  };

  // アイテム操作
  const moveItemUp = (ci: number, ii: number) => {
    if (ii === 0) return;
    const arr = reorderGroups.map((g) => ({ ...g, items: [...g.items] }));
    [arr[ci].items[ii - 1], arr[ci].items[ii]] = [arr[ci].items[ii], arr[ci].items[ii - 1]];
    setReorderGroups(arr);
  };
  const moveItemDown = (ci: number, ii: number) => {
    if (ii === reorderGroups[ci].items.length - 1) return;
    const arr = reorderGroups.map((g) => ({ ...g, items: [...g.items] }));
    [arr[ci].items[ii], arr[ci].items[ii + 1]] = [arr[ci].items[ii + 1], arr[ci].items[ii]];
    setReorderGroups(arr);
  };
  const moveItemToCategory = (tgtCatName: string) => {
    if (!movingItem) return;
    const { catIdx: sc, itemIdx: si } = movingItem;
    const arr = reorderGroups.map((g) => ({ ...g, items: [...g.items] }));
    const [moved] = arr[sc].items.splice(si, 1);
    const ti = arr.findIndex((g) => g.name === tgtCatName);
    if (ti >= 0) arr[ti].items.push(moved);
    setReorderGroups(arr);
    setMovingItem(null);
  };

  // ドラッグ
  const onCatDragStart = (e: React.DragEvent, i: number) => { dragRef.current = { type: 'cat', catIdx: i }; e.dataTransfer.effectAllowed = 'move'; };
  const onCatDragOver = (e: React.DragEvent, i: number) => { e.preventDefault(); if (dragRef.current?.type !== 'cat') return; setDropTarget({ catIdx: i }); };
  const onCatDrop = (e: React.DragEvent, ti: number) => {
    e.preventDefault();
    if (dragRef.current?.type !== 'cat') return;
    const si = dragRef.current.catIdx;
    if (si !== ti) {
      const arr = [...reorderGroups];
      const [moved] = arr.splice(si, 1);
      arr.splice(ti > si ? ti - 1 : ti, 0, moved);
      setReorderGroups(arr);
    }
    dragRef.current = null; setDropTarget(null);
  };
  const onItemDragStart = (e: React.DragEvent, ci: number, ii: number) => { e.stopPropagation(); dragRef.current = { type: 'item', catIdx: ci, itemIdx: ii }; e.dataTransfer.effectAllowed = 'move'; };
  const onItemDragOver = (e: React.DragEvent, ci: number, ii: number) => { e.preventDefault(); e.stopPropagation(); if (dragRef.current?.type !== 'item') return; setDropTarget({ catIdx: ci, itemIdx: ii }); };
  const onItemDrop = (e: React.DragEvent, tci: number, tii: number) => {
    e.preventDefault(); e.stopPropagation();
    if (dragRef.current?.type !== 'item') return;
    const { catIdx: sc, itemIdx: si } = dragRef.current;
    if (si === undefined) return;
    const arr = reorderGroups.map((g) => ({ ...g, items: [...g.items] }));
    const [moved] = arr[sc].items.splice(si, 1);
    const insertAt = sc === tci && tii > si ? tii - 1 : tii;
    arr[tci].items.splice(insertAt, 0, moved);
    setReorderGroups(arr);
    dragRef.current = null; setDropTarget(null);
  };
  const onDragEnd = () => { dragRef.current = null; setDropTarget(null); };

  if (loading) return <div className="p-8">読み込み中...</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      {upgradeMessage && <UpgradeModal message={upgradeMessage} onClose={() => setUpgradeMessage(null)} />}
      <div className="max-w-4xl mx-auto p-4 sm:p-8">
        <div className="mb-6 flex items-center justify-between">
          <Link href="/" className="text-amber-600 hover:text-amber-700">← ダッシュボードに戻る</Link>
          <Link
            href="/help/ingredients"
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-amber-600 px-2.5 py-1.5 rounded-lg hover:bg-amber-50 transition-colors border border-gray-200 hover:border-amber-200"
          >
            <span>？</span>
            <span>使い方</span>
          </Link>
        </div>
        <h1 className="text-2xl sm:text-4xl font-bold mb-6 sm:mb-8">{pageTitle}</h1>

        {/* ===== 手動追加フォーム ===== */}
        <div className="bg-white rounded-xl shadow p-4 sm:p-5 mb-4 sm:mb-6">
          <h2 className="text-sm font-bold mb-3 text-gray-600">✏️ 手動で1件追加</h2>
          <form onSubmit={handleSubmit}>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text" value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="食材名" required
                className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-400"
              />
              <select
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                className="w-full sm:w-28 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-400"
              >
                <option value="g">グラム (g)</option>
                <option value="ml">ml</option>
              </select>
              <input
                type="number" step="0.001" value={formData.costPerUnit}
                onChange={(e) => setFormData({ ...formData, costPerUnit: e.target.value })}
                placeholder="単価（円）" required
                className="w-full sm:w-32 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-400"
              />
              <input
                type="text" value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                placeholder="カテゴリー（任意）"
                className="w-full sm:w-36 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-400"
              />
              <button type="submit" disabled={submitting}
                className="bg-amber-500 text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-amber-600 disabled:bg-gray-400 whitespace-nowrap">
                {submitting ? '登録中…' : '登録する'}
              </button>
            </div>
          </form>
        </div>

        {/* ===== 一覧 ===== */}
        <div className="bg-white rounded-xl shadow p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-baseline gap-2">
              <h2 className="text-base font-bold sm:text-xl">登録済み{pageTitle}</h2>
              <span className="text-sm text-gray-400">{ingredients.length}件</span>
            </div>
            {ingredients.length > 0 && !reorderMode && (
              <button onClick={enterReorderMode}
                className="text-xs text-amber-600 hover:text-amber-700 hover:bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-400 hover:border-amber-400 transition font-medium">
                編集
              </button>
            )}
          </div>

          {ingredients.length === 0 ? (
            <p className="text-gray-500 text-sm">まだ登録されていません</p>
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
                  const isCatDrop = dropTarget?.catIdx === catIdx && dropTarget.itemIdx === undefined;
                  const isEditingCat = editingCatIdx === catIdx;
                  return (
                    <div key={catIdx}
                      draggable={!isEditingCat}
                      onDragStart={(e) => !isEditingCat && onCatDragStart(e, catIdx)}
                      onDragOver={(e) => onCatDragOver(e, catIdx)}
                      onDrop={(e) => onCatDrop(e, catIdx)}
                      onDragEnd={onDragEnd}
                      className={`border-2 rounded-xl overflow-hidden transition-all ${isCatDrop ? 'border-amber-400 shadow-md' : 'border-gray-200'}`}>
                      {/* カテゴリーヘッダー */}
                      <div className="flex items-center gap-1.5 px-3 py-2 bg-gray-50 border-b border-gray-200">
                        <span className="text-gray-400 text-lg select-none cursor-grab shrink-0">⠿</span>
                        {isEditingCat ? (
                          <input autoFocus value={editingCatName}
                            onChange={(e) => setEditingCatName(e.target.value)}
                            onBlur={saveCatName}
                            onKeyDown={(e) => { if (e.key === 'Enter') saveCatName(); if (e.key === 'Escape') setEditingCatIdx(null); }}
                            className="flex-1 text-sm font-semibold border border-amber-400 rounded-md px-2 py-0.5 bg-white focus:outline-none" />
                        ) : (
                          <span className="font-semibold text-sm text-gray-700 flex-1 truncate">🏷 {group.name}</span>
                        )}
                        <span className="text-xs text-gray-400 shrink-0">{group.items.length}件</span>
                        <button onClick={() => isEditingCat ? saveCatName() : startCatEdit(catIdx)}
                          className="p-1 text-gray-400 hover:text-amber-500 transition shrink-0" title="カテゴリー名を変更">
                          {isEditingCat ? '✓' : '✏️'}
                        </button>
                        <button onClick={() => moveCatUp(catIdx)} disabled={catIdx === 0}
                          className="p-1 text-gray-400 hover:text-amber-500 disabled:opacity-20 transition shrink-0 text-base leading-none">↑</button>
                        <button onClick={() => moveCatDown(catIdx)} disabled={catIdx === reorderGroups.length - 1}
                          className="p-1 text-gray-400 hover:text-amber-500 disabled:opacity-20 transition shrink-0 text-base leading-none">↓</button>
                      </div>
                      {/* アイテムリスト */}
                      <div className="divide-y divide-gray-100">
                        {group.items.map((item, itemIdx) => {
                          const isItemDrop = dropTarget?.catIdx === catIdx && dropTarget.itemIdx === itemIdx;
                          return (
                            <div key={item.id} draggable
                              onDragStart={(e) => onItemDragStart(e, catIdx, itemIdx)}
                              onDragOver={(e) => onItemDragOver(e, catIdx, itemIdx)}
                              onDrop={(e) => onItemDrop(e, catIdx, itemIdx)}
                              onDragEnd={onDragEnd}
                              className={`flex items-center gap-1.5 px-3 py-2.5 transition-colors ${isItemDrop ? 'bg-amber-100' : 'bg-white hover:bg-gray-50'}`}>
                              <span className="text-gray-300 select-none cursor-grab shrink-0">⠿</span>
                              <span className="flex-1 text-sm truncate min-w-0">{item.name}</span>
                              <span className="text-xs text-gray-400 shrink-0">{item.costPerUnit.toFixed(2)}円/{item.unit}</span>
                              <button onClick={() => moveItemUp(catIdx, itemIdx)} disabled={itemIdx === 0}
                                className="p-1 text-gray-300 hover:text-amber-500 disabled:opacity-20 transition shrink-0 text-base leading-none">↑</button>
                              <button onClick={() => moveItemDown(catIdx, itemIdx)} disabled={itemIdx === group.items.length - 1}
                                className="p-1 text-gray-300 hover:text-amber-500 disabled:opacity-20 transition shrink-0 text-base leading-none">↓</button>
                              <button onClick={() => setMovingItem({ catIdx, itemIdx })}
                                className="p-1 text-gray-300 hover:text-amber-500 transition shrink-0 text-sm">📁</button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex gap-3 mb-3">
                <button onClick={saveReorder} disabled={reorderSaving}
                  className="flex-1 bg-amber-500 text-white py-2.5 rounded-xl font-semibold hover:bg-amber-600 disabled:bg-gray-300 text-sm">
                  {reorderSaving ? '保存中…' : '✓ 並び順を保存する'}
                </button>
                <button onClick={cancelReorder} disabled={reorderSaving}
                  className="px-4 py-2.5 border rounded-xl text-gray-600 hover:bg-gray-50 text-sm">
                  キャンセル
                </button>
              </div>
              {/* 全件削除 */}
              <button
                onClick={async () => {
                  if (!confirm(`${pageTitle}の${ingredients.length}件をすべて削除しますか？`)) return;
                  await fetch(`/api/ingredients?type=${type}`, { method: 'DELETE' });
                  await fetchIngredients();
                  setReorderMode(false);
                  setSelectedCategory(null);
                }}
                disabled={reorderSaving}
                className="w-full py-2 text-xs text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl border border-red-200 hover:border-red-300 transition disabled:opacity-30"
              >
                🗑️ 全件削除（{ingredients.length}件すべて削除）
              </button>

              {/* カテゴリー移動モーダル */}
              {movingItem && (
                <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-4"
                  onClick={() => setMovingItem(null)}>
                  <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden"
                    onClick={(e) => e.stopPropagation()}>
                    <div className="px-4 py-3 border-b bg-gray-50">
                      <p className="font-semibold text-sm text-gray-800">カテゴリーを移動</p>
                      <p className="text-xs text-gray-500 mt-0.5 truncate">
                        「{reorderGroups[movingItem.catIdx]?.items[movingItem.itemIdx]?.name}」
                      </p>
                    </div>
                    <div className="divide-y max-h-72 overflow-y-auto">
                      {reorderGroups.map((group, gi) => (
                        <button key={gi} onClick={() => moveItemToCategory(group.name)}
                          disabled={gi === movingItem.catIdx}
                          className={`w-full text-left px-4 py-3 text-sm transition ${gi === movingItem.catIdx ? 'bg-amber-50 text-amber-600 font-semibold cursor-default' : 'hover:bg-gray-50 text-gray-700'}`}>
                          🏷 {group.name}
                          {gi === movingItem.catIdx && <span className="ml-2 text-xs font-normal text-blue-400">← 現在</span>}
                          <span className="float-right text-xs text-gray-400">{group.items.length}件</span>
                        </button>
                      ))}
                    </div>
                    <div className="p-3 bg-gray-50">
                      <button onClick={() => setMovingItem(null)}
                        className="w-full py-2 border rounded-xl text-sm text-gray-600 hover:bg-gray-100 transition">
                        キャンセル
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            /* ===== 通常表示 ===== */
            <>
              {/* カテゴリーフィルター */}
              {categories.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-2 mb-4 -mx-1 px-1">
                  <button onClick={() => setSelectedCategory(null)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition ${selectedCategory === null ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                    全て ({ingredients.length})
                  </button>
                  {categories.map(({ name, count }) => (
                    <button key={name} onClick={() => setSelectedCategory(selectedCategory === name ? null : name)}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition ${selectedCategory === name ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                      {name} ({count})
                    </button>
                  ))}
                </div>
              )}

              <div className="space-y-4">
                {groupedDisplayItems.map((group) => (
                  <div key={group.name} className="border border-gray-200 rounded-xl overflow-hidden">
                    <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 border-b border-gray-200">
                      <span className="font-semibold text-sm text-gray-700">🏷 {group.name}</span>
                      <span className="text-xs text-gray-400">{group.items.length}件</span>
                    </div>
                    <div className="divide-y divide-gray-100">
                      {group.items.map((item) => {
                        const isEditing = editingId === item.id;
                        if (isEditing && editDraft) {
                          return (
                            <div key={item.id} className="px-4 py-3 bg-amber-50">
                              <div className="flex flex-col sm:flex-row gap-2 mb-2">
                                <input autoFocus value={editDraft.name}
                                  onChange={(e) => setEditDraft({ ...editDraft, name: e.target.value })}
                                  className="flex-1 text-sm border rounded-lg px-3 py-1.5 focus:border-amber-400 focus:outline-none bg-white"
                                  placeholder="食材名" />
                                <select value={editDraft.unit}
                                  onChange={(e) => setEditDraft({ ...editDraft, unit: e.target.value })}
                                  className="w-full sm:w-24 text-sm border rounded-lg px-2 py-1.5 focus:outline-none focus:border-amber-400 bg-white">
                                  <option value="g">g</option>
                                  <option value="ml">ml</option>
                                </select>
                                <div className="flex items-center gap-1">
                                  <input type="number" step="0.001" value={editDraft.costPerUnit}
                                    onChange={(e) => setEditDraft({ ...editDraft, costPerUnit: e.target.value })}
                                    className="w-28 border rounded-lg px-2 py-1.5 text-sm text-right focus:outline-none focus:border-amber-400 bg-white" />
                                  <span className="text-xs text-gray-400">円/{editDraft.unit}</span>
                                </div>
                                <input value={editDraft.category}
                                  onChange={(e) => setEditDraft({ ...editDraft, category: e.target.value })}
                                  placeholder="カテゴリー"
                                  className="w-full sm:w-32 text-sm border rounded-lg px-2 py-1.5 focus:outline-none focus:border-amber-400 bg-white" />
                              </div>
                              <div className="flex gap-2">
                                <button onClick={saveEdit} disabled={editSaving}
                                  className="flex-1 bg-amber-500 text-white py-1.5 rounded-lg text-sm font-semibold hover:bg-amber-600 disabled:bg-gray-300">
                                  {editSaving ? '…' : '保存'}
                                </button>
                                <button onClick={cancelEdit} disabled={editSaving}
                                  className="px-3 py-1.5 rounded-lg text-sm border bg-white text-gray-600 hover:bg-gray-50">取消</button>
                                <button onClick={() => deleteItem(item.id)} disabled={editSaving}
                                  className="px-2 py-1.5 rounded-lg text-sm text-red-300 hover:text-red-500 hover:bg-red-50 disabled:opacity-30">🗑️</button>
                              </div>
                            </div>
                          );
                        }
                        return (
                          <div key={item.id} className="flex items-center gap-2 px-4 py-3 hover:bg-gray-50 transition group">
                            <div className="flex-1 min-w-0">
                              <span className="text-sm font-medium">{item.name}</span>
                            </div>
                            <span className="text-sm font-semibold text-amber-600 shrink-0">
                              {item.costPerUnit.toFixed(2)}円/{item.unit}
                            </span>
                            <span className="text-xs text-gray-400 shrink-0 hidden sm:inline">
                              更新: {new Date(item.lastUpdated).toLocaleDateString('ja-JP')}
                            </span>
                            <button onClick={() => startEdit(item)} disabled={editingId !== null}
                              className="text-gray-300 hover:text-amber-500 disabled:opacity-20 p-1 shrink-0 transition-colors opacity-0 group-hover:opacity-100"
                              title="編集">✏️</button>
                            <button onClick={() => deleteItem(item.id)} disabled={editingId !== null}
                              className="text-gray-300 hover:text-red-400 disabled:opacity-20 p-1 shrink-0 transition-colors opacity-0 group-hover:opacity-100"
                              title="削除">🗑️</button>
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

export default function IngredientsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center"><p className="text-gray-400">読み込み中…</p></div>}>
      <IngredientsContent />
    </Suspense>
  );
}
