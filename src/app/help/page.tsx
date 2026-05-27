import Link from 'next/link';
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

export default function HelpPage() {
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

        {/* サポート */}
        <div className="bg-white rounded-2xl shadow-sm p-5 border border-gray-100 text-center">
          <div className="text-2xl mb-2">💬</div>
          <div className="font-bold text-gray-800 text-sm mb-1">お困りのことがあれば</div>
          <p className="text-xs text-gray-400 mb-3">解決しない場合はお気軽にお問い合わせください</p>
          <a
            href="mailto:support@costra.app"
            className="inline-flex items-center gap-1.5 text-sm text-amber-600 font-semibold hover:text-amber-700 transition-colors"
          >
            <span>✉️</span>
            support@costra.app
          </a>
        </div>

      </div>
    </div>
  );
}
