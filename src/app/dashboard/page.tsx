'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import StoreSelector from '@/components/StoreSelector';
import CostraLogo from '@/components/CostraLogo';
import MultiStoreLink from '@/components/MultiStoreLink';

interface Stats {
  menuItemCount: number;
  foodCount: number;
  seasoningCount: number;
  avgCostRate: number | null;
}

const KPI_CARDS = (stats: Stats) => [
  {
    label: 'メニュー',
    value: stats.menuItemCount,
    unit: '品',
    icon: '📋',
    color: 'bg-blue-50 text-blue-600',
    href: '/menu',
  },
  {
    label: '食材・調味料',
    value: stats.foodCount + stats.seasoningCount,
    unit: '種',
    icon: '🥦',
    color: 'bg-green-50 text-green-600',
    href: '/ingredients',
  },
  {
    label: '平均原価率',
    value: stats.avgCostRate !== null ? stats.avgCostRate : '-',
    unit: stats.avgCostRate !== null ? '%' : '',
    icon: '📊',
    color:
      stats.avgCostRate === null
        ? 'bg-gray-50 text-gray-400'
        : stats.avgCostRate <= 30
        ? 'bg-amber-50 text-amber-600'
        : stats.avgCostRate <= 40
        ? 'bg-orange-50 text-orange-600'
        : 'bg-red-50 text-red-500',
    href: null,
  },
];

export default function Dashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats>({
    menuItemCount: 0,
    foodCount: 0,
    seasoningCount: 0,
    avgCostRate: null,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/dashboard/stats')
      .then((r) => r.json())
      .then((data) => { setStats(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  };

  const kpiCards = KPI_CARDS(stats);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-xl mx-auto px-4 pt-6 pb-4">

        {/* ヘッダー */}
        <div className="flex items-center justify-between mb-4">
          <CostraLogo size={32} />
          <div className="flex items-center gap-1">
            <Link
              href="/help"
              className="text-xs text-gray-400 hover:text-gray-600 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            >
              ？ヘルプ
            </Link>
            <Link
              href="/admin"
              className="text-xs text-gray-400 hover:text-gray-600 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            >
              ⚙️ 設定
            </Link>
            <button
              onClick={handleLogout}
              className="text-xs text-gray-400 hover:text-gray-600 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            >
              ログアウト
            </button>
          </div>
        </div>
        {/* 店舗切替 ＋ 全店舗ダッシュボード（tenant_admin かつ複数店舗時のみ表示） */}
        <div className="mb-4 flex items-center gap-2">
          <StoreSelector />
          <MultiStoreLink />
        </div>

        {/* KPIカード */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {kpiCards.map((card) => {
            const inner = (
              <div className={`rounded-2xl p-3 text-center ${card.color} ${card.href ? 'hover:opacity-80 active:opacity-70 transition-opacity' : ''}`}>
                <div className="text-xl mb-1">{card.icon}</div>
                <div className="text-2xl font-bold leading-none">
                  {loading ? (
                    <span className="inline-block w-8 h-6 bg-current opacity-10 rounded animate-pulse" />
                  ) : (
                    card.value
                  )}
                  {!loading && card.unit && (
                    <span className="text-xs font-normal ml-0.5">{card.unit}</span>
                  )}
                </div>
                <div className="text-[11px] font-medium mt-1 opacity-80">{card.label}</div>
              </div>
            );
            return card.href ? (
              <Link key={card.label} href={card.href}>{inner}</Link>
            ) : (
              <div key={card.label}>{inner}</div>
            );
          })}
        </div>

        {/* メインCTA：スキャン */}
        <Link
          href="/delivery"
          className="flex items-center justify-center gap-2.5 w-full bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white py-4 rounded-2xl text-base font-bold shadow-md shadow-amber-200 transition-colors mb-4"
        >
          <span className="text-xl">📸</span>
          <span>納品書をスキャン</span>
        </Link>

        {/* サブアクション */}
        <div className="grid grid-cols-2 gap-3">
          <Link
            href="/menu"
            className="flex items-center gap-3 bg-white rounded-2xl shadow-sm px-4 py-3.5 hover:shadow-md active:bg-gray-50 transition"
          >
            <span className="text-2xl">📋</span>
            <div>
              <div className="font-semibold text-sm text-gray-800">メニュー</div>
              <div className="text-[11px] text-gray-400">価格・原価確認</div>
            </div>
          </Link>
          <Link
            href="/ingredients"
            className="flex items-center gap-3 bg-white rounded-2xl shadow-sm px-4 py-3.5 hover:shadow-md active:bg-gray-50 transition"
          >
            <span className="text-2xl">🥦</span>
            <div>
              <div className="font-semibold text-sm text-gray-800">食材</div>
              <div className="text-[11px] text-gray-400">原価・単価管理</div>
            </div>
          </Link>
          <Link
            href="/delivery-history"
            className="flex items-center gap-3 bg-white rounded-2xl shadow-sm px-4 py-3.5 hover:shadow-md active:bg-gray-50 transition"
          >
            <span className="text-2xl">📦</span>
            <div>
              <div className="font-semibold text-sm text-gray-800">納品履歴</div>
              <div className="text-[11px] text-gray-400">過去の納品確認</div>
            </div>
          </Link>
          <Link
            href="/ingredients?type=seasoning"
            className="flex items-center gap-3 bg-white rounded-2xl shadow-sm px-4 py-3.5 hover:shadow-md active:bg-gray-50 transition"
          >
            <span className="text-2xl">🧂</span>
            <div>
              <div className="font-semibold text-sm text-gray-800">調味料</div>
              <div className="text-[11px] text-gray-400">調味料の単価管理</div>
            </div>
          </Link>
        </div>

      </div>
    </div>
  );
}
