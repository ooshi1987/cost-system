'use client';

import Link from 'next/link';
import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'done'>('idle');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) setError('リンクが無効です。再度パスワードリセットをお試しください。');
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) { setError('パスワードが一致しません'); return; }
    setError('');
    setStatus('loading');
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'エラーが発生しました'); setStatus('idle'); return; }
      setStatus('done');
      setTimeout(() => router.push('/login'), 2500);
    } catch {
      setError('エラーが発生しました');
      setStatus('idle');
    }
  };

  const fieldStyle = {
    border: '1px solid var(--line)',
    borderRadius: 'var(--r)',
    padding: '11px 14px',
    fontSize: '15px',
    color: 'var(--ink)',
    background: 'var(--bg)',
    outline: 'none',
    fontFamily: 'var(--sans)',
  } as React.CSSProperties;

  return (
    <div style={{ width: '100%', maxWidth: '400px', background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 'var(--r-xl)', padding: '36px 32px', boxShadow: 'var(--shadow-md)' }}>

      {status === 'done' ? (
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '40px', marginBottom: '16px' }}>✅</div>
          <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--ink)', margin: '0 0 10px' }}>パスワードを変更しました</h1>
          <p style={{ fontSize: '14px', color: 'var(--muted)', lineHeight: 1.7, margin: '0 0 8px' }}>
            新しいパスワードでログインできます。<br />
            ログイン画面に移動します…
          </p>
        </div>
      ) : (
        <>
          <h1 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--ink)', margin: '0 0 6px' }}>新しいパスワードを設定</h1>
          <p style={{ fontSize: '13px', color: 'var(--muted)', margin: '0 0 28px' }}>8文字以上で入力してください。</p>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink-2)' }}>新しいパスワード</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="8文字以上"
                required
                minLength={8}
                autoComplete="new-password"
                style={fieldStyle}
                onFocus={(e) => e.target.style.borderColor = 'var(--accent)'}
                onBlur={(e) => e.target.style.borderColor = 'var(--line)'}
              />
            </label>

            <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink-2)' }}>確認（もう一度入力）</span>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="同じパスワードを入力"
                required
                autoComplete="new-password"
                style={fieldStyle}
                onFocus={(e) => e.target.style.borderColor = 'var(--accent)'}
                onBlur={(e) => e.target.style.borderColor = 'var(--line)'}
              />
            </label>

            {error && (
              <div style={{ background: 'var(--accent-soft)', border: '1px solid var(--accent-2)', borderRadius: 'var(--r)', padding: '10px 14px', color: 'var(--accent)', fontSize: '13px' }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={status === 'loading' || !token}
              style={{
                background: (status === 'loading' || !token) ? 'var(--muted)' : 'var(--accent)',
                color: '#fff',
                border: 'none',
                borderRadius: 'var(--r)',
                padding: '13px',
                fontSize: '15px',
                fontWeight: 700,
                cursor: (status === 'loading' || !token) ? 'not-allowed' : 'pointer',
                fontFamily: 'var(--sans)',
              }}
              onMouseEnter={(e) => { if (status !== 'loading' && token) (e.target as HTMLButtonElement).style.background = 'var(--accent-h)'; }}
              onMouseLeave={(e) => { if (status !== 'loading' && token) (e.target as HTMLButtonElement).style.background = 'var(--accent)'; }}
            >
              {status === 'loading' ? '変更中…' : 'パスワードを変更する'}
            </button>
          </form>
        </>
      )}
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div style={{ minHeight: '100svh', background: 'var(--bg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 20px' }}>
      <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '40px', textDecoration: 'none' }}>
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
          <circle cx="14" cy="14" r="13" stroke="var(--accent)" strokeWidth="1.5"/>
          <path d="M9 14h10M14 9v10" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
        <span style={{ fontSize: '20px', fontWeight: 700, color: 'var(--ink)', letterSpacing: '-0.02em' }}>Costra</span>
      </Link>
      <Suspense fallback={<div style={{ color: 'var(--muted)', fontSize: '14px' }}>読み込み中…</div>}>
        <ResetPasswordForm />
      </Suspense>
      <p style={{ marginTop: '24px', fontSize: '13px', color: 'var(--muted)' }}>
        <Link href="/login" style={{ color: 'var(--accent)', fontWeight: 600, textDecoration: 'none' }}>
          ← ログイン画面に戻る
        </Link>
      </p>
    </div>
  );
}
