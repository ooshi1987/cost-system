import Link from 'next/link';
import Image from 'next/image';
import CostraLogo from '@/components/CostraLogo';

export default function HelpAdminPage() {
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
          <span className="text-2xl">🏪</span>
          <h1 className="text-2xl font-extrabold text-gray-900">複数店舗・スタッフ管理</h1>
        </div>
        <p className="text-sm text-gray-400 mb-2">複数の店舗をまとめて管理し、スタッフアカウントを作成する方法です</p>
        <div className="inline-flex items-center gap-1.5 bg-amber-100 text-amber-700 text-xs font-bold px-3 py-1 rounded-full mb-4">
          <span>⚡</span> プロプラン以上で利用できます
        </div>

        {/* 全体の仕組み */}
        <div className="bg-gray-800 rounded-2xl p-5 mb-6">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">仕組みの全体像</p>
          <div className="flex flex-col gap-2">
            {[
              { icon: '👑', label: 'オーナー（管理者）', desc: '全店舗のデータを横断して確認・設定できる' },
              { icon: '↓', label: '', desc: '' },
              { icon: '🏪', label: 'スタッフアカウントを店舗ごとに作成', desc: '担当店舗のみ表示・切り替え不要' },
              { icon: '↓', label: '', desc: '' },
              { icon: '📱', label: 'スタッフがPWAをホーム画面に追加', desc: 'アプリのように使える・自分の店舗だけ表示' },
            ].map((item, i) => (
              item.label === '' ? null :
              <div key={i} className={`flex items-start gap-3 ${item.icon === '↓' ? 'pl-3 py-0' : 'bg-gray-700 rounded-xl px-4 py-3'}`}>
                {item.icon !== '↓' && (
                  <>
                    <span className="text-xl flex-shrink-0">{item.icon}</span>
                    <div>
                      <p className="text-sm font-bold text-white">{item.label}</p>
                      <p className="text-xs text-gray-400">{item.desc}</p>
                    </div>
                  </>
                )}
                {item.icon === '↓' && <p className="text-gray-500 text-sm pl-1">↓</p>}
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-4">

          {/* STEP 1: 設定を開く */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="bg-amber-500 px-5 py-3 flex items-center gap-2">
              <span className="text-white font-extrabold text-base">STEP 1</span>
              <h2 className="font-bold text-white">管理設定を開く</h2>
            </div>
            <div className="p-5 flex flex-col gap-3">
              <div className="flex flex-col gap-2">
                {[
                  { step: '1', text: 'ダッシュボード右上の「⚙️ 設定」をタップ' },
                  { step: '2', text: '管理設定ページ（/admin）が開く' },
                ].map((item) => (
                  <div key={item.step} className="flex gap-3 items-start">
                    <div className="w-6 h-6 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                      {item.step}
                    </div>
                    <p className="text-sm text-gray-600">{item.text}</p>
                  </div>
                ))}
              </div>
              {/* ダッシュボードスクリーンショット */}
              <div className="bg-gray-50 rounded-xl p-2 mt-1">
                <p className="text-[10px] text-gray-400 mb-1.5 font-semibold">📱 ダッシュボード右上の⚙️設定ボタン</p>
                <Image
                  src="/help/screen-admin-dashboard.jpg"
                  alt="ダッシュボード - 設定ボタンの場所"
                  width={390}
                  height={844}
                  className="rounded-lg w-full border border-gray-100"
                />
              </div>
            </div>
          </div>

          {/* STEP 2: 店舗を追加する */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="bg-blue-600 px-5 py-3 flex items-center gap-2">
              <span className="text-white font-extrabold text-base">STEP 2</span>
              <h2 className="font-bold text-white">店舗を追加する（複数店舗の場合）</h2>
            </div>
            <div className="p-5 flex flex-col gap-3">
              <p className="text-sm text-gray-500 leading-relaxed">
                管理設定ページの「🏪 店舗一覧」に最初の店舗がすでに表示されています。
                2店舗目以降は入力欄に店舗名を入れて「追加」ボタンをタップします。
              </p>
              <div className="flex flex-col gap-2">
                {[
                  { step: '1', text: '「店舗一覧」セクションの入力欄に店舗名を入力（例：はぐくみカフェ）' },
                  { step: '2', text: '「追加」ボタンをタップ' },
                  { step: '3', text: '店舗が追加され一覧に表示される。必要な分だけ繰り返す' },
                ].map((item) => (
                  <div key={item.step} className="flex gap-3 items-start">
                    <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                      {item.step}
                    </div>
                    <p className="text-sm text-gray-600">{item.text}</p>
                  </div>
                ))}
              </div>
              {/* 管理ページ上部スクリーンショット */}
              <div className="bg-gray-50 rounded-xl p-2 mt-1">
                <p className="text-[10px] text-gray-400 mb-1.5 font-semibold">📱 管理設定ページ（店舗一覧とスタッフ一覧）</p>
                <Image
                  src="/help/screen-admin-top.jpg"
                  alt="管理設定ページ"
                  width={390}
                  height={844}
                  className="rounded-lg w-full border border-gray-100"
                />
              </div>
            </div>
          </div>

          {/* STEP 3: スタッフアカウントを作る */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="bg-green-600 px-5 py-3 flex items-center gap-2">
              <span className="text-white font-extrabold text-base">STEP 3</span>
              <h2 className="font-bold text-white">スタッフアカウントを作成する</h2>
            </div>
            <div className="p-5 flex flex-col gap-3">
              <div className="flex flex-col gap-2">
                {[
                  { step: '1', text: '「スタッフを追加」フォームに名前・メールアドレスを入力' },
                  { step: '2', text: '初期パスワードを決めて入力（8文字以上。後でスタッフに共有する）' },
                  { step: '3', text: '役割は「スタッフ」のまま、担当店舗をドロップダウンから選択' },
                  { step: '4', text: '「スタッフを追加」ボタンをタップ → パスワードが画面に表示されるのでメモする' },
                  { step: '5', text: 'スタッフに「メールアドレス」と「パスワード」を共有する' },
                ].map((item) => (
                  <div key={item.step} className="flex gap-3 items-start">
                    <div className="w-6 h-6 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                      {item.step}
                    </div>
                    <p className="text-sm text-gray-600">{item.text}</p>
                  </div>
                ))}
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                <p className="text-xs text-amber-700 font-semibold mb-1">⚠️ パスワードは作成時しか表示されません</p>
                <p className="text-xs text-amber-600 leading-relaxed">
                  「スタッフを追加」後に表示されるパスワードをその場でメモしてください。
                  画面を閉じると再表示できません（再発行はユーザーを削除して作り直し）。
                </p>
              </div>
              {/* スタッフ追加フォームのスクリーンショット */}
              <div className="bg-gray-50 rounded-xl p-2 mt-1">
                <p className="text-[10px] text-gray-400 mb-1.5 font-semibold">📱 スタッフ追加フォーム</p>
                <Image
                  src="/help/screen-admin-staff-form.jpg"
                  alt="スタッフ追加フォーム"
                  width={390}
                  height={844}
                  className="rounded-lg w-full border border-gray-100"
                />
              </div>
            </div>
          </div>

          {/* STEP 4: PWAをホーム画面に追加 */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="bg-purple-600 px-5 py-3 flex items-center gap-2">
              <span className="text-white font-extrabold text-base">STEP 4</span>
              <h2 className="font-bold text-white">スタッフがPWAをホーム画面に追加する</h2>
            </div>
            <div className="p-5 flex flex-col gap-3">
              <p className="text-sm text-gray-500 leading-relaxed">
                スタッフが自分のスマホで一度ログインしたあと、ホーム画面にアプリとして追加できます。
                次回からはアプリアイコンをタップするだけでログインなしで開けます。
              </p>

              <div>
                <p className="text-sm font-semibold text-gray-700 mb-2">📱 iPhoneの場合（Safari）</p>
                <div className="flex flex-col gap-2">
                  {[
                    'Safariで cost-system.app を開きログインする',
                    '画面下の「共有」ボタン（□↑のアイコン）をタップ',
                    '「ホーム画面に追加」をタップ',
                    '名前はそのままで「追加」をタップ',
                  ].map((text, i) => (
                    <div key={i} className="flex gap-2 items-start">
                      <span className="text-purple-500 font-bold mt-0.5 flex-shrink-0">{i + 1}.</span>
                      <p className="text-sm text-gray-600">{text}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-sm font-semibold text-gray-700 mb-2">🤖 Androidの場合（Chrome）</p>
                <div className="flex flex-col gap-2">
                  {[
                    'ChromeでURLを開きログインする',
                    '右上の「⋮」メニューをタップ',
                    '「アプリをインストール」または「ホーム画面に追加」をタップ',
                  ].map((text, i) => (
                    <div key={i} className="flex gap-2 items-start">
                      <span className="text-purple-500 font-bold mt-0.5 flex-shrink-0">{i + 1}.</span>
                      <p className="text-sm text-gray-600">{text}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
                <p className="text-xs text-blue-700 font-semibold mb-1">💡 スタッフには自分の店舗だけが表示されます</p>
                <p className="text-xs text-blue-600 leading-relaxed">
                  スタッフアカウントでログインすると、担当店舗のメニュー・食材だけが表示されます。
                  他店舗への切り替えは不要で、複雑な操作が一切ありません。
                </p>
              </div>
            </div>
          </div>

          {/* 役割の違い */}
          <div className="bg-white rounded-2xl shadow-sm p-5 border border-gray-100">
            <h2 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
              <span>👥</span> 管理者とスタッフの違い
            </h2>
            <div className="flex flex-col gap-3">
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                <p className="text-sm font-bold text-amber-800 mb-1">👑 管理者（オーナー）</p>
                <ul className="flex flex-col gap-1">
                  {[
                    '全店舗のデータを確認・編集できる',
                    '店舗の追加・削除ができる',
                    'スタッフアカウントの作成・削除ができる',
                    'プラン・請求情報の変更ができる',
                  ].map((t, i) => <li key={i} className="text-xs text-amber-700 flex gap-1"><span>✓</span>{t}</li>)}
                </ul>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
                <p className="text-sm font-bold text-blue-800 mb-1">👤 スタッフ</p>
                <ul className="flex flex-col gap-1">
                  {[
                    '担当店舗のデータのみ表示・編集できる',
                    '他店舗への切り替えや閲覧はできない',
                    'アカウント設定・プラン変更はできない',
                  ].map((t, i) => <li key={i} className="text-xs text-blue-700 flex gap-1"><span>✓</span>{t}</li>)}
                </ul>
              </div>
            </div>
          </div>

          {/* よくある質問 */}
          <div className="bg-white rounded-2xl shadow-sm p-5 border border-gray-100">
            <h2 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
              <span>❓</span> よくある質問
            </h2>
            <div className="flex flex-col gap-4">
              {[
                {
                  q: 'パスワードを忘れたスタッフはどうすれば？',
                  a: '現在パスワードリセット機能はありません。管理者がそのアカウントを削除して新しいアカウントを作成してください。',
                },
                {
                  q: 'スタッフが退職したら？',
                  a: '管理設定のスタッフ一覧から「削除」をタップしてアカウントを削除してください。ログインできなくなります。',
                },
                {
                  q: '管理者が複数いてもいい？',
                  a: 'はい。スタッフ追加時に役割を「管理者」にすると、同じ権限を持つアカウントを複数作れます。',
                },
              ].map((item, i) => (
                <div key={i}>
                  <p className="text-sm font-semibold text-gray-800 mb-1">Q. {item.q}</p>
                  <p className="text-sm text-gray-500 leading-relaxed">A. {item.a}</p>
                </div>
              ))}
            </div>
          </div>

          {/* 他ページリンク */}
          <div className="bg-white rounded-2xl shadow-sm p-4 border border-gray-100">
            <p className="text-xs font-bold text-gray-500 mb-3">他のページの使い方</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { href: '/help/dashboard', icon: '🏠', label: 'ダッシュボード' },
                { href: '/help/menu', icon: '📋', label: 'メニュー管理' },
                { href: '/help/ingredients', icon: '🥦', label: '食材・調味料' },
                { href: '/help/delivery', icon: '📸', label: '納品書スキャン' },
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
