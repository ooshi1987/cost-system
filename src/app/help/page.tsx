'use client';

import Link from 'next/link';
import { useState } from 'react';
import CostraLogo from '@/components/CostraLogo';

const PAGE_GUIDES = [
  {
    href: '/help/dashboard',
    icon: '🏠',
    title: 'ダッシュボード',
    desc: '原価率の見かた・各機能への入り方',
    color: 'border-blue-200 hover:border-blue-400',
    badge: null,
  },
  {
    href: '/help/menu',
    icon: '📋',
    title: 'メニュー管理',
    desc: '写真で一括インポート・手動登録・修正方法',
    color: 'border-amber-200 hover:border-amber-400',
    badge: null,
  },
  {
    href: '/help/ingredients',
    icon: '🥦',
    title: '食材・調味料の管理',
    desc: '食材の登録・単価更新・並び替え',
    color: 'border-green-200 hover:border-green-400',
    badge: null,
  },
  {
    href: '/help/delivery',
    icon: '📸',
    title: '納品書スキャン',
    desc: '撮影から保存まで・読み取りのコツ',
    color: 'border-purple-200 hover:border-purple-400',
    badge: 'ベーシック以上',
  },
  {
    href: '/help/history',
    icon: '📦',
    title: '納品履歴',
    desc: '過去の納品書を確認・後から修正する',
    color: 'border-orange-200 hover:border-orange-400',
    badge: null,
  },
  {
    href: '/help/recipe',
    icon: '🍳',
    title: 'レシピ設定・原価計算',
    desc: '食材と使用量の入力・原価率の見かた',
    color: 'border-red-200 hover:border-red-400',
    badge: null,
  },
];

const QUICK_STEPS = [
  { step: 1, title: '食材を登録する', href: '/help/ingredients', desc: '仕入れている食材と単価を入力' },
  { step: 2, title: 'メニューを登録する', href: '/help/menu', desc: '写真を撮るか手動で入力' },
  { step: 3, title: 'レシピを設定する', href: '/help/recipe', desc: 'メニューに使う食材と量を入力' },
  { step: 4, title: '原価率を確認する', href: '/help/dashboard', desc: 'ダッシュボードで一目確認' },
];

const CATEGORIES = [
  { value: 'usage', label: '操作方法がわからない' },
  { value: 'bug', label: 'バグ・不具合の報告' },
  { value: 'billing', label: '料金・プランについて' },
  { value: 'feature', label: '機能追加のご要望' },
  { value: 'other', label: 'その他' },
];

export default function HelpPage() {
  const [category, setCategory] = useState('');
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!category || !content.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, content }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || '送信に失敗しました');
      }
      setSent(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : '送信に失敗しました');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-xl mx-auto px-4 pt-6 pb-12">

        {/* ヘッダー */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <CostraLogo size={28} />
            <span className="text-sm font-semibold text-gray-500">ヘルプ</span>
          </div>
          <Link
            href="/dashboard"
            className="text-xs text-gray-400 hover:text-gray-600 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            ← ダッシュボード
          </Link>
        </div>

        <h1 className="text-2xl font-extrabold text-gray-900 mb-1">使いかたガイド</h1>
        <p className="text-sm text-gray-400 mb-6">各ページの操作方法を詳しく解説します</p>

        {/* ページ別ガイド */}
        <div className="flex flex-col gap-3 mb-8">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">ページ別の使い方</p>
          {PAGE_GUIDES.map((guide) => (
            <Link
              key={guide.href}
              href={guide.href}
              className={`bg-white rounded-2xl shadow-sm border-2 p-4 flex items-center gap-4 transition-colors ${guide.color}`}
            >
              <span className="text-3xl flex-shrink-0">{guide.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="font-bold text-gray-800 text-sm">{guide.title}</span>
                  {guide.badge && (
                    <span className="text-[10px] bg-amber-100 text-amber-600 font-bold px-2 py-0.5 rounded-full flex-shrink-0">
                      {guide.badge}
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-400 leading-relaxed">{guide.desc}</p>
              </div>
              <span className="text-gray-300 flex-shrink-0">›</span>
            </Link>
          ))}
        </div>

        {/* はじめてのかた向けステップ */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-6">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-4">🚀 はじめてのかたへ — まずこの順番で</p>
          <div className="flex flex-col gap-3">
            {QUICK_STEPS.map((item) => (
              <Link key={item.step} href={item.href} className="flex gap-3 items-start hover:opacity-75 transition-opacity">
                <div className="w-7 h-7 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">
                  {item.step}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800">{item.title}</p>
                  <p className="text-xs text-gray-400">{item.desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* PDF版 */}
        <div className="bg-gray-800 rounded-2xl p-5 mb-6 flex items-center gap-4">
          <span className="text-3xl flex-shrink-0">📄</span>
          <div className="flex-1">
            <p className="font-bold text-white text-sm mb-0.5">マニュアルPDF版</p>
            <p className="text-xs text-gray-400">印刷・動画台本用の全ページまとめ版</p>
          </div>
          <Link
            href="/help/pdf"
            className="flex-shrink-0 bg-white text-gray-800 text-xs font-bold px-4 py-2 rounded-xl hover:bg-gray-100 transition-colors"
          >
            開く
          </Link>
        </div>

        {/* お問い合わせフォーム */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="bg-gray-800 px-5 py-3 flex items-center gap-2">
            <span className="text-white text-lg">💬</span>
            <h2 className="font-bold text-white">お問い合わせ</h2>
          </div>
          <div className="p-5">
            {sent ? (
              <div className="text-center py-4">
                <div className="text-4xl mb-3">✅</div>
                <p className="font-bold text-gray-800 mb-1">送信しました！</p>
                <p className="text-xs text-gray-400 leading-relaxed">
                  お問い合わせいただきありがとうございます。<br />
                  内容を確認のうえ、ご登録のメールアドレスに返信いたします。
                </p>
                <button
                  onClick={() => { setSent(false); setCategory(''); setContent(''); }}
                  className="mt-4 text-xs text-amber-600 hover:text-amber-800 font-semibold"
                >
                  別の問い合わせをする
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">件名</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    required
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-amber-400 bg-white"
                  >
                    <option value="">選択してください</option>
                    {CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">
                    お問い合わせ内容
                    <span className="text-gray-400 font-normal ml-2">{content.length}/2000</span>
                  </label>
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    required
                    maxLength={2000}
                    rows={5}
                    placeholder="できるだけ具体的にお書きください&#10;例：メニュー管理のインポートボタンを押しても何も反応しない"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-amber-400 resize-none"
                  />
                </div>
                {error && (
                  <p className="text-xs text-red-600 bg-red-50 rounded-xl px-3 py-2">{error}</p>
                )}
                <button
                  type="submit"
                  disabled={submitting || !category || !content.trim()}
                  className="w-full bg-amber-500 hover:bg-amber-600 disabled:bg-gray-200 disabled:text-gray-400 text-white font-bold py-3 rounded-2xl text-sm transition-colors"
                >
                  {submitting ? '送信中...' : '送信する'}
                </button>
                <p className="text-xs text-gray-400 text-center leading-relaxed">
                  ログイン中のアカウント情報が自動で添付されます
                </p>
              </form>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
