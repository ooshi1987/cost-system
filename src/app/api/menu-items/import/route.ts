import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

interface ExtractedMenuItem {
  name: string;
  sellingPrice: number;
  category: string;
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
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'ファイルが選択されていません' }, { status: 400 });
    }

    const isPdf = file.type === 'application/pdf';
    const isImage = file.type.startsWith('image/');

    if (!isPdf && !isImage) {
      return NextResponse.json(
        { error: 'PDF または画像ファイルをアップロードしてください' },
        { status: 400 }
      );
    }

    // ファイルをbase64に変換
    const buffer = await file.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');

    const prompt = `このメニュー表から商品情報を抽出してください。

以下のルールに従って JSON 形式で返してください：
- name: 商品名（正確に）
- sellingPrice: 税込み販売価格（数字のみ、円マーク不要）
- category: 以下のカテゴリーから最も適切なものを1つ選んでください
  「前菜・サラダ」「スープ」「肉料理」「魚料理」「丼・ご飯物」「麺類」「揚げ物」「鍋物」「デザート」「ドリンク」「アルコール」「セットメニュー」「その他」

レスポンス形式（JSON のみ返してください）：
{
  "items": [
    {"name": "唐揚げ定食", "sellingPrice": 850, "category": "肉料理"},
    {"name": "ざるそば", "sellingPrice": 680, "category": "麺類"},
    ...
  ]
}

注意：
- 価格が読み取れないものは除外してください
- セット内容の説明や備考は除外してください
- メニュー名のみ抽出（サブタイトルや説明文は不要）`;

    // PDFと画像でコンテンツの組み立て方が異なる
    const contentItem = isPdf
      ? {
          type: 'document' as const,
          source: {
            type: 'base64' as const,
            media_type: 'application/pdf' as const,
            data: base64,
          },
        }
      : {
          type: 'image' as const,
          source: {
            type: 'base64' as const,
            media_type: file.type as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
            data: base64,
          },
        };

    const message = await client.messages.create({
      model: 'claude-opus-4-7',
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: [
            contentItem,
            { type: 'text', text: prompt },
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
      throw new Error('メニュー情報を抽出できませんでした。ファイルを確認してください。');
    }

    const result = JSON.parse(jsonMatch[0]) as { items: ExtractedMenuItem[] };

    if (!result.items || result.items.length === 0) {
      return NextResponse.json(
        { error: 'メニュー項目が見つかりませんでした。別のファイルをお試しください。' },
        { status: 422 }
      );
    }

    return NextResponse.json({
      items: result.items,
      count: result.items.length,
    });
  } catch (error) {
    console.error('Menu import error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '読み取りに失敗しました' },
      { status: 500 }
    );
  }
}
