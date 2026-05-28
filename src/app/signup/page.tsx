'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SignupPage() {
  const router = useRouter();
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyName, email, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || '登録に失敗しました'); return; }
      router.push('/dashboard');
      router.refresh();
    } catch {
      setError('エラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  const field = {
    border: '1px solid var(--line)',
    borderRadius: 'var(--r)',
    padding: '11px 14px',
    fontSize: '15px',
    color: 'var(--ink)',
    background: 'var(--bg)',
    outline: 'none',
    transition: 'border-color .15s',
    width: '100%',
    fontFamily: 'var(--sans)',
  } as React.CSSProperties;

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

      <div style={{ width: '100%', maxWidth: '420px' }}>

        {/* Trial badge */}
        <div style={{ background: 'var(--accent-soft)', border: '1px solid var(--accent-2)', borderRadius: 'var(--r-lg)', padding: '14px 18px', marginBottom: '20px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
          <span style={{ fontSize: '18px', lineHeight: 1 }}>🎉</span>
          <div>
            <p style={{ margin: 0, fontWeight: 700, color: 'var(--accent)', fontSize: '13px', marginBottom: '6px' }}>14日間 無料トライアル</p>
            <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '3px' }}>
              {['全機能が使い放題', 'クレジットカード不要', 'いつでもキャンセル可'].map((t) => (
                <li key={t} style={{ fontSize: '12px', color: 'var(--ink-2)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ color: 'var(--accent)', fontWeight: 700 }}>✓</span>{t}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Card */}
        <div style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 'var(--r-xl)', padding: '32px', boxShadow: 'var(--shadow-md)' }}>

          <h1 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--ink)', marginBottom: '6px', marginTop: 0 }}>アカウント作成</h1>
          <p style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '28px', marginTop: 0 }}>まずは無料で始めましょう</p>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

            <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink-2)' }}>会社名 / 屋号</span>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="〇〇フード株式会社"
                required
                style={field}
                onFocus={(e) => e.target.style.borderColor = 'var(--accent)'}
                onBlur={(e) => e.target.style.borderColor = 'var(--line)'}
              />
            </label>

            <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink-2)' }}>メールアドレス</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="mail@example.com"
                required
                autoComplete="email"
                style={field}
                onFocus={(e) => e.target.style.borderColor = 'var(--accent)'}
                onBlur={(e) => e.target.style.borderColor = 'var(--line)'}
              />
            </label>

            <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink-2)' }}>パスワード</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="8文字以上"
                required
                minLength={8}
                autoComplete="new-password"
                style={field}
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
              {loading ? '登録中…' : '無料アカウントを作る →'}
            </button>

            <p style={{ fontSize: '11px', color: 'var(--muted)', textAlign: 'center', margin: 0 }}>
              登録すると利用規約・プライバシーポリシーに同意したものとみなします。
            </p>
          </form>
        </div>

        <p style={{ marginTop: '24px', fontSize: '13px', color: 'var(--muted)', textAlign: 'center' }}>
          既にアカウントをお持ちの方は{' '}
          <Link href="/login" style={{ color: 'var(--accent)', fontWeight: 600, textDecoration: 'none' }}>
            ログイン
          </Link>
        </p>
      </div>
    </div>
  );
}
