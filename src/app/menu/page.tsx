'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface MenuItem {
  id: string;
  name: string;
  sellingPrice: number;
  category?: string;
  recipeItems: any[];
}

export default function MenuPage() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    sellingPrice: '',
    category: '',
  });
  const [submitting, setSubmitting] = useState(false);

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
    } catch (error) {
      console.error('Error creating menu item:', error);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="p-8">読み込み中...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-8">
        <div className="mb-8">
          <Link href="/" className="text-blue-600 hover:text-blue-700">
            ← ダッシュボードに戻る
          </Link>
        </div>

        <h1 className="text-4xl font-bold mb-8">メニュー管理</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Add Menu Form */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold mb-4">新規メニュー登録</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-2">商品名</label>
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
                <label className="block text-sm font-semibold mb-2">販売価格（円）</label>
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
                <label className="block text-sm font-semibold mb-2">カテゴリー（任意）</label>
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

          {/* Menu List */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold mb-4">登録済みメニュー</h2>
            {menuItems.length === 0 ? (
              <p className="text-gray-500">メニューがまだ登録されていません</p>
            ) : (
              <div className="space-y-2">
                {menuItems.map((item) => (
                  <Link
                    key={item.id}
                    href={`/menu/${item.id}/recipe`}
                    className="block p-3 border rounded hover:bg-gray-50 transition"
                  >
                    <div className="font-semibold">{item.name}</div>
                    <div className="text-sm text-gray-600">
                      販売価格: ¥{item.sellingPrice.toLocaleString()}
                      {item.category && ` • ${item.category}`}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      レシピ: {item.recipeItems.length}件 • クリックしてレシピを編集
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
