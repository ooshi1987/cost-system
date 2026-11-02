import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { getAuth } from '@/lib/auth';

interface OCRResult {
  statedTotal?: number | null;
  customerCount?: number | null;
  items: Array<{
    method: 'cash' | 'cashless' | 'transfer' | 'other';
    label: string;
    amount: number;
    needsReview?: boolean;
  }>;
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuth(request);
    if (!auth?.storeId) return NextResponse.json({ error: 'ログインしてください' }, { status: 401 });
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'ANTHROPIC_API_KEY is not configured' },
        { status: 500 }
      );
    }

    const client = new Anthropic({ apiKey });

    const formData = await request.formData();
    const imageFile = formData.get('image');

    if (!(imageFile instanceof File)) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }
    if (!['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(imageFile.type) || imageFile.size === 0 || imageFile.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'JPEG・PNG・GIF・WebP形式の10MB以下の画像を選んでください' }, { status: 400 });
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
              text: `これはAirレジなどPOSレジの締め画面のスクリーンショットです。
以下の情報を JSON 形式で抽出してください:
- 支払方法ごとの内訳（現金・キャッシュレス・オンライン・その他 のうち、画面に表示されているもの）
- 客数（読み取れなければ null）
- 画面に記載されている売上合計（statedTotal、読み取れなければ null）
- needsReview（読み取りに自信が無い行はtrue）

支払方法の判定基準:
- "cash"（現金）
- "cashless"（クレジットカード・電子マネー・タッチ決済など）
- "transfer"（銀行振込・オンライン決済）
- "other"（上記に当てはまらないもの）

レスポンス形式（JSON のみ返してください）:
{
  "statedTotal": 118200,
  "customerCount": 62,
  "items": [
    {"method": "cash", "label": "現金", "amount": 46800, "needsReview": false},
    {"method": "cashless", "label": "キャッシュレス", "amount": 71400, "needsReview": false}
  ]
}

注意:
- 金額が読み取れない行は除外してください
- 売上合計、預り金、お釣り、決済方法の小計とその内訳を二重にitemsへ入れないでください
- 客数・合計が読み取れない場合は null を入れてください`,
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
    if (!Array.isArray(ocrResult.items)) throw new Error('売上の内訳を読み取れませんでした');

    return NextResponse.json({
      statedTotal: ocrResult.statedTotal ?? null,
      customerCount: ocrResult.customerCount ?? null,
      items: ocrResult.items.map((item) => ({
        method: item.method,
        label: item.label,
        amount: item.amount,
        needsReview: item.needsReview ?? false,
      })),
    });
  } catch (error) {
    console.error('Sales OCR Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'OCR processing failed' },
      { status: 500 }
    );
  }
}
