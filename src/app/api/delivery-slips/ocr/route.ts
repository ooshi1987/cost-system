import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { prisma } from '@/lib/prisma';

interface OCRResult {
  items: Array<{
    ingredientName: string;
    quantity: number;
    unit: 'g' | 'ml';
    totalPrice: number;
  }>;
}

export async function POST(request: NextRequest) {
  try {
    // API キーを確認
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'ANTHROPIC_API_KEY is not configured' },
        { status: 500 }
      );
    }

    const client = new Anthropic({
      apiKey: apiKey,
    });

    const formData = await request.formData();
    const imageFile = formData.get('image') as File;

    if (!imageFile) {
      return NextResponse.json(
        { error: 'No image provided' },
        { status: 400 }
      );
    }

    // Convert image to base64
    const buffer = await imageFile.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');
    const mimeType = imageFile.type || 'image/jpeg';

    // Call Claude Vision API to extract data from delivery slip
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
              text: `このは納品書（デリバリースリップ）の画像です。
以下の情報を JSON形式で抽出してください:
- 商品名（食材・調味料）
- 数量
- 単位（g/ml）
- 合計金額（円）

レスポンス形式:
{
  "items": [
    {"ingredientName": "鶏もも肉", "quantity": 1000, "unit": "g", "totalPrice": 1000},
    ...
  ]
}

店舗が見やすい名前で商品名を正規化してください。複数行の場合は複数のitemsに分けてください。`,
            },
          ],
        },
      ],
    });

    // Parse the response
    const content = message.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Claude');
    }

    let ocrResult: OCRResult;
    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in Claude response');
    }
    ocrResult = JSON.parse(jsonMatch[0]);

    // Create delivery slip record
    const deliverySlip = await prisma.deliverySlip.create({
      data: {
        ocrRawData: JSON.stringify(ocrResult),
        processedAt: new Date(),
        deliveryItems: {
          create: await Promise.all(
            ocrResult.items.map(async (item) => {
              // Find or create ingredient
              let ingredient = await prisma.ingredient.findUnique({
                where: { name: item.ingredientName },
              });

              if (!ingredient) {
                ingredient = await prisma.ingredient.create({
                  data: {
                    name: item.ingredientName,
                    unit: item.unit,
                    costPerUnit: item.totalPrice / item.quantity,
                  },
                });
              } else {
                // Update cost per unit with latest price
                await prisma.ingredient.update({
                  where: { id: ingredient.id },
                  data: {
                    costPerUnit: item.totalPrice / item.quantity,
                    lastUpdated: new Date(),
                  },
                });
              }

              return {
                ingredientId: ingredient.id,
                quantity: item.quantity,
                unit: item.unit,
                totalPrice: item.totalPrice,
              };
            })
          ),
        },
      },
      include: {
        deliveryItems: {
          include: {
            ingredient: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      deliverySlipId: deliverySlip.id,
      itemsProcessed: deliverySlip.deliveryItems.length,
      items: deliverySlip.deliveryItems.map((item) => ({
        name: item.ingredient.name,
        quantity: item.quantity,
        unit: item.unit,
        totalPrice: item.totalPrice,
        pricePerUnit: (item.totalPrice / item.quantity).toFixed(2),
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
