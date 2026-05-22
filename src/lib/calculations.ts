import { prisma } from './prisma';

export interface MenuCost {
  menuItemId: string;
  name: string;
  sellingPrice: number;
  costPrice: number;
  profit: number;
  profitMargin: number; // %
}

export async function calculateMenuCost(menuItemId: string): Promise<MenuCost | null> {
  const menuItem = await prisma.menuItem.findUnique({
    where: { id: menuItemId },
    include: {
      recipeItems: {
        include: {
          ingredient: true,
        },
      },
    },
  });

  if (!menuItem) return null;

  let totalCost = 0;
  for (const recipeItem of menuItem.recipeItems) {
    const costPerUnit = recipeItem.ingredient.costPerUnit;
    const quantity = recipeItem.quantity;
    totalCost += costPerUnit * quantity;
  }

  const profit = menuItem.sellingPrice - totalCost;
  const profitMargin = (profit / menuItem.sellingPrice) * 100;

  return {
    menuItemId,
    name: menuItem.name,
    sellingPrice: menuItem.sellingPrice,
    costPrice: totalCost,
    profit,
    profitMargin: Math.round(profitMargin * 100) / 100,
  };
}

export async function getAllMenuCosts(): Promise<MenuCost[]> {
  const menuItems = await prisma.menuItem.findMany();
  const costs: MenuCost[] = [];

  for (const item of menuItems) {
    const cost = await calculateMenuCost(item.id);
    if (cost) costs.push(cost);
  }

  return costs.sort((a, b) => a.name.localeCompare(b.name));
}
