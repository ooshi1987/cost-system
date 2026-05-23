'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

const NAV_ITEMS = [
  {
    href: '/menu',
    icon: '📋',
    label: '商品一覧',
    description: 'メニューの登録・価格管理',
  },
  {
    href: '/ingredients?type=food',
    icon: '🥬',
    label: '食材一覧',
    description: '食材の原価を確認・編集',
  },
  {
    href: '/ingredients?type=seasoning',
    icon: '🧂',
    label: '調味料一覧',
    description: '調味料の原価を確認・編集',
  },
  {
    href: '/delivery-history',
    icon: '📦',
    label: '納品履歴',
    description: '過去の納品書を確認・修正',
  },
];

export default function Dashboard() {
  const router = useRouter();

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-xl mx-auto px-4 py-6 sm:py-10">

        {/* ヘッダー */}
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold sm:text-3xl">原価管理システム</h1>
            <button
              onClick={handleLogout}
              className="text-xs text-gray-400 hover:text-gray-600 px-3 py-1.5 rounded-lg hover:bg-gray-100"
            >
              ログアウト
            </button>
          </div>
          <Link
            href="/delivery"
            className="flex items-center justify-center gap-2 w-full bg-blue-600 text-white py-4 rounded-2xl text-base font-bold hover:bg-blue-700 active:bg-blue-800 shadow"
          >
            📸 納品書をスキャン
          </Link>
        </div>

        {/* 縦並びナビ */}
        <div className="space-y-3">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-4 bg-white rounded-2xl shadow-sm px-5 py-4 hover:shadow-md active:bg-gray-50 transition"
            >
              <span className="text-3xl shrink-0">{item.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-base">{item.label}</div>
                <div className="text-gray-400 text-xs mt-0.5">{item.description}</div>
              </div>
              <span className="text-gray-300 text-xl shrink-0">›</span>
            </Link>
          ))}
        </div>

      </div>
    </div>
  );
}
