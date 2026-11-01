import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { isNonNegativeAmount, isReceiptTaxBasis, isDocumentDate, type ReceiptTaxBasis } from '@/lib/deliveryAmounts';

interface OCRResult {
  documentDate?: string | null;
  vendor?: string | null;
  statedTotal?: number | null;
  externalTax?: number | null;
  taxBasis?: ReceiptTaxBasis;
  items: Array<{
    ingredientName: string;
    quantity: number;
    unit: string;
    totalPrice: number;
    type: 'food' | 'seasoning';
    needsReview?: boolean;
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
- 取引先名（発行元の会社名・店舗名。読み取れなければ null）
- 伝票に印字された取引日（documentDate、YYYY-MM-DD形式。和暦は西暦に変換。読めない・複数候補で不明な場合はnull。今日の日付や支払期日で補わない）
- レシート・納品書に記載されている合計金額（statedTotal、円、数値のみ。読み取れなければ null）
- 明細合計に別途加算する外税の合計（externalTax）。税抜明細に加算する印字された税額のみ。内税は二重加算しないため0。税の扱いが不明ならnull。合計との差額から税額を推測しない。
- 明細の税区分（taxBasis）: 税抜明細は"exclusive"、税込明細は"inclusive"、混在は"mixed"、不明は"unknown"。
- 商品名（食材・調味料）
- 数量（数値のみ）
- 単位（g / ml / 個 / 本 / 枚 / 袋 / パック / ケース など実際の単位を使用）
- 合計金額（円、数値のみ）
- 種別（"food" または "seasoning"）
- needsReview（読み取りに自信が無い行は true。文字がかすれている・数量や単価の計算が合わない・手書きで判読しづらい等の場合に true にする）

種別の判定基準:
- "seasoning"（調味料）: 醤油・味噌・塩・砂糖・酢・みりん・酒・油・ソース・ドレッシング・スパイス・だし・コンソメ・小麦粉・片栗粉・パン粉・マヨネーズ・ケチャップ など調理に使う調味料・粉類
- "food"（食材）: 肉・魚・野菜・果物・卵・乳製品・豆腐・麺類 などそれ以外の食材

レスポンス形式（JSON のみ返してください）:
{
  "vendor": "〇〇食品株式会社",
  "documentDate": null,
  "statedTotal": 23300,
  "externalTax": null,
  "taxBasis": "unknown",
  "items": [
    {"ingredientName": "鶏もも肉", "quantity": 1000, "unit": "g", "totalPrice": 1000, "type": "food", "needsReview": false},
    {"ingredientName": "長ネギ", "quantity": 2, "unit": "本", "totalPrice": 718, "type": "food", "needsReview": false},
    {"ingredientName": "醤油", "quantity": 1, "unit": "本", "totalPrice": 298, "type": "seasoning", "needsReview": true}
  ]
}

注意:
- 合計金額が読み取れないものは除外してください
- 商品名は店舗が分かりやすい名前に正規化してください
- レジ袋など食材以外も含めてください（その場合は type: "food" としてください）
- 取引先名が読み取れない場合は vendor に null を入れてください
- statedTotalは税込の支払合計です。預り金・お釣りではありません
- 明細の金額は原本の印字どおりに保持し、税抜明細に消費税を配分したり、税込明細を推測で税抜に直したりしないでください
- 消費税を商品明細として追加しないでください
- 税込明細（inclusive）のexternalTaxは0。印字された内税額はexternalTaxへ入れないでください
- statedTotalが読み取れない場合は null を入れてください`,
            },
          ],
        },
      ],
    });

    if (message.stop_reason === 'max_tokens') {
      throw new Error('明細が多く読み取り結果が途中で終了しました。伝票を分けて確認してください');
    }
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
      vendor: ocrResult.vendor ?? null,
      documentDate: isDocumentDate(ocrResult.documentDate) ? ocrResult.documentDate : null,
      statedTotal: isNonNegativeAmount(ocrResult.statedTotal) ? ocrResult.statedTotal : null,
      externalTax: isNonNegativeAmount(ocrResult.externalTax) ? ocrResult.externalTax : null,
      taxBasis: isReceiptTaxBasis(ocrResult.taxBasis) ? ocrResult.taxBasis : 'unknown',
      items: ocrResult.items.map((item) => ({
        name: item.ingredientName,
        quantity: item.quantity,
        unit: item.unit,
        totalPrice: item.totalPrice,
        type: item.type === 'seasoning' ? 'seasoning' : 'food',
        needsReview: item.needsReview ?? false,
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
