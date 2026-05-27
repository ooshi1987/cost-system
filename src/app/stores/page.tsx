'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import CostraLogo from '@/components/CostraLogo';

interface HighCostMenu {
  name: string;
  costRate: number;
}

interface StoreStats {
  id: string;
  name: string;
  menuCount: number;
  ingredientCount: number;
  avgCostRate: number | null;
  deliveryCount: number;
  highCostMenus: HighCostMenu[];
  alert: boolean;
  warning: boolean;
}

interface Summary {
  totalStores: number;
  totalMenuItems: number;
  totalIngredients: number;
  totalDeliveryScans: number;
  overallAvgCostRate: number | null;
  alertCount: number;
  warningCount: number;
}

function CostRateBadge({ rate }: { rate: number | null }) {
  if (rate === null) return <span className="text-xs text-gray-300">未設定</span>;
  const color = rate > 40 ? 'text-red-600 bg-red-50' : rate > 30 ? 'text-orange-500 bg-orange-50' : 'text-amber-600 bg-amber-50';
  return (
    <span className={`text-lg font-extrabold px-2 py-0.5 rounded-lg ${color}`}>
      {rate}%
    </span>
  );
}

function CostRateBar({ rate }: { rate: number | null }) {
  if (rate === null) return <div className="h-1.5 bg-gray-100 rounded-full w-full" />;
  const capped = Math.min(rate, 60);
  const color = rate > 40 ? 'bg-red-400' : rate > 30 ? 'bg-orange-400' : 'bg-amber-400';
  return (
    <div className="h-1.5 bg-gray-100 rounded-full w-full overflow-hidden">
      <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${(capped / 60) * 100}%` }} />
    </div>
  );
}

export default function StoresPage() {
  const router = useRouter();
  const [stores, setStores]   = useState<StoreStats[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  useEffect(() => {
    fetch('/api/stores/overview')
      .then(r => {
        if (r.status === 403) throw new Error('forbidden');
        if (!r.ok) throw new Error('error');
        return r.json();
      })
      .then(data => {
        setStores(data.stores);
        setSummary(data.summary);
        setLoading(false);
      })
      .catch(e => {
        setError(e.message === 'forbidden' ? 'プロプランのみ利用できます' : 'データ取得に失敗しました');
        setLoading(false);
      });
  }, []);

  const switchStore = async (storeId: string) => {
    await fetch('/api/auth/switch-store', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ storeId }),
    });
    router.push('/dashboard');
    router.refresh();
  };

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p className="text-gray-400 animate-pulse">読み込み中…</p>
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="text-center">
        <div className="text-4xl mb-3">🔒</div>
        <p className="text-gray-700 font-semibold">{error}</p>
        <button onClick={() => router.push('/dashboard')} className="mt-4 text-sm text-amber-600 hover:underline">
          ダッシュボードに戻る
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-xl mx-auto px-4 pt-6 pb-8">

        {/* ヘッダー */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <CostraLogo size={28} />
            <span className="text-sm font-semibold text-gray-500">全店舗</span>
          </div>
          <button
            onClick={() => router.push('/dashboard')}
            className="text-xs text-gray-400 hover:text-gray-600 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            ← ダッシュボード
          </button>
        </div>

        {/* アラートバナー */}
        {summary && summary.alertCount > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 mb-4 flex items-center gap-2">
            <span className="text-red-500 text-lg">⚠️</span>
            <p className="text-sm text-red-700 font-medium">
              原価率40%超の店舗が <span className="font-extrabold">{summary.alertCount}店舗</span> あります
            </p>
          </div>
        )}
        {summary && summary.warningCount > 0 && summary.alertCount === 0 && (
          <div className="bg-orange-50 border border-orange-200 rounded-2xl px-4 py-3 mb-4 flex items-center gap-2">
            <span className="text-lg">⚡</span>
            <p className="text-sm text-orange-700 font-medium">
              原価率30%超の店舗が <span className="font-extrabold">{summary.warningCount}店舗</span> あります
            </p>
          </div>
        )}

        {/* 全体KPI */}
        {summary && (
          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="bg-white rounded-2xl shadow-sm p-4 col-span-2">
              <p className="text-xs text-gray-400 mb-1">全店舗 平均原価率</p>
              <div className="flex items-end gap-3 mb-2">
                <CostRateBadge rate={summary.overallAvgCostRate} />
                <span className="text-xs text-gray-400 mb-1">目標: 30%以下</span>
              </div>
              <CostRateBar rate={summary.overallAvgCostRate} />
            </div>
            {[
              { label: '総メニュー数',  value: summary.totalMenuItems,     unit: '品', icon: '📋' },
              { label: '総食材数',      value: summary.totalIngredients,   unit: '種', icon: '🥦' },
              { label: 'スキャン合計',  value: summary.totalDeliveryScans, unit: '件', icon: '📸' },
              { label: '管理店舗数',    value: summary.totalStores,        unit: '店舗', icon: '🏪' },
            ].map(k => (
              <div key={k.label} className="bg-white rounded-2xl shadow-sm p-3 text-center">
                <div className="text-xl mb-1">{k.icon}</div>
                <p className="text-xl font-bold text-gray-800">
                  {k.value}<span className="text-xs font-normal text-gray-400 ml-0.5">{k.unit}</span>
                </p>
                <p className="text-[11px] text-gray-400 mt-0.5">{k.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* 店舗カード一覧 */}
        <h2 className="text-sm font-bold text-gray-600 mb-3">店舗別 原価率</h2>
        <div className="flex flex-col gap-3">
          {stores.map(store => (
            <div
              key={store.id}
              className={`bg-white rounded-2xl shadow-sm border-2 overflow-hidden transition-all ${
                store.alert   ? 'border-red-200' :
                store.warning ? 'border-orange-200' :
                'border-transparent'
              }`}
            >
              {/* 店舗ヘッダー */}
              <div className="px-4 pt-4 pb-3">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {store.alert   && <span className="text-red-400 text-sm">🔴</span>}
                    {store.warning && !store.alert && <span className="text-orange-400 text-sm">🟡</span>}
                    {!store.alert  && !store.warning && store.avgCostRate !== null && <span className="text-green-400 text-sm">🟢</span>}
                    <span className="font-bold text-gray-800">{store.name}</span>
                  </div>
                  <CostRateBadge rate={store.avgCostRate} />
                </div>
                <CostRateBar rate={store.avgCostRate} />
              </div>

              {/* KPI */}
              <div className="grid grid-cols-3 gap-0 border-t border-gray-50">
                {[
                  { label: 'メニュー', value: store.menuCount,       unit: '品' },
                  { label: '食材',     value: store.ingredientCount,  unit: '種' },
                  { label: 'スキャン', value: store.deliveryCount,    unit: '件' },
                ].map((k, i) => (
                  <div key={k.label} className={`px-3 py-2.5 text-center ${i < 2 ? 'border-r border-gray-50' : ''}`}>
                    <p className="text-base font-bold text-gray-700">{k.value}<span className="text-xs font-normal text-gray-400 ml-0.5">{k.unit}</span></p>
                    <p className="text-[10px] text-gray-400">{k.label}</p>
                  </div>
                ))}
              </div>

              {/* 高原価メニュー */}
              {store.highCostMenus.length > 0 && (
                <div className="px-4 py-2.5 border-t border-gray-50 bg-red-50/40">
                  <p className="text-[10px] text-red-400 font-bold mb-1.5">⚠ 原価率が高いメニュー</p>
                  <div className="flex flex-col gap-1">
                    {store.highCostMenus.map(m => (
                      <div key={m.name} className="flex items-center justify-between">
                        <span className="text-xs text-gray-600 truncate max-w-[70%]">{m.name}</span>
                        <span className={`text-xs font-bold ${m.costRate > 40 ? 'text-red-500' : 'text-orange-500'}`}>{m.costRate}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* この店舗を開くボタン */}
              <div className="px-4 py-3 border-t border-gray-50">
                <button
                  onClick={() => switchStore(store.id)}
                  className="w-full text-sm font-semibold text-amber-600 hover:text-amber-700 hover:bg-amber-50 py-1.5 rounded-xl transition-colors"
                >
                  この店舗を管理する →
                </button>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
