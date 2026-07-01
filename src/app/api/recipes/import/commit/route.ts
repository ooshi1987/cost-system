import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuth } from '@/lib/auth';
import { getEffectivePlan } from '@/lib/stripe';

interface CommitItem {
  name: string;
  qty: number | null;
  unit: string;
  unitCost: number | null;
  ingredientId: string | null;
}

interface CommitRecipe {
  mode: 'new' | 'matched';
  menuItemId: string | null;
  menuName: string;
  sellPrice: number | null;
  items: CommitItem[];
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuth(request);
    if (!auth?.storeId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const storeId = auth.storeId;

    const { recipes } = (await request.json()) as { recipes: CommitRecipe[] };
    if (!recipes || !Array.isArray(recipes) || recipes.length === 0) {
      return NextResponse.json({ error: '登録するレシピがありません' }, { status: 400 });
    }

    const tenant = await prisma.tenant.findUnique({ where: { id: auth.tenantId }, select: { plan: true, isInternal: true } });
    const plan = getEffectivePlan(tenant?.plan, tenant?.isInternal);
    let menuItemCount = plan.menuItems === Infinity ? 0 : await prisma.menuItem.count({ where: { storeId } });

    const results: { index: number; success: boolean; menuItemId?: string; error?: string }[] = [];

    for (let index = 0; index < recipes.length; index++) {
      const recipe = recipes[index];
      try {
        if (recipe.mode === 'new' && !recipe.menuName.trim()) {
          throw new Error('メニュー名を入力してください');
        }
        if (recipe.mode === 'matched' && !recipe.menuItemId) {
          throw new Error('振り分け先メニューが未選択です');
        }
        if (recipe.mode === 'new' && plan.menuItems !== Infinity && menuItemCount >= plan.menuItems) {
          throw new Error(`${plan.name}プランではメニューは${plan.menuItems}品まで登録できます。`);
        }

        const menuItemId = await prisma.$transaction(async (tx) => {
          let targetMenuItemId: string;

          if (recipe.mode === 'new') {
            const created = await tx.menuItem.create({
              data: { storeId, name: recipe.menuName.trim(), sellingPrice: recipe.sellPrice ?? 0 },
            });
            targetMenuItemId = created.id;
          } else {
            const existing = await tx.menuItem.findFirst({ where: { id: recipe.menuItemId!, storeId } });
            if (!existing) throw new Error('振り分け先メニューが見つかりません');
            if (recipe.sellPrice !== null && recipe.sellPrice !== undefined) {
              await tx.menuItem.update({ where: { id: existing.id }, data: { sellingPrice: recipe.sellPrice } });
            }
            await tx.recipeItem.deleteMany({ where: { menuItemId: existing.id } });
            targetMenuItemId = existing.id;
          }

          for (const item of recipe.items) {
            if (!item.name.trim()) continue;
            let ingredientId = item.ingredientId;
            let existingIngredient = ingredientId
              ? await tx.ingredient.findFirst({ where: { id: ingredientId, storeId } })
              : null;
            if (ingredientId && !existingIngredient) ingredientId = null;

            if (!ingredientId) {
              existingIngredient = await tx.ingredient.findFirst({ where: { storeId, name: item.name.trim() } });
              if (existingIngredient) {
                ingredientId = existingIngredient.id;
              } else {
                const created = await tx.ingredient.create({
                  data: {
                    storeId,
                    name: item.name.trim(),
                    unit: item.unit || 'g',
                    costPerUnit: item.unitCost ?? 0,
                    priceSource: item.unitCost && item.unitCost > 0 ? 'manual' : 'unset',
                  },
                });
                ingredientId = created.id;
              }
            }

            // プレビューで単価を上書きした場合は手入力単価として反映
            if (existingIngredient && item.unitCost !== null && item.unitCost !== existingIngredient.costPerUnit) {
              await tx.ingredient.update({
                where: { id: existingIngredient.id },
                data: { costPerUnit: item.unitCost, priceSource: 'manual' },
              });
            }

            await tx.recipeItem.create({
              data: { menuItemId: targetMenuItemId, ingredientId, quantity: item.qty ?? 0 },
            });
          }

          return targetMenuItemId;
        });

        if (recipe.mode === 'new') menuItemCount++;
        results.push({ index, success: true, menuItemId });
      } catch (err) {
        results.push({ index, success: false, error: err instanceof Error ? err.message : '登録に失敗しました' });
      }
    }

    return NextResponse.json({ results });
  } catch (error) {
    console.error('Recipe import commit error:', error);
    return NextResponse.json({ error: '一括登録に失敗しました' }, { status: 500 });
  }
}
