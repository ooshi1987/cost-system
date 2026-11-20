/* eslint-disable @typescript-eslint/no-require-imports -- Node.jsで直接実行するCommonJSスクリプト */
/**
 * 過去の仕入伝票に、対応する経費取引（税込合計・伝票日・取引先）を作成する。
 *
 * 使い方:
 *   node scripts/backfill-delivery-expenses.cjs            … 読み取りのみ（対象と重複候補を表示）
 *   node scripts/backfill-delivery-expenses.cjs --apply    … 書き込みを実行
 *
 * 接続先は DATABASE_URL。本番に書き込むときは、対象を確認・承認してから --apply を付ける。
 * 保存APIと同じ src/lib/deliveryExpense.ts の処理を使う（何度実行しても1伝票1件）。
 */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const { PrismaClient } = require('@prisma/client');

const root = path.resolve(__dirname, '..');
const apply = process.argv.includes('--apply');
// --ids=伝票ID,伝票ID … 指定した伝票だけを対象にする（承認した分だけ取り込むため）
const idsArg = process.argv.find((arg) => arg.startsWith('--ids='));
const onlyIds = idsArg ? new Set(idsArg.slice('--ids='.length).split(',').filter(Boolean)) : null;

function loadTs(file, deps = {}) {
  const out = ts.transpileModule(fs.readFileSync(path.join(root, file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
  }).outputText;
  const context = { exports: {}, Date, Intl, JSON, Math, Number };
  context.module = { exports: context.exports };
  context.require = (id) => {
    if (id in deps) return deps[id];
    if (id === '@prisma/client') return {};
    throw new Error(`unexpected import: ${id}`);
  };
  vm.runInNewContext(out, context, { filename: file });
  return context.exports;
}

const amounts = loadTs('src/lib/deliveryAmounts.ts');
const expense = loadTs('src/lib/deliveryExpense.ts', { './deliveryAmounts': amounts });

function hostOf(url) {
  try { return new URL(url).host; } catch { return '(不明)'; }
}

async function main() {
  const prisma = new PrismaClient();
  console.log(`接続先: ${hostOf(process.env.DATABASE_URL ?? '')}`);
  console.log(apply ? 'モード: 書き込み（--apply）' : 'モード: 読み取りのみ');

  const slips = await prisma.deliverySlip.findMany({
    select: { id: true, storeId: true, vendor: true, createdAt: true, ocrRawData: true, deliveryItems: { select: { totalPrice: true } }, store: { select: { name: true } } },
    orderBy: { createdAt: 'asc' },
  });
  const existing = new Set((await prisma.transaction.findMany({
    where: { source: expense.DELIVERY_EXPENSE_SOURCE }, select: { id: true },
  })).map((row) => row.id));
  const targets = slips.filter((slip) => !existing.has(expense.deliveryExpenseId(slip.id)) && (!onlyIds || onlyIds.has(slip.id)));
  if (onlyIds && targets.length !== onlyIds.size) console.log(`⚠ 指定 ${onlyIds.size}件のうち対象は ${targets.length}件（作成済み・存在しないIDを除外）`);

  const created = slips.filter((slip) => existing.has(expense.deliveryExpenseId(slip.id))).length;
  console.log(`伝票 ${slips.length}件 / 作成済み ${created}件 / 今回の対象 ${targets.length}件`);
  for (const slip of targets) {
    const date = amounts.getDeliveryDocumentDate(slip);
    const amount = amounts.getDeliveryPurchaseTotal(slip);
    const manual = await prisma.transaction.findMany({
      where: {
        storeId: slip.storeId, type: 'expense', source: { not: expense.DELIVERY_EXPENSE_SOURCE }, amount,
        date: { gte: new Date(`${date}T00:00:00+09:00`), lt: new Date(new Date(`${date}T00:00:00+09:00`).getTime() + 86400000) },
      },
      select: { id: true, vendor: true, memo: true },
    });
    const note = manual.length ? `  ⚠ 同日・同額の手入力経費 ${manual.length}件（二重計上の可能性）: ${manual.map((m) => m.vendor ?? '取引先なし').join(', ')}` : '';
    console.log(`- ${slip.store.name} | 伝票日 ${date} | ${slip.vendor ?? '取引先なし'} | ¥${amount.toLocaleString('ja-JP')} | ${slip.id}${note}`);
  }

  if (!apply) {
    console.log('読み取りのみで終了しました。書き込む場合は --apply を付けて実行してください。');
    await prisma.$disconnect();
    return;
  }

  for (const slip of targets) {
    await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "Store" WHERE "id" = ${slip.storeId} FOR UPDATE`;
      await expense.syncDeliveryExpense(tx, slip.storeId, slip.id);
    }, { maxWait: 15000, timeout: 30000 });
  }
  console.log(`${targets.length}件の経費取引を作成しました。`);
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
