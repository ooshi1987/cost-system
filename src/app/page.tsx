'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface MenuCost {
  menuItemId: string;
  name: string;
  sellingPrice: number;
  costPrice: number;
  profit: number;
  profitMargin: number;
}

export default function Dashboard() {
  const [menuCosts, setMenuCosts] = useState<MenuCost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMenuCosts();
  }, []);

  const fetchMenuCosts = async () => {
    try {
      const response = await fetch('/api/dashboard/costs');
      if (response.ok) {
        const data = await response.json();
        setMenuCosts(data);
      }
    } catch (error) {
      console.error('Error fetching menu costs:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-8">読み込み中...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-4 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-4xl font-bold">利益率ダッシュボード</h1>
          <div className="flex gap-2">
            <Link
              href="/delivery"
              className="flex-1 sm:flex-none text-center bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm sm:text-base"
            >
              📸 納品書をスキャン
            </Link>
            <Link
              href="/menu"
              className="flex-1 sm:flex-none text-center bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 text-sm sm:text-base"
            >
              📋 メニュー管理
            </Link>
          </div>
        </div>

        {menuCosts.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-6 sm:p-8 text-center">
            <p className="text-gray-500 mb-4">メニュー情報がまだ登録されていません</p>
            <Link
              href="/menu"
              className="inline-block bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
            >
              メニューを登録する
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-x-auto">
            <table className="w-full min-w-[500px]">
              <thead className="bg-gray-100 border-b">
                <tr>
                  <th className="px-4 sm:px-6 py-3 text-left font-semibold">商品名</th>
                  <th className="px-4 sm:px-6 py-3 text-right font-semibold">販売価格</th>
                  <th className="px-4 sm:px-6 py-3 text-right font-semibold">原価</th>
                  <th className="px-4 sm:px-6 py-3 text-right font-semibold">利益</th>
                  <th className="px-4 sm:px-6 py-3 text-right font-semibold">利益率</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {menuCosts.map((item) => (
                  <tr key={item.menuItemId} className="hover:bg-gray-50">
                    <td className="px-4 sm:px-6 py-3 sm:py-4 font-medium">{item.name}</td>
                    <td className="px-4 sm:px-6 py-3 sm:py-4 text-right">¥{item.sellingPrice.toFixed(0)}</td>
                    <td className="px-4 sm:px-6 py-3 sm:py-4 text-right">¥{item.costPrice.toFixed(0)}</td>
                    <td className="px-4 sm:px-6 py-3 sm:py-4 text-right font-semibold text-green-600">
                      ¥{item.profit.toFixed(0)}
                    </td>
                    <td
                      className={`px-4 sm:px-6 py-3 sm:py-4 text-right font-bold ${
                        item.profitMargin >= 30 ? 'text-green-600' : 'text-orange-600'
                      }`}
                    >
                      {item.profitMargin.toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-6 sm:mt-8 grid grid-cols-2 gap-4">
          <Link
            href="/ingredients"
            className="block bg-white rounded-lg shadow p-6 hover:shadow-lg transition"
          >
            <div className="text-2xl mb-2">🥘</div>
            <h2 className="font-semibold text-lg">食材・調味料管理</h2>
            <p className="text-gray-600 text-sm mt-1">食材の原価を確認・編集</p>
          </Link>
          <Link
            href="/delivery-history"
            className="block bg-white rounded-lg shadow p-6 hover:shadow-lg transition"
          >
            <div className="text-2xl mb-2">📦</div>
            <h2 className="font-semibold text-lg">納品履歴</h2>
            <p className="text-gray-600 text-sm mt-1">過去の納品書を確認</p>
          </Link>
        </div>
      </div>
    </div>
  );
}
