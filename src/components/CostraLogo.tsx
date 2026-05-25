interface CostraLogoProps {
  /** アイコン+テキスト or アイコンのみ */
  variant?: 'full' | 'icon';
  /** ロゴ全体のサイズスケール（px基準、デフォルト32） */
  size?: number;
  className?: string;
}

/**
 * Costra ブランドロゴ
 * - variant="full"  → SVGアイコン ＋ "Costra" テキスト（横並び）
 * - variant="icon"  → SVGアイコンのみ（ファビコン・PWAアイコン用途）
 */
export default function CostraLogo({
  variant = 'full',
  size = 32,
  className = '',
}: CostraLogoProps) {
  const textSize = Math.round(size * 0.65);

  const icon = (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="costra-bg" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#d97706" />
        </linearGradient>
      </defs>

      {/* 背景：ラウンド正方形 */}
      <rect width="32" height="32" rx="8" fill="url(#costra-bg)" />

      {/* C アーク — 原価率の円グラフをイメージ */}
      <path
        d="M22 16a6 6 0 1 1-6-6"
        stroke="white"
        strokeWidth="2.8"
        strokeLinecap="round"
        fill="none"
        opacity="0.95"
      />

      {/* 小さなトレンドライン（右上） — データ分析ツールの象徴 */}
      <polyline
        points="19,9 21,11.5 23,9.5 25,7"
        stroke="white"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.85"
        fill="none"
      />

      {/* トレンドラインの終点ドット */}
      <circle cx="25" cy="7" r="1.5" fill="white" opacity="0.9" />
    </svg>
  );

  if (variant === 'icon') return icon;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {icon}
      <span
        style={{ fontSize: textSize, lineHeight: 1, letterSpacing: '-0.02em' }}
        className="font-bold text-gray-900 tracking-tight select-none"
      >
        Costra
      </span>
    </div>
  );
}
