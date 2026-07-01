import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { prisma } from '@/lib/prisma';
import { getAuth } from '@/lib/auth';

// ─── 文字列突合ヘルパー ──────────────────────────────────

function normalizeName(s: string): string {
  return s
    .toLowerCase()
    .replace(/[\s　]/g, '')
    .replace(/[()（）[\]【】「」『』・、。,.!！?？:：;；~〜\-ー_/／]/g, '');
}

function bigrams(s: string): string[] {
  if (s.length < 2) return s ? [s] : [];
  const arr: string[] = [];
  for (let i = 0; i < s.length - 1; i++) arr.push(s.slice(i, i + 2));
  return arr;
}

function diceCoefficient(a: string, b: string): number {
  const na = normalizeName(a);
  const nb = normalizeName(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;
  const bigramsA = bigrams(na);
  const bigramsB = bigrams(nb);
  if (bigramsA.length === 0 || bigramsB.length === 0) return 0;
  const bMap = new Map<string, number>();
  for (const bg of bigramsB) bMap.set(bg, (bMap.get(bg) || 0) + 1);
  let matches = 0;
  for (const bg of bigramsA) {
    const count = bMap.get(bg) || 0;
    if (count > 0) { matches++; bMap.set(bg, count - 1); }
  }
  return (2 * matches) / (bigramsA.length + bigramsB.length);
}

type IngredientWithDelivery = Awaited<ReturnType<typeof loadIngredients>>[number];

async function loadIngredients(storeId: string) {
  return prisma.ingredient.findMany({
    where: { storeId },
    include: {
      deliveryItems: {
        orderBy: { deliverySlip: { createdAt: 'desc' } },
        take: 1,
        include: { deliverySlip: { select: { createdAt: true, vendor: true } } },
      },
    },
  });
}

function findIngredientMatch(itemName: string, ingredients: IngredientWithDelivery[]): IngredientWithDelivery | null {
  const norm = normalizeName(itemName);
  if (!norm) return null;
  const exact = ingredients.find((i) => normalizeName(i.name) === norm);
  if (exact) return exact;
  const candidates = ingredients.filter((i) => {
    const iNorm = normalizeName(i.name);
    return iNorm.length > 0 && (norm.includes(iNorm) || iNorm.includes(norm));
  });
  if (candidates.length === 0) return null;
  candidates.sort((a, b) => normalizeName(b.name).length - normalizeName(a.name).length);
  return candidates[0];
}

// ─── レスポンス型 ────────────────────────────────────────

interface RawItem {
  name: string;
  qty: number | null;
  unit: string | null;
  unit_cost: number | null;
  line_cost: number | null;
}

interface RawRecipe {
  menu_name: string;
  sell_price: number | null;
  items: RawItem[];
  stated_total_cost: number | null;
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuth(request);
    if (!auth?.storeId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return NextResponse.json({ error: 'ANTHROPIC_API_KEY is not configured' }, { status: 500 });

    const formData = await request.formData();
    const file = formData.get('file') as File;
    if (!file) return NextResponse.json({ error: 'ファイルが選択されていません' }, { status: 400 });

    const isImage = file.type.startsWith('image/');
    const isPdf = file.type === 'application/pdf';
    if (!isImage && !isPdf) return NextResponse.json({ error: 'PDF または画像ファイルをアップロードしてください' }, { status: 400 });
    if (file.size > 15 * 1024 * 1024) return NextResponse.json({ error: 'ファイルが大きすぎます（15MB以下にしてください）' }, { status: 413 });

    const buffer = await file.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');

    const client = new Anthropic({ apiKey });
    const contentItem = isPdf
      ? { type: 'document' as const, source: { type: 'base64' as const, media_type: 'application/pdf' as const, data: base64 } }
      : { type: 'image' as const, source: { type: 'base64' as const, media_type: file.type as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp', data: base64 } };

    const prompt = `この画像は飲食店の原価表・レシピ表の一覧です。複数のメニュー・商品が並んでいる場合は、メニュー単位に分割して読み取ってください。

以下のJSONのみを返してください（コードブロック不要、説明文不要）:
{"recipes": [{"menu_name": "メニュー名", "sell_price": 販売価格の数値またはnull, "items": [{"name": "材料名", "qty": 数量またはnull, "unit": "単位(g/ml/個/枚/尾など)", "unit_cost": 1単位あたりの単価またはnull, "line_cost": この材料の小計またはnull}], "stated_total_cost": 原価表記載の合計原価またはnull}], "low_confidence": ["読み取りに自信がないメニュー名（日本語）"]}

注意:
- menu_name は原価表・レシピ表に記載のメニュー・商品名
- sell_price は販売価格。記載がなければ null
- unit_cost が空欄でも line_cost と qty から算出を試みること（unit_cost = line_cost / qty）
- stated_total_cost は「合計原価」「材料費合計」等として記載された数値。なければ null
- 読み取れない数値は null
- 画像が原価表・レシピ表でない場合は {"error": "理由"} のみを返してください
- JSON以外の文字列は一切出力しないでください`;

    const message = await client.messages.create({
      model: 'claude-opus-4-7',
      max_tokens: 4096,
      messages: [{ role: 'user', content: [contentItem, { type: 'text', text: prompt }] }],
    });

    const content = message.content[0];
    if (content.type !== 'text') throw new Error('Unexpected response type');

    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return NextResponse.json({ error: '原価表を読み取れませんでした。別の画像をお試しください。' }, { status: 422 });

    const result = JSON.parse(jsonMatch[0]) as { error?: string; recipes?: RawRecipe[]; low_confidence?: string[] };
    if (result.error) return NextResponse.json({ error: result.error }, { status: 422 });
    if (!result.recipes || result.recipes.length === 0) {
      return NextResponse.json({ error: 'メニュー・レシピ情報が見つかりませんでした。' }, { status: 422 });
    }

    // ── 既存データとの突合 ──
    const [menuItems, ingredients] = await Promise.all([
      prisma.menuItem.findMany({ where: { storeId: auth.storeId }, select: { id: true, name: true, sellingPrice: true } }),
      loadIngredients(auth.storeId),
    ]);

    const recipes = result.recipes.map((recipe) => {
      // メニュー名突合
      let bestMenu: { id: string; name: string; sellingPrice: number } | null = null;
      let bestScore = 0;
      for (const m of menuItems) {
        const score = diceCoefficient(recipe.menu_name, m.name);
        if (score > bestScore) { bestScore = score; bestMenu = m; }
      }
      const matchMode: 'matched' | 'candidate' | 'new' =
        bestScore >= 0.8 ? 'matched' : bestScore >= 0.42 ? 'candidate' : 'new';

      // 材料の単価連動
      const items = recipe.items.map((item) => {
        const matched = findIngredientMatch(item.name, ingredients);
        let unitCost: number | null = null;
        let priceSource: string = 'unset';
        let vendor: string | null = null;
        let deliveryDate: string | null = null;

        if (matched && matched.costPerUnit > 0) {
          unitCost = matched.costPerUnit;
          priceSource = matched.priceSource;
          const slip = matched.deliveryItems[0]?.deliverySlip;
          if (slip) { vendor = slip.vendor; deliveryDate = slip.createdAt.toISOString(); }
        } else {
          unitCost = item.unit_cost ?? (item.line_cost && item.qty ? item.line_cost / item.qty : null);
          priceSource = unitCost !== null && unitCost > 0 ? 'manual' : 'unset';
        }

        const qty = item.qty;
        const lineCost = qty !== null && unitCost !== null ? qty * unitCost : item.line_cost;

        return {
          name: item.name,
          qty,
          unit: (matched && matched.costPerUnit > 0) ? matched.unit : (item.unit || 'g'),
          unitCost,
          lineCost,
          ingredientId: matched?.id ?? null,
          priceSource,
          vendor,
          deliveryDate,
        };
      });

      return {
        menuName: recipe.menu_name,
        sellPrice: recipe.sell_price,
        statedTotalCost: recipe.stated_total_cost,
        items,
        matchMenuItemId: bestMenu?.id ?? null,
        matchMenuName: bestMenu?.name ?? null,
        matchMode,
        score: Math.round(bestScore * 100) / 100,
      };
    });

    return NextResponse.json({ recipes, lowConfidence: result.low_confidence ?? [] });
  } catch (error) {
    console.error('Recipe import error:', error);
    const msg = error instanceof Error ? error.message : '';
    if (msg.includes('request_too_large') || msg.includes('413')) {
      return NextResponse.json({ error: 'ファイルが大きすぎます。10MB以下の画像でお試しください。' }, { status: 413 });
    }
    return NextResponse.json({ error: msg || '読み取りに失敗しました' }, { status: 500 });
  }
}
