import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

interface ExtractedMenuItem {
  name: string;
  sellingPrice: number;
  category: string;
  order: number;
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
- name: 商品名（メニュー表に記載のまま正確に）
- sellingPrice: 税込み販売価格（数字のみ、円マーク不要）
- category: メニュー表に記載されているセクション名・見出しをそのまま使用してください
  （例：「焼き鳥」「前菜」「おすすめ」「ドリンク」「デザート」など）
  セクションが明記されていない場合は「その他」としてください
- order: メニュー表の上から何番目に記載されているか（1から始まる整数）

レスポンス形式（JSON のみ返してください）：
{
  "items": [
    {"name": "ささみ(梅)", "sellingPrice": 220, "category": "焼き鳥", "order": 1},
    {"name": "ささみ(わさび)", "sellingPrice": 220, "category": "焼き鳥", "order": 2},
    {"name": "生ビール", "sellingPrice": 550, "category": "ドリンク", "order": 3},
    ...
  ]
}

注意：
- 価格が読み取れないものは除外してください
- メニュー表の見出し・セクション名はそのまま category に使用してください（AI で別カテゴリーに変えないでください）
- 記載されている順番を order に正確に反映してください
- 商品名のみ抽出（説明文・備考は不要）`;

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

    // order の昇順に並び替えてから返す
    const sorted = [...result.items].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

    return NextResponse.json({
      items: sorted,
      count: sorted.length,
    });
  } catch (error) {
    console.error('Menu import error:', error);
    const msg = error instanceof Error ? error.message : '';
    if (msg.includes('request_too_large') || msg.includes('413')) {
      return NextResponse.json(
        { error: 'ファイルが大きすぎます。10MB以下のPDFか、メニュー表を画像（JPG/PNG）で保存してアップロードしてください。' },
        { status: 413 }
      );
    }
    return NextResponse.json(
      { error: msg || '読み取りに失敗しました' },
      { status: 500 }
    );
  }
}
