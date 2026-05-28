import { redirect } from 'next/navigation';
import { getServerAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import MenuClient from './MenuClient';

export default async function MenuPage() {
  const auth = await getServerAuth();
  if (!auth?.storeId) redirect('/login');

  const [menuItems, settings] = await Promise.all([
    prisma.menuItem.findMany({
      where: { storeId: auth.storeId },
      include: { recipeItems: { select: { id: true } } },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    }),
    prisma.settings.findMany({ where: { storeId: auth.storeId } }),
  ]);

  const settingsMap: Record<string, unknown> = {};
  for (const row of settings) {
    try { settingsMap[row.key] = JSON.parse(row.value); }
    catch { settingsMap[row.key] = row.value; }
  }
  const categoryOrder = Array.isArray(settingsMap['category_order']) ? settingsMap['category_order'] as string[] : [];

  const serialized = menuItems.map((item) => ({
    id: item.id,
    name: item.name,
    sellingPrice: Number(item.sellingPrice),
    category: item.category ?? undefined,
    recipeItems: item.recipeItems,
  }));

  return (
    <MenuClient
      initialMenuItems={serialized}
      initialCategoryOrder={categoryOrder}
    />
  );
}
