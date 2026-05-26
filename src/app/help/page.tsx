import Link from 'next/link';
import CostraLogo from '@/components/CostraLogo';

const SECTIONS = [
  {
    id: 'start',
    title: 'はじめかた',
    icon: '🚀',
    steps: [
      {
        step: 1,
        title: 'アカウント登録',
        desc: 'メールアドレスとパスワードを入力して登録。クレジットカード不要で今すぐ始められます。',
      },
      {
        step: 2,
        title: '店舗を設定する',
        desc: 'ダッシュボードから店舗名を設定してください。複数店舗はプロプランで対応しています。',
      },
      {
        step: 3,
        title: '食材・メニューを登録する',
        desc: '手入力でも、スキャン機能でも登録できます。まずは主要な食材とメニューを入れてみましょう。',
      },
    ],
  },
  {
    id: 'scan',
    title: 'スキャン機能',
    icon: '📸',
    steps: [
      {
        step: null,
        title: '納品書をスキャン',
        desc: '下部ナビの「スキャン」からカメラを起動。納品書を撮影するだけで食材名・単価・数量をAIが自動読み取りします。確認画面で修正してから保存してください。',
        badge: 'ベーシック以上',
      },
      {
        step: null,
        title: 'メニューをスキャン',
        desc: '紙のメニュー表をスマホで撮影するだけ。AIがメニュー名・カテゴリ・価格を自動認識して登録します。手入力の手間をゼロにします。',
        badge: 'ベーシック以上',
      },
      {
        step: null,
        title: 'レシピをスキャン',
        desc: '紙のレシピをそのまま撮影するだけ。AIが食材と分量を読み取り、レシピとして自動登録。原価計算にすぐ活用できます。',
        badge: 'ベーシック以上',
      },
    ],
  },
  {
    id: 'ingredients',
    title: '食材・調味料の管理',
    icon: '🥦',
    steps: [
      {
        step: null,
        title: '食材を手動登録する',
        desc: '「食材」メニューから「＋追加」をタップ。食材名・単位・単価を入力して保存します。',
      },
      {
        step: null,
        title: '単価を更新する',
        desc: '仕入れ値が変わったら食材の単価を編集するだけ。関連するすべてのメニューの原価率が自動で再計算されます。',
      },
      {
        step: null,
        title: '調味料を管理する',
        desc: '「食材」メニューの「調味料」タブから管理できます。少量使用の調味料も正確に原価に反映できます。',
      },
    ],
  },
  {
    id: 'menu',
    title: 'メニューと原価管理',
    icon: '📋',
    steps: [
      {
        step: null,
        title: 'メニューを登録する',
        desc: '「メニュー」から「＋追加」をタップ。メニュー名・販売価格・カテゴリを設定します。',
      },
      {
        step: null,
        title: 'レシピを設定して原価を計算',
        desc: 'メニュー詳細の「レシピ」タブから使用食材と分量を設定。登録した食材の単価をもとに原価・原価率が自動計算されます。',
      },
      {
        step: null,
        title: '原価率の目安',
        desc: '飲食店の理想的な原価率は30%以下が目安です。Costraでは原価率が高いメニューを色分けで警告します。',
      },
    ],
  },
  {
    id: 'plan',
    title: 'プランについて',
    icon: '💳',
    plans: [
      {
        name: 'フリー',
        color: 'bg-gray-50 border-gray-200',
        badge: 'bg-gray-100 text-gray-600',
        features: ['メニュー10品まで', '食材・調味料20種まで', '店舗1つ', 'スキャン機能なし'],
      },
      {
        name: 'ベーシック',
        color: 'bg-amber-50 border-amber-200',
        badge: 'bg-amber-100 text-amber-700',
        features: ['メニュー無制限', '食材・調味料無制限', '店舗1つ', '納品書・メニュー・レシピスキャン'],
      },
      {
        name: 'プロ',
        color: 'bg-orange-50 border-orange-200',
        badge: 'bg-orange-100 text-orange-700',
        features: ['ベーシックの全機能', '複数店舗対応', 'スタッフアカウント', '優先サポート'],
      },
    ],
  },
];

export default function HelpPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-xl mx-auto px-4 pt-6 pb-8">

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
        <p className="text-sm text-gray-400 mb-6">Costraの基本操作をわかりやすく解説します</p>

        {/* 目次 */}
        <div className="bg-white rounded-2xl shadow-sm p-4 mb-6 border border-gray-100">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">目次</p>
          <div className="flex flex-col gap-1">
            {SECTIONS.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className="flex items-center gap-2 text-sm text-gray-700 hover:text-amber-600 py-1 transition-colors"
              >
                <span>{s.icon}</span>
                <span>{s.title}</span>
              </a>
            ))}
          </div>
        </div>

        {/* セクション */}
        <div className="flex flex-col gap-6">

          {/* はじめかた */}
          <section id="start">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xl">🚀</span>
              <h2 className="text-lg font-bold text-gray-800">はじめかた</h2>
            </div>
            <div className="flex flex-col gap-3">
              {SECTIONS[0].steps!.map((item) => (
                <div key={item.step} className="bg-white rounded-2xl shadow-sm p-4 border border-gray-100 flex gap-3">
                  <div className="w-7 h-7 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">
                    {item.step}
                  </div>
                  <div>
                    <div className="font-semibold text-gray-800 text-sm mb-1">{item.title}</div>
                    <div className="text-xs text-gray-500 leading-relaxed">{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* スキャン機能 */}
          <section id="scan">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xl">📸</span>
              <h2 className="text-lg font-bold text-gray-800">スキャン機能</h2>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-2.5 mb-3 flex items-center gap-2">
              <span className="text-amber-500 text-sm">⚡</span>
              <p className="text-xs text-amber-700 font-medium">スキャン機能はベーシックプラン以上でご利用いただけます</p>
            </div>
            <div className="flex flex-col gap-3">
              {SECTIONS[1].steps!.map((item, i) => (
                <div key={i} className="bg-white rounded-2xl shadow-sm p-4 border border-gray-100">
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="font-semibold text-gray-800 text-sm">{item.title}</div>
                    {item.badge && (
                      <span className="text-[10px] bg-amber-100 text-amber-600 font-bold px-2 py-0.5 rounded-full">
                        {item.badge}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 leading-relaxed">{item.desc}</div>
                </div>
              ))}
            </div>
          </section>

          {/* 食材・調味料 */}
          <section id="ingredients">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xl">🥦</span>
              <h2 className="text-lg font-bold text-gray-800">食材・調味料の管理</h2>
            </div>
            <div className="flex flex-col gap-3">
              {SECTIONS[2].steps!.map((item, i) => (
                <div key={i} className="bg-white rounded-2xl shadow-sm p-4 border border-gray-100">
                  <div className="font-semibold text-gray-800 text-sm mb-1">{item.title}</div>
                  <div className="text-xs text-gray-500 leading-relaxed">{item.desc}</div>
                </div>
              ))}
            </div>
          </section>

          {/* メニューと原価管理 */}
          <section id="menu">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xl">📋</span>
              <h2 className="text-lg font-bold text-gray-800">メニューと原価管理</h2>
            </div>
            <div className="flex flex-col gap-3">
              {SECTIONS[3].steps!.map((item, i) => (
                <div key={i} className="bg-white rounded-2xl shadow-sm p-4 border border-gray-100">
                  <div className="font-semibold text-gray-800 text-sm mb-1">{item.title}</div>
                  <div className="text-xs text-gray-500 leading-relaxed">{item.desc}</div>
                </div>
              ))}
            </div>
          </section>

          {/* プランについて */}
          <section id="plan">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xl">💳</span>
              <h2 className="text-lg font-bold text-gray-800">プランについて</h2>
            </div>
            <div className="flex flex-col gap-3">
              {SECTIONS[4].plans!.map((plan) => (
                <div key={plan.name} className={`rounded-2xl border p-4 ${plan.color}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${plan.badge}`}>
                      {plan.name}
                    </span>
                  </div>
                  <ul className="flex flex-col gap-1">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-center gap-1.5 text-xs text-gray-600">
                        <span className="text-green-500">✓</span>
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
              <Link
                href="/billing"
                className="flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-white font-bold py-3 rounded-2xl text-sm transition-colors"
              >
                プランを変更する →
              </Link>
            </div>
          </section>

          {/* サポート */}
          <section>
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
          </section>

        </div>
      </div>
    </div>
  );
}
