'use client';

import Link from 'next/link';
import { useState } from 'react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'done'>('idle');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setStatus('loading');
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'エラーが発生しました'); setStatus('idle'); return; }
      setStatus('done');
    } catch {
      setError('エラーが発生しました');
      setStatus('idle');
    }
  };

  return (
    <div style={{ minHeight: '100svh', background: 'var(--bg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 20px' }}>

      {/* Logo */}
      <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '40px', textDecoration: 'none' }}>
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
          <circle cx="14" cy="14" r="13" stroke="var(--accent)" strokeWidth="1.5"/>
          <path d="M9 14h10M14 9v10" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
        <span style={{ fontSize: '20px', fontWeight: 700, color: 'var(--ink)', letterSpacing: '-0.02em' }}>Costra</span>
      </Link>

      <div style={{ width: '100%', maxWidth: '400px', background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 'var(--r-xl)', padding: '36px 32px', boxShadow: 'var(--shadow-md)' }}>

        {status === 'done' ? (
          /* 送信完了 */
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '40px', marginBottom: '16px' }}>📬</div>
            <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--ink)', margin: '0 0 10px' }}>メールを送信しました</h1>
            <p style={{ fontSize: '14px', color: 'var(--muted)', lineHeight: 1.7, margin: '0 0 28px' }}>
              <strong style={{ color: 'var(--ink-2)' }}>{email}</strong> に<br />
              パスワードリセット用のリンクを送信しました。<br />
              メールが届かない場合はスパムフォルダをご確認ください。
            </p>
            <Link
              href="/login"
              style={{ display: 'inline-block', color: 'var(--accent)', fontWeight: 600, fontSize: '14px', textDecoration: 'none' }}
            >
              ← ログイン画面に戻る
            </Link>
          </div>
        ) : (
          /* 入力フォーム */
          <>
            <h1 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--ink)', margin: '0 0 6px' }}>パスワードをお忘れの方</h1>
            <p style={{ fontSize: '13px', color: 'var(--muted)', margin: '0 0 28px', lineHeight: 1.6 }}>
              登録済みのメールアドレスを入力してください。<br />
              パスワードリセット用のリンクをお送りします。
            </p>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink-2)' }}>メールアドレス</span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="mail@example.com"
                  required
                  autoComplete="email"
                  style={{
                    border: '1px solid var(--line)',
                    borderRadius: 'var(--r)',
                    padding: '11px 14px',
                    fontSize: '15px',
                    color: 'var(--ink)',
                    background: 'var(--bg)',
                    outline: 'none',
                    fontFamily: 'var(--sans)',
                  }}
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
                disabled={status === 'loading'}
                style={{
                  background: status === 'loading' ? 'var(--muted)' : 'var(--accent)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 'var(--r)',
                  padding: '13px',
                  fontSize: '15px',
                  fontWeight: 700,
                  cursor: status === 'loading' ? 'not-allowed' : 'pointer',
                  fontFamily: 'var(--sans)',
                }}
                onMouseEnter={(e) => { if (status !== 'loading') (e.target as HTMLButtonElement).style.background = 'var(--accent-h)'; }}
                onMouseLeave={(e) => { if (status !== 'loading') (e.target as HTMLButtonElement).style.background = 'var(--accent)'; }}
              >
                {status === 'loading' ? '送信中…' : 'リセットメールを送信'}
              </button>
            </form>
          </>
        )}
      </div>

      {status !== 'done' && (
        <p style={{ marginTop: '24px', fontSize: '13px', color: 'var(--muted)' }}>
          <Link href="/login" style={{ color: 'var(--accent)', fontWeight: 600, textDecoration: 'none' }}>
            ← ログイン画面に戻る
          </Link>
        </p>
      )}
    </div>
  );
}
