import Link from 'next/link';
import Image from 'next/image';
import CostraLogo from '@/components/CostraLogo';

export default function HelpRecipePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-xl mx-auto px-4 pt-6 pb-12">

        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <CostraLogo size={28} />
            <span className="text-sm font-semibold text-gray-500">使い方ガイド</span>
          </div>
          <Link href="/menu" className="text-xs text-gray-400 hover:text-gray-600 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            ← メニュー一覧へ
          </Link>
        </div>

        <div className="flex items-center gap-2 mb-1">
          <span className="text-2xl">🍳</span>
          <h1 className="text-2xl font-extrabold text-gray-900">レシピ設定・原価計算</h1>
        </div>
        <p className="text-sm text-gray-400 mb-4">メニューに使う食材と量を設定して、原価率を自動計算する画面です</p>

        {/* スクリーンショット */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-3 mb-6">
          <p className="text-xs font-semibold text-gray-400 mb-2 flex items-center gap-1">
            <span>📱</span> 実際の画面
          </p>
          <Image
            src="/help/screen-recipe.jpg"
            alt="レシピ設定・原価計算画面"
            width={390}
            height={844}
            className="rounded-xl w-full border border-gray-100"
          />
        </div>

        <div className="flex flex-col gap-4">

          {/* レシピ画面に入るには */}
          <div className="bg-white rounded-2xl shadow-sm p-5 border border-gray-100">
            <h2 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
              <span>📌</span> レシピ設定画面への入り方
            </h2>
            <div className="flex flex-col gap-2">
              {[
                { step: '1', text: 'メニュー管理画面を開く（下部ナビ「メニュー」）' },
                { step: '2', text: 'レシピを設定したいメニュー名をタップ' },
                { step: '3', text: '「レシピを設定」ボタンをタップ' },
              ].map((item) => (
                <div key={item.step} className="flex gap-3 items-start">
                  <div className="w-6 h-6 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                    {item.step}
                  </div>
                  <p className="text-sm text-gray-600">{item.text}</p>
                </div>
              ))}
            </div>
          </div>

          {/* 食材を追加する */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="bg-amber-500 px-5 py-3 flex items-center gap-2">
              <span className="text-white text-lg">＋</span>
              <h2 className="font-bold text-white">レシピに食材を追加する</h2>
            </div>
            <div className="p-5 flex flex-col gap-3">
              <div className="flex flex-col gap-2">
                {[
                  { step: '1', text: '「食材を選択」のプルダウンから使う食材を選ぶ' },
                  { step: '2', text: '「使用量」に1人前（1皿分）の量を入力する' },
                  { step: '3', text: '「追加」ボタンをタップ' },
                  { step: '4', text: 'すべての食材を追加すると原価・原価率が自動計算される' },
                ].map((item) => (
                  <div key={item.step} className="flex gap-3 items-start">
                    <div className="w-6 h-6 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                      {item.step}
                    </div>
                    <p className="text-sm text-gray-600">{item.text}</p>
                  </div>
                ))}
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
                <p className="text-xs text-blue-700 font-semibold mb-1">💡 入力例</p>
                <p className="text-xs text-blue-600 leading-relaxed">
                  「鶏もも肉（単位：g）」を選んで、使用量に「150」と入力<br />
                  → 食材マスタの単価（例：0.6円/g）× 150g = 90円と計算されます
                </p>
              </div>
            </div>
          </div>

          {/* 原価率の見かた */}
          <div className="bg-white rounded-2xl shadow-sm p-5 border border-gray-100">
            <h2 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
              <span>📊</span> 原価・原価率の見かた
            </h2>
            <div className="flex flex-col gap-3">
              <div className="bg-gray-50 rounded-xl px-4 py-3">
                <p className="text-sm font-semibold text-gray-700 mb-1">原価（円）</p>
                <p className="text-xs text-gray-500">登録した食材の単価 × 使用量の合計。1皿作るのにかかる材料費です。</p>
              </div>
              <div className="bg-gray-50 rounded-xl px-4 py-3">
                <p className="text-sm font-semibold text-gray-700 mb-1">原価率（%）</p>
                <p className="text-xs text-gray-500">原価 ÷ 販売価格 × 100。30%以下が理想的です。</p>
              </div>
              <div className="bg-gray-50 rounded-xl px-4 py-3">
                <p className="text-sm font-semibold text-gray-700 mb-1">粗利（円）</p>
                <p className="text-xs text-gray-500">販売価格 − 原価。1皿あたりの利益の目安です（人件費・光熱費は含まない）。</p>
              </div>
            </div>
            <div className="flex flex-col gap-2 mt-3">
              {[
                { color: 'bg-amber-50 border-amber-200 text-amber-700', icon: '✅', label: '30%以下', desc: '理想的な原価率' },
                { color: 'bg-orange-50 border-orange-200 text-orange-700', icon: '⚠️', label: '30〜40%', desc: '少し高め。価格見直しを検討' },
                { color: 'bg-red-50 border-red-200 text-red-700', icon: '🚨', label: '40%超', desc: '原価が高い。食材見直しが必要' },
              ].map((item, i) => (
                <div key={i} className={`rounded-xl border px-4 py-2 flex items-center gap-3 ${item.color}`}>
                  <span>{item.icon}</span>
                  <div>
                    <span className="font-bold text-sm">{item.label}</span>
                    <span className="text-xs ml-2">{item.desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 食材を削除する */}
          <div className="bg-white rounded-2xl shadow-sm p-5 border border-gray-100">
            <h2 className="font-bold text-gray-800 mb-2 flex items-center gap-2">
              <span>🗑️</span> レシピから食材を外す
            </h2>
            <p className="text-sm text-gray-500 leading-relaxed">
              レシピ一覧に表示された食材の右端のゴミ箱アイコンをタップすると、その食材をレシピから削除できます。
              食材マスタ自体は削除されません。
            </p>
          </div>

          {/* よくある質問 */}
          <div className="bg-white rounded-2xl shadow-sm p-5 border border-gray-100">
            <h2 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
              <span>❓</span> よくある質問
            </h2>
            <div className="flex flex-col gap-3">
              {[
                {
                  q: '食材の選択肢に出てこない食材があります',
                  a: 'まだ食材マスタに登録されていません。先に「食材・調味料」画面から登録してください。',
                  link: '/help/ingredients',
                  linkText: '食材登録の使い方を見る',
                },
                {
                  q: '原価率が変わらない',
                  a: '食材の単価が更新されると原価率も自動で変わります。食材マスタの単価を確認してください。',
                  link: '/help/ingredients',
                  linkText: '単価更新の使い方を見る',
                },
                {
                  q: '複数人前のレシピを入力したい',
                  a: '使用量は1人前（1皿分）で入力してください。原価計算は1皿単位で行われます。',
                  link: null,
                  linkText: null,
                },
              ].map((item, i) => (
                <div key={i} className="bg-gray-50 rounded-xl px-4 py-3">
                  <p className="text-sm font-semibold text-gray-700 mb-1">Q. {item.q}</p>
                  <p className="text-xs text-gray-500 leading-relaxed">A. {item.a}</p>
                  {item.link && (
                    <Link href={item.link} className="inline-flex items-center gap-1 mt-2 text-xs font-semibold text-amber-600 hover:text-amber-800">
                      {item.linkText} →
                    </Link>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 他ページリンク */}
          <div className="bg-white rounded-2xl shadow-sm p-4 border border-gray-100">
            <p className="text-xs font-bold text-gray-500 mb-3">他のページの使い方</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { href: '/help/menu', icon: '📋', label: 'メニュー管理' },
                { href: '/help/ingredients', icon: '🥦', label: '食材・調味料' },
                { href: '/help/delivery', icon: '📸', label: '納品書スキャン' },
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
