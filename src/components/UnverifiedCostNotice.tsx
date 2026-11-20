import { COST_DATA_VERIFIED } from '@/lib/costVerification';

/** 原価データが未検証のあいだ、原価・原価率を表示しない理由を伝える */
export default function UnverifiedCostNotice() {
  if (COST_DATA_VERIFIED) return null;
  return (
    <div role="note" className="mb-4 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-800">
      <p className="font-bold">原価・原価率は準備中です（未検証）</p>
      <p className="mt-1 text-xs">
        登録済みのレシピは分量・単位の確認が終わっていないため、原価・原価率の数字を表示していません。材料の登録と食材の単価（仕入から自動更新）は使えます。
      </p>
    </div>
  );
}
