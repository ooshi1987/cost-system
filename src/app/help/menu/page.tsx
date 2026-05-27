import Link from 'next/link';
import CostraLogo from '@/components/CostraLogo';

export default function HelpMenuPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-xl mx-auto px-4 pt-6 pb-12">

        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <CostraLogo size={28} />
            <span className="text-sm font-semibold text-gray-500">使い方ガイド</span>
          </div>
          <Link href="/menu" className="text-xs text-gray-400 hover:text-gray-600 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            ← メニュー管理へ
          </Link>
        </div>

        <div className="flex items-center gap-2 mb-1">
          <span className="text-2xl">📋</span>
          <h1 className="text-2xl font-extrabold text-gray-900">メニュー管理</h1>
        </div>
        <p className="text-sm text-gray-400 mb-6">お店のメニューを登録・管理する画面です</p>

        <div className="flex flex-col gap-4">

          {/* 一括インポート */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="bg-amber-500 px-5 py-3 flex items-center gap-2">
              <span className="text-white text-lg">📸</span>
              <h2 className="font-bold text-white">メニュー表を写真でまとめて登録する（一括インポート）</h2>
            </div>
            <div className="p-5 flex flex-col gap-3">
              <p className="text-sm text-gray-500 leading-relaxed">
                紙のメニュー表や手書きのメニュー一覧を撮影するだけで、AIが自動でメニュー名・価格・カテゴリを読み取ります。
                複数枚まとめて選択することもできます。
              </p>
              <div className="flex flex-col gap-2">
                {[
                  { step: '1', text: '画面上部の「写真でまとめて登録」ボタンをタップ' },
                  { step: '2', text: '写真ライブラリまたはカメラから画像を選択（複数枚OK）' },
                  { step: '3', text: '「読み込み開始」をタップするとAIが自動解析' },
                  { step: '4', text: '読み取り結果が一覧で表示される。チェックボックスで保存するメニューを選ぶ' },
                  { step: '5', text: '間違いがあれば鉛筆アイコンをタップして修正' },
                  { step: '6', text: '「選択した〇品を保存」ボタンで一括保存完了' },
                ].map((item) => (
                  <div key={item.step} className="flex gap-3 items-start">
                    <div className="w-6 h-6 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                      {item.step}
                    </div>
                    <p className="text-sm text-gray-600">{item.text}</p>
                  </div>
                ))}
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 mt-1">
                <p className="text-xs text-blue-700 font-semibold mb-1">💡 複数ページのメニュー表を読み込むには</p>
                <p className="text-xs text-blue-600 leading-relaxed">
                  画像選択時に複数ファイルを選んでください（iPhoneなら写真を長押し→複数選択）。
                  ページをまたいで同じメニュー名があっても、重複チェックが自動で入るので安心です。
                </p>
              </div>
            </div>
          </div>

          {/* 手動登録 */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="bg-gray-700 px-5 py-3 flex items-center gap-2">
              <span className="text-white text-lg">✏️</span>
              <h2 className="font-bold text-white">メニューを1品ずつ手動で登録する</h2>
            </div>
            <div className="p-5 flex flex-col gap-3">
              <div className="flex flex-col gap-2">
                {[
                  { step: '1', text: '画面下部の「メニュー名」「価格」「カテゴリ」フォームに入力' },
                  { step: '2', text: 'カテゴリは「ランチ」「ドリンク」など自由に入力できます（空白でも可）' },
                  { step: '3', text: '「追加」ボタンをタップして保存' },
                ].map((item) => (
                  <div key={item.step} className="flex gap-3 items-start">
                    <div className="w-6 h-6 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                      {item.step}
                    </div>
                    <p className="text-sm text-gray-600">{item.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 修正・削除 */}
          <div className="bg-white rounded-2xl shadow-sm p-5 border border-gray-100">
            <h2 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
              <span>✏️</span> 登録済みメニューを修正・削除する
            </h2>
            <div className="flex flex-col gap-3">
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-1">名前・価格・カテゴリを変更する</p>
                <p className="text-sm text-gray-500 leading-relaxed">メニュー一覧のアイテムをタップ →「編集」アイコン（鉛筆）をタップ → 変更して「保存」</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-1">メニューを削除する</p>
                <p className="text-sm text-gray-500 leading-relaxed">メニューをタップ →「削除」アイコン（ゴミ箱）をタップ。レシピも一緒に削除されます。</p>
              </div>
            </div>
          </div>

          {/* カテゴリーフィルター */}
          <div className="bg-white rounded-2xl shadow-sm p-5 border border-gray-100">
            <h2 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
              <span>🏷️</span> カテゴリーで絞り込む
            </h2>
            <p className="text-sm text-gray-500 leading-relaxed">
              画面上部のカテゴリーボタンをタップすると、そのカテゴリーのメニューだけが表示されます。
              「全て」をタップすると全メニューに戻ります。
            </p>
          </div>

          {/* 並び替え */}
          <div className="bg-white rounded-2xl shadow-sm p-5 border border-gray-100">
            <h2 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
              <span>↕️</span> 表示順を変更する
            </h2>
            <p className="text-sm text-gray-500 leading-relaxed mb-2">
              右上の「並び替え」ボタンをタップすると並び替えモードになります。
              各メニューの右端の「＝」マークをドラッグ＆ドロップして順番を変更できます。
              「保存」を押すと順番が固定されます。
            </p>
          </div>

          {/* レシピへ */}
          <div className="bg-amber-50 rounded-2xl border border-amber-200 p-5">
            <h2 className="font-bold text-amber-800 mb-2 flex items-center gap-2">
              <span>💡</span> メニューを登録したら次はレシピを設定しよう
            </h2>
            <p className="text-sm text-amber-700 leading-relaxed">
              メニューをタップ →「レシピを設定」から使う食材と量を入力することで、
              原価と原価率が自動計算されます。
            </p>
            <Link href="/help/recipe" className="inline-flex items-center gap-1 mt-3 text-xs font-semibold text-amber-700 hover:text-amber-900">
              レシピ設定の使い方を見る →
            </Link>
          </div>

          {/* 他ページリンク */}
          <div className="bg-white rounded-2xl shadow-sm p-4 border border-gray-100">
            <p className="text-xs font-bold text-gray-500 mb-3">他のページの使い方</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { href: '/help/dashboard', icon: '🏠', label: 'ダッシュボード' },
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
