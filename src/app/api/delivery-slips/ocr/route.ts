import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

interface OCRResult {
  items: Array<{
    ingredientName: string;
    quantity: number;
    unit: string;
    totalPrice: number;
    type: 'food' | 'seasoning';
  }>;
}

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'ANTHROPIC_API_KEY is not configured' },
        { status: 500 }
      );
    }

    const client = new Anthropic({ apiKey });

    const formData = await request.formData();
    const imageFile = formData.get('image') as File;

    if (!imageFile) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    const buffer = await imageFile.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');
    const mimeType = imageFile.type || 'image/jpeg';

    const message = await client.messages.create({
      model: 'claude-opus-4-7',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mimeType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
                data: base64,
              },
            },
            {
              type: 'text',
              text: `これは納品書またはレシートの画像です。
以下の情報を JSON 形式で抽出してください:
- 商品名（食材・調味料）
- 数量（数値のみ）
- 単位（g / ml / 個 / 本 / 枚 / 袋 / パック / ケース など実際の単位を使用）
- 合計金額（円、数値のみ）
- 種別（"food" または "seasoning"）

種別の判定基準:
- "seasoning"（調味料）: 醤油・味噌・塩・砂糖・酢・みりん・酒・油・ソース・ドレッシング・スパイス・だし・コンソメ・小麦粉・片栗粉・パン粉・マヨネーズ・ケチャップ など調理に使う調味料・粉類
- "food"（食材）: 肉・魚・野菜・果物・卵・乳製品・豆腐・麺類 などそれ以外の食材

レスポンス形式（JSON のみ返してください）:
{
  "items": [
    {"ingredientName": "鶏もも肉", "quantity": 1000, "unit": "g", "totalPrice": 1000, "type": "food"},
    {"ingredientName": "長ネギ", "quantity": 2, "unit": "本", "totalPrice": 718, "type": "food"},
    {"ingredientName": "醤油", "quantity": 1, "unit": "本", "totalPrice": 298, "type": "seasoning"}
  ]
}

注意:
- 合計金額が読み取れないものは除外してください
- 商品名は店舗が分かりやすい名前に正規化してください
- レジ袋など食材以外も含めてください（その場合は type: "food" としてください）`,
            },
          ],
        },
      ],
    });

    const content = message.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Claude');
    }

    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in Claude response');
    }

    const ocrResult: OCRResult = JSON.parse(jsonMatch[0]);

    // DB保存はしない — フロントで確認・編集後に /api/delivery-slips (POST) で保存
    return NextResponse.json({
      items: ocrResult.items.map((item) => ({
        name: item.ingredientName,
        quantity: item.quantity,
        unit: item.unit,
        totalPrice: item.totalPrice,
        type: item.type === 'seasoning' ? 'seasoning' : 'food',
      })),
    });
  } catch (error) {
    console.error('OCR Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'OCR processing failed' },
      { status: 500 }
    );
  }
}
