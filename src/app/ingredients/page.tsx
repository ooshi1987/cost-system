import { redirect } from 'next/navigation';
import { getServerAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import IngredientsClient from './IngredientsClient';

export default async function IngredientsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const auth = await getServerAuth();
  if (!auth?.storeId) redirect('/login');

  const params = await searchParams;
  const type = (params.type === 'seasoning' ? 'seasoning' : 'food') as 'food' | 'seasoning';
  const settingsKey = `ingredient_${type}_category_order`;

  const [ingredients, settings] = await Promise.all([
    prisma.ingredient.findMany({
      where: { storeId: auth.storeId, type },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    }),
    prisma.settings.findMany({ where: { storeId: auth.storeId } }),
  ]);

  const settingsMap: Record<string, unknown> = {};
  for (const row of settings) {
    try { settingsMap[row.key] = JSON.parse(row.value); }
    catch { settingsMap[row.key] = row.value; }
  }
  const categoryOrder = Array.isArray(settingsMap[settingsKey]) ? settingsMap[settingsKey] as string[] : [];

  const serialized = ingredients.map((i) => ({
    ...i,
    costPerUnit: Number(i.costPerUnit),
    sortOrder: i.sortOrder ?? undefined,
    category: i.category ?? undefined,
    lastUpdated: i.updatedAt.toISOString(),
  }));

  return (
    <IngredientsClient
      type={type}
      initialIngredients={serialized}
      initialCategoryOrder={categoryOrder}
    />
  );
}
