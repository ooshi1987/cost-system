'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import CostraLogo from '@/components/CostraLogo';

interface Store { id: string; name: string; }
interface TenantUser { id: string; email: string; name: string | null; role: string; }

interface ContactInquiry {
  id: string;
  category: string;
  content: string;
  email: string | null;
  tenantName: string | null;
  plan: string | null;
  isRead: boolean;
  createdAt: string;
}

const CATEGORY_LABEL: Record<string, string> = {
  usage:   '操作方法',
  bug:     'バグ報告',
  billing: '料金・プラン',
  feature: '機能要望',
  other:   'その他',
};

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
  users: TenantUser[];
  createdAt: string;
}

interface Stats {
  summary: {
    totalTenants: number;
    totalUsers: number;
    totalStores: number;
    totalMenuItems: number;
    totalIngredients: number;
    totalDeliveryScans: number;
    mrr: number;
    activeStores30d: number;
    paidCount: number;
    internalCount: number;
  };
  planBreakdown: { free: number; basic: number; pro: number };
  monthlySignups: { month: string; count: number }[];
  recentTenants: { id: string; name: string; email: string; plan: string; isInternal: boolean; createdAt: string }[];
}

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  active:   { label: '有料',     color: 'bg-green-100 text-green-700' },
  trialing: { label: '試用中',   color: 'bg-blue-100 text-blue-700' },
  past_due: { label: '支払遅延', color: 'bg-orange-100 text-orange-700' },
  canceled: { label: '解約',     color: 'bg-gray-100 text-gray-500' },
};

function statusBadge(status: string | null) {
  const cfg = STATUS_LABEL[status ?? ''] ?? { label: '無料', color: 'bg-gray-100 text-gray-500' };
  return (
    <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full ${cfg.color}`}>
      {cfg.label}
    </span>
  );
}

/** SVGミニ棒グラフ */
function BarChart({ data }: { data: { month: string; count: number }[] }) {
  const max = Math.max(...data.map(d => d.count), 1);
  const h = 60;
  const barW = 28;
  const gap = 8;
  const w = data.length * (barW + gap) - gap;

  return (
    <svg width={w} height={h + 20} className="overflow-visible">
      {data.map((d, i) => {
        const barH = Math.max((d.count / max) * h, d.count > 0 ? 4 : 0);
        const x = i * (barW + gap);
        const y = h - barH;
        return (
          <g key={i}>
            <rect x={x} y={y} width={barW} height={barH} rx={4} fill="#f59e0b" opacity={0.85} />
            {d.count > 0 && (
              <text x={x + barW / 2} y={y - 4} textAnchor="middle" fontSize={10} fill="#92400e" fontWeight="600">
                {d.count}
              </text>
            )}
            <text x={x + barW / 2} y={h + 14} textAnchor="middle" fontSize={9} fill="#9ca3af">
              {d.month}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/** プラン内訳ドーナツ風バー */
function PlanBar({ free, basic, pro }: { free: number; basic: number; pro: number }) {
  const total = free + basic + pro || 1;
  const segments = [
    { label: 'フリー',     value: free,  color: 'bg-gray-300' },
    { label: 'ベーシック', value: basic, color: 'bg-amber-400' },
    { label: 'プロ',       value: pro,   color: 'bg-orange-500' },
  ];
  return (
    <div>
      <div className="flex h-3 rounded-full overflow-hidden gap-0.5 mb-3">
        {segments.map(s => (
          <div
            key={s.label}
            className={`${s.color} transition-all`}
            style={{ width: `${(s.value / total) * 100}%` }}
          />
        ))}
      </div>
      <div className="flex gap-4">
        {segments.map(s => (
          <div key={s.label} className="flex items-center gap-1.5">
            <span className={`w-2.5 h-2.5 rounded-full ${s.color}`} />
            <span className="text-xs text-gray-500">{s.label} <span className="font-bold text-gray-800">{s.value}</span></span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function SuperAdminPage() {
  const router = useRouter();
  const [tenants, setTenants]     = useState<Tenant[]>([]);
  const [stats, setStats]         = useState<Stats | null>(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [tab, setTab]             = useState<'overview' | 'tenants' | 'inquiries'>('overview');
  // 問い合わせ
  const [inquiries, setInquiries]     = useState<ContactInquiry[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [expandedInquiryId, setExpandedInquiryId] = useState<string | null>(null);
  // パスワードリセット
  const [resetUserId, setResetUserId]   = useState<string | null>(null);
  const [resetPassword, setResetPassword] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMsg, setResetMsg]         = useState<{ ok: boolean; text: string } | null>(null);
  // スタッフ追加
  const [addStaffStoreId, setAddStaffStoreId] = useState<string | null>(null);
  const [staffEmail, setStaffEmail]           = useState('');
  const [staffPassword, setStaffPassword]     = useState('');
  const [staffName, setStaffName]             = useState('');
  const [staffLoading, setStaffLoading]       = useState(false);
  const [staffMsg, setStaffMsg]               = useState<{ ok: boolean; text: string } | null>(null);
  // 作成済み認証情報（一度だけ表示）
  const [createdCredential, setCreatedCredential] = useState<{ email: string; password: string } | null>(null);
  // テナント名・店舗名編集
  const [editingTenantId, setEditingTenantId] = useState<string | null>(null);
  const [editingTenantName, setEditingTenantName] = useState('');
  const [editingStoreId, setEditingStoreId] = useState<string | null>(null);
  const [editingStoreName, setEditingStoreName] = useState('');
  const [editSaving, setEditSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch('/api/super-admin/tenants').then(r => { if (!r.ok) throw new Error('Forbidden'); return r.json(); }),
      fetch('/api/super-admin/stats').then(r => r.json()),
      fetch('/api/super-admin/inquiries').then(r => r.json()),
    ])
      .then(([tenantData, statsData, inquiryData]) => {
        setTenants(tenantData.tenants);
        setStats(statsData);
        setInquiries(inquiryData.inquiries ?? []);
        setUnreadCount(inquiryData.unreadCount ?? 0);
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

  const resetUserPassword = async () => {
    if (!resetUserId || resetPassword.length < 4) return;
    setResetLoading(true); setResetMsg(null);
    try {
      const res = await fetch('/api/super-admin/tenants', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: resetUserId, newPassword: resetPassword }),
      });
      if (res.ok) {
        setResetMsg({ ok: true, text: 'パスワードを変更しました' });
        setResetPassword('');
        setTimeout(() => { setResetUserId(null); setResetMsg(null); }, 2000);
      } else {
        setResetMsg({ ok: false, text: '変更に失敗しました' });
      }
    } finally {
      setResetLoading(false);
    }
  };

  const addStaffAccount = async (tenantId: string) => {
    if (!addStaffStoreId || !staffEmail || !staffPassword) return;
    setStaffLoading(true); setStaffMsg(null);
    try {
      const res = await fetch('/api/super-admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId, storeId: addStaffStoreId, email: staffEmail, password: staffPassword, name: staffName }),
      });
      const data = await res.json();
      if (res.ok) {
        setCreatedCredential({ email: staffEmail, password: staffPassword });
        setStaffMsg({ ok: true, text: 'アカウントを作成しました' });
        setStaffEmail(''); setStaffPassword(''); setStaffName('');
        setAddStaffStoreId(null);
        // ユーザー一覧を更新
        setTenants(prev => prev.map(t =>
          t.id === tenantId ? { ...t, users: [...t.users, data.user], userCount: t.userCount + 1 } : t
        ));
      } else {
        setStaffMsg({ ok: false, text: data.error ?? '作成に失敗しました' });
      }
    } finally {
      setStaffLoading(false);
    }
  };

  const markInquiryRead = async (id: string) => {
    await fetch(`/api/super-admin/inquiries/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isRead: true }),
    });
    setInquiries(prev => prev.map(q => q.id === id ? { ...q, isRead: true } : q));
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const saveTenantName = async (tenantId: string) => {
    const name = editingTenantName.trim();
    if (!name) { setEditingTenantId(null); return; }
    setEditSaving(true);
    try {
      const res = await fetch('/api/super-admin/tenants', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId, tenantName: name }),
      });
      if (res.ok) {
        setTenants(prev => prev.map(t => t.id === tenantId ? { ...t, name } : t));
        setEditingTenantId(null);
      }
    } finally { setEditSaving(false); }
  };

  const saveStoreName = async (tenantId: string, storeId: string) => {
    const name = editingStoreName.trim();
    if (!name) { setEditingStoreId(null); return; }
    setEditSaving(true);
    try {
      const res = await fetch('/api/super-admin/tenants', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storeId, storeName: name }),
      });
      if (res.ok) {
        setTenants(prev => prev.map(t =>
          t.id === tenantId ? { ...t, stores: t.stores.map(s => s.id === storeId ? { ...s, name } : s) } : t
        ));
        setEditingStoreId(null);
      }
    } finally { setEditSaving(false); }
  };

  const toggleInternal = async (tenantId: string, current: boolean) => {
    setTogglingId(tenantId);
    try {
      const res = await fetch('/api/super-admin/tenants', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId, isInternal: !current }),
      });
      if (res.ok) {
        setTenants(prev => prev.map(t => t.id === tenantId ? { ...t, isInternal: !current } : t));
      }
    } finally {
      setTogglingId(null);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p className="text-gray-400">読み込み中…</p>
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p className="text-red-500">{error}</p>
    </div>
  );

  const s = stats?.summary;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-6">

        {/* ヘッダー */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <CostraLogo size={28} />
            <span className="text-xs font-bold text-purple-600 bg-purple-100 px-2 py-0.5 rounded-full">運営管理</span>
          </div>
          <button
            onClick={handleLogout}
            className="text-xs text-gray-400 hover:text-gray-600 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            ログアウト
          </button>
        </div>

        {/* タブ */}
        <div className="flex gap-1 bg-gray-200 rounded-xl p-1 mb-6">
          {([['overview', '📊 事業概要'], ['tenants', '🏪 テナント一覧'], ['inquiries', '💬 問い合わせ']] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex-1 text-sm font-semibold py-2 rounded-lg transition-colors relative ${
                tab === key ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {label}
              {key === 'inquiries' && unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── 事業概要タブ ── */}
        {tab === 'overview' && s && (
          <div className="flex flex-col gap-5">

            {/* KPI上段 */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: '総テナント数',   value: s.totalTenants,    unit: '社', color: 'text-gray-800' },
                { label: '有料契約',        value: s.paidCount,       unit: '社', color: 'text-green-600' },
                { label: 'MRR',             value: `¥${s.mrr.toLocaleString()}`, unit: '', color: 'text-amber-600' },
                { label: '30日アクティブ', value: s.activeStores30d, unit: '店舗', color: 'text-blue-600' },
              ].map(k => (
                <div key={k.label} className="bg-white rounded-2xl p-4 shadow-sm text-center">
                  <p className={`text-2xl font-extrabold ${k.color}`}>{k.value}<span className="text-sm font-normal text-gray-400 ml-0.5">{k.unit}</span></p>
                  <p className="text-xs text-gray-400 mt-0.5">{k.label}</p>
                </div>
              ))}
            </div>

            {/* KPI下段 */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: '総ユーザー数',   value: s.totalUsers,         unit: '人', icon: '👤' },
                { label: '総メニュー数',   value: s.totalMenuItems,     unit: '品', icon: '📋' },
                { label: 'スキャン総数',   value: s.totalDeliveryScans, unit: '件', icon: '📸' },
              ].map(k => (
                <div key={k.label} className="bg-white rounded-2xl p-3 shadow-sm text-center">
                  <div className="text-xl mb-1">{k.icon}</div>
                  <p className="text-xl font-bold text-gray-800">{k.value.toLocaleString()}<span className="text-xs font-normal text-gray-400 ml-0.5">{k.unit}</span></p>
                  <p className="text-[11px] text-gray-400 mt-0.5">{k.label}</p>
                </div>
              ))}
            </div>

            {/* 月別登録推移 */}
            <div className="bg-white rounded-2xl shadow-sm p-5">
              <h2 className="text-sm font-bold text-gray-700 mb-4">📈 月別新規登録（直近6ヶ月）</h2>
              <div className="overflow-x-auto">
                <BarChart data={stats!.monthlySignups} />
              </div>
            </div>

            {/* プラン内訳 */}
            <div className="bg-white rounded-2xl shadow-sm p-5">
              <h2 className="text-sm font-bold text-gray-700 mb-4">📊 プラン内訳</h2>
              <PlanBar
                free={stats!.planBreakdown.free}
                basic={stats!.planBreakdown.basic}
                pro={stats!.planBreakdown.pro}
              />
              {s.internalCount > 0 && (
                <p className="text-xs text-purple-500 mt-3">※ 社内アカウント {s.internalCount}社 を含む</p>
              )}
            </div>

            {/* 直近の新規登録 */}
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b">
                <h2 className="text-sm font-bold text-gray-700">🆕 直近の新規登録</h2>
              </div>
              <div className="divide-y">
                {stats!.recentTenants.map(t => (
                  <div key={t.id} className="px-5 py-3 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-gray-800">{t.name}</span>
                        {t.isInternal && (
                          <span className="text-[10px] bg-purple-100 text-purple-700 font-bold px-1.5 py-0.5 rounded-full">社内</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400">{t.email}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-gray-400">
                        {new Date(t.createdAt).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })}
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        t.plan === 'pro' ? 'bg-orange-100 text-orange-600' :
                        t.plan === 'basic' ? 'bg-amber-100 text-amber-600' :
                        'bg-gray-100 text-gray-500'
                      }`}>{t.plan}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

        {/* ── テナント一覧タブ ── */}
        {tab === 'tenants' && (
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b flex items-center justify-between">
              <h2 className="font-semibold text-gray-700 text-sm">テナント一覧 <span className="text-gray-400 font-normal">({tenants.length}社)</span></h2>
            </div>

            {tenants.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-sm">テナントがありません</div>
            ) : (
              <div className="divide-y">
                {tenants.map((t) => (
                  <div key={t.id}>
                    <div className="px-5 py-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="min-w-0 flex-1">
                          {editingTenantId === t.id ? (
                            <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                              <input
                                autoFocus
                                value={editingTenantName}
                                onChange={e => setEditingTenantName(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') saveTenantName(t.id); if (e.key === 'Escape') setEditingTenantId(null); }}
                                className="flex-1 text-sm font-semibold border border-amber-400 rounded-lg px-2 py-1 focus:outline-none bg-white"
                              />
                              <button onClick={() => saveTenantName(t.id)} disabled={editSaving} className="text-xs font-bold text-white bg-amber-500 hover:bg-amber-600 disabled:opacity-50 px-2 py-1 rounded-lg">保存</button>
                              <button onClick={() => setEditingTenantId(null)} className="text-xs text-gray-400 hover:text-gray-600 px-1">✕</button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-gray-800 truncate">{t.name}</span>
                              <button
                                onClick={e => { e.stopPropagation(); setEditingTenantId(t.id); setEditingTenantName(t.name); }}
                                className="text-gray-300 hover:text-amber-500 transition-colors text-xs px-1"
                                title="テナント名を編集"
                              >✏️</button>
                              {statusBadge(t.subscriptionStatus)}
                              {t.isInternal && (
                                <span className="text-[10px] bg-purple-100 text-purple-700 font-bold px-2 py-0.5 rounded-full">社内</span>
                              )}
                            </div>
                          )}
                          <p className="text-xs text-gray-400 mt-0.5 truncate">{t.email}</p>
                        </div>
                        <div className="flex items-center gap-4 ml-4 shrink-0">
                          <div className="hidden sm:block text-xs text-gray-400">
                            <span>{t.storeCount}店舗</span>
                            <span className="mx-1">·</span>
                            <span>{t.userCount}ユーザー</span>
                          </div>
                          <button
                            onClick={() => setExpandedId(expandedId === t.id ? null : t.id)}
                            className="text-gray-300 text-sm px-2 py-1 hover:text-gray-500"
                          >
                            {expandedId === t.id ? '▲' : '▼'}
                          </button>
                        </div>
                      </div>
                    </div>

                    {expandedId === t.id && (
                      <div className="bg-gray-50 border-t px-5 py-4">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3 text-sm">
                          <div>
                            <p className="text-xs text-gray-400">月額/店舗</p>
                            <p className="font-semibold">{t.pricePerStore > 0 ? `¥${t.pricePerStore.toLocaleString()}` : '—'}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400">MRR</p>
                            <p className="font-semibold text-amber-600">¥{t.mrr.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400">登録日</p>
                            <p className="font-semibold">{new Date(t.createdAt).toLocaleDateString('ja-JP')}</p>
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
                            <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                              t.isInternal ? 'translate-x-7' : 'translate-x-1'
                            }`} />
                          </button>
                        </div>

                        {/* ユーザー一覧 */}
                      {t.users.length > 0 && (
                        <div className="mb-3">
                          <p className="text-xs text-gray-400 mb-2">👤 ユーザー一覧</p>
                          <div className="flex flex-col gap-1.5">
                            {t.users.map(u => (
                              <div key={u.id} className="bg-white border rounded-xl px-3 py-2.5 flex items-center justify-between gap-2">
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-sm font-semibold text-gray-800 truncate">{u.email}</span>
                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${u.role === 'tenant_admin' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'}`}>
                                      {u.role === 'tenant_admin' ? '管理者' : 'スタッフ'}
                                    </span>
                                  </div>
                                  {u.name && <p className="text-xs text-gray-400">{u.name}</p>}
                                </div>
                                <button
                                  onClick={() => { setResetUserId(u.id); setResetPassword(''); setResetMsg(null); }}
                                  className="text-xs text-blue-500 hover:text-blue-700 font-semibold shrink-0 px-2 py-1 rounded-lg hover:bg-blue-50 transition-colors"
                                >
                                  PW変更
                                </button>
                              </div>
                            ))}
                          </div>

                          {/* パスワードリセットフォーム */}
                          {t.users.some(u => u.id === resetUserId) && (
                            <div className="mt-2 bg-blue-50 border border-blue-200 rounded-xl p-3">
                              <p className="text-xs font-semibold text-blue-700 mb-2">
                                🔑 {t.users.find(u => u.id === resetUserId)?.email} のパスワード変更
                              </p>
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  value={resetPassword}
                                  onChange={e => setResetPassword(e.target.value)}
                                  placeholder="新しいパスワード（4文字以上）"
                                  className="flex-1 text-sm border border-blue-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-400 bg-white"
                                />
                                <button
                                  onClick={resetUserPassword}
                                  disabled={resetLoading || resetPassword.length < 4}
                                  className="text-xs font-bold bg-blue-500 hover:bg-blue-600 disabled:opacity-40 text-white px-3 py-2 rounded-lg transition-colors"
                                >
                                  {resetLoading ? '…' : '変更'}
                                </button>
                                <button
                                  onClick={() => { setResetUserId(null); setResetMsg(null); }}
                                  className="text-xs text-gray-400 hover:text-gray-600 px-2"
                                >
                                  ✕
                                </button>
                              </div>
                              {resetMsg && (
                                <p className={`text-xs mt-1.5 font-semibold ${resetMsg.ok ? 'text-green-600' : 'text-red-500'}`}>
                                  {resetMsg.ok ? '✅' : '❌'} {resetMsg.text}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {/* 店舗一覧＋スタッフ追加 */}
                      {t.stores.length > 0 && (
                        <div>
                          <p className="text-xs text-gray-400 mb-2">🏪 店舗・スタッフアカウント</p>
                          <div className="flex flex-col gap-2">
                            {t.stores.map(s => (
                              <div key={s.id} className="bg-white border rounded-xl px-3 py-2.5">
                                <div className="flex items-center justify-between mb-1">
                                  {editingStoreId === s.id ? (
                                    <div className="flex items-center gap-2 flex-1 mr-2">
                                      <input
                                        autoFocus
                                        value={editingStoreName}
                                        onChange={e => setEditingStoreName(e.target.value)}
                                        onKeyDown={e => { if (e.key === 'Enter') saveStoreName(t.id, s.id); if (e.key === 'Escape') setEditingStoreId(null); }}
                                        className="flex-1 text-sm font-semibold border border-amber-400 rounded-lg px-2 py-1 focus:outline-none bg-white"
                                      />
                                      <button onClick={() => saveStoreName(t.id, s.id)} disabled={editSaving} className="text-xs font-bold text-white bg-amber-500 hover:bg-amber-600 disabled:opacity-50 px-2 py-1 rounded-lg">保存</button>
                                      <button onClick={() => setEditingStoreId(null)} className="text-xs text-gray-400 hover:text-gray-600">✕</button>
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-sm font-semibold text-gray-700">{s.name}</span>
                                      <button
                                        onClick={() => { setEditingStoreId(s.id); setEditingStoreName(s.name); }}
                                        className="text-gray-300 hover:text-amber-500 transition-colors text-xs"
                                        title="店舗名を編集"
                                      >✏️</button>
                                    </div>
                                  )}
                                  <button
                                    onClick={() => {
                                      setAddStaffStoreId(addStaffStoreId === s.id ? null : s.id);
                                      setStaffEmail(''); setStaffPassword(''); setStaffName('');
                                      setStaffMsg(null); setCreatedCredential(null);
                                    }}
                                    className="text-xs text-green-600 hover:text-green-700 font-semibold px-2 py-1 rounded-lg hover:bg-green-50 transition-colors shrink-0"
                                  >
                                    ＋ スタッフ追加
                                  </button>
                                </div>

                                {/* 該当店舗のスタッフ一覧 */}
                                {t.users.filter(u => u.role === 'store_staff').length > 0 && (
                                  <div className="flex flex-col gap-1 mb-1">
                                    {t.users
                                      .filter(u => u.role === 'store_staff')
                                      .map(u => (
                                        <div key={u.id} className="flex items-center gap-2 text-xs text-gray-500 pl-1">
                                          <span>👤</span>
                                          <span className="truncate">{u.email}</span>
                                        </div>
                                      ))}
                                  </div>
                                )}

                                {/* スタッフ追加フォーム */}
                                {addStaffStoreId === s.id && (
                                  <div className="mt-2 bg-green-50 border border-green-200 rounded-xl p-3">
                                    <p className="text-xs font-semibold text-green-700 mb-2">
                                      ＋ 「{s.name}」のスタッフアカウントを作成
                                    </p>
                                    <div className="flex flex-col gap-2">
                                      <input
                                        type="text"
                                        value={staffName}
                                        onChange={e => setStaffName(e.target.value)}
                                        placeholder="名前（任意）"
                                        className="text-sm border border-green-200 rounded-lg px-3 py-2 focus:outline-none focus:border-green-400 bg-white"
                                      />
                                      <input
                                        type="email"
                                        value={staffEmail}
                                        onChange={e => setStaffEmail(e.target.value)}
                                        placeholder="メールアドレス"
                                        className="text-sm border border-green-200 rounded-lg px-3 py-2 focus:outline-none focus:border-green-400 bg-white"
                                      />
                                      <input
                                        type="text"
                                        value={staffPassword}
                                        onChange={e => setStaffPassword(e.target.value)}
                                        placeholder="パスワード（4文字以上）"
                                        className="text-sm border border-green-200 rounded-lg px-3 py-2 focus:outline-none focus:border-green-400 bg-white"
                                      />
                                      <div className="flex gap-2">
                                        <button
                                          onClick={() => addStaffAccount(t.id)}
                                          disabled={staffLoading || !staffEmail || staffPassword.length < 4}
                                          className="flex-1 text-sm font-bold bg-green-500 hover:bg-green-600 disabled:opacity-40 text-white py-2 rounded-lg transition-colors"
                                        >
                                          {staffLoading ? '作成中…' : 'アカウント作成'}
                                        </button>
                                        <button
                                          onClick={() => { setAddStaffStoreId(null); setStaffMsg(null); }}
                                          className="text-xs text-gray-400 hover:text-gray-600 px-3"
                                        >✕</button>
                                      </div>
                                      {staffMsg && (
                                        <p className={`text-xs font-semibold ${staffMsg.ok ? 'text-green-600' : 'text-red-500'}`}>
                                          {staffMsg.ok ? '✅' : '❌'} {staffMsg.text}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>

                          {/* 作成済み認証情報の表示（一度だけ） */}
                          {createdCredential && (
                            <div className="mt-3 bg-yellow-50 border border-yellow-300 rounded-xl p-3">
                              <p className="text-xs font-bold text-yellow-700 mb-2">📋 作成したアカウント情報（スタッフに共有してください）</p>
                              <div className="flex flex-col gap-1 font-mono text-sm">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-gray-500 w-24">メール:</span>
                                  <span className="font-semibold text-gray-800">{createdCredential.email}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-gray-500 w-24">パスワード:</span>
                                  <span className="font-semibold text-gray-800">{createdCredential.password}</span>
                                </div>
                              </div>
                              <p className="text-[10px] text-yellow-600 mt-2">※ このページを閉じると再表示できません</p>
                              <button
                                onClick={() => setCreatedCredential(null)}
                                className="text-xs text-yellow-600 hover:text-yellow-800 mt-1 font-semibold"
                              >
                                閉じる
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── 問い合わせタブ ── */}
        {tab === 'inquiries' && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between mb-1">
              <p className="text-sm text-gray-500">
                全 <span className="font-bold text-gray-800">{inquiries.length}</span> 件
                {unreadCount > 0 && (
                  <span className="ml-2 text-red-600 font-bold">未読 {unreadCount} 件</span>
                )}
              </p>
            </div>

            {inquiries.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 text-center text-gray-400 text-sm shadow-sm">
                問い合わせはまだありません
              </div>
            ) : (
              inquiries.map((q) => (
                <div
                  key={q.id}
                  className={`bg-white rounded-2xl shadow-sm border-2 transition-colors ${
                    q.isRead ? 'border-gray-100' : 'border-red-200'
                  }`}
                >
                  {/* ヘッダー行 */}
                  <button
                    className="w-full text-left px-5 py-4"
                    onClick={() => {
                      const isOpening = expandedInquiryId !== q.id;
                      setExpandedInquiryId(isOpening ? q.id : null);
                      if (isOpening && !q.isRead) markInquiryRead(q.id);
                    }}
                  >
                    <div className="flex items-center gap-3">
                      {!q.isRead && (
                        <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
                      )}
                      <span className="text-xs bg-gray-100 text-gray-600 font-semibold px-2 py-0.5 rounded-full flex-shrink-0">
                        {CATEGORY_LABEL[q.category] ?? q.category}
                      </span>
                      <span className="text-sm text-gray-700 truncate flex-1">
                        {q.content.slice(0, 60)}{q.content.length > 60 ? '…' : ''}
                      </span>
                      <span className="text-xs text-gray-400 flex-shrink-0">
                        {new Date(q.createdAt).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    {q.tenantName && (
                      <div className="flex items-center gap-2 mt-1.5 ml-5">
                        <span className="text-xs text-gray-400">{q.tenantName}</span>
                        {q.plan && (
                          <span className="text-[10px] bg-amber-100 text-amber-700 font-bold px-1.5 py-0.5 rounded-full">{q.plan}</span>
                        )}
                        {q.email && (
                          <span className="text-xs text-gray-400">{q.email}</span>
                        )}
                      </div>
                    )}
                  </button>

                  {/* 展開内容 */}
                  {expandedInquiryId === q.id && (
                    <div className="border-t border-gray-100 px-5 py-4">
                      <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{q.content}</p>
                      {q.email && (
                        <div className="mt-4 flex gap-2 items-center">
                          <a
                            href={`mailto:${q.email}?subject=【Costra】お問い合わせへの回答`}
                            className="inline-flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors"
                          >
                            ✉️ {q.email} に返信
                          </a>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        <p className="text-center text-xs text-gray-300 mt-6">Costra Admin Console · {new Date().getFullYear()}</p>
      </div>
    </div>
  );
}
