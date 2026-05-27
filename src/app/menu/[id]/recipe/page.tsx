'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

interface Ingredient {
  id: string;
  name: string;
  unit: string;
  costPerUnit: number;
}

interface RecipeItem {
  id: string;
  ingredient: Ingredient;
  quantity: number;
}

interface MenuItem {
  id: string;
  name: string;
  sellingPrice: number;
  recipeItems: RecipeItem[];
}

export default function RecipePage() {
  const params = useParams();
  const menuId = params.id as string;
  const [menuItem, setMenuItem] = useState<MenuItem | null>(null);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIngredient, setSelectedIngredient] = useState('');
  const [quantity, setQuantity] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    Promise.all([fetchMenuItems(), fetchIngredients()]).finally(() => setLoading(false));
  }, []);

  const fetchMenuItems = async () => {
    try {
      const res = await fetch('/api/menu-items');
      if (res.ok) {
        const data = await res.json();
        setMenuItem(data.find((m: MenuItem) => m.id === menuId));
      }
    } catch (e) { console.error(e); }
  };

  const fetchIngredients = async () => {
    try {
      const res = await fetch('/api/ingredients');
      if (res.ok) setIngredients(await res.json());
    } catch (e) { console.error(e); }
  };

  const handleAddIngredient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIngredient || !quantity) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ menuItemId: menuId, ingredientId: selectedIngredient, quantity: parseFloat(quantity) }),
      });
      if (res.ok) { setSelectedIngredient(''); setQuantity(''); await fetchMenuItems(); }
    } finally { setSubmitting(false); }
  };

  if (loading) return <div className="p-6 text-gray-500">読み込み中...</div>;
  if (!menuItem) return <div className="p-6 text-gray-500">メニューが見つかりません</div>;

  const totalCost = menuItem.recipeItems.reduce(
    (sum, item) => sum + item.ingredient.costPerUnit * item.quantity, 0
  );
  const profit = menuItem.sellingPrice - totalCost;
  const profitMargin = (profit / menuItem.sellingPrice) * 100;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-6 sm:px-8 sm:py-8">

        <div className="mb-4 flex items-center justify-between">
          <Link href="/menu" className="text-amber-600 hover:text-amber-700 text-sm">
            ← メニュー管理に戻る
          </Link>
          <Link
            href="/help/recipe"
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-amber-600 px-2.5 py-1.5 rounded-lg hover:bg-amber-50 transition-colors border border-gray-200 hover:border-amber-200"
          >
            <span>？</span>
            <span>使い方</span>
          </Link>
        </div>

        <h1 className="text-2xl font-bold sm:text-4xl">{menuItem.name}</h1>
        <p className="text-gray-500 text-sm mt-1 mb-5 sm:mb-8">
          販売価格: ¥{menuItem.sellingPrice.toLocaleString()}
        </p>

        {/* 利益サマリー (スマホでは先に表示) */}
        <div className="bg-white rounded-xl shadow p-4 sm:p-6 mb-4 sm:mb-0">
          <h2 className="text-base font-bold mb-3 sm:text-2xl sm:mb-4">利益計算</h2>
          <div className="grid grid-cols-2 gap-3 sm:block sm:space-y-3">
            <div className="bg-gray-50 rounded-lg p-3 sm:bg-transparent sm:p-0 sm:flex sm:justify-between sm:items-center">
              <span className="text-xs text-gray-500 block sm:text-base sm:text-gray-600">販売価格</span>
              <span className="text-base font-bold sm:font-bold">¥{menuItem.sellingPrice.toLocaleString()}</span>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 sm:bg-transparent sm:p-0 sm:flex sm:justify-between sm:items-center">
              <span className="text-xs text-gray-500 block sm:text-base sm:text-gray-600">原価</span>
              <span className="text-base font-bold">¥{totalCost.toFixed(0)}</span>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 col-span-2 sm:bg-transparent sm:p-0 sm:border-t sm:pt-3 sm:flex sm:justify-between sm:items-center">
              <span className="text-xs text-gray-500 block sm:text-lg sm:font-semibold sm:text-gray-800">利益</span>
              <span className={`text-2xl font-bold ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                ¥{profit.toFixed(0)}
              </span>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 col-span-2 sm:bg-transparent sm:p-0 sm:flex sm:justify-between sm:items-center">
              <span className="text-xs text-gray-500 block sm:text-base sm:text-gray-600">利益率</span>
              <span className={`text-xl font-bold ${profitMargin >= 30 ? 'text-green-600' : 'text-orange-500'}`}>
                {profitMargin.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 sm:mt-8">
          {/* 食材追加フォーム */}
          <div className="bg-white rounded-xl shadow p-4 sm:p-6 md:order-1 order-2">
            <h2 className="text-base font-bold mb-3 sm:text-2xl sm:mb-4">食材を追加</h2>
            <form onSubmit={handleAddIngredient} className="space-y-3">
              <div>
                <label className="block text-sm font-semibold mb-1">食材・調味料</label>
                <select
                  value={selectedIngredient}
                  onChange={(e) => setSelectedIngredient(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2.5 text-sm"
                  required
                >
                  <option value="">選択してください</option>
                  {ingredients.map((ing) => (
                    <option key={ing.id} value={ing.id}>
                      {ing.name} (¥{ing.costPerUnit.toFixed(2)}/{ing.unit})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">数量 (g/ml)</label>
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="例：100"
                  className="w-full border rounded-lg px-3 py-2.5 text-sm"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-amber-500 text-white py-2.5 rounded-lg font-semibold text-sm hover:bg-amber-600 active:bg-amber-700 disabled:bg-gray-300"
              >
                {submitting ? '追加中...' : '追加する'}
              </button>
            </form>
          </div>

          {/* レシピ明細 */}
          <div className="bg-white rounded-xl shadow p-4 sm:p-6 md:order-2 order-1">
            <h2 className="text-base font-bold mb-3 sm:text-2xl sm:mb-4">
              レシピ明細（{menuItem.recipeItems.length}件）
            </h2>
            {menuItem.recipeItems.length === 0 ? (
              <p className="text-gray-400 text-sm">食材がまだ追加されていません</p>
            ) : (
              /* スマホ: カードリスト / PC: テーブル */
              <>
                {/* スマホ */}
                <div className="space-y-2 sm:hidden">
                  {menuItem.recipeItems.map((item) => (
                    <div key={item.id} className="flex justify-between items-center py-2 border-b last:border-0">
                      <div>
                        <div className="text-sm font-medium">{item.ingredient.name}</div>
                        <div className="text-xs text-gray-400">
                          {item.quantity}{item.ingredient.unit} × ¥{item.ingredient.costPerUnit.toFixed(2)}
                        </div>
                      </div>
                      <div className="text-sm font-semibold text-gray-700">
                        ¥{(item.ingredient.costPerUnit * item.quantity).toFixed(0)}
                      </div>
                    </div>
                  ))}
                </div>
                {/* PC */}
                <div className="hidden sm:block overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-100 border-b">
                      <tr>
                        <th className="px-4 py-2 text-left">食材名</th>
                        <th className="px-4 py-2 text-right">数量</th>
                        <th className="px-4 py-2 text-left">単位</th>
                        <th className="px-4 py-2 text-right">単価</th>
                        <th className="px-4 py-2 text-right">小計</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {menuItem.recipeItems.map((item) => (
                        <tr key={item.id} className="hover:bg-gray-50">
                          <td className="px-4 py-2">{item.ingredient.name}</td>
                          <td className="px-4 py-2 text-right">{item.quantity}</td>
                          <td className="px-4 py-2">{item.ingredient.unit}</td>
                          <td className="px-4 py-2 text-right">¥{item.ingredient.costPerUnit.toFixed(2)}</td>
                          <td className="px-4 py-2 text-right font-semibold">
                            ¥{(item.ingredient.costPerUnit * item.quantity).toFixed(0)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
