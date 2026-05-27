import Link from 'next/link';
import CostraLogo from '@/components/CostraLogo';

export default function HelpDeliveryPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-xl mx-auto px-4 pt-6 pb-12">

        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <CostraLogo size={28} />
            <span className="text-sm font-semibold text-gray-500">使い方ガイド</span>
          </div>
          <Link href="/delivery" className="text-xs text-gray-400 hover:text-gray-600 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            ← スキャン画面へ
          </Link>
        </div>

        <div className="flex items-center gap-2 mb-1">
          <span className="text-2xl">📸</span>
          <h1 className="text-2xl font-extrabold text-gray-900">納品書スキャン</h1>
        </div>
        <p className="text-sm text-gray-400 mb-2">納品書を撮影してAIに読み取らせる画面です</p>
        <div className="inline-flex items-center gap-1.5 bg-amber-100 text-amber-700 text-xs font-bold px-3 py-1 rounded-full mb-6">
          <span>⚡</span> ベーシックプラン以上で利用できます
        </div>

        <div className="flex flex-col gap-4">

          {/* 基本的な使い方 */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="bg-blue-600 px-5 py-3 flex items-center gap-2">
              <span className="text-white text-lg">📋</span>
              <h2 className="font-bold text-white">納品書を読み込む手順</h2>
            </div>
            <div className="p-5 flex flex-col gap-3">
              <div className="flex flex-col gap-2">
                {[
                  { step: '1', text: '画面中央の「写真を選択」または「カメラで撮影」をタップ' },
                  { step: '2', text: '納品書全体が入るように撮影する。なるべく真上から、文字がはっきり見えるように' },
                  { step: '3', text: '写真が表示されたら「読み込み開始」ボタンをタップ' },
                  { step: '4', text: 'AIが自動で「食材名・数量・単位・金額」を読み取って一覧表示する' },
                  { step: '5', text: '内容を確認して、間違いがあればタップして修正する' },
                  { step: '6', text: '「保存する」ボタンで食材マスタに反映される' },
                ].map((item) => (
                  <div key={item.step} className="flex gap-3 items-start">
                    <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                      {item.step}
                    </div>
                    <p className="text-sm text-gray-600">{item.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* うまく読み取れないとき */}
          <div className="bg-white rounded-2xl shadow-sm p-5 border border-gray-100">
            <h2 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
              <span>🔍</span> うまく読み取れないときのコツ
            </h2>
            <div className="flex flex-col gap-2.5">
              {[
                { icon: '☀️', title: '明るい場所で撮影する', desc: '暗い場所だと文字がぼやけて認識精度が下がります。照明の下で撮りましょう。' },
                { icon: '📐', title: '真上から撮影する', desc: '斜めから撮ると文字が歪んで読み取りにくくなります。できるだけ真上から。' },
                { icon: '🔎', title: '文字が全部入るようにする', desc: '端が切れていると読み取り漏れが発生します。納品書全体が収まるように。' },
                { icon: '📄', title: 'PDFや画像ファイルでも可', desc: '業者からメールで届いたPDFや画像ファイルをそのまま選択してもOKです。' },
              ].map((item, i) => (
                <div key={i} className="flex gap-3 items-start bg-gray-50 rounded-xl px-4 py-3">
                  <span className="text-xl flex-shrink-0">{item.icon}</span>
                  <div>
                    <p className="text-sm font-semibold text-gray-700">{item.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 読み取り結果の修正 */}
          <div className="bg-white rounded-2xl shadow-sm p-5 border border-gray-100">
            <h2 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
              <span>✏️</span> 読み取り結果を修正する
            </h2>
            <p className="text-sm text-gray-500 mb-3 leading-relaxed">
              AIの読み取りが間違っていても、保存前に修正できます。
            </p>
            <div className="flex flex-col gap-2">
              {[
                '読み取り結果の行をタップすると編集モードになる',
                '食材名・数量・単位・合計金額を正しい値に修正',
                '「食材」か「調味料」かの分類も変更可能',
                '不要な行はチェックを外して保存から除外できる',
              ].map((text, i) => (
                <div key={i} className="flex gap-2 items-start">
                  <span className="text-amber-500 font-bold mt-0.5">•</span>
                  <p className="text-sm text-gray-600">{text}</p>
                </div>
              ))}
            </div>
          </div>

          {/* 保存後の動き */}
          <div className="bg-amber-50 rounded-2xl border border-amber-200 p-5">
            <h2 className="font-bold text-amber-800 mb-2 flex items-center gap-2">
              <span>💡</span> 保存するとどうなるの？
            </h2>
            <div className="flex flex-col gap-2 mt-2">
              <div className="flex gap-2 items-start">
                <span className="text-amber-600 font-bold mt-0.5">①</span>
                <p className="text-sm text-amber-700">食材マスタに登録される（まだ登録されていないものは新規追加）</p>
              </div>
              <div className="flex gap-2 items-start">
                <span className="text-amber-600 font-bold mt-0.5">②</span>
                <p className="text-sm text-amber-700">すでに登録済みの食材は最新の単価に自動更新される</p>
              </div>
              <div className="flex gap-2 items-start">
                <span className="text-amber-600 font-bold mt-0.5">③</span>
                <p className="text-sm text-amber-700">納品履歴として記録される（後から確認・修正できる）</p>
              </div>
            </div>
            <Link href="/help/history" className="inline-flex items-center gap-1 mt-3 text-xs font-semibold text-amber-700 hover:text-amber-900">
              納品履歴の使い方を見る →
            </Link>
          </div>

          {/* 他ページリンク */}
          <div className="bg-white rounded-2xl shadow-sm p-4 border border-gray-100">
            <p className="text-xs font-bold text-gray-500 mb-3">他のページの使い方</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { href: '/help/dashboard', icon: '🏠', label: 'ダッシュボード' },
                { href: '/help/menu', icon: '📋', label: 'メニュー管理' },
                { href: '/help/ingredients', icon: '🥦', label: '食材・調味料' },
                { href: '/help/history', icon: '📦', label: '納品履歴' },
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
