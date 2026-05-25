'use client';

import { useRouter } from 'next/navigation';

interface Props {
  message: string;
  onClose: () => void;
}

export default function UpgradeModal({ message, onClose }: Props) {
  const router = useRouter();

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4 pb-6 sm:pb-0">
      {/* オーバーレイ */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* モーダル本体 */}
      <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl p-6 z-10">
        {/* アイコン */}
        <div className="text-4xl text-center mb-3">🚀</div>

        <h2 className="text-lg font-bold text-center text-gray-800 mb-2">
          上限に達しました
        </h2>

        <p className="text-sm text-center text-gray-500 mb-5">
          {message}
        </p>

        {/* プランの違い */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-5 text-sm">
          <p className="font-semibold text-amber-700 mb-1.5">プランをアップグレードすると：</p>
          <ul className="text-amber-600 space-y-1">
            <li>✅ メニュー品目・食材が<strong>無制限</strong></li>
            <li>✅ 全スキャン・原価計算機能</li>
            <li className="text-xs text-amber-500 pt-1">Basic ¥1,980〜 / 月（税別）</li>
          </ul>
        </div>

        <button
          onClick={() => { onClose(); router.push('/billing'); }}
          className="w-full bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white py-3.5 rounded-xl font-bold text-base transition-colors shadow-md shadow-amber-100"
        >
          プランを見る →
        </button>

        <button
          onClick={onClose}
          className="w-full mt-2 py-2.5 text-sm text-gray-400 hover:text-gray-600 transition-colors"
        >
          キャンセル
        </button>
      </div>
    </div>
  );
}
