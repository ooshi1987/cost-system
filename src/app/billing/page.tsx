'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

interface BillingInfo {
  subscriptionStatus: string | null;
  storeCount: number;
  trialUsage: {
    menuItems: { used: number; limit: number };
    ingredients: { used: number; limit: number };
  };
  monthlyTotal: number;
  pricePerStore: number;
}

function BillingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [info, setInfo] = useState<BillingInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [redirecting, setRedirecting] = useState(false);
  const [error, setError] = useState('');
  const success = searchParams.get('success') === '1';

  useEffect(() => {
    fetch('/api/billing/info').then(async (r) => {
      if (r.ok) setInfo(await r.json());
      setLoading(false);
    });
  }, []);

  const startCheckout = async () => {
    setRedirecting(true); setError('');
    const res = await fetch('/api/billing/checkout', { method: 'POST' });
    if (res.ok) {
      const { url } = await res.json();
      window.location.href = url;
    } else {
      const d = await res.json();
      setError(d.error ?? '決済ページを開けませんでした');
      setRedirecting(false);
    }
  };

  const openPortal = async () => {
    setRedirecting(true); setError('');
    const res = await fetch('/api/billing/portal', { method: 'POST' });
    if (res.ok) {
      const { url } = await res.json();
      window.location.href = url;
    } else {
      const d = await res.json();
      setError(d.error ?? 'ポータルを開けませんでした');
      setRedirecting(false);
    }
  };

  const isPaid = info?.subscriptionStatus === 'active';
  const isPastDue = info?.subscriptionStatus === 'past_due';

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p className="text-gray-400">読み込み中…</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => router.push('/admin')} className="text-amber-600 text-sm">← 戻る</button>
          <h1 className="text-xl font-bold">プラン・請求</h1>
        </div>

        {success && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-4 mb-4 text-green-700 text-sm">
            🎉 サブスクリプションを開始しました！ご利用ありがとうございます。
          </div>
        )}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-4 text-red-600 text-sm">{error}</div>
        )}

        {/* 現在のプラン */}
        <div className="bg-white rounded-2xl shadow-sm p-5 mb-4">
          <h2 className="font-bold text-base mb-4">📋 現在のプラン</h2>

          {isPaid ? (
            <div className="flex items-center gap-3 mb-4">
              <span className="bg-amber-100 text-amber-700 text-sm font-bold px-3 py-1.5 rounded-full">
                ✅ 有料プラン（アクティブ）
              </span>
            </div>
          ) : isPastDue ? (
            <div className="flex items-center gap-3 mb-4">
              <span className="bg-red-100 text-red-700 text-sm font-bold px-3 py-1.5 rounded-full">
                ⚠️ 支払い遅延
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-3 mb-4">
              <span className="bg-gray-100 text-gray-600 text-sm font-bold px-3 py-1.5 rounded-full">
                🆓 トライアル中
              </span>
            </div>
          )}

          <div className="bg-gray-50 rounded-xl p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">店舗数</span>
              <span className="font-semibold">{info?.storeCount ?? 0}店舗</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">単価</span>
              <span className="font-semibold">¥{(info?.pricePerStore ?? 3000).toLocaleString()} / 店舗 / 月</span>
            </div>
            <div className="border-t pt-2 flex justify-between text-sm font-bold">
              <span>合計（税別）</span>
              <span className="text-amber-600">¥{(info?.monthlyTotal ?? 0).toLocaleString()} / 月</span>
            </div>
          </div>
        </div>

        {/* トライアル使用状況（未課金のみ） */}
        {!isPaid && info && (
          <div className="bg-white rounded-2xl shadow-sm p-5 mb-4">
            <h2 className="font-bold text-base mb-4">📊 トライアル使用状況</h2>
            <p className="text-xs text-gray-400 mb-3">
              トライアル中は店舗ごとにメニュー {info.trialUsage.menuItems.limit}件・食材 {info.trialUsage.ingredients.limit}件まで無料でご利用いただけます。
            </p>

            {/* メニュー */}
            <div className="mb-4">
              <div className="flex justify-between text-sm mb-1.5">
                <span className="text-gray-600 font-medium">🍽 メニュー品目</span>
                <span className={`font-semibold ${info.trialUsage.menuItems.used >= info.trialUsage.menuItems.limit ? 'text-red-500' : 'text-gray-700'}`}>
                  {info.trialUsage.menuItems.used} / {info.trialUsage.menuItems.limit}件
                </span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${info.trialUsage.menuItems.used >= info.trialUsage.menuItems.limit ? 'bg-red-400' : 'bg-amber-400'}`}
                  style={{ width: `${Math.min((info.trialUsage.menuItems.used / info.trialUsage.menuItems.limit) * 100, 100)}%` }}
                />
              </div>
            </div>

            {/* 食材 */}
            <div>
              <div className="flex justify-between text-sm mb-1.5">
                <span className="text-gray-600 font-medium">🥦 食材・調味料</span>
                <span className={`font-semibold ${info.trialUsage.ingredients.used >= info.trialUsage.ingredients.limit ? 'text-red-500' : 'text-gray-700'}`}>
                  {info.trialUsage.ingredients.used} / {info.trialUsage.ingredients.limit}件
                </span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${info.trialUsage.ingredients.used >= info.trialUsage.ingredients.limit ? 'bg-red-400' : 'bg-green-400'}`}
                  style={{ width: `${Math.min((info.trialUsage.ingredients.used / info.trialUsage.ingredients.limit) * 100, 100)}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {/* アクションボタン */}
        <div className="bg-white rounded-2xl shadow-sm p-5">
          {isPaid || isPastDue ? (
            <>
              <h2 className="font-bold text-base mb-3">💳 お支払い管理</h2>
              <p className="text-sm text-gray-500 mb-4">
                請求書の確認・支払い方法の変更・プランのキャンセルは Stripe ポータルで行えます。
              </p>
              <button
                onClick={openPortal}
                disabled={redirecting}
                className="w-full bg-amber-500 hover:bg-amber-600 text-white py-3 rounded-xl font-bold text-sm disabled:bg-gray-200 transition-colors"
              >
                {redirecting ? '移動中…' : '請求ポータルを開く →'}
              </button>
            </>
          ) : (
            <>
              <h2 className="font-bold text-base mb-2">🚀 有料プランへアップグレード</h2>
              <p className="text-sm text-gray-500 mb-1">品目数の制限がなくなり、全機能が無制限で使えます。</p>
              <ul className="text-sm text-gray-500 mb-4 space-y-1">
                <li>✅ メニュー品目・食材の登録が無制限</li>
                <li>✅ 複数店舗のデータを一元管理</li>
                <li>✅ 全スキャン・原価計算機能が無制限</li>
              </ul>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4">
                <p className="text-amber-700 text-sm font-semibold">
                  {info?.storeCount ?? 1}店舗 × ¥{(info?.pricePerStore ?? 3000).toLocaleString()} = <span className="text-base">月額 ¥{(info?.monthlyTotal ?? 3000).toLocaleString()}</span>（税別）
                </p>
              </div>
              <button
                onClick={startCheckout}
                disabled={redirecting}
                className="w-full bg-amber-500 hover:bg-amber-600 text-white py-3 rounded-xl font-bold text-sm disabled:bg-gray-200 transition-colors shadow-lg shadow-amber-200"
              >
                {redirecting ? '決済ページへ移動中…' : '今すぐアップグレード →'}
              </button>
            </>
          )}
        </div>
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
