import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { prisma } from '@/lib/prisma';
import { getAuth } from '@/lib/auth';

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

    const prompt = `この原価表・レシピ表から情報を抽出してください。

以下のJSONのみを返してください（コードブロック不要、説明文不要）:
{"menu_name": "メニュー名", "sell_price": 販売価格の数値またはnull, "items": [{"name": "材料名", "qty": 数量またはnull, "unit": "単位(g/ml/個/枚など)", "unit_cost": 1単位あたりの単価またはnull, "line_cost": この材料の小計またはnull}], "stated_total_cost": 原価表記載の合計原価またはnull, "low_confidence_fields": ["読み取り自信なし項目"]}

注意:
- menu_name は原価表のメニュー・商品名
- sell_price は販売価格。記載がなければ null
- unit_cost が空欄でも line_cost と qty から算出を試みること（unit_cost = line_cost / qty）
- stated_total_cost は「合計原価」「材料費合計」等として記載された数値。なければ null
- 読み取れない数値は null`;

    const message = await client.messages.create({
      model: 'claude-opus-4-7',
      max_tokens: 2048,
      messages: [{ role: 'user', content: [contentItem, { type: 'text', text: prompt }] }],
    });

    const content = message.content[0];
    if (content.type !== 'text') throw new Error('Unexpected response type');

    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return NextResponse.json({ error: '原価表を読み取れませんでした。別の画像をお試しください。' }, { status: 422 });

    const result = JSON.parse(jsonMatch[0]);
    if (result.error) return NextResponse.json({ error: result.error }, { status: 422 });
    if (!result.items || result.items.length === 0) {
      return NextResponse.json({ error: '材料情報が見つかりませんでした。' }, { status: 422 });
    }

    // 既存食材と名前突合
    const ingredients = await prisma.ingredient.findMany({ where: { storeId: auth.storeId } });
    const ingMap = new Map(ingredients.map((ing) => [ing.name, ing]));

    const items = (result.items as { name: string; qty: number | null; unit: string | null; unit_cost: number | null; line_cost: number | null }[]).map((item) => {
      const matched = ingMap.get(item.name);
      let unitCost = item.unit_cost ?? null;
      if (unitCost === null && item.line_cost && item.qty) unitCost = item.line_cost / item.qty;
      return {
        name: item.name,
        qty: item.qty,
        unit: item.unit || matched?.unit || 'g',
        unit_cost: unitCost,
        line_cost: item.line_cost,
        matched_ingredient_id: matched?.id ?? null,
        matched_cost_per_unit: matched?.costPerUnit ?? null,
      };
    });

    return NextResponse.json({
      menu_name: result.menu_name ?? '',
      sell_price: result.sell_price ?? null,
      items,
      stated_total_cost: result.stated_total_cost ?? null,
      low_confidence_fields: result.low_confidence_fields ?? [],
    });
  } catch (error) {
    console.error('Recipe import error:', error);
    const msg = error instanceof Error ? error.message : '';
    if (msg.includes('request_too_large') || msg.includes('413')) {
      return NextResponse.json({ error: 'ファイルが大きすぎます。10MB以下の画像でお試しください。' }, { status: 413 });
    }
    return NextResponse.json({ error: msg || '読み取りに失敗しました' }, { status: 500 });
  }
}
