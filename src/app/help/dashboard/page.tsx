import Link from 'next/link';
import Image from 'next/image';
import CostraLogo from '@/components/CostraLogo';

export default function HelpDashboardPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-xl mx-auto px-4 pt-6 pb-12">

        {/* ヘッダー */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <CostraLogo size={28} />
            <span className="text-sm font-semibold text-gray-500">使い方ガイド</span>
          </div>
          <Link href="/dashboard" className="text-xs text-gray-400 hover:text-gray-600 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            ← ダッシュボードへ
          </Link>
        </div>

        <div className="flex items-center gap-2 mb-1">
          <span className="text-2xl">🏠</span>
          <h1 className="text-2xl font-extrabold text-gray-900">ダッシュボード</h1>
        </div>
        <p className="text-sm text-gray-400 mb-4">お店全体の状況をひと目で確認できるトップ画面です</p>

        {/* スクリーンショット */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-3 mb-6">
          <p className="text-xs font-semibold text-gray-400 mb-2 flex items-center gap-1">
            <span>📱</span> 実際の画面
          </p>
          <Image
            src="/help/screen-dashboard.jpg"
            alt="ダッシュボード画面"
            width={390}
            height={844}
            className="rounded-xl w-full border border-gray-100"
          />
        </div>

        <div className="flex flex-col gap-4">

          {/* 概要 */}
          <div className="bg-white rounded-2xl shadow-sm p-5 border border-gray-100">
            <h2 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
              <span>📊</span> この画面でできること
            </h2>
            <ul className="flex flex-col gap-2">
              {[
                { icon: '📋', text: '登録済みメニュー数を確認する' },
                { icon: '🥦', text: '登録済み食材・調味料数を確認する' },
                { icon: '📈', text: '全メニューの平均原価率を確認する' },
                { icon: '📸', text: '納品書スキャンをすぐに始める' },
                { icon: '⚙️', text: '店舗設定・プラン変更に移動する' },
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-2 text-sm text-gray-600">
                  <span>{item.icon}</span>{item.text}
                </li>
              ))}
            </ul>
          </div>

          {/* 平均原価率の見かた */}
          <div className="bg-white rounded-2xl shadow-sm p-5 border border-gray-100">
            <h2 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
              <span>📈</span> 平均原価率の見かた
            </h2>
            <p className="text-sm text-gray-500 mb-3 leading-relaxed">
              レシピを登録したメニューの原価率を平均した数値です。
              メニューを登録しただけではなく、<span className="font-semibold text-gray-700">レシピ（使う食材と量）を設定して初めて表示</span>されます。
            </p>
            <div className="flex flex-col gap-2">
              {[
                { color: 'bg-amber-50 border-amber-200 text-amber-700', icon: '✅', label: '30%以下', desc: '理想的な原価率です' },
                { color: 'bg-orange-50 border-orange-200 text-orange-700', icon: '⚠️', label: '30〜40%', desc: '少し高め。主要メニューを見直しましょう' },
                { color: 'bg-red-50 border-red-200 text-red-700', icon: '🚨', label: '40%超', desc: '要注意。食材単価やレシピを確認してください' },
              ].map((item, i) => (
                <div key={i} className={`rounded-xl border px-4 py-2.5 flex items-center gap-3 ${item.color}`}>
                  <span>{item.icon}</span>
                  <div>
                    <span className="font-bold text-sm">{item.label}</span>
                    <span className="text-xs ml-2">{item.desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 数字が「-」になっているとき */}
          <div className="bg-amber-50 rounded-2xl border border-amber-200 p-5">
            <h2 className="font-bold text-amber-800 mb-2 flex items-center gap-2">
              <span>💡</span> 平均原価率が「-」と表示されているときは
            </h2>
            <p className="text-sm text-amber-700 leading-relaxed">
              まだレシピが登録されていません。メニューを選んで「レシピを設定」してください。食材と使用量を入力すると自動で原価率が計算されます。
            </p>
            <Link href="/help/recipe" className="inline-flex items-center gap-1 mt-3 text-xs font-semibold text-amber-700 hover:text-amber-900">
              レシピ設定の使い方を見る →
            </Link>
          </div>

          {/* スキャンボタン */}
          <div className="bg-white rounded-2xl shadow-sm p-5 border border-gray-100">
            <h2 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
              <span>📸</span> 納品書スキャンボタン
            </h2>
            <p className="text-sm text-gray-500 leading-relaxed">
              画面下部の「スキャン」ボタン（カメラアイコン）から納品書の撮影をすぐに始めることができます。
              撮影した写真はAIが自動で食材名・数量・金額を読み取ります。
            </p>
            <Link href="/help/delivery" className="inline-flex items-center gap-1 mt-3 text-xs font-semibold text-amber-600 hover:text-amber-800">
              納品書スキャンの使い方を見る →
            </Link>
          </div>

          {/* 他のページへ */}
          <div className="bg-white rounded-2xl shadow-sm p-4 border border-gray-100">
            <p className="text-xs font-bold text-gray-500 mb-3">他のページの使い方</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { href: '/help/menu', icon: '📋', label: 'メニュー管理' },
                { href: '/help/ingredients', icon: '🥦', label: '食材・調味料' },
                { href: '/help/delivery', icon: '📸', label: '納品書スキャン' },
                { href: '/help/recipe', icon: '🍳', label: 'レシピ設定' },
              ].map((link) => (
                <Link key={link.href} href={link.href} className="flex items-center gap-2 text-sm text-gray-700 hover:text-amber-600 bg-gray-50 hover:bg-amber-50 rounded-xl px-3 py-2.5 transition-colors">
                  <span>{link.icon}</span>{link.label}
                </Link>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
