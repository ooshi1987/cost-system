import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@/lib/auth';
import { isNonNegativeAmount, isReceiptTaxBasis, readReceiptMetadata } from '@/lib/deliveryAmounts';
import { prisma } from '@/lib/prisma';
import { lockStoreForWrite } from '@/lib/storeWriteLock';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAuth(request);
  if (!auth?.storeId) return NextResponse.json({ error: 'ログインしてください' }, { status: 401 });
  const { id } = await params;
  try {
    const { statedTotal, externalTax, taxBasis, expectedRaw, confirmed } = await request.json();
    if (!isNonNegativeAmount(statedTotal) || !isNonNegativeAmount(externalTax) ||
        !isReceiptTaxBasis(taxBasis) || taxBasis === 'unknown' ||
        (taxBasis === 'inclusive' && externalTax !== 0) ||
        typeof expectedRaw !== 'string' || confirmed !== true) {
      return NextResponse.json({ error: '原本と税込合計・外税・税区分を確認してください' }, { status: 400 });
    }
    const storeId = auth.storeId;
    const result = await prisma.$transaction(async (tx) => {
      await lockStoreForWrite(tx, storeId);
      const current = await tx.deliverySlip.findFirst({ where: { id, storeId }, select: { ocrRawData: true } });
      if (!current) return 'missing';
      if (current.ocrRawData !== expectedRaw) return 'conflict';
      if (!readReceiptMetadata(current.ocrRawData)) return 'unsupported';
      const raw = JSON.parse(current.ocrRawData as string);
      raw.receipt = { ...raw.receipt, statedTotal, externalTax, taxBasis };
      await tx.deliverySlip.update({ where: { id }, data: { ocrRawData: JSON.stringify(raw) } });
      return 'saved';
    }, { maxWait: 15000, timeout: 30000 });
    if (result === 'missing') return NextResponse.json({ error: '伝票が見つかりません' }, { status: 404 });
    if (result === 'conflict') return NextResponse.json({ error: '別の画面で伝票が変更されました。再読み込みして確認してください。' }, { status: 409 });
    if (result === 'unsupported') return NextResponse.json({ error: 'この形式の伝票は修正できません' }, { status: 400 });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delivery receipt update failed', error);
    return NextResponse.json({ error: '伝票を更新できませんでした' }, { status: 500 });
  }
}
