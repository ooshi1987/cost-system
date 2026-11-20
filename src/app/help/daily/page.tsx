import Link from 'next/link';
import CostraLogo from '@/components/CostraLogo';

// 店長・スタッフ向けの「毎日の手順」1枚もの。スマホで見ても、印刷して貼っても使える構成にする。

const STEPS = [
  {
    no: 1,
    when: '伝票・レシートが届いたら（その日のうちに）',
    title: '仕入伝票を撮る',
    href: '/delivery',
    link: '仕入伝票を撮影する',
    items: [
      '下の「撮影」→「仕入伝票・レシート」を開く',
      '伝票は1枚ずつ撮る。取引先・日付・全部の明細・合計が写るように',
      '「読み取り開始」は1回だけ押して、結果が出るまで待つ',
      '取引先・伝票の日付・品名・数量・単位・金額を原本と見比べる',
      '「税込合計」が「一致」になっていることを確認する',
      '「原本と照合しました」にチェックして「保存」を1回押す',
    ],
  },
  {
    no: 2,
    when: '閉店後',
    title: '売上を締める',
    href: '/sales',
    link: '売上締めを開く',
    items: [
      '「撮影」→「Airレジ 売上締め」を開き、Airレジの締め画面を撮る',
      '読み取れないときや写真がないときは「写真なしで手入力する」',
      '営業日（深夜0時を過ぎても締めの営業日）と売上合計を確認する',
      '現金・カードなどの内訳を確認し、合計照合が「一致」になるようにする',
      '「原本と照合しました」にチェックして保存する',
    ],
  },
  {
    no: 3,
    when: '仕入以外の支払いがあったら',
    title: '経費を入れる',
    href: '/expense',
    link: '経費を手入力する',
    items: [
      '消耗品・水道光熱費など、仕入以外の経費だけを入れる',
      '食材・酒の仕入は伝票から自動で記録されるので、ここには入れない',
    ],
  },
];

const DONTS = [
  { title: '「読み取り開始」を連打しない', detail: '1回ごとにAIの費用がかかります。1日の回数にも上限があります。' },
  { title: '保存できたか分からないとき、もう一度保存しない', detail: '先に「履歴」で記録があるか確認してください。二重登録の原因になります。' },
  { title: '仕入を「経費の手入力」に入れない', detail: '伝票と経費の両方に入り、支出が2倍になります。' },
  { title: '複数の伝票を1枚の写真に写さない', detail: '明細が混ざります。1枚ずつ撮ってください。' },
  { title: 'メニューの原価・原価率は使わない', detail: 'レシピの確認が終わるまで「未検証」です。' },
];

const TROUBLES = [
  { sign: 'エラーが出た・画面が止まった', action: '時刻と画面（スクショ）を残し、その伝票はいつもの記録（Excel・紙）にも書いておく。後でオーナーに伝える。' },
  { sign: 'ログインできない・サーバーエラー', action: '少し待って1回だけやり直す。だめならいつもの記録で続け、オーナーに伝える。パスワードの変更や新しいアカウント作成はしない。' },
  { sign: '「本日のAI読み取りの上限」と出た', action: '売上は「写真なしで手入力」、伝票は翌日に撮るか、いつもの記録に書いておく。' },
  { sign: '「同じ内容の伝票が登録されています」と出た', action: '保存せず「履歴」→「納品履歴」で同じ伝票がないか確認する。別の伝票のときだけ保存する。' },
];

export default function HelpDailyPage() {
  return (
    <div className="min-h-screen bg-gray-50 print:bg-white">
      <div className="max-w-xl mx-auto px-4 pt-6 pb-24 print:pb-4">
        <div className="flex items-center justify-between mb-6 print:hidden">
          <div className="flex items-center gap-3">
            <CostraLogo size={28} />
            <span className="text-sm font-semibold text-gray-500">使い方ガイド</span>
          </div>
          <Link href="/dashboard" className="text-xs text-gray-400 hover:text-gray-600 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            ← 今日へ
          </Link>
        </div>

        <h1 className="text-2xl font-extrabold text-gray-900">毎日の手順</h1>
        <p className="text-sm text-gray-500 mt-1 mb-4">店長・スタッフ向け。迷ったらこのページに戻ってください。</p>

        <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 mb-6">
          <p className="font-bold">試験運用中は、いつもの記録（Excel・LINE）も続けてください</p>
          <p className="text-xs mt-1 leading-relaxed">Costraの数字といつもの記録が合っているかを確かめる期間です。合わないときは、どちらも消さずにオーナーへ伝えてください。</p>
        </div>

        <section className="flex flex-col gap-4 mb-8">
          {STEPS.map((step) => (
            <div key={step.no} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 print:shadow-none print:break-inside-avoid">
              <p className="text-xs font-semibold text-amber-700">{step.when}</p>
              <h2 className="text-lg font-bold text-gray-900 mt-0.5">
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-500 text-white text-sm mr-2">{step.no}</span>
                {step.title}
              </h2>
              <ol className="mt-3 flex flex-col gap-2 text-sm text-gray-700 list-decimal pl-5">
                {step.items.map((item) => <li key={item} className="leading-relaxed">{item}</li>)}
              </ol>
              <Link href={step.href} className="mt-3 inline-block text-sm font-semibold text-amber-700 underline print:hidden">{step.link} →</Link>
            </div>
          ))}
        </section>

        <section className="mb-8 print:break-inside-avoid">
          <h2 className="text-lg font-bold text-gray-900 mb-3">やってはいけないこと</h2>
          <ul className="flex flex-col gap-2">
            {DONTS.map((item) => (
              <li key={item.title} className="bg-white rounded-xl border border-red-100 px-4 py-3">
                <p className="text-sm font-bold text-red-700">✕ {item.title}</p>
                <p className="text-xs text-gray-600 mt-1 leading-relaxed">{item.detail}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="print:break-inside-avoid">
          <h2 className="text-lg font-bold text-gray-900 mb-3">困ったとき</h2>
          <dl className="flex flex-col gap-2">
            {TROUBLES.map((item) => (
              <div key={item.sign} className="bg-white rounded-xl border border-gray-100 px-4 py-3">
                <dt className="text-sm font-bold text-gray-900">{item.sign}</dt>
                <dd className="text-xs text-gray-600 mt-1 leading-relaxed">{item.action}</dd>
              </div>
            ))}
          </dl>
        </section>
      </div>
    </div>
  );
}
