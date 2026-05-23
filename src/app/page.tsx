'use client';

import Link from 'next/link';

export default function Dashboard() {

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


        {/* ショートカット */}
        <div className="mt-4 sm:mt-8 grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
          <Link href="/menu"
            className="bg-white rounded-xl shadow-sm p-4 sm:p-6 hover:shadow-md transition active:bg-gray-50">
            <div className="text-2xl mb-2">📋</div>
            <div className="font-semibold text-sm sm:text-base">商品一覧</div>
            <div className="text-gray-500 text-xs mt-1">メニューの登録・インポート</div>
          </Link>
          <Link href="/ingredients"
            className="bg-white rounded-xl shadow-sm p-4 sm:p-6 hover:shadow-md transition active:bg-gray-50">
            <div className="text-2xl mb-2">🥘</div>
            <div className="font-semibold text-sm sm:text-base">食材・調味料管理</div>
            <div className="text-gray-500 text-xs mt-1">食材の原価を確認・編集</div>
          </Link>
          <Link href="/delivery-history"
            className="col-span-2 sm:col-span-1 bg-white rounded-xl shadow-sm p-4 sm:p-6 hover:shadow-md transition active:bg-gray-50">
            <div className="text-2xl mb-2">📦</div>
            <div className="font-semibold text-sm sm:text-base">納品履歴</div>
            <div className="text-gray-500 text-xs mt-1">過去の納品書を確認・修正</div>
          </Link>
        </div>

      </div>
    </div>
  );
}
