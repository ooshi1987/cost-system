'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import CostraLogo from '@/components/CostraLogo';

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
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">

        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <CostraLogo size={40} />
          </div>
          <p className="text-gray-400 text-sm mt-1">ログインしてください</p>
        </div>

        <div className="bg-white rounded-2xl shadow p-6 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">メールアドレス</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="mail@example.com"
                required
                autoComplete="email"
                className="w-full border rounded-xl px-4 py-3 text-base focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">パスワード</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="パスワード"
                required
                autoComplete="current-password"
                className="w-full border rounded-xl px-4 py-3 text-base focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-600 text-sm">{error}</div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white py-3.5 rounded-xl font-bold text-base disabled:bg-gray-300 mt-2 transition-colors"
            >
              {loading ? 'ログイン中…' : 'ログイン'}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-gray-400 mt-6">
          アカウントをお持ちでない方は{' '}
          <Link href="/signup" className="text-amber-600 font-semibold hover:underline">
            新規登録
          </Link>
        </p>

      </div>
    </div>
  );
}
