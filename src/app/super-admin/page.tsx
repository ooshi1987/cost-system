'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface Store {
  id: string;
  name: string;
}

interface Tenant {
  id: string;
  name: string;
  email: string;
  subscriptionStatus: string | null;
  isInternal: boolean;
  pricePerStore: number;
  storeCount: number;
  userCount: number;
  mrr: number;
  stores: Store[];
  createdAt: string;
}

interface Summary {
  totalTenants: number;
  activePaid: number;
  trialing: number;
  totalMrr: number;
}

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  active:    { label: '有料', color: 'bg-green-100 text-green-700' },
  trialing:  { label: '試用中', color: 'bg-blue-100 text-blue-700' },
  past_due:  { label: '支払遅延', color: 'bg-orange-100 text-orange-700' },
  canceled:  { label: '解約', color: 'bg-gray-100 text-gray-500' },
};

function statusBadge(status: string | null) {
  const s = status ?? 'free';
  const cfg = STATUS_LABEL[s] ?? { label: '無料', color: 'bg-gray-100 text-gray-500' };
  return (
    <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full ${cfg.color}`}>
      {cfg.label}
    </span>
  );
}

export default function SuperAdminPage() {
  const router = useRouter();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const toggleInternal = async (tenantId: string, current: boolean) => {
    setTogglingId(tenantId);
    try {
      const res = await fetch('/api/super-admin/tenants', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId, isInternal: !current }),
      });
      if (res.ok) {
        setTenants((prev) =>
          prev.map((t) => t.id === tenantId ? { ...t, isInternal: !current } : t)
        );
      }
    } finally {
      setTogglingId(null);
    }
  };

  useEffect(() => {
    fetch('/api/super-admin/tenants')
      .then((r) => {
        if (!r.ok) throw new Error('Forbidden');
        return r.json();
      })
      .then((data) => {
        setTenants(data.tenants);
        setSummary(data.summary);
        setLoading(false);
      })
      .catch(() => {
        setError('アクセス権限がありません');
        setLoading(false);
      });
  }, []);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-400">読み込み中…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-6">

        {/* ヘッダー */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide">Super Admin</p>
            <h1 className="text-2xl font-bold text-gray-800">管理コンソール</h1>
          </div>
          <button
            onClick={handleLogout}
            className="text-xs text-gray-400 hover:text-gray-600 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            ログアウト
          </button>
        </div>

        {/* KPIサマリ */}
        {summary && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <div className="bg-white rounded-2xl p-4 shadow-sm text-center">
              <p className="text-2xl font-bold text-gray-800">{summary.totalTenants}</p>
              <p className="text-xs text-gray-400 mt-0.5">全テナント</p>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm text-center">
              <p className="text-2xl font-bold text-green-600">{summary.activePaid}</p>
              <p className="text-xs text-gray-400 mt-0.5">有料契約</p>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm text-center">
              <p className="text-2xl font-bold text-blue-600">{summary.trialing}</p>
              <p className="text-xs text-gray-400 mt-0.5">試用中</p>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm text-center">
              <p className="text-2xl font-bold text-amber-600">
                ¥{summary.totalMrr.toLocaleString()}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">月次売上（MRR）</p>
            </div>
          </div>
        )}

        {/* テナント一覧 */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b">
            <h2 className="font-semibold text-gray-700 text-sm">テナント一覧</h2>
          </div>

          {tenants.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-sm">テナントがありません</div>
          ) : (
            <div className="divide-y">
              {tenants.map((t) => (
                <div key={t.id}>
                  {/* メイン行 */}
                  <button
                    className="w-full text-left px-5 py-4 hover:bg-gray-50 transition-colors"
                    onClick={() => setExpandedId(expandedId === t.id ? null : t.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-gray-800 truncate">{t.name}</span>
                            {statusBadge(t.subscriptionStatus)}
                            {t.isInternal && (
                              <span className="text-[10px] bg-purple-100 text-purple-700 font-bold px-2 py-0.5 rounded-full">
                                社内
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-400 mt-0.5 truncate">{t.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 ml-4 shrink-0 text-right">
                        <div className="hidden sm:block">
                          <p className="text-sm font-semibold text-amber-600">
                            ¥{t.mrr.toLocaleString()}
                            <span className="text-xs text-gray-400 font-normal">/月</span>
                          </p>
                        </div>
                        <div className="hidden sm:block text-xs text-gray-400">
                          <span>{t.storeCount}店舗</span>
                          <span className="mx-1">·</span>
                          <span>{t.userCount}ユーザー</span>
                        </div>
                        <span className="text-gray-300 text-sm">{expandedId === t.id ? '▲' : '▼'}</span>
                      </div>
                    </div>
                  </button>

                  {/* 展開詳細 */}
                  {expandedId === t.id && (
                    <div className="bg-gray-50 border-t px-5 py-4">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3 text-sm">
                        <div>
                          <p className="text-xs text-gray-400">月額/店舗</p>
                          <p className="font-semibold">
                            {t.pricePerStore > 0 ? `¥${t.pricePerStore.toLocaleString()}` : '—'}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400">MRR</p>
                          <p className="font-semibold text-amber-600">
                            ¥{t.mrr.toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400">登録日</p>
                          <p className="font-semibold">
                            {new Date(t.createdAt).toLocaleDateString('ja-JP')}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400">ステータス</p>
                          <p>{statusBadge(t.subscriptionStatus)}</p>
                        </div>
                      </div>

                      {/* 社内アカウントトグル */}
                      <div className="flex items-center justify-between bg-white border rounded-xl px-4 py-3 mb-3">
                        <div>
                          <p className="text-sm font-semibold text-gray-700">社内アカウント（課金スキップ）</p>
                          <p className="text-xs text-gray-400">ONにするとPro相当の機能を無料で利用可能</p>
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleInternal(t.id, t.isInternal); }}
                          disabled={togglingId === t.id}
                          className={`relative w-12 h-6 rounded-full transition-colors ${
                            t.isInternal ? 'bg-purple-500' : 'bg-gray-200'
                          } ${togglingId === t.id ? 'opacity-50' : ''}`}
                        >
                          <span
                            className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                              t.isInternal ? 'translate-x-7' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>

                      {t.stores.length > 0 && (
                        <div>
                          <p className="text-xs text-gray-400 mb-1">店舗</p>
                          <div className="flex flex-wrap gap-1.5">
                            {t.stores.map((s) => (
                              <span
                                key={s.id}
                                className="text-xs bg-white border rounded-full px-2.5 py-1 text-gray-600"
                              >
                                {s.name}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <p className="text-center text-xs text-gray-300 mt-6">
          Super Admin Console · {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
