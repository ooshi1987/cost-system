'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';

interface RecipeIngredient {
  id: string;
  name: string;
  unit: string;
  costPerUnit: number;
  priceSource: string;
}

interface RecipeItem {
  id: string;
  quantity: number;
  ingredient: RecipeIngredient;
}

interface MenuItem {
  id: string;
  name: string;
  sellingPrice: number;
  category?: string;
  recipeItems: RecipeItem[];
}

interface Props {
  menuItems: MenuItem[];
  categoryOrder: string[];
  targetCostRate: number;
}

function ingredientBadge(ing: RecipeIngredient): { text: string; cls: string } {
  if (ing.priceSource === 'delivery') return { text: `仕入連動・¥${ing.costPerUnit.toFixed(2)}/${ing.unit}`, cls: 'bg-green-50 text-green-700' };
  if (ing.priceSource === 'manual') return { text: `手入力単価・¥${ing.costPerUnit.toFixed(2)}/${ing.unit}`, cls: 'bg-gray-100 text-gray-600' };
  return { text: '⚠ 単価未連動', cls: 'bg-amber-100 text-amber-700' };
}

export default function RecipesClient({ menuItems, categoryOrder, targetCostRate }: Props) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  const categories = useMemo(() => {
    const counts: Record<string, number> = {};
    menuItems.forEach((item) => {
      const cat = item.category || 'その他';
      counts[cat] = (counts[cat] || 0) + 1;
    });
    const allCats = Object.entries(counts).map(([name, count]) => ({ name, count }));
    if (categoryOrder.length === 0) return allCats.sort((a, b) => b.count - a.count);
    const ordered: typeof allCats = [];
    const seen = new Set<string>();
    for (const name of categoryOrder) {
      const found = allCats.find((c) => c.name === name);
      if (found) { ordered.push(found); seen.add(name); }
    }
    for (const cat of allCats) { if (!seen.has(cat.name)) ordered.push(cat); }
    return ordered;
  }, [menuItems, categoryOrder]);

  const groupedItems = useMemo(() => {
    const targetItems = selectedCategory
      ? menuItems.filter((item) => (item.category || 'その他') === selectedCategory)
      : menuItems;
    const map = new Map<string, MenuItem[]>();
    for (const item of targetItems) {
      const cat = item.category || 'その他';
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(item);
    }
    const result: { name: string; items: MenuItem[] }[] = [];
    const seen = new Set<string>();
    for (const name of categoryOrder) {
      if (map.has(name)) { result.push({ name, items: map.get(name)! }); seen.add(name); }
    }
    for (const [name, its] of map) { if (!seen.has(name)) result.push({ name, items: its }); }
    return result;
  }, [menuItems, selectedCategory, categoryOrder]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-4 sm:p-8">
        <div className="mb-6 flex items-center justify-between">
          <Link href="/dashboard" className="text-amber-600 hover:text-amber-700">← ダッシュボードに戻る</Link>
        </div>
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-4xl font-bold mb-1">レシピ</h1>
          <p className="text-gray-500 text-sm">メニューをタップすると材料・数量・原価率がその場で開きます。取り込んだレシピもここで確認できます。</p>
        </div>

        <Link
          href="/menu/import"
          className="block bg-white rounded-lg shadow p-4 sm:p-5 mb-6 border-2 border-dashed border-amber-300 hover:border-amber-400 hover:bg-amber-50 transition"
        >
          <div className="flex items-center gap-2">
            <span className="text-xl">📷</span>
            <span><span className="font-semibold text-amber-600">原価表・レシピ表を撮影で取込</span><span className="text-gray-400 block text-xs mt-0.5">PDF・画像をアップロードすると、AIが読み取ってここに反映されます</span></span>
          </div>
        </Link>

        <div className="bg-white rounded-xl shadow p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-baseline gap-2">
              <h2 className="text-base font-bold sm:text-xl">レシピ一覧</h2>
              <span className="text-sm text-gray-400">{menuItems.length}件</span>
            </div>
          </div>

          {menuItems.length === 0 ? (
            <p className="text-gray-500 text-sm">メニューがまだ登録されていません。上の「撮影で取込」か、<Link href="/menu" className="text-amber-600 hover:underline">メニュー管理</Link>から登録してください。</p>
          ) : (
            <>
              <div className="flex gap-2 overflow-x-auto pb-2 mb-4 -mx-1 px-1">
                <button onClick={() => setSelectedCategory(null)} className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition ${selectedCategory === null ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>全て ({menuItems.length})</button>
                {categories.map(({ name, count }) => (
                  <button key={name} onClick={() => setSelectedCategory(selectedCategory === name ? null : name)} className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition ${selectedCategory === name ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{name} ({count})</button>
                ))}
              </div>

              <div className="space-y-4">
                {groupedItems.map((group) => (
                  <div key={group.name} className="border border-gray-200 rounded-xl overflow-hidden">
                    <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 border-b border-gray-200">
                      <span className="font-semibold text-sm text-gray-700">🏷 {group.name}</span>
                      <span className="text-xs text-gray-400">{group.items.length}件</span>
                    </div>
                    <div className="divide-y divide-gray-100">
                      {group.items.map((item) => {
                        const totalCost = item.recipeItems.reduce((s, r) => s + r.ingredient.costPerUnit * r.quantity, 0);
                        const costRate = item.sellingPrice > 0 && item.recipeItems.length > 0 ? (totalCost / item.sellingPrice) * 100 : null;
                        const unlinkedCount = item.recipeItems.filter((r) => r.ingredient.priceSource === 'unset').length;
                        const badgeColor = costRate === null ? 'bg-gray-100 text-gray-400' :
                          unlinkedCount > 0 ? 'bg-amber-100 text-amber-700' :
                          costRate <= targetCostRate ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700';
                        const isOpen = openId === item.id;
                        return (
                          <div key={item.id}>
                            <button
                              onClick={() => setOpenId(isOpen ? null : item.id)}
                              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition text-left"
                            >
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium truncate">{item.name}</div>
                                <div className="text-xs text-gray-400 mt-0.5">
                                  ¥{item.sellingPrice.toLocaleString()}
                                  {item.recipeItems.length > 0 && (
                                    <> · 材料費 ¥{totalCost.toFixed(0)}{unlinkedCount > 0 && <> · <span className="text-amber-500">未連動{unlinkedCount}件</span></>}</>
                                  )}
                                </div>
                              </div>
                              <div className={`shrink-0 text-xs font-bold px-2 py-1 rounded-full ${badgeColor}`}>
                                {costRate !== null ? `${costRate.toFixed(1)}%${unlinkedCount > 0 ? '※' : ''}` : 'レシピ未登録'}
                              </div>
                              <span className="text-gray-300 shrink-0">{isOpen ? '▲' : '▼'}</span>
                            </button>

                            {isOpen && (
                              <div className="px-4 pb-4 bg-gray-50/60">
                                {item.recipeItems.length === 0 ? (
                                  <p className="text-xs text-gray-400 py-2">材料がまだ登録されていません。</p>
                                ) : (
                                  <div className="space-y-1.5 pt-1">
                                    {item.recipeItems.map((ri) => {
                                      const badge = ingredientBadge(ri.ingredient);
                                      const lineCost = ri.ingredient.costPerUnit * ri.quantity;
                                      return (
                                        <div key={ri.id} className="flex items-center justify-between bg-white rounded-lg border border-gray-100 px-3 py-2 text-xs">
                                          <div className="min-w-0">
                                            <div className="font-medium truncate">{ri.ingredient.name} <span className="text-gray-400 font-normal">{ri.quantity}{ri.ingredient.unit}</span></div>
                                            <div className={`mt-1 inline-block px-2 py-0.5 rounded-full ${badge.cls}`}>{badge.text}</div>
                                          </div>
                                          <div className="font-semibold text-gray-700 shrink-0 ml-2">¥{lineCost.toFixed(0)}</div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                                <Link href={`/menu/${item.id}/recipe`} className="mt-2 inline-block text-xs text-amber-600 hover:underline">
                                  材料を編集する →
                                </Link>
                              </div>
                            )}
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
