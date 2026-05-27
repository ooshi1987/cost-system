import Link from 'next/link';
import Image from 'next/image';
import CostraLogo from '@/components/CostraLogo';

export default function HelpHistoryPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-xl mx-auto px-4 pt-6 pb-12">

        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <CostraLogo size={28} />
            <span className="text-sm font-semibold text-gray-500">使い方ガイド</span>
          </div>
          <Link href="/delivery-history" className="text-xs text-gray-400 hover:text-gray-600 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            ← 納品履歴へ
          </Link>
        </div>

        <div className="flex items-center gap-2 mb-1">
          <span className="text-2xl">📦</span>
          <h1 className="text-2xl font-extrabold text-gray-900">納品履歴</h1>
        </div>
        <p className="text-sm text-gray-400 mb-4">過去にスキャンした納品書の内容を確認・修正できる画面です</p>

        {/* スクリーンショット */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-3 mb-6">
          <p className="text-xs font-semibold text-gray-400 mb-2 flex items-center gap-1">
            <span>📱</span> 実際の画面
          </p>
          <Image
            src="/help/screen-history.jpg"
            alt="納品履歴画面"
            width={390}
            height={844}
            className="rounded-xl w-full border border-gray-100"
          />
        </div>

        <div className="flex flex-col gap-4">

          {/* この画面でできること */}
          <div className="bg-white rounded-2xl shadow-sm p-5 border border-gray-100">
            <h2 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
              <span>📌</span> この画面でできること
            </h2>
            <ul className="flex flex-col gap-2">
              {[
                { icon: '📋', text: '過去にスキャンした納品書の内容を日付ごとに確認する' },
                { icon: '✏️', text: '読み取りの間違いに気づいたとき、後から数量・金額を修正する' },
                { icon: '📊', text: '食材ごとの仕入れ履歴を見返す' },
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-2 text-sm text-gray-600">
                  <span>{item.icon}</span>{item.text}
                </li>
              ))}
            </ul>
          </div>

          {/* 履歴の見かた */}
          <div className="bg-white rounded-2xl shadow-sm p-5 border border-gray-100">
            <h2 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
              <span>🗓️</span> 履歴の見かた
            </h2>
            <p className="text-sm text-gray-500 leading-relaxed mb-3">
              スキャンした日付ごとにまとめて表示されます。それぞれのカードに、
              その日に読み込んだ食材の一覧と数量・金額が表示されます。
            </p>
            <p className="text-sm text-gray-500 leading-relaxed">
              カードをタップすると詳細が展開されます。
            </p>
          </div>

          {/* 修正方法 */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="bg-orange-500 px-5 py-3 flex items-center gap-2">
              <span className="text-white text-lg">✏️</span>
              <h2 className="font-bold text-white">数量・金額を後から修正する</h2>
            </div>
            <div className="p-5 flex flex-col gap-3">
              <p className="text-sm text-gray-500 leading-relaxed">
                スキャン後に間違いに気づいた場合でも、納品履歴から修正できます。
              </p>
              <div className="flex flex-col gap-2">
                {[
                  { step: '1', text: '修正したい納品書のカードを開く' },
                  { step: '2', text: '修正したい食材の行をタップ' },
                  { step: '3', text: '「数量」または「合計金額」を正しい値に入力' },
                  { step: '4', text: '「保存」ボタンをタップ' },
                ].map((item) => (
                  <div key={item.step} className="flex gap-3 items-start">
                    <div className="w-6 h-6 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                      {item.step}
                    </div>
                    <p className="text-sm text-gray-600">{item.text}</p>
                  </div>
                ))}
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                <p className="text-xs text-amber-700 leading-relaxed">
                  ⚡ 金額を修正すると食材の単価も自動で再計算されます。
                  関連するメニューの原価率も連動して更新されます。
                </p>
              </div>
            </div>
          </div>

          {/* 履歴がないとき */}
          <div className="bg-gray-50 rounded-2xl border border-gray-200 p-5">
            <h2 className="font-bold text-gray-700 mb-2 flex items-center gap-2">
              <span>💡</span> 「履歴がありません」と表示されているときは
            </h2>
            <p className="text-sm text-gray-500 leading-relaxed">
              まだ納品書スキャンが使われていません。
              納品書（紙またはPDF・画像）を用意して、スキャン画面から読み込みを始めてください。
            </p>
            <Link href="/help/delivery" className="inline-flex items-center gap-1 mt-3 text-xs font-semibold text-gray-600 hover:text-amber-600">
              納品書スキャンの使い方を見る →
            </Link>
          </div>

          {/* 他ページリンク */}
          <div className="bg-white rounded-2xl shadow-sm p-4 border border-gray-100">
            <p className="text-xs font-bold text-gray-500 mb-3">他のページの使い方</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { href: '/help/delivery', icon: '📸', label: '納品書スキャン' },
                { href: '/help/ingredients', icon: '🥦', label: '食材・調味料' },
                { href: '/help/menu', icon: '📋', label: 'メニュー管理' },
                { href: '/help/dashboard', icon: '🏠', label: 'ダッシュボード' },
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
