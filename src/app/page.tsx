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

  useEffect(() => { fetchMenuCosts(); }, []);

  const fetchMenuCosts = async () => {
    try {
      const res = await fetch('/api/dashboard/costs');
      if (res.ok) setMenuCosts(await res.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-6 text-gray-500">読み込み中...</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-6 sm:px-8 sm:py-8">

        {/* ヘッダー */}
        <div className="flex flex-col gap-3 mb-6 sm:flex-row sm:items-center sm:justify-between sm:mb-8">
          <h1 className="text-2xl font-bold sm:text-4xl">利益率ダッシュボード</h1>
          <div className="flex gap-2">
            <Link href="/delivery"
              className="flex-1 text-center sm:flex-none bg-blue-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 active:bg-blue-800">
              📸 納品書をスキャン
            </Link>
            <Link href="/menu"
              className="flex-1 text-center sm:flex-none bg-green-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-green-700 active:bg-green-800">
              📋 メニュー管理
            </Link>
          </div>
        </div>

        {menuCosts.length === 0 ? (
          <div className="bg-white rounded-xl shadow p-8 text-center">
            <p className="text-gray-500 mb-4">メニューがまだ登録されていません</p>
            <Link href="/menu"
              className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700">
              メニューを登録する
            </Link>
          </div>
        ) : (
          <>
            {/* ── スマホ: カード表示 ── */}
            <div className="space-y-3 sm:hidden">
              {menuCosts.map((item) => (
                <div key={item.menuItemId} className="bg-white rounded-xl shadow-sm p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-semibold text-base">{item.name}</span>
                    <span className={`text-2xl font-bold ${item.profitMargin >= 30 ? 'text-green-600' : 'text-orange-500'}`}>
                      {item.profitMargin.toFixed(1)}%
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-gray-50 rounded-lg py-2 px-1">
                      <div className="text-xs text-gray-400 mb-0.5">販売価格</div>
                      <div className="text-sm font-medium">¥{item.sellingPrice.toLocaleString()}</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg py-2 px-1">
                      <div className="text-xs text-gray-400 mb-0.5">原価</div>
                      <div className="text-sm font-medium">¥{item.costPrice.toFixed(0)}</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg py-2 px-1">
                      <div className="text-xs text-gray-400 mb-0.5">利益</div>
                      <div className={`text-sm font-semibold ${item.profit >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                        ¥{item.profit.toFixed(0)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* ── PC: テーブル表示 ── */}
            <div className="hidden sm:block bg-white rounded-xl shadow overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-100 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left font-semibold">商品名</th>
                    <th className="px-6 py-3 text-right font-semibold">販売価格</th>
                    <th className="px-6 py-3 text-right font-semibold">原価</th>
                    <th className="px-6 py-3 text-right font-semibold">利益</th>
                    <th className="px-6 py-3 text-right font-semibold">利益率</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {menuCosts.map((item) => (
                    <tr key={item.menuItemId} className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-medium">{item.name}</td>
                      <td className="px-6 py-4 text-right">¥{item.sellingPrice.toFixed(0)}</td>
                      <td className="px-6 py-4 text-right">¥{item.costPrice.toFixed(0)}</td>
                      <td className="px-6 py-4 text-right font-semibold text-green-600">¥{item.profit.toFixed(0)}</td>
                      <td className={`px-6 py-4 text-right font-bold ${item.profitMargin >= 30 ? 'text-green-600' : 'text-orange-500'}`}>
                        {item.profitMargin.toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* ショートカット */}
        <div className="mt-4 sm:mt-8 grid grid-cols-2 gap-3 sm:gap-4">
          <Link href="/ingredients"
            className="bg-white rounded-xl shadow-sm p-4 sm:p-6 hover:shadow-md transition active:bg-gray-50">
            <div className="text-2xl mb-2">🥘</div>
            <div className="font-semibold text-sm sm:text-base">食材・調味料管理</div>
            <div className="text-gray-500 text-xs mt-1">食材の原価を確認・編集</div>
          </Link>
          <Link href="/delivery-history"
            className="bg-white rounded-xl shadow-sm p-4 sm:p-6 hover:shadow-md transition active:bg-gray-50">
            <div className="text-2xl mb-2">📦</div>
            <div className="font-semibold text-sm sm:text-base">納品履歴</div>
            <div className="text-gray-500 text-xs mt-1">過去の納品書を確認・修正</div>
          </Link>
        </div>

      </div>
    </div>
  );
}
