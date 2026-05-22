'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Ingredient {
  id: string;
  name: string;
  unit: string;
  costPerUnit: number;
  lastUpdated: string;
}

export default function IngredientsPage() {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    unit: 'g',
    costPerUnit: '',
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchIngredients();
  }, []);

  const fetchIngredients = async () => {
    try {
      const response = await fetch('/api/ingredients');
      if (response.ok) {
        const data = await response.json();
        setIngredients(data);
      }
    } catch (error) {
      console.error('Error fetching ingredients:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.costPerUnit) return;

    setSubmitting(true);
    try {
      const response = await fetch('/api/ingredients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          unit: formData.unit,
          costPerUnit: parseFloat(formData.costPerUnit),
        }),
      });

      if (response.ok) {
        setFormData({ name: '', unit: 'g', costPerUnit: '' });
        await fetchIngredients();
      }
    } catch (error) {
      console.error('Error creating ingredient:', error);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="p-8">読み込み中...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto p-8">
        <div className="mb-8">
          <Link href="/" className="text-blue-600 hover:text-blue-700">
            ← ダッシュボードに戻る
          </Link>
        </div>

        <h1 className="text-4xl font-bold mb-8">食材・調味料管理</h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Add Ingredient Form */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold mb-4">新規食材登録</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-2">食材名</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="例：鶏もも肉"
                  className="w-full border rounded px-3 py-2"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">単位</label>
                <select
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                >
                  <option value="g">グラム (g)</option>
                  <option value="ml">ミリリットル (ml)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">単価（円/{formData.unit}）</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.costPerUnit}
                  onChange={(e) => setFormData({ ...formData, costPerUnit: e.target.value })}
                  placeholder="例：1"
                  className="w-full border rounded px-3 py-2"
                  required
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

          {/* Ingredients List */}
          <div className="md:col-span-2">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-2xl font-bold mb-4">登録済み食材（{ingredients.length}件）</h2>
              {ingredients.length === 0 ? (
                <p className="text-gray-500">食材がまだ登録されていません</p>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {ingredients.map((ingredient) => (
                    <div key={ingredient.id} className="p-3 border rounded hover:bg-gray-50">
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="font-semibold">{ingredient.name}</div>
                          <div className="text-sm text-gray-600">
                            ¥{ingredient.costPerUnit.toFixed(2)}/{ingredient.unit}
                          </div>
                        </div>
                        <div className="text-xs text-gray-500">
                          更新: {new Date(ingredient.lastUpdated).toLocaleDateString('ja-JP')}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
