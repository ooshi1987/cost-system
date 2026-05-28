'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'ログインに失敗しました'); return; }
      router.push(data.redirect ?? '/');
      router.refresh();
    } catch {
      setError('エラーが発生しました');
    } finally {
      setLoading(false);
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

      {/* Card */}
      <div style={{ width: '100%', maxWidth: '400px', background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 'var(--r-xl)', padding: '36px 32px', boxShadow: 'var(--shadow-md)' }}>

        <h1 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--ink)', marginBottom: '6px', marginTop: 0 }}>ログイン</h1>
        <p style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '28px', marginTop: 0 }}>Costraアカウントにサインインしてください</p>

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
                transition: 'border-color .15s',
              }}
              onFocus={(e) => e.target.style.borderColor = 'var(--accent)'}
              onBlur={(e) => e.target.style.borderColor = 'var(--line)'}
            />
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink-2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>パスワード</span>
              <Link href="/forgot-password" style={{ fontSize: '12px', color: 'var(--accent)', fontWeight: 500, textDecoration: 'none' }}>
                お忘れの方
              </Link>
            </span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="パスワードを入力"
              required
              autoComplete="current-password"
              style={{
                border: '1px solid var(--line)',
                borderRadius: 'var(--r)',
                padding: '11px 14px',
                fontSize: '15px',
                color: 'var(--ink)',
                background: 'var(--bg)',
                outline: 'none',
                transition: 'border-color .15s',
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
            disabled={loading}
            style={{
              background: loading ? 'var(--muted)' : 'var(--accent)',
              color: '#fff',
              border: 'none',
              borderRadius: 'var(--r)',
              padding: '13px',
              fontSize: '15px',
              fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              marginTop: '4px',
              transition: 'background .15s',
              fontFamily: 'var(--sans)',
            }}
            onMouseEnter={(e) => { if (!loading) (e.target as HTMLButtonElement).style.background = 'var(--accent-h)'; }}
            onMouseLeave={(e) => { if (!loading) (e.target as HTMLButtonElement).style.background = 'var(--accent)'; }}
          >
            {loading ? 'ログイン中…' : 'ログイン'}
          </button>
        </form>
      </div>

      <p style={{ marginTop: '24px', fontSize: '13px', color: 'var(--muted)' }}>
        アカウントをお持ちでない方は{' '}
        <Link href="/signup" style={{ color: 'var(--accent)', fontWeight: 600, textDecoration: 'none' }}>
          新規登録
        </Link>
      </p>
    </div>
  );
}
