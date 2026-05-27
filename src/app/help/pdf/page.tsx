'use client';

import CostraLogo from '@/components/CostraLogo';

export default function HelpPdfPage() {
  return (
    <div className="bg-white min-h-screen">
      {/* 印刷ボタン（印刷時は非表示） */}
      <div className="print:hidden sticky top-0 bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <CostraLogo size={24} />
          <span className="text-sm font-semibold text-gray-500">操作マニュアル（印刷・PDF保存用）</span>
        </div>
        <button
          onClick={() => window.print()}
          className="bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold px-5 py-2 rounded-lg transition-colors"
        >
          📄 印刷 / PDFで保存
        </button>
      </div>

      <div className="max-w-2xl mx-auto px-8 py-10 print:py-6 print:px-6">

        {/* 表紙 */}
        <div className="text-center mb-12 pb-8 border-b-2 border-gray-200 print:mb-8">
          <div className="flex justify-center mb-4">
            <CostraLogo size={48} />
          </div>
          <h1 className="text-3xl font-extrabold text-gray-900 mb-2">Costra 操作マニュアル</h1>
          <p className="text-gray-500 text-sm">飲食店向け原価管理アプリ</p>
          <p className="text-gray-400 text-xs mt-2">support@costra.app</p>
        </div>

        {/* 目次 */}
        <section className="mb-10 print:mb-8">
          <h2 className="text-lg font-bold text-gray-800 mb-4 pb-2 border-b border-gray-200">目次</h2>
          <ol className="flex flex-col gap-1.5">
            {[
              { num: '1', title: 'はじめに — まず最初にやること' },
              { num: '2', title: 'ダッシュボード' },
              { num: '3', title: 'メニュー管理' },
              { num: '4', title: '食材・調味料の管理' },
              { num: '5', title: '納品書スキャン' },
              { num: '6', title: '納品履歴' },
              { num: '7', title: 'レシピ設定・原価計算' },
              { num: '8', title: 'プランについて' },
            ].map((item) => (
              <li key={item.num} className="flex items-center gap-3 text-sm text-gray-600">
                <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center text-xs font-bold flex-shrink-0">{item.num}</span>
                {item.title}
              </li>
            ))}
          </ol>
        </section>

        {/* 1. はじめに */}
        <section className="mb-10 print:mb-8 print:break-before-page">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-8 h-8 rounded-full bg-amber-500 text-white flex items-center justify-center font-bold text-sm flex-shrink-0">1</span>
            <h2 className="text-xl font-extrabold text-gray-900">はじめに — まず最初にやること</h2>
          </div>
          <p className="text-sm text-gray-500 mb-4 leading-relaxed">
            Costraを使い始めるには、以下の順番で設定を進めてください。
          </p>
          <div className="flex flex-col gap-3">
            {[
              { step: 1, title: '食材を登録する', desc: '仕入れている食材の名前・単位・単価（1単位あたりの仕入れ価格）を入力します。納品書スキャンを使えば撮影するだけで自動登録できます。' },
              { step: 2, title: 'メニューを登録する', desc: 'お店のメニュー表を写真で撮影して一括インポートするか、1品ずつ手入力します。' },
              { step: 3, title: 'レシピを設定する', desc: '各メニューに「どの食材を何g使うか」を設定します。この設定をすることで原価率が自動計算されます。' },
              { step: 4, title: 'ダッシュボードで原価率を確認する', desc: '全メニューの平均原価率が表示されます。30%以下が理想です。' },
            ].map((item) => (
              <div key={item.step} className="flex gap-3 items-start bg-gray-50 rounded-xl p-4">
                <div className="w-7 h-7 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center font-bold text-sm flex-shrink-0 mt-0.5">{item.step}</div>
                <div>
                  <p className="font-bold text-gray-800 text-sm mb-1">{item.title}</p>
                  <p className="text-xs text-gray-500 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 2. ダッシュボード */}
        <section className="mb-10 print:mb-8">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold text-sm flex-shrink-0">2</span>
            <h2 className="text-xl font-extrabold text-gray-900">🏠 ダッシュボード</h2>
          </div>
          <p className="text-sm text-gray-500 mb-4 leading-relaxed">
            アプリを開くと最初に表示されるトップ画面です。お店全体の状況をひと目で確認できます。
          </p>
          <div className="flex flex-col gap-3">
            <div className="border border-gray-200 rounded-xl p-4">
              <p className="font-semibold text-gray-700 text-sm mb-1">📊 平均原価率</p>
              <p className="text-xs text-gray-500 leading-relaxed">レシピを設定したメニューの原価率の平均値です。30%以下が理想的、40%以上は要注意です。</p>
            </div>
            <div className="border border-gray-200 rounded-xl p-4">
              <p className="font-semibold text-gray-700 text-sm mb-1">📋 メニュー数 / 🥦 食材数</p>
              <p className="text-xs text-gray-500 leading-relaxed">登録済みのメニューと食材の数が表示されます。タップすると各管理画面に移動します。</p>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <p className="font-semibold text-amber-800 text-sm mb-1">💡 「-」と表示されているときは</p>
              <p className="text-xs text-amber-700 leading-relaxed">まだレシピが設定されていません。メニューを選んでレシピを設定すると表示されるようになります。</p>
            </div>
          </div>
        </section>

        {/* 3. メニュー管理 */}
        <section className="mb-10 print:mb-8 print:break-before-page">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-8 h-8 rounded-full bg-amber-500 text-white flex items-center justify-center font-bold text-sm flex-shrink-0">3</span>
            <h2 className="text-xl font-extrabold text-gray-900">📋 メニュー管理</h2>
          </div>
          <p className="text-sm text-gray-500 mb-4 leading-relaxed">
            お店のメニューを登録・管理する画面です。画面下部のナビ「メニュー」から開きます。
          </p>

          <h3 className="font-bold text-gray-700 text-sm mb-3 mt-4">◆ メニュー表の写真でまとめて登録する（一括インポート）</h3>
          <div className="flex flex-col gap-2 mb-4">
            {[
              '画面上部の「写真でまとめて登録」ボタンをタップ',
              '写真ライブラリまたはカメラから画像を選択（複数枚OK）',
              '「読み込み開始」をタップするとAIが自動解析する',
              '読み取り結果が一覧表示される。チェックボックスで保存するメニューを選ぶ',
              '内容が間違っていれば鉛筆アイコンから修正する',
              '「選択した〇品を保存」ボタンで一括保存完了',
            ].map((text, i) => (
              <div key={i} className="flex gap-3 items-start">
                <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">{i + 1}</span>
                <p className="text-xs text-gray-600">{text}</p>
              </div>
            ))}
          </div>

          <h3 className="font-bold text-gray-700 text-sm mb-3">◆ 1品ずつ手動で登録する</h3>
          <div className="flex flex-col gap-2 mb-4">
            {[
              '画面下部のフォームにメニュー名・販売価格・カテゴリを入力',
              '「追加」ボタンをタップして保存',
            ].map((text, i) => (
              <div key={i} className="flex gap-3 items-start">
                <span className="w-5 h-5 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">{i + 1}</span>
                <p className="text-xs text-gray-600">{text}</p>
              </div>
            ))}
          </div>

          <h3 className="font-bold text-gray-700 text-sm mb-2">◆ 登録済みメニューを修正・削除する</h3>
          <p className="text-xs text-gray-500 leading-relaxed">メニューをタップ → 鉛筆アイコン（修正）またはゴミ箱アイコン（削除）をタップ</p>
        </section>

        {/* 4. 食材・調味料 */}
        <section className="mb-10 print:mb-8">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-8 h-8 rounded-full bg-green-600 text-white flex items-center justify-center font-bold text-sm flex-shrink-0">4</span>
            <h2 className="text-xl font-extrabold text-gray-900">🥦 食材・調味料の管理</h2>
          </div>
          <p className="text-sm text-gray-500 mb-4 leading-relaxed">
            仕入れている食材・調味料を登録します。ここに登録した食材をレシピで使って原価計算します。
          </p>

          <div className="flex gap-3 mb-4">
            <div className="flex-1 bg-green-50 border border-green-200 rounded-xl p-3">
              <p className="text-xs font-bold text-green-800 mb-1">🥦 食材タブ</p>
              <p className="text-xs text-green-700">野菜・肉・魚など。単位が明確なもの（g、枚、個など）</p>
            </div>
            <div className="flex-1 bg-orange-50 border border-orange-200 rounded-xl p-3">
              <p className="text-xs font-bold text-orange-800 mb-1">🧂 調味料タブ</p>
              <p className="text-xs text-orange-700">醤油・砂糖・油など少量使うもの（ml、g単位）</p>
            </div>
          </div>

          <h3 className="font-bold text-gray-700 text-sm mb-3">◆ 食材を新しく登録する</h3>
          <div className="flex flex-col gap-2 mb-4">
            {[
              '食材名を入力（例：鶏もも肉）',
              '単位を選択（g、ml、枚、個など）',
              '単価を入力（その単位1つあたりの仕入れ価格）例：500gで300円なら「0.6」',
              'カテゴリを入力（省略可）',
              '「追加」ボタンで保存',
            ].map((text, i) => (
              <div key={i} className="flex gap-3 items-start">
                <span className="w-5 h-5 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">{i + 1}</span>
                <p className="text-xs text-gray-600">{text}</p>
              </div>
            ))}
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
            <p className="text-xs text-amber-700 leading-relaxed">
              ⚡ 仕入れ値が変わったら単価を更新しましょう。食材をタップ → 鉛筆アイコン → 新しい単価を入力 → 保存。関連するすべてのメニューの原価率が自動で再計算されます。
            </p>
          </div>
        </section>

        {/* 5. 納品書スキャン */}
        <section className="mb-10 print:mb-8 print:break-before-page">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold text-sm flex-shrink-0">5</span>
            <h2 className="text-xl font-extrabold text-gray-900">📸 納品書スキャン</h2>
          </div>
          <div className="inline-flex items-center gap-1.5 bg-amber-100 text-amber-700 text-xs font-bold px-3 py-1 rounded-full mb-4">
            ⚡ ベーシックプラン以上で利用できます
          </div>
          <p className="text-sm text-gray-500 mb-4 leading-relaxed">
            納品書を撮影するだけで食材名・数量・金額をAIが自動読み取りします。
          </p>

          <h3 className="font-bold text-gray-700 text-sm mb-3">◆ 基本的な手順</h3>
          <div className="flex flex-col gap-2 mb-4">
            {[
              '画面中央の「写真を選択」または「カメラで撮影」をタップ',
              '納品書全体が写るように撮影する（明るい場所で、真上から）',
              '写真が表示されたら「読み込み開始」をタップ',
              'AIが自動で食材名・数量・単位・金額を読み取り一覧表示',
              '間違いがあれば行をタップして修正する',
              '「保存する」ボタンで食材マスタに反映',
            ].map((text, i) => (
              <div key={i} className="flex gap-3 items-start">
                <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">{i + 1}</span>
                <p className="text-xs text-gray-600">{text}</p>
              </div>
            ))}
          </div>

          <h3 className="font-bold text-gray-700 text-sm mb-2">◆ うまく読み取れないときのコツ</h3>
          <ul className="flex flex-col gap-1 mb-4">
            {[
              '明るい場所・照明の下で撮影する',
              '真上から撮影する（斜めは精度が下がる）',
              '納品書の端が切れないようにする',
              'メールで届いたPDFや画像ファイルをそのまま選択してもOK',
            ].map((text, i) => (
              <li key={i} className="flex gap-2 items-start text-xs text-gray-600">
                <span className="text-amber-500 mt-0.5">•</span>{text}
              </li>
            ))}
          </ul>
        </section>

        {/* 6. 納品履歴 */}
        <section className="mb-10 print:mb-8">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-8 h-8 rounded-full bg-orange-500 text-white flex items-center justify-center font-bold text-sm flex-shrink-0">6</span>
            <h2 className="text-xl font-extrabold text-gray-900">📦 納品履歴</h2>
          </div>
          <p className="text-sm text-gray-500 mb-4 leading-relaxed">
            過去にスキャンした納品書の内容を確認・修正できます。画面下部ナビ「履歴」から開きます。
          </p>
          <div className="flex flex-col gap-2">
            {[
              '納品書は日付ごとにまとめて表示される',
              'カードをタップすると食材の一覧と金額が展開表示される',
              '修正したい食材の行をタップ → 数量または金額を変更 → 「保存」',
              '金額を修正すると食材の単価と原価率が自動で再計算される',
            ].map((text, i) => (
              <div key={i} className="flex gap-2 items-start text-xs text-gray-600">
                <span className="text-orange-500 font-bold mt-0.5">•</span>{text}
              </div>
            ))}
          </div>
        </section>

        {/* 7. レシピ設定 */}
        <section className="mb-10 print:mb-8 print:break-before-page">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-8 h-8 rounded-full bg-red-500 text-white flex items-center justify-center font-bold text-sm flex-shrink-0">7</span>
            <h2 className="text-xl font-extrabold text-gray-900">🍳 レシピ設定・原価計算</h2>
          </div>
          <p className="text-sm text-gray-500 mb-4 leading-relaxed">
            各メニューに使う食材と量を設定することで原価・原価率が自動計算されます。
            メニュー画面でメニューをタップ →「レシピを設定」から入ります。
          </p>

          <h3 className="font-bold text-gray-700 text-sm mb-3">◆ 食材を追加する手順</h3>
          <div className="flex flex-col gap-2 mb-4">
            {[
              '「食材を選択」のプルダウンから使う食材を選ぶ',
              '「使用量」に1人前（1皿分）の量を入力する',
              '「追加」ボタンをタップ',
              'すべての食材を追加すると原価・原価率が自動計算される',
            ].map((text, i) => (
              <div key={i} className="flex gap-3 items-start">
                <span className="w-5 h-5 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">{i + 1}</span>
                <p className="text-xs text-gray-600">{text}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-2 mb-4">
            {[
              { label: '30%以下', color: 'bg-green-50 border-green-200', textColor: 'text-green-800', desc: '理想的な原価率です' },
              { label: '30〜40%', color: 'bg-orange-50 border-orange-200', textColor: 'text-orange-800', desc: '少し高め。価格の見直しを検討してください' },
              { label: '40%超', color: 'bg-red-50 border-red-200', textColor: 'text-red-800', desc: '要注意。食材単価またはレシピを見直してください' },
            ].map((item, i) => (
              <div key={i} className={`rounded-xl border px-4 py-2.5 flex items-center gap-3 ${item.color}`}>
                <span className={`font-bold text-sm ${item.textColor}`}>{item.label}</span>
                <span className={`text-xs ${item.textColor}`}>{item.desc}</span>
              </div>
            ))}
          </div>
        </section>

        {/* 8. プラン */}
        <section className="mb-10 print:mb-8">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-8 h-8 rounded-full bg-gray-700 text-white flex items-center justify-center font-bold text-sm flex-shrink-0">8</span>
            <h2 className="text-xl font-extrabold text-gray-900">💳 プランについて</h2>
          </div>
          <div className="flex flex-col gap-3">
            {[
              { name: 'フリー', color: 'bg-gray-50 border-gray-200', features: ['メニュー10品まで', '食材・調味料20種まで', '店舗1つ', 'スキャン機能なし'] },
              { name: 'ベーシック', color: 'bg-amber-50 border-amber-200', features: ['メニュー無制限', '食材・調味料無制限', '店舗1つ', '納品書・メニュースキャン'] },
              { name: 'プロ', color: 'bg-orange-50 border-orange-200', features: ['ベーシックの全機能', '複数店舗対応', 'スタッフアカウント', '優先サポート'] },
            ].map((plan) => (
              <div key={plan.name} className={`rounded-xl border p-4 ${plan.color}`}>
                <p className="font-bold text-gray-800 text-sm mb-2">{plan.name}プラン</p>
                <ul className="flex flex-col gap-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-1.5 text-xs text-gray-600">
                      <span className="text-green-500">✓</span>{f}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* フッター */}
        <div className="border-t border-gray-200 pt-6 text-center">
          <p className="text-xs text-gray-400">Costra サポート：support@costra.app</p>
        </div>

      </div>
    </div>
  );
}
