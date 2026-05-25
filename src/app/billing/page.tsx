'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

interface BillingInfo {
  subscriptionStatus: string | null;
  plan: string;
  planName: string;
  storeCount: number;
  usage: {
    menuItems:   { used: number; limit: number | null };
    ingredients: { used: number; limit: number | null };
  };
}

function UsageBar({ used, limit }: { used: number; limit: number | null }) {
  if (limit === null) return <p className="text-xs text-green-600 font-medium">無制限</p>;
  const pct = Math.min((used / limit) * 100, 100);
  const over = used >= limit;
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className={over ? 'text-red-500 font-bold' : 'text-gray-500'}>{used} / {limit}</span>
        {over && <span className="text-red-500 font-bold">上限到達</span>}
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${over ? 'bg-red-400' : 'bg-amber-400'}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function BillingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [info, setInfo] = useState<BillingInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [redirecting, setRedirecting] = useState<string | null>(null);
  const [error, setError] = useState('');
  const success = searchParams.get('success') === '1';

  useEffect(() => {
    fetch('/api/billing/info').then(async (r) => {
      if (r.ok) setInfo(await r.json());
      setLoading(false);
    });
  }, []);

  const startCheckout = async (planId: 'basic' | 'pro') => {
    setRedirecting(planId); setError('');
    const res = await fetch('/api/billing/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ planId }),
    });
    if (res.ok) {
      const { url } = await res.json();
      window.location.href = url;
    } else {
      const d = await res.json();
      setError(d.error ?? '決済ページを開けませんでした');
      setRedirecting(null);
    }
  };

  const openPortal = async () => {
    setRedirecting('portal'); setError('');
    const res = await fetch('/api/billing/portal', { method: 'POST' });
    if (res.ok) {
      const { url } = await res.json();
      window.location.href = url;
    } else {
      const d = await res.json();
      setError(d.error ?? 'ポータルを開けませんでした');
      setRedirecting(null);
    }
  };

  const currentPlan = info?.plan ?? 'free';
  const isPaid = info?.subscriptionStatus === 'active';
  const isPastDue = info?.subscriptionStatus === 'past_due';

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p className="text-gray-400">読み込み中…</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="max-w-xl mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => router.push('/')} className="text-amber-600 text-sm">← 戻る</button>
          <h1 className="text-xl font-bold">プラン・請求</h1>
        </div>

        {success && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-4 mb-4 text-green-700 text-sm font-medium">
            🎉 プランを開始しました！ご利用ありがとうございます。
          </div>
        )}
        {isPastDue && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-4 text-red-600 text-sm font-medium">
            ⚠️ お支払いに問題があります。請求ポータルから確認してください。
          </div>
        )}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-4 text-red-600 text-sm">{error}</div>
        )}

        {/* 現在の使用状況 */}
        <div className="bg-white rounded-2xl shadow-sm p-5 mb-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-base">現在のプラン</h2>
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
              currentPlan === 'pro'   ? 'bg-purple-100 text-purple-700' :
              currentPlan === 'basic' ? 'bg-amber-100 text-amber-700'  :
                                        'bg-gray-100 text-gray-600'
            }`}>
              {currentPlan === 'pro' ? '⭐ Pro' : currentPlan === 'basic' ? '✅ Basic' : '🆓 無料'}
            </span>
          </div>
          <div className="space-y-3">
            <div>
              <p className="text-xs text-gray-500 mb-1">🍽 メニュー品目</p>
              <UsageBar used={info?.usage.menuItems.used ?? 0} limit={info?.usage.menuItems.limit ?? 10} />
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">🥦 食材・調味料</p>
              <UsageBar used={info?.usage.ingredients.used ?? 0} limit={info?.usage.ingredients.limit ?? 20} />
            </div>
          </div>
        </div>

        {/* 有料プランのポータル */}
        {isPaid && (
          <div className="bg-white rounded-2xl shadow-sm p-5 mb-5">
            <h2 className="font-bold text-base mb-2">💳 お支払い管理</h2>
            <p className="text-sm text-gray-500 mb-4">請求書・支払い方法の変更・解約は Stripe ポータルで行えます。</p>
            <button
              onClick={openPortal}
              disabled={!!redirecting}
              className="w-full bg-gray-800 hover:bg-gray-900 text-white py-3 rounded-xl font-bold text-sm disabled:bg-gray-300 transition-colors"
            >
              {redirecting === 'portal' ? '移動中…' : '請求ポータルを開く →'}
            </button>
          </div>
        )}

        {/* プラン比較カード */}
        {!isPaid && (
          <div className="space-y-3">
            <h2 className="font-bold text-base px-1">プランを選択</h2>

            {/* Basic */}
            <div className={`bg-white rounded-2xl shadow-sm p-5 border-2 ${currentPlan === 'basic' ? 'border-amber-400' : 'border-transparent'}`}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-bold text-lg">Basic</p>
                  <p className="text-gray-400 text-xs">個人店・1店舗向け</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-amber-600">¥1,980</p>
                  <p className="text-xs text-gray-400">/ 月（税別）</p>
                </div>
              </div>
              <ul className="text-sm text-gray-600 space-y-1.5 mb-4">
                <li>✅ メニュー品目・食材 <strong>無制限</strong></li>
                <li>✅ 全スキャン・原価計算機能</li>
                <li>✅ 1店舗</li>
              </ul>
              {currentPlan !== 'basic' && currentPlan !== 'pro' && (
                <button
                  onClick={() => startCheckout('basic')}
                  disabled={!!redirecting}
                  className="w-full bg-amber-500 hover:bg-amber-600 text-white py-3 rounded-xl font-bold text-sm disabled:bg-gray-200 transition-colors shadow-md shadow-amber-100"
                >
                  {redirecting === 'basic' ? '決済ページへ移動中…' : 'Basicプランを始める →'}
                </button>
              )}
            </div>

            {/* Pro */}
            <div className={`bg-white rounded-2xl shadow-sm p-5 border-2 ${currentPlan === 'pro' ? 'border-purple-400' : 'border-transparent'} relative`}>
              <div className="absolute -top-3 left-4">
                <span className="bg-purple-600 text-white text-xs font-bold px-3 py-1 rounded-full">多店舗おすすめ</span>
              </div>
              <div className="flex items-start justify-between mb-3 mt-1">
                <div>
                  <p className="font-bold text-lg">Pro</p>
                  <p className="text-gray-400 text-xs">多店舗展開・チェーン向け</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-purple-600">¥4,980</p>
                  <p className="text-xs text-gray-400">/ 月（税別）</p>
                </div>
              </div>
              <ul className="text-sm text-gray-600 space-y-1.5 mb-4">
                <li>✅ メニュー品目・食材 <strong>無制限</strong></li>
                <li>✅ 全スキャン・原価計算機能</li>
                <li>✅ 店舗数 <strong>無制限</strong></li>
                <li>✅ スタッフアカウント追加</li>
              </ul>
              {currentPlan !== 'pro' && (
                <button
                  onClick={() => startCheckout('pro')}
                  disabled={!!redirecting}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-xl font-bold text-sm disabled:bg-gray-200 transition-colors shadow-md shadow-purple-100"
                >
                  {redirecting === 'pro' ? '決済ページへ移動中…' : 'Proプランを始める →'}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function BillingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center"><p className="text-gray-400">読み込み中…</p></div>}>
      <BillingContent />
    </Suspense>
  );
}
