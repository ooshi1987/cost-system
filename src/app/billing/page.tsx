'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

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
  if (limit === null) return <p style={{ fontSize: 12, color: '#16a34a', fontWeight: 600 }}>無制限</p>;
  const pct = Math.min((used / limit) * 100, 100);
  const over = used >= limit;
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
        <span style={{ color: over ? 'var(--accent)' : 'var(--muted)', fontWeight: over ? 700 : 400 }}>{used} / {limit}</span>
        {over && <span style={{ color: 'var(--accent)', fontWeight: 700 }}>上限到達</span>}
      </div>
      <div style={{ height: 6, background: 'var(--line-2)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: over ? 'var(--accent)' : 'var(--accent-2)', borderRadius: 3, transition: 'width .4s ease' }} />
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
    <div style={{ minHeight: '100svh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: 'var(--muted)', fontSize: 14 }}>読み込み中…</p>
    </div>
  );

  const planBadgeStyle = (plan: string): React.CSSProperties => {
    if (plan === 'pro')   return { background: '#f3e8ff', color: '#7c3aed', fontWeight: 700, fontSize: 11, padding: '3px 10px', borderRadius: 20 };
    if (plan === 'basic') return { background: '#fff3e0', color: 'var(--accent)', fontWeight: 700, fontSize: 11, padding: '3px 10px', borderRadius: 20 };
    return { background: 'var(--line-2)', color: 'var(--muted)', fontWeight: 700, fontSize: 11, padding: '3px 10px', borderRadius: 20 };
  };

  return (
    <div style={{ minHeight: '100svh', background: 'var(--bg)', paddingBottom: 80 }}>
      <div style={{ maxWidth: 560, margin: '0 auto', padding: '20px 16px 40px' }}>

        {/* ヘッダー */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <button
            onClick={() => router.push('/dashboard')}
            style={{ fontSize: 13, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--sans)', padding: 0 }}
          >
            ← 戻る
          </button>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink)', margin: 0 }}>プラン・請求</h1>
        </div>

        {/* 成功バナー */}
        {success && (
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 'var(--r-lg)', padding: '14px 16px', marginBottom: 16, color: '#15803d', fontSize: 13, fontWeight: 600 }}>
            プランを開始しました！ご利用ありがとうございます。
          </div>
        )}

        {/* 滞納バナー */}
        {isPastDue && (
          <div style={{ background: '#fff1f1', border: '1px solid #fecaca', borderRadius: 'var(--r-lg)', padding: '14px 16px', marginBottom: 16, color: 'var(--accent)', fontSize: 13, fontWeight: 600 }}>
            お支払いに問題があります。請求ポータルから確認してください。
          </div>
        )}

        {/* エラー */}
        {error && (
          <div style={{ background: '#fff1f1', border: '1px solid #fecaca', borderRadius: 'var(--r-lg)', padding: '14px 16px', marginBottom: 16, color: 'var(--accent)', fontSize: 13 }}>
            {error}
          </div>
        )}

        {/* 現在のプラン */}
        <div style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 'var(--r-lg)', padding: '20px 18px', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
            <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)', margin: 0 }}>現在のプラン</h2>
            <span style={planBadgeStyle(currentPlan)}>
              {currentPlan === 'pro' ? 'Pro' : currentPlan === 'basic' ? 'Basic' : '無料'}
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>メニュー品目</p>
              <UsageBar used={info?.usage.menuItems.used ?? 0} limit={info?.usage.menuItems.limit ?? 10} />
            </div>
            <div>
              <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>食材・調味料</p>
              <UsageBar used={info?.usage.ingredients.used ?? 0} limit={info?.usage.ingredients.limit ?? 20} />
            </div>
          </div>
        </div>

        {/* 有料プランのポータル */}
        {isPaid && (
          <div style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 'var(--r-lg)', padding: '20px 18px', marginBottom: 16 }}>
            <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)', marginBottom: 6 }}>お支払い管理</h2>
            <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16 }}>請求書・支払い方法の変更・解約は Stripe ポータルで行えます。</p>
            <button
              onClick={openPortal}
              disabled={!!redirecting}
              style={{
                width: '100%', background: 'var(--ink)', color: '#fff',
                border: 'none', borderRadius: 'var(--r)', padding: '12px 0',
                fontSize: 14, fontWeight: 700, cursor: redirecting ? 'not-allowed' : 'pointer',
                opacity: redirecting ? 0.5 : 1, fontFamily: 'var(--sans)',
              }}
            >
              {redirecting === 'portal' ? '移動中…' : '請求ポータルを開く →'}
            </button>
          </div>
        )}

        {/* プラン比較カード */}
        {!isPaid && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)', margin: 0 }}>プランを選択</h2>

            {/* Basic */}
            <div style={{
              background: 'var(--paper)',
              border: `2px solid ${currentPlan === 'basic' ? 'var(--accent-2)' : 'var(--line)'}`,
              borderRadius: 'var(--r-lg)', padding: '20px 18px',
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
                <div>
                  <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink)', marginBottom: 2 }}>Basic</p>
                  <p style={{ fontSize: 12, color: 'var(--muted)' }}>個人店・1店舗向け</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: 24, fontWeight: 700, color: 'var(--accent)', lineHeight: 1 }}>¥1,980</p>
                  <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>/ 月（税別）</p>
                </div>
              </div>
              <ul style={{ fontSize: 13, color: 'var(--ink-2)', listStyle: 'none', padding: 0, margin: '0 0 16px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                <li>✓ メニュー品目・食材 <strong>無制限</strong></li>
                <li>✓ 全スキャン・原価計算機能</li>
                <li>✓ 1店舗</li>
              </ul>
              {currentPlan !== 'basic' && currentPlan !== 'pro' && (
                <button
                  onClick={() => startCheckout('basic')}
                  disabled={!!redirecting}
                  style={{
                    width: '100%', background: 'var(--accent)', color: '#fff',
                    border: 'none', borderRadius: 'var(--r)', padding: '12px 0',
                    fontSize: 14, fontWeight: 700, cursor: redirecting ? 'not-allowed' : 'pointer',
                    opacity: redirecting ? 0.5 : 1, fontFamily: 'var(--sans)',
                  }}
                >
                  {redirecting === 'basic' ? '決済ページへ移動中…' : 'Basicプランを始める →'}
                </button>
              )}
              {currentPlan === 'basic' && (
                <p style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 600, textAlign: 'center' }}>現在のプランです</p>
              )}
            </div>

            {/* Pro */}
            <div style={{
              background: 'var(--paper)',
              border: `2px solid ${currentPlan === 'pro' ? '#7c3aed' : 'var(--line)'}`,
              borderRadius: 'var(--r-lg)', padding: '20px 18px',
              position: 'relative',
            }}>
              <div style={{ position: 'absolute', top: -12, left: 16 }}>
                <span style={{ background: '#7c3aed', color: '#fff', fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20 }}>多店舗おすすめ</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14, marginTop: 8 }}>
                <div>
                  <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink)', marginBottom: 2 }}>Pro</p>
                  <p style={{ fontSize: 12, color: 'var(--muted)' }}>多店舗展開・チェーン向け</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: 24, fontWeight: 700, color: '#7c3aed', lineHeight: 1 }}>¥4,980</p>
                  <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>/ 月（税別）</p>
                </div>
              </div>
              <ul style={{ fontSize: 13, color: 'var(--ink-2)', listStyle: 'none', padding: 0, margin: '0 0 16px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                <li>✓ メニュー品目・食材 <strong>無制限</strong></li>
                <li>✓ 全スキャン・原価計算機能</li>
                <li>✓ 店舗数 <strong>無制限</strong></li>
                <li>✓ スタッフアカウント追加</li>
              </ul>
              {currentPlan !== 'pro' && (
                <button
                  onClick={() => startCheckout('pro')}
                  disabled={!!redirecting}
                  style={{
                    width: '100%', background: '#7c3aed', color: '#fff',
                    border: 'none', borderRadius: 'var(--r)', padding: '12px 0',
                    fontSize: 14, fontWeight: 700, cursor: redirecting ? 'not-allowed' : 'pointer',
                    opacity: redirecting ? 0.5 : 1, fontFamily: 'var(--sans)',
                  }}
                >
                  {redirecting === 'pro' ? '決済ページへ移動中…' : 'Proプランを始める →'}
                </button>
              )}
              {currentPlan === 'pro' && (
                <p style={{ fontSize: 12, color: '#7c3aed', fontWeight: 600, textAlign: 'center' }}>現在のプランです</p>
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
    <Suspense fallback={
      <div style={{ minHeight: '100svh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--muted)', fontSize: 14 }}>読み込み中…</p>
      </div>
    }>
      <BillingContent />
    </Suspense>
  );
}
