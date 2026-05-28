import Link from 'next/link';
import CostraLogo from '@/components/CostraLogo';

const AI_STEPS = [
  { icon: '📸', label: '撮影する', desc: 'スマホで納品書やメニューを撮るだけ' },
  { icon: '🤖', label: 'AIが読み取る', desc: '食材名・価格・メニュー内容を自動解析' },
  { icon: '✅', label: '自動で完了', desc: '登録・原価計算・更新まで全部おまかせ' },
];

const PROBLEMS = [
  {
    icon: '😩',
    problem: '原価計算にExcelで何時間もかかる',
    detail: '食材が値上がりするたびに、全メニューの計算をやり直し。終わらない作業に疲弊。',
  },
  {
    icon: '📦',
    problem: '納品書の手入力が毎回しんどい',
    detail: '届くたびに品名・価格を1つずつ入力。ミスも多く、確認作業まで発生してしまう。',
  },
  {
    icon: '📉',
    problem: '原価率が高いメニューを把握できていない',
    detail: '「なんとなく高そう」で終わってしまい、値上げや改善のタイミングを逃し続けている。',
  },
  {
    icon: '🤯',
    problem: '食材の値上がりが原価にいつ反映されたかわからない',
    detail: '価格改定の時期と、メニュー原価の更新がバラバラで、どのデータが正しいか不明。',
  },
];

const FEATURES = [
  {
    icon: '📸',
    title: '納品書の登録、AIが全部やる',
    description: 'スマホで撮るだけ。食材名も仕入れ価格も、AIが自動で読み取って登録。手入力は一切不要。',
  },
  {
    icon: '🍽️',
    title: 'メニューの登録も、AIが全部やる',
    description: '紙のメニューを撮影するだけでAIが自動登録。カテゴリも値段も、AIにおまかせ。',
  },
  {
    icon: '📝',
    title: 'レシピの登録も、AIが全部やる',
    description: '手書きのレシピでもOK。撮影するだけでAIが内容を読み取り、食材と紐づけて登録。',
  },
  {
    icon: '📊',
    title: '原価率の計算も、AIが自動でやる',
    description: '食材価格が変わると、AIが即座に全メニューの原価率を再計算。常に最新の数字を把握できる。',
  },
  {
    icon: '📋',
    title: 'メニュー原価の管理も、全部おまかせ',
    description: 'レシピと食材の紐づけもAIが補助。値上げタイミングの判断を数字でサポートします。',
  },
  {
    icon: '🏪',
    title: '複数店舗も、まとめて管理',
    description: '店舗ごとの食材・メニューをAIが整理。チェーン店や複数業態にもそのまま対応。',
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
    features: ['メニュー無制限', '食材・調味料無制限', '店舗1つ', 'AIスキャン無制限'],
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
        <div className="max-w-4xl mx-auto px-5 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CostraLogo size={28} />
            <span className="hidden sm:block text-xs text-gray-400 font-medium border-l border-gray-200 pl-3">
              AI原価管理
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="text-sm text-gray-400 hover:text-gray-600 font-medium transition-colors px-2 hidden sm:block"
            >
              ログイン
            </Link>
            <Link
              href="/signup"
              className="text-sm border border-amber-400 text-amber-600 hover:bg-amber-50 font-bold px-4 py-2 rounded-xl transition-colors"
            >
              無料で始める
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
      <section className="max-w-4xl mx-auto px-5 pt-20 pb-16 text-center">
        <div className="inline-flex items-center gap-2 bg-amber-50 text-amber-700 text-xs font-bold px-3 py-1.5 rounded-full mb-6 border border-amber-200">
          <span>🤖</span>
          <span>AI が原価管理をまるごと自動化</span>
        </div>
        <p className="text-gray-400 text-sm sm:text-base mb-3">
          大変な原価計算、もう自分でやらなくていい。
        </p>
        <h1 className="text-3xl sm:text-5xl font-extrabold text-gray-900 leading-tight mb-5">
          撮影するだけ。<br />
          <span className="text-amber-500">あとはAIが全部やる。</span>
        </h1>
        <p className="text-gray-500 text-base sm:text-lg max-w-xl mx-auto mb-10 leading-relaxed">
          食材の登録も、メニューの原価計算も、価格変動の反映も。<br />
          飲食店の原価管理に必要なことを、AIがすべて自動でこなします。
        </p>

        {/* AI ステップ */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-0 mb-10">
          {AI_STEPS.map((step, i) => (
            <div key={step.label} className="flex sm:flex-row flex-col items-center gap-2 sm:gap-0">
              <div className="flex flex-col items-center bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 w-44">
                <span className="text-3xl mb-1">{step.icon}</span>
                <span className="font-bold text-sm text-gray-900">{step.label}</span>
                <span className="text-gray-400 text-xs mt-1 text-center leading-snug">{step.desc}</span>
              </div>
              {i < AI_STEPS.length - 1 && (
                <span className="text-gray-300 text-xl sm:mx-3 rotate-90 sm:rotate-0">→</span>
              )}
            </div>
          ))}
        </div>

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
              <span>🤖</span>
              <span>AIが自動で登録・計算中...</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── 課題提示 ── */}
      <section className="max-w-4xl mx-auto px-5 mb-24">
        <h2 className="text-2xl font-extrabold text-center mb-3">こんなお悩み、ありませんか？</h2>
        <p className="text-gray-500 text-center text-sm mb-10">多くの飲食店オーナーが抱える、原価管理の「あるある」です</p>
        <div className="grid sm:grid-cols-2 gap-4 mb-12">
          {PROBLEMS.map((p) => (
            <div key={p.problem} className="flex gap-4 bg-red-50 border border-red-100 rounded-2xl p-5">
              <div className="text-3xl flex-shrink-0">{p.icon}</div>
              <div>
                <div className="font-bold text-gray-900 mb-1">「{p.problem}」</div>
                <div className="text-gray-500 text-sm leading-relaxed">{p.detail}</div>
              </div>
            </div>
          ))}
        </div>
        <div className="text-center">
          <div className="inline-flex flex-col items-center gap-3">
            <div className="text-2xl font-extrabold text-gray-900">
              それ、<span className="text-amber-500">全部Costraが解決します。</span>
            </div>
            <div className="text-gray-400 text-sm">撮影するだけで、AIが全部やってくれます。</div>
          </div>
        </div>
      </section>

      {/* ── 特徴 ── */}
      <section className="max-w-4xl mx-auto px-5 mb-24">
        <h2 className="text-2xl font-extrabold text-center mb-3">AIがやってくれること</h2>
        <p className="text-gray-500 text-center text-sm mb-10">面倒な作業は全部AIにおまかせ。あなたは経営に集中できる。</p>
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
        <h2 className="text-2xl font-extrabold mb-3">AIに任せて、経営に集中しよう</h2>
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
