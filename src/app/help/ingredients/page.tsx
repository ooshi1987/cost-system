import Link from 'next/link';
import CostraLogo from '@/components/CostraLogo';

export default function HelpIngredientsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-xl mx-auto px-4 pt-6 pb-12">

        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <CostraLogo size={28} />
            <span className="text-sm font-semibold text-gray-500">使い方ガイド</span>
          </div>
          <Link href="/ingredients" className="text-xs text-gray-400 hover:text-gray-600 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            ← 食材一覧へ
          </Link>
        </div>

        <div className="flex items-center gap-2 mb-1">
          <span className="text-2xl">🥦</span>
          <h1 className="text-2xl font-extrabold text-gray-900">食材・調味料の管理</h1>
        </div>
        <p className="text-sm text-gray-400 mb-6">メニューの原価計算に使う食材・調味料を登録する画面です</p>

        <div className="flex flex-col gap-4">

          {/* 食材と調味料の違い */}
          <div className="bg-white rounded-2xl shadow-sm p-5 border border-gray-100">
            <h2 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
              <span>📌</span> 食材と調味料、どっちに登録するの？
            </h2>
            <div className="flex flex-col gap-3">
              <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3">
                <p className="text-sm font-semibold text-green-800 mb-1">🥦 食材タブ</p>
                <p className="text-xs text-green-700 leading-relaxed">野菜・肉・魚など、メインで使うもの。「100g」「1枚」など単位が明確なもの向け。</p>
              </div>
              <div className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-3">
                <p className="text-sm font-semibold text-orange-800 mb-1">🧂 調味料タブ</p>
                <p className="text-xs text-orange-700 leading-relaxed">醤油・砂糖・油など少量使うもの。1mlや1gあたりの単価で管理します。</p>
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-3 leading-relaxed">
              ※ URLの末尾に <code className="bg-gray-100 px-1 rounded">?type=seasoning</code> をつけると調味料タブが開きます。
              画面上部の「食材」「調味料」タブでも切り替えられます。
            </p>
          </div>

          {/* 新規登録 */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="bg-green-600 px-5 py-3 flex items-center gap-2">
              <span className="text-white text-lg">＋</span>
              <h2 className="font-bold text-white">食材を新しく登録する</h2>
            </div>
            <div className="p-5 flex flex-col gap-3">
              <div className="flex flex-col gap-2">
                {[
                  { step: '1', text: '画面下部のフォームに「食材名」を入力（例：鶏もも肉）' },
                  { step: '2', text: '「単位」を選択または入力（例：g、ml、枚、個）' },
                  { step: '3', text: '「単価」を入力（その単位1つあたりの仕入れ価格）' },
                  { step: '4', text: 'カテゴリを入力（例：肉類、野菜）※省略可' },
                  { step: '5', text: '「追加」ボタンをタップして保存' },
                ].map((item) => (
                  <div key={item.step} className="flex gap-3 items-start">
                    <div className="w-6 h-6 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                      {item.step}
                    </div>
                    <p className="text-sm text-gray-600">{item.text}</p>
                  </div>
                ))}
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
                <p className="text-xs text-blue-700 font-semibold mb-1">💡 単価の入力例</p>
                <p className="text-xs text-blue-600 leading-relaxed">
                  「鶏もも肉を500gで300円で仕入れている」場合 →<br />
                  単位：<strong>g</strong>、単価：<strong>0.6</strong>（円/g）を入力<br />
                  レシピで「300g使う」と設定すると 0.6×300 = 180円と計算されます。
                </p>
              </div>
            </div>
          </div>

          {/* 単価の更新 */}
          <div className="bg-white rounded-2xl shadow-sm p-5 border border-gray-100">
            <h2 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
              <span>💴</span> 仕入れ値が変わったら単価を更新する
            </h2>
            <div className="flex flex-col gap-2">
              {[
                { step: '1', text: '食材一覧から更新したい食材をタップ' },
                { step: '2', text: '鉛筆アイコン（編集）をタップ' },
                { step: '3', text: '新しい単価を入力して「保存」' },
              ].map((item) => (
                <div key={item.step} className="flex gap-3 items-start">
                  <div className="w-6 h-6 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                    {item.step}
                  </div>
                  <p className="text-sm text-gray-600">{item.text}</p>
                </div>
              ))}
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mt-3">
              <p className="text-xs text-amber-700 leading-relaxed">
                ⚡ 単価を更新すると、その食材を使っている<strong>すべてのメニューの原価率が自動で再計算</strong>されます。
                仕入れ値が上がったらすぐに更新しましょう。
              </p>
            </div>
          </div>

          {/* 並び替え・カテゴリー変更 */}
          <div className="bg-white rounded-2xl shadow-sm p-5 border border-gray-100">
            <h2 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
              <span>↕️</span> 並び替え・カテゴリー名を変更する
            </h2>
            <p className="text-sm text-gray-500 leading-relaxed mb-3">
              右上の「並び替え」ボタンで並び替えモードになります。
            </p>
            <div className="flex flex-col gap-2">
              <div className="flex gap-2 items-start">
                <span className="text-amber-500 font-bold mt-0.5">•</span>
                <p className="text-sm text-gray-600">食材の「＝」マークをドラッグして順番を変更できます</p>
              </div>
              <div className="flex gap-2 items-start">
                <span className="text-amber-500 font-bold mt-0.5">•</span>
                <p className="text-sm text-gray-600">カテゴリー名をタップすると名前を変更できます</p>
              </div>
              <div className="flex gap-2 items-start">
                <span className="text-amber-500 font-bold mt-0.5">•</span>
                <p className="text-sm text-gray-600">カテゴリー行の「＝」マークをドラッグしてカテゴリーごと移動できます</p>
              </div>
              <div className="flex gap-2 items-start">
                <span className="text-amber-500 font-bold mt-0.5">•</span>
                <p className="text-sm text-gray-600">「保存」ボタンで変更を確定します</p>
              </div>
            </div>
          </div>

          {/* 削除 */}
          <div className="bg-white rounded-2xl shadow-sm p-5 border border-gray-100">
            <h2 className="font-bold text-gray-800 mb-2 flex items-center gap-2">
              <span>🗑️</span> 食材を削除する
            </h2>
            <p className="text-sm text-gray-500 leading-relaxed">
              食材をタップ → ゴミ箱アイコンをタップ。
            </p>
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mt-3">
              <p className="text-xs text-red-700 leading-relaxed">
                ⚠️ その食材をレシピで使っているメニューがある場合、原価計算に影響が出ます。削除前に確認してください。
              </p>
            </div>
          </div>

          {/* 他ページリンク */}
          <div className="bg-white rounded-2xl shadow-sm p-4 border border-gray-100">
            <p className="text-xs font-bold text-gray-500 mb-3">他のページの使い方</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { href: '/help/dashboard', icon: '🏠', label: 'ダッシュボード' },
                { href: '/help/menu', icon: '📋', label: 'メニュー管理' },
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
