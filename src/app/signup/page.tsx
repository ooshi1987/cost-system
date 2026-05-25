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

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">

        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🧾</div>
          <h1 className="text-2xl font-bold text-gray-800">新規登録</h1>
          <p className="text-gray-400 text-sm mt-1">まずは無料で始めましょう</p>
        </div>

        {/* トライアル内容 */}
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-5 text-sm">
          <p className="font-bold text-amber-700 mb-2">🎉 無料トライアル</p>
          <ul className="text-amber-600 space-y-1">
            <li>✓ メニュー品目 最大10品</li>
            <li>✓ 食材・調味料 最大20種</li>
            <li>✓ 店舗数 1店舗</li>
            <li className="text-amber-500 text-xs mt-1">※ 制限を超えたらプランを選択してください</li>
          </ul>
        </div>

        <div className="bg-white rounded-2xl shadow p-6 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">会社名 / 屋号</label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="〇〇フード株式会社"
                required
                className="w-full border rounded-xl px-4 py-3 text-base focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
              />
            </div>
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
                placeholder="8文字以上"
                required
                minLength={8}
                autoComplete="new-password"
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
              {loading ? '登録中…' : '無料で始める'}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-gray-400 mt-6">
          既にアカウントをお持ちの方は{' '}
          <Link href="/login" className="text-amber-600 font-semibold hover:underline">
            ログイン
          </Link>
        </p>

      </div>
    </div>
  );
}
