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
      const response = await fetch('/api/menu-items');
      if (response.ok) {
        const data = await response.json();
        const item = data.find((m: MenuItem) => m.id === menuId);
        setMenuItem(item);
      }
    } catch (error) {
      console.error('Error fetching menu item:', error);
    }
  };

  const fetchIngredients = async () => {
    try {
      const response = await fetch('/api/ingredients');
      if (response.ok) {
        const data = await response.json();
        setIngredients(data);
      }
    } catch (error) {
      console.error('Error fetching ingredients:', error);
    }
  };

  const handleAddIngredient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIngredient || !quantity) return;

    setSubmitting(true);
    try {
      const response = await fetch('/api/recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          menuItemId: menuId,
          ingredientId: selectedIngredient,
          quantity: parseFloat(quantity),
        }),
      });

      if (response.ok) {
        setSelectedIngredient('');
        setQuantity('');
        await fetchMenuItems();
      }
    } catch (error) {
      console.error('Error adding recipe item:', error);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="p-8">読み込み中...</div>;
  }

  if (!menuItem) {
    return <div className="p-8">メニューが見つかりません</div>;
  }

  const totalCost = menuItem.recipeItems.reduce(
    (sum, item) => sum + item.ingredient.costPerUnit * item.quantity,
    0
  );
  const profit = menuItem.sellingPrice - totalCost;
  const profitMargin = (profit / menuItem.sellingPrice) * 100;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-8">
        <div className="mb-8">
          <Link href="/menu" className="text-blue-600 hover:text-blue-700">
            ← メニュー管理に戻る
          </Link>
        </div>

        <h1 className="text-4xl font-bold mb-2">{menuItem.name}</h1>
        <p className="text-gray-600 mb-8">販売価格: ¥{menuItem.sellingPrice.toLocaleString()}</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Add Ingredient Form */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold mb-4">食材を追加</h2>
            <form onSubmit={handleAddIngredient} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-2">食材・調味料</label>
                <select
                  value={selectedIngredient}
                  onChange={(e) => setSelectedIngredient(e.target.value)}
                  className="w-full border rounded px-3 py-2"
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
                <label className="block text-sm font-semibold mb-2">数量 (g/ml)</label>
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="例：100"
                  className="w-full border rounded px-3 py-2"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-blue-600 text-white py-2 rounded font-semibold hover:bg-blue-700 disabled:bg-gray-400"
              >
                {submitting ? '追加中...' : '追加する'}
              </button>
            </form>
          </div>

          {/* Cost Summary */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold mb-4">利益計算</h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">販売価格</span>
                <span className="font-bold">¥{menuItem.sellingPrice.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">原価</span>
                <span className="font-bold">¥{totalCost.toFixed(0)}</span>
              </div>
              <div className="border-t pt-4 flex justify-between items-center">
                <span className="text-lg font-semibold">利益</span>
                <span className={`text-2xl font-bold ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  ¥{profit.toFixed(0)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">利益率</span>
                <span className={`text-xl font-bold ${profitMargin >= 30 ? 'text-green-600' : 'text-orange-600'}`}>
                  {profitMargin.toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Recipe Items */}
        <div className="mt-8 bg-white rounded-lg shadow p-6">
          <h2 className="text-2xl font-bold mb-4">レシピ明細</h2>
          {menuItem.recipeItems.length === 0 ? (
            <p className="text-gray-500">食材がまだ追加されていません</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
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
                      <td className="px-4 py-2 text-right">{item.quantity.toLocaleString()}</td>
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
          )}
        </div>
      </div>
    </div>
  );
}
