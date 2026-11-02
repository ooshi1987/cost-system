// OCR が変換した数量ではなく、原本から読み取った数量・単位の文字列を使う。
// 複数の数量や単位が混ざる場合は推測せず、画面での確認を必須にする。
export function parsePrintedQuantity(value: unknown): { quantity: number; unit: string } | null {
  if (typeof value !== 'string' || value.length > 100) return null;
  const text = value.normalize('NFKC').trim();
  const match = text.match(/^((?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?)\s*([^\d\s,\.]+)$/u);
  if (!match) return null;
  const quantity = Number(match[1].replaceAll(',', ''));
  if (!Number.isFinite(quantity) || quantity <= 0) return null;
  return { quantity, unit: match[2] };
}
