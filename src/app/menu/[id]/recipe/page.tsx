'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

// ─── Types ───────────────────────────────────────────────

interface DeliverySlipRef { createdAt: string; vendor: string | null }
interface DeliveryItemRef { deliverySlip: DeliverySlipRef }

interface IngredientWithLinkage {
  id: string;
  name: string;
  unit: string;
  costPerUnit: number;
  category: string | null;
  priceSource: string;
  deliveryItems: DeliveryItemRef[];
}

interface RecipeItemFull {
  id: string;
  ingredient: IngredientWithLinkage;
  quantity: number;
}

interface MenuItemBasic {
  id: string;
  name: string;
  sellingPrice: number;
}

interface IngredientBasic {
  id: string;
  name: string;
  unit: string;
  costPerUnit: number;
}

// ─── Linkage helpers ─────────────────────────────────────

type LinkageStatus = 'linked' | 'manual' | 'unlinked';

function getLinkageStatus(ing: IngredientWithLinkage): LinkageStatus {
  if (ing.priceSource === 'delivery') return 'linked';
  if (ing.priceSource === 'manual') return 'manual';
  return 'unlinked';
}

function getLinkageBadge(ing: IngredientWithLinkage): { status: LinkageStatus; text: string } {
  const status = getLinkageStatus(ing);
  if (status === 'linked') {
    const slip = ing.deliveryItems[0]?.deliverySlip;
    const dateStr = slip?.createdAt ? new Date(slip.createdAt).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' }) : '';
    const vendorStr = slip?.vendor ? `${slip.vendor} ` : '';
    return { status, text: `仕入連動 ${vendorStr}${dateStr}・¥${ing.costPerUnit.toFixed(2)}/${ing.unit}` };
  }
  if (status === 'manual') return { status, text: `手入力単価 ¥${ing.costPerUnit.toFixed(2)}/${ing.unit}` };
  return { status, text: '⚠ 単価未連動 — タップで入力' };
}

// ─── Component ───────────────────────────────────────────

export default function RecipePage() {
  const params = useParams();
  const menuId = params.id as string;

  const [menuItem, setMenuItem] = useState<MenuItemBasic | null>(null);
  const [recipeItems, setRecipeItems] = useState<RecipeItemFull[]>([]);
  const [allIngredients, setAllIngredients] = useState<IngredientBasic[]>([]);
  const [targetCostRate, setTargetCostRate] = useState(30);
  const [loading, setLoading] = useState(true);

  // 食材追加フォーム
  const [addIngId, setAddIngId] = useState('');
  const [addQty, setAddQty] = useState('');
  const [addSubmitting, setAddSubmitting] = useState(false);

  // 編集シート（ボトムシート）
  const [editItem, setEditItem] = useState<RecipeItemFull | null>(null);
  const [editQty, setEditQty] = useState('');
  const [editCost, setEditCost] = useState('');
  const [editIngId, setEditIngId] = useState('');
  const [editSaving, setEditSaving] = useState(false);

  const fetchRecipe = useCallback(async () => {
    try {
      const res = await fetch(`/api/recipes?menuItemId=${menuId}`);
      if (res.ok) {
        const data = await res.json();
        setMenuItem(data.menuItem);
        setRecipeItems(data.recipeItems);
        setTargetCostRate(data.targetCostRate ?? 30);
      }
    } catch (e) { console.error(e); }
  }, [menuId]);

  const fetchIngredients = useCallback(async () => {
    try {
      const res = await fetch('/api/ingredients');
      if (res.ok) setAllIngredients(await res.json());
    } catch (e) { console.error(e); }
  }, []);

  useEffect(() => {
    Promise.all([fetchRecipe(), fetchIngredients()]).finally(() => setLoading(false));
  }, [fetchRecipe, fetchIngredients]);

  // ─── 計算 ───────────────────────────────────────────────
  const totalCost = recipeItems.reduce((s, r) => s + r.ingredient.costPerUnit * r.quantity, 0);
  const costRate = menuItem && menuItem.sellingPrice > 0 ? (totalCost / menuItem.sellingPrice) * 100 : 0;
  const unlinkedCount = recipeItems.filter((r) => getLinkageStatus(r.ingredient) === 'unlinked').length;

  const costRateColor =
    unlinkedCount > 0 ? 'text-amber-600' :
    costRate <= targetCostRate ? 'text-green-600' :
    'text-orange-500';

  const barColor =
    unlinkedCount > 0 ? 'bg-amber-400' :
    costRate <= targetCostRate ? 'bg-green-500' :
    'bg-orange-500';

  // ─── 食材追加 ────────────────────────────────────────────
  const handleAddIngredient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addIngId || !addQty) return;
    setAddSubmitting(true);
    try {
      const res = await fetch('/api/recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ menuItemId: menuId, ingredientId: addIngId, quantity: parseFloat(addQty) }),
      });
      if (res.ok) { setAddIngId(''); setAddQty(''); await fetchRecipe(); }
      else { const d = await res.json(); alert(d.error || '追加に失敗しました'); }
    } finally { setAddSubmitting(false); }
  };

  // ─── 編集シート ───────────────────────────────────────────
  const openEdit = (item: RecipeItemFull) => {
    setEditItem(item);
    setEditQty(String(item.quantity));
    setEditCost(String(item.ingredient.costPerUnit));
    setEditIngId(item.ingredient.id);
  };
  const closeEdit = () => { setEditItem(null); setEditSaving(false); };

  const saveEdit = async () => {
    if (!editItem) return;
    setEditSaving(true);
    try {
      const qtyChanged = parseFloat(editQty) !== editItem.quantity;
      const costChanged = parseFloat(editCost) !== editItem.ingredient.costPerUnit;
      const ingChanged = editIngId !== editItem.ingredient.id;

      if (ingChanged) {
        // 食材付け替え: 削除 → 新規作成
        await fetch(`/api/recipes/${editItem.id}`, { method: 'DELETE' });
        await fetch('/api/recipes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ menuItemId: menuId, ingredientId: editIngId, quantity: parseFloat(editQty) }),
        });
      } else {
        if (qtyChanged) {
          await fetch(`/api/recipes/${editItem.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ quantity: parseFloat(editQty) }),
          });
        }
        if (costChanged) {
          const ing = editItem.ingredient;
          await fetch(`/api/ingredients/${ing.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: ing.name, unit: ing.unit, costPerUnit: parseFloat(editCost), category: ing.category }),
          });
        }
      }
      await fetchRecipe();
      closeEdit();
    } catch { alert('保存に失敗しました'); }
    finally { setEditSaving(false); }
  };

  const deleteItem = async () => {
    if (!editItem) return;
    if (!confirm(`「${editItem.ingredient.name}」を削除しますか？`)) return;
    setEditSaving(true);
    try {
      await fetch(`/api/recipes/${editItem.id}`, { method: 'DELETE' });
      await fetchRecipe();
      closeEdit();
    } catch { alert('削除に失敗しました'); }
    finally { setEditSaving(false); }
  };

  // ─── Render ───────────────────────────────────────────────
  if (loading) return <div className="p-6 text-gray-500">読み込み中...</div>;
  if (!menuItem) return <div className="p-6 text-gray-500">メニューが見つかりません</div>;

  const barWidth = Math.min((costRate / (targetCostRate * 2)) * 100, 100);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-6">

        {/* ヘッダー */}
        <div className="mb-4 flex items-center justify-between">
          <Link href="/menu" className="text-amber-600 hover:text-amber-700 text-sm">← メニュー管理に戻る</Link>
          <Link href="/help/recipe" className="flex items-center gap-1 text-xs text-gray-400 hover:text-amber-600 px-2.5 py-1.5 rounded-lg hover:bg-amber-50 transition-colors border border-gray-200 hover:border-amber-200">
            <span>？</span><span>使い方</span>
          </Link>
        </div>

        {/* メニュー名・販売価格 */}
        <div className="mb-4">
          <h1 className="text-2xl font-bold">{menuItem.name}</h1>
          <p className="text-gray-500 text-sm mt-0.5">販売価格: ¥{menuItem.sellingPrice.toLocaleString()}</p>
        </div>

        {/* 要確認バナー */}
        {unlinkedCount > 0 ? (
          <div className="mb-4 flex items-center gap-2 bg-amber-50 border border-amber-300 rounded-xl px-4 py-3 text-sm text-amber-700">
            <span className="text-base">⚠</span>
            <span><span className="font-bold">要確認 {unlinkedCount}件</span> — 仕入と連動できない材料の単価を入力してください</span>
          </div>
        ) : recipeItems.length > 0 ? (
          <div className="mb-4 flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-700">
            <span>✓</span><span>全材料の単価が確定しています</span>
          </div>
        ) : null}

        {/* 原価率カード */}
        <div className="bg-white rounded-xl shadow p-4 mb-4">
          <div className="flex items-baseline gap-3 mb-2">
            <span className={`text-4xl font-bold ${costRateColor}`}>{costRate.toFixed(1)}%</span>
            <span className="text-xs bg-amber-50 text-amber-700 border border-amber-200 rounded-full px-2.5 py-0.5 font-medium">
              材料費 ¥{totalCost.toFixed(0)}
            </span>
          </div>
          <div className="text-xs text-gray-400 mb-2">目標原価率 {targetCostRate}%</div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-500 ${barColor}`} style={{ width: `${barWidth}%` }} />
          </div>
        </div>

        {/* 取込導線 */}
        <Link
          href="/menu/import"
          className="mb-4 flex items-center gap-2 bg-white rounded-xl shadow p-4 border-2 border-dashed border-amber-300 hover:border-amber-400 hover:bg-amber-50 transition text-sm"
        >
          <span className="text-xl">📷</span>
          <span><span className="font-semibold text-amber-600">原価表・レシピ表を撮影で取込</span><span className="text-gray-400 block text-xs mt-0.5">一覧をまとめて撮影すると、複数メニューを自動で振り分けます</span></span>
        </Link>

        {/* レシピ明細 */}
        <div className="bg-white rounded-xl shadow p-4 mb-4">
          <h2 className="text-base font-bold mb-3">レシピ明細（{recipeItems.length}件）</h2>
          {recipeItems.length === 0 ? (
            <p className="text-gray-400 text-sm">食材がまだ追加されていません</p>
          ) : (
            <div className="space-y-1">
              {recipeItems.map((item) => {
                const badge = getLinkageBadge(item.ingredient);
                const isUnlinked = badge.status === 'unlinked';
                const lineCost = item.ingredient.costPerUnit * item.quantity;
                return (
                  <button
                    key={item.id}
                    onClick={() => openEdit(item)}
                    className={`w-full text-left rounded-xl px-3 py-3 border transition hover:shadow-sm ${isUnlinked ? 'bg-amber-50 border-amber-200' : 'bg-white border-gray-100 hover:bg-gray-50'}`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">{item.ingredient.name}</div>
                        <div className="text-xs text-gray-400 mt-0.5">
                          {item.quantity}{item.ingredient.unit}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0 ml-2">
                        <div className="text-sm font-semibold text-gray-700">¥{lineCost.toFixed(0)}</div>
                        <div className="text-xs text-gray-400">›</div>
                      </div>
                    </div>
                    {/* 連動バッジ */}
                    <div className={`mt-1.5 inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${
                      badge.status === 'linked' ? 'bg-green-50 text-green-700' :
                      badge.status === 'manual' ? 'bg-gray-100 text-gray-600' :
                      'bg-amber-100 text-amber-700'
                    }`}>
                      {badge.text}
                    </div>
                  </button>
                );
              })}

              {/* 材料費合計 */}
              <div className="flex justify-between items-center pt-3 border-t border-gray-100 px-1 mt-2">
                <span className="text-sm text-gray-600 font-medium">材料費合計</span>
                <span className="text-base font-bold text-gray-800">¥{totalCost.toFixed(0)}</span>
              </div>
            </div>
          )}
        </div>

        {/* 食材追加フォーム */}
        <div className="bg-white rounded-xl shadow p-4">
          <h2 className="text-sm font-bold text-gray-600 mb-3">✏️ 食材を追加</h2>
          <form onSubmit={handleAddIngredient} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold mb-1 text-gray-600">食材・調味料</label>
              <select
                value={addIngId}
                onChange={(e) => setAddIngId(e.target.value)}
                className="w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-amber-400"
                required
              >
                <option value="">選択してください</option>
                {allIngredients.map((ing) => (
                  <option key={ing.id} value={ing.id}>
                    {ing.name} (¥{ing.costPerUnit.toFixed(2)}/{ing.unit})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1 text-gray-600">数量</label>
              <input
                type="number"
                value={addQty}
                onChange={(e) => setAddQty(e.target.value)}
                placeholder="例：100"
                className="w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-amber-400"
                required
              />
            </div>
            <button
              type="submit"
              disabled={addSubmitting}
              className="w-full bg-amber-500 text-white py-2.5 rounded-lg font-semibold text-sm hover:bg-amber-600 active:bg-amber-700 disabled:bg-gray-300"
            >
              {addSubmitting ? '追加中...' : '追加する'}
            </button>
          </form>
        </div>

      </div>

      {/* 編集ボトムシート */}
      {editItem && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end justify-center" onClick={closeEdit}>
          <div className="bg-white w-full max-w-lg rounded-t-2xl shadow-2xl p-5 pb-8" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-base">明細を編集</h3>
              <button onClick={closeEdit} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
            </div>

            <div className="space-y-4">
              {/* 食材選択 */}
              <div>
                <label className="block text-xs font-semibold mb-1 text-gray-600">食材</label>
                <select
                  value={editIngId}
                  onChange={(e) => setEditIngId(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-amber-400"
                >
                  {allIngredients.map((ing) => (
                    <option key={ing.id} value={ing.id}>{ing.name} ({ing.unit})</option>
                  ))}
                </select>
              </div>

              {/* 分量 */}
              <div>
                <label className="block text-xs font-semibold mb-1 text-gray-600">
                  分量 ({editItem.ingredient.unit})
                </label>
                <input
                  type="number"
                  value={editQty}
                  onChange={(e) => setEditQty(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-amber-400"
                />
              </div>

              {/* 単価（手入力/未連動のみ編集可） */}
              <div>
                <label className="block text-xs font-semibold mb-1 text-gray-600">
                  単価（円/{editItem.ingredient.unit}）
                  {getLinkageStatus(editItem.ingredient) === 'linked' && (
                    <span className="ml-1 text-green-600 font-normal">仕入連動</span>
                  )}
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={editCost}
                  onChange={(e) => setEditCost(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-amber-400"
                />
                {getLinkageStatus(editItem.ingredient) === 'linked' && (
                  <p className="text-xs text-amber-600 mt-1">⚠ 手動変更すると仕入連動が上書きされます</p>
                )}
              </div>

              {/* 小計プレビュー */}
              {editQty && editCost && (
                <div className="text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2">
                  小計: ¥{(parseFloat(editQty) * parseFloat(editCost)).toFixed(0)}
                </div>
              )}
            </div>

            <div className="flex gap-2 mt-5">
              <button onClick={saveEdit} disabled={editSaving} className="flex-1 bg-amber-500 text-white py-3 rounded-xl font-semibold hover:bg-amber-600 disabled:bg-gray-300">
                {editSaving ? '保存中...' : '保存する'}
              </button>
              <button onClick={closeEdit} disabled={editSaving} className="px-4 py-3 border rounded-xl text-gray-600 hover:bg-gray-50">取消</button>
            </div>
            <button onClick={deleteItem} disabled={editSaving} className="w-full mt-2 py-2.5 text-sm text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl border border-red-100 transition">
              この材料を削除
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
