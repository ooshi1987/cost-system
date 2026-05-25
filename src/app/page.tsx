import Link from 'next/link';
import CostraLogo from '@/components/CostraLogo';

const FEATURES = [
  {
    icon: '📸',
    title: '納品書をスキャンするだけ',
    description: 'スマホで撮影するだけで食材の仕入れ価格を自動登録。手入力の手間をゼロに。',
  },
  {
    icon: '📊',
    title: 'リアルタイム原価率を把握',
    description: 'メニューごとの原価率を自動計算。食材価格が変わると即座に反映されます。',
  },
  {
    icon: '📋',
    title: 'メニュー原価を一元管理',
    description: 'レシピと食材をひもづけて原価を自動算出。値上げタイミングの判断に役立てましょう。',
  },
  {
    icon: '🏪',
    title: '複数店舗に対応',
    description: '店舗ごとに食材・メニューを分けて管理。チェーン店や複数業態にも対応。',
  },
];

const PLANS = [
  {
    name: 'フリー',
    price: '¥0',
    period: '',
    description: 'まずはお試し',
    features: ['メニュー10品まで', '食材・調味料20種まで', '店舗1つ'],
    cta: '無料で始める',
    href: '/signup',
    highlight: false,
  },
  {
    name: 'ベーシック',
    price: '¥1,980',
    period: '/ 月',
    description: '個人・小規模店舗向け',
    features: ['メニュー無制限', '食材・調味料無制限', '店舗1つ', '納品書スキャン'],
    cta: '14日間無料で試す',
    href: '/signup',
    highlight: true,
  },
  {
    name: 'プロ',
    price: '¥4,980',
    period: '/ 月',
    description: '複数店舗・チェーン向け',
    features: ['ベーシックの全機能', '複数店舗対応', 'スタッフアカウント', '優先サポート'],
    cta: '14日間無料で試す',
    href: '/signup',
    highlight: false,
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-gray-800">

      {/* ── ヘッダー ── */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-5 h-14 flex items-center justify-between">
          <CostraLogo size={28} />
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm text-gray-500 hover:text-gray-700 font-medium transition-colors"
            >
              ログイン
            </Link>
            <Link
              href="/demo"
              className="text-sm bg-amber-500 hover:bg-amber-600 text-white font-bold px-4 py-2 rounded-xl transition-colors"
            >
              デモを試す
            </Link>
          </div>
        </div>
      </header>

      {/* ── ヒーロー ── */}
      <section className="max-w-4xl mx-auto px-5 pt-20 pb-24 text-center">
        <div className="inline-flex items-center gap-2 bg-amber-50 text-amber-700 text-xs font-bold px-3 py-1.5 rounded-full mb-6 border border-amber-200">
          <span>🎉</span>
          <span>フリープランは永久無料</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 leading-tight mb-4">
          飲食店の原価管理を、<br />
          <span className="text-amber-500">もっとかんたんに。</span>
        </h1>
        <p className="text-gray-500 text-base sm:text-lg max-w-xl mx-auto mb-8 leading-relaxed">
          納品書を撮影するだけで食材の仕入れ価格を自動登録。
          メニューごとの原価率をリアルタイムで把握できます。
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
          <Link
            href="/demo"
            className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white font-bold px-7 py-4 rounded-2xl text-base shadow-lg shadow-amber-200 transition-colors"
          >
            <span>🚀</span>
            <span>デモを試す</span>
          </Link>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 bg-gray-50 hover:bg-gray-100 text-gray-700 font-semibold px-7 py-4 rounded-2xl text-base border border-gray-200 transition-colors"
          >
            無料で始める →
          </Link>
        </div>
        <p className="text-xs text-gray-400 mt-4">クレジットカード不要 · 登録2分</p>
      </section>

      {/* ── イメージ（ダミープレビュー） ── */}
      <section className="max-w-2xl mx-auto px-5 mb-24">
        <div className="bg-gray-50 border border-gray-200 rounded-3xl overflow-hidden shadow-xl">
          <div className="bg-white border-b border-gray-100 px-5 py-3 flex items-center gap-2">
            <div className="flex gap-1.5">
              <span className="w-3 h-3 rounded-full bg-red-300" />
              <span className="w-3 h-3 rounded-full bg-yellow-300" />
              <span className="w-3 h-3 rounded-full bg-green-300" />
            </div>
            <CostraLogo size={16} className="ml-2 opacity-60" />
          </div>
          <div className="p-6">
            <div className="grid grid-cols-3 gap-3 mb-5">
              {[
                { icon: '📋', label: 'メニュー', value: '24品', color: 'bg-blue-50 text-blue-600' },
                { icon: '🥦', label: '食材', value: '68種', color: 'bg-green-50 text-green-600' },
                { icon: '📊', label: '平均原価率', value: '28%', color: 'bg-amber-50 text-amber-600' },
              ].map((item) => (
                <div key={item.label} className={`${item.color} rounded-2xl p-3 text-center`}>
                  <div className="text-xl mb-1">{item.icon}</div>
                  <div className="text-xl font-bold">{item.value}</div>
                  <div className="text-[11px] font-medium mt-0.5 opacity-80">{item.label}</div>
                </div>
              ))}
            </div>
            <div className="bg-amber-500 rounded-2xl py-3 text-center text-white font-bold text-sm flex items-center justify-center gap-2">
              <span>📸</span>
              <span>納品書をスキャン</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── 特徴 ── */}
      <section className="max-w-4xl mx-auto px-5 mb-24">
        <h2 className="text-2xl font-extrabold text-center mb-3">なぜ選ばれるのか</h2>
        <p className="text-gray-500 text-center text-sm mb-10">飲食店オーナーの「めんどくさい」を解消します</p>
        <div className="grid sm:grid-cols-2 gap-5">
          {FEATURES.map((f) => (
            <div key={f.title} className="flex gap-4 bg-gray-50 rounded-2xl p-5 border border-gray-100">
              <div className="text-3xl flex-shrink-0">{f.icon}</div>
              <div>
                <div className="font-bold text-gray-900 mb-1">{f.title}</div>
                <div className="text-gray-500 text-sm leading-relaxed">{f.description}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── 料金 ── */}
      <section className="bg-gray-50 border-y border-gray-100 py-20 mb-0">
        <div className="max-w-4xl mx-auto px-5">
          <h2 className="text-2xl font-extrabold text-center mb-3">シンプルな料金体系</h2>
          <p className="text-gray-500 text-center text-sm mb-10">小さく始めて、必要になったら拡張できます</p>
          <div className="grid sm:grid-cols-3 gap-5">
            {PLANS.map((plan) => (
              <div
                key={plan.name}
                className={`rounded-2xl p-6 flex flex-col ${
                  plan.highlight
                    ? 'bg-amber-500 text-white shadow-xl shadow-amber-200 scale-105'
                    : 'bg-white border border-gray-200'
                }`}
              >
                <div className="mb-4">
                  <div className={`text-xs font-bold uppercase tracking-wide mb-1 ${plan.highlight ? 'text-amber-100' : 'text-gray-400'}`}>
                    {plan.description}
                  </div>
                  <div className="font-extrabold text-2xl">{plan.name}</div>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-3xl font-extrabold">{plan.price}</span>
                    <span className={`text-sm ${plan.highlight ? 'text-amber-100' : 'text-gray-400'}`}>{plan.period}</span>
                  </div>
                </div>
                <ul className="space-y-2 mb-6 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className={`flex items-center gap-2 text-sm ${plan.highlight ? 'text-amber-50' : 'text-gray-600'}`}>
                      <span className={plan.highlight ? 'text-white' : 'text-amber-500'}>✓</span>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href={plan.href}
                  className={`block text-center font-bold py-3 rounded-xl text-sm transition-colors ${
                    plan.highlight
                      ? 'bg-white text-amber-600 hover:bg-amber-50'
                      : 'bg-amber-500 hover:bg-amber-600 text-white'
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA フッター ── */}
      <section className="max-w-4xl mx-auto px-5 py-20 text-center">
        <h2 className="text-2xl font-extrabold mb-3">まずはデモを見てみましょう</h2>
        <p className="text-gray-500 text-sm mb-8">登録不要、すぐに試せます</p>
        <Link
          href="/demo"
          className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white font-bold px-8 py-4 rounded-2xl text-base shadow-lg shadow-amber-200 transition-colors"
        >
          <span>🚀</span>
          <span>デモを試す</span>
        </Link>
      </section>

      {/* ── フッター ── */}
      <footer className="border-t border-gray-100 py-8">
        <div className="max-w-4xl mx-auto px-5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <CostraLogo size={22} className="opacity-70" />
          <div className="flex gap-5 text-xs text-gray-400">
            <Link href="/login" className="hover:text-gray-600 transition-colors">ログイン</Link>
            <Link href="/signup" className="hover:text-gray-600 transition-colors">新規登録</Link>
          </div>
        </div>
      </footer>

    </div>
  );
}
