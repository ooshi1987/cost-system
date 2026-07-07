import { prisma } from '@/lib/prisma';

export const DEFAULT_CATEGORIES: { name: string; kind: 'expense' | 'income'; color: string }[] = [
  { name: '仕入（食材・酒）', kind: 'expense', color: '#c84a1f' },
  { name: '人件費',          kind: 'expense', color: '#e87b4d' },
  { name: '地代家賃',        kind: 'expense', color: '#5a6573' },
  { name: '水道光熱費',      kind: 'expense', color: '#c79a3a' },
  { name: '消耗品費',        kind: 'expense', color: '#9c8f78' },
  { name: '通信費',          kind: 'expense', color: '#7b8190' },
  { name: '販促・広告費',    kind: 'expense', color: '#b0894f' },
  { name: '修繕費',          kind: 'expense', color: '#8a7d63' },
  { name: 'その他経費',      kind: 'expense', color: '#a0968a' },
  { name: '売上',            kind: 'income',  color: '#1f8a5b' },
  { name: 'その他収入',      kind: 'income',  color: '#3a9e70' },
];

/** storeId に科目が1件も無ければ既定科目セットを投入する（遅延シード） */
export async function ensureDefaultCategories(storeId: string): Promise<void> {
  const count = await prisma.category.count({ where: { storeId } });
  if (count > 0) return;

  await prisma.category.createMany({
    data: DEFAULT_CATEGORIES.map((category, index) => ({
      storeId,
      name: category.name,
      kind: category.kind,
      color: category.color,
      sortOrder: index,
    })),
    skipDuplicates: true,
  });
}
