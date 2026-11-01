// 実DB・課金AIを使わず、伝票金額の保存・照合・表示を検証する。
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const root = path.resolve(__dirname, '..');

function loadTs(file, dependencies = {}, clock) {
  const compiled = ts.transpileModule(fs.readFileSync(path.join(root, file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
    fileName: file,
    reportDiagnostics: true,
  });
  const errors = (compiled.diagnostics || []).filter((d) => d.category === ts.DiagnosticCategory.Error);
  assert.equal(errors.length, 0, `${file}: 構文エラー`);
  const context = {
    exports: {}, URL, Buffer, Date: clock || Date, process: { env: { ANTHROPIC_API_KEY: 'mock-only-no-network' } }, console: { error() {} },
    require(id) {
      if (id in dependencies) return dependencies[id];
      if (['next/server', 'react/jsx-runtime'].includes(id)) return require(id);
      throw new Error(`許可していない依存: ${id}`);
    },
  };
  vm.runInNewContext(compiled.outputText, context, { filename: file });
  return context.exports;
}

const amounts = loadTs('src/lib/deliveryAmounts.ts');
const items = [{ name: 'サニーレタス', quantity: 2, unit: '個', totalPrice: 316, type: 'food' }];
const receipt = { statedTotal: 341, externalTax: 25, taxBasis: 'exclusive', documentDate: '2026-10-29' };
const serialize = (x) => JSON.parse(JSON.stringify(x));
assert.deepEqual(serialize(amounts.calculateReceiptAmounts(items, 341, 25)), { itemsTotal: 316, calculatedTotal: 341, difference: 0 });
assert.equal(amounts.calculateReceiptAmounts([{ totalPrice: 341 }], 341, 0).difference, 0);
assert.equal(amounts.calculateReceiptAmounts(items, 342, 25).difference, 1);
assert.equal(amounts.calculateReceiptAmounts(items, 341, null).difference, null);
assert.equal(amounts.calculateReceiptAmounts([{ totalPrice: 0.1 }, { totalPrice: 0.2 }], 0.3, 0).difference, 0);
const raw = JSON.stringify({ version: 2, receipt, items });
assert.equal(amounts.getDeliveryPurchaseTotal({ ocrRawData: raw, deliveryItems: items }), 341);
assert.equal(amounts.getDeliveryPurchaseTotal({ ocrRawData: JSON.stringify(items), deliveryItems: items }), 316);
assert.equal(amounts.getDeliveryPurchaseTotal({ ocrRawData: '{invalid', deliveryItems: items }), 316);
assert.equal(amounts.readReceiptMetadata(JSON.stringify({ version: 2, receipt: { ...receipt, statedTotal: -1 } })), null);
assert.equal(amounts.getDeliveryPurchaseTotal({ ocrRawData: raw, deliveryItems: [{ totalPrice: 999 }] }), 341);

function makeApi({ failSave = false, unit = '個', auth = { storeId: 'test-store' } } = {}) {
  let state = { ingredients: [{ id: 'ingredient-1', storeId: 'test-store', name: 'サニーレタス', unit, costPerUnit: 100 }], slips: [] };
  const prisma = {
    async $transaction(callback) {
      const before = structuredClone(state);
      try {
        return await callback({
          ingredient: {
            async findUnique({ where }) { return state.ingredients.find((i) => i.storeId === where.storeId_name.storeId && i.name === where.storeId_name.name) || null; },
            async update({ where, data }) {
              const item = state.ingredients.find((i) => i.id === where.id);
              Object.assign(item, data);
              return item;
            },
            async create({ data }) { const item = { id: `ingredient-${state.ingredients.length + 1}`, ...data }; state.ingredients.push(item); return item; },
          },
          deliverySlip: {
            async create({ data }) {
              if (failSave) throw new Error('mock storage failure');
              const slip = { id: 'slip-1', ...data };
              state.slips.push(slip);
              return slip;
            },
          },
        });
      } catch (error) { state = before; throw error; }
    },
  };
  const api = loadTs('src/app/api/delivery-slips/route.ts', {
    '@/lib/prisma': { prisma }, '@/lib/auth': { getAuth: async () => auth }, '@/lib/deliveryAmounts': amounts,
  });
  return { state: () => state, post: (body) => api.POST({ json: async () => body }) };
}

async function main() {
  let api = makeApi();
  let res = await api.post({ vendor: '池栄青果 大山店', items, receipt });
  assert.equal(res.status, 200);
  assert.equal(api.state().ingredients[0].costPerUnit, 158);
  assert.equal(api.state().slips[0].deliveryItems.create[0].totalPrice, 316);
  assert.deepEqual(serialize(amounts.readReceiptMetadata(api.state().slips[0].ocrRawData)), receipt);

  for (const bad of [
    { ...receipt, statedTotal: 342 },
    { ...receipt, taxBasis: 'unknown' },
    { ...receipt, taxBasis: 'inclusive' },
    { ...receipt, externalTax: -25 },
    { ...receipt, statedTotal: Infinity },
    { ...receipt, documentDate: '2026-02-29' },
    { ...receipt, documentDate: '' },
    { ...receipt, documentDate: null },
  ]) {
    api = makeApi();
    res = await api.post({ items, receipt: bad });
    assert.equal(res.status, 400);
    assert.equal(api.state().slips.length, 0);
    assert.equal(api.state().ingredients[0].costPerUnit, 100);
  }

  api = makeApi();
  assert.equal((await api.post({ items: [{ ...items[0], totalPrice: 341 }], receipt: { statedTotal: 341, externalTax: 0, taxBasis: 'inclusive' } })).status, 200);
  api = makeApi({ auth: null });
  assert.equal((await api.post({ items, receipt })).status, 401);
  api = makeApi({ unit: 'g' });
  assert.equal((await api.post({ items, receipt })).status, 400);
  assert.equal(api.state().ingredients[0].costPerUnit, 100);
  api = makeApi({ failSave: true });
  assert.equal((await api.post({ items, receipt })).status, 500);
  assert.equal(api.state().ingredients[0].costPerUnit, 100);
  api = makeApi();
  assert.equal((await api.post({ items: [{ ...items[0], quantity: 0 }], receipt })).status, 400);
  assert.equal(api.state().slips.length, 0);
  // 旧クライアントからの登録は旧形式で保持する。
  api = makeApi();
  assert.equal((await api.post({ items })).status, 200);
  assert.ok(Array.isArray(JSON.parse(api.state().slips[0].ocrRawData)));

  // 実際の画面コンポーネントを固定の読取結果で描画。AI・DB・通信は使わない。
  function markupFor({ externalTax = 25, taxBasis = 'exclusive', needsReview = false, documentDate = '2026-10-29' } = {}) {
    let index = 0;
    const state = [null, 'reviewing', [{ ...items[0], quantity: '2', totalPrice: '316', needsReview }], '池栄青果 大山店', 341, externalTax, taxBasis, 0, null, null, null, documentDate];
    const page = loadTs('src/app/delivery/page.tsx', {
      react: { ...React, useRef: () => ({ current: null }), useState: (initial) => [index < state.length ? state[index++] : initial, () => {}] },
      'next/link': { __esModule: true, default: ({ children, ...props }) => React.createElement('a', props, children) },
      '@/lib/deliveryAmounts': amounts,
    });
    return renderToStaticMarkup(React.createElement(page.default));
  }
  const html = markupFor();
  assert.match(html, /税込合計照合/);
  assert.match(html, /単価 ¥158.00/);
  assert.match(html, /✓ 一致/);
  assert.doesNotMatch(html, /<button[^>]*disabled=""[^>]*>✓ 1件を保存する/);
  assert.match(markupFor({ externalTax: null }), /<button[^>]*disabled=""[^>]*>✓ 1件を保存する/);
  assert.match(markupFor({ taxBasis: 'unknown' }), /<button[^>]*disabled=""[^>]*>✓ 1件を保存する/);
  assert.match(markupFor({ needsReview: true }), /<button[^>]*disabled=""[^>]*>✓ 1件を保存する/);
  assert.match(html, /type="date"[^>]*value="2026-10-29"/);
  assert.match(markupFor({ documentDate: '' }), /<button[^>]*disabled=""[^>]*>✓ 1件を保存する/);
  assert.match(markupFor({ documentDate: '2026-02-29' }), /<button[^>]*disabled=""[^>]*>✓ 1件を保存する/);

  // 実在日付と月末・年末の日本時間境界。
  for (const day of ['2024-02-29', '2026-10-29', '2026-12-31']) assert.equal(amounts.isDocumentDate(day), true);
  for (const day of ['2026-02-29', '2026-04-31', '2026-13-01', '2026-1-01', '0000-01-01', null]) assert.equal(amounts.isDocumentDate(day), false);
  assert.equal(amounts.japanDateKey('2026-10-31T14:59:59Z'), '2026-10-31');
  assert.equal(amounts.japanDateKey('2026-10-31T15:00:00Z'), '2026-11-01');
  const now = '2026-10-31T15:05:00Z'; // 日本は11月1日、UTCは10月31日
  const clock = class extends Date { constructor(...args) { super(...(args.length ? args : [now])); } };
  const windows = amounts.getJapanMonthWindows(new Date(now));
  assert.equal(windows[5].key, '2026-11');
  assert.equal(windows[5].start.toISOString(), '2026-10-31T15:00:00.000Z');
  assert.equal(amounts.getJapanMonthWindows(new Date('2026-12-31T15:00:00Z'), 1)[0].key, '2027-01');
  const slips = [
    { id: 'backdated', vendor: '池栄青果', createdAt: new Date(now), ocrRawData: raw, deliveryItems: items },
    { id: 'legacy', createdAt: new Date(now), ocrRawData: '[]', deliveryItems: [{ totalPrice: 100 }] },
    { id: 'future', createdAt: new Date(now), ocrRawData: JSON.stringify({ version: 2, receipt: { ...receipt, documentDate: '2026-12-01' } }), deliveryItems: items },
  ];
  assert.equal(amounts.getDeliveryDocumentDate(slips[0]), '2026-10-29');
  assert.equal(amounts.getDeliveryDocumentDate(slips[1]), '2026-11-01');
  let fetches = 0;
  const prisma = {
    deliverySlip: {
      async findMany({ where, select }) {
        assert.equal(where.storeId, 'test-store');
        assert.equal(where.createdAt, undefined, '登録日で絞らない');
        assert.equal(select.createdAt, true);
        fetches++;
        return slips;
      }, count: async () => 0,
    },
    ingredient: { groupBy: async () => [] },
    menuItem: { count: async () => 0, findMany: async () => [] },
    tenant: { findUnique: async () => ({ subscriptionStatus: 'trial' }) },
    transaction: { aggregate: async () => ({ _sum: { amount: 0 } }), count: async () => 0, findMany: async () => [] },
    user: { findUnique: async () => ({ name: 'QA' }) },
    store: { findUnique: async () => ({ name: '模擬店舗' }) },
  };
  const deps = {
    '@/lib/prisma': { prisma }, '@/lib/deliveryAmounts': amounts,
    '@/lib/auth': { getAuth: async () => ({ storeId: 'test-store' }), getServerAuth: async () => ({ storeId: 'test-store' }), TRIAL_LIMITS: {}, isPaidPlan: () => false },
  };
  const reports = await loadTs('src/app/api/reports/route.ts', deps, clock).GET({});
  const reportData = await reports.json();
  assert.equal(reports.status, 200);
  assert.equal(reportData.monthlyData.find((m) => m.label === '10月').total, 341);
  assert.equal(reportData.monthlyData.find((m) => m.label === '11月').total, 100);
  const stats = await loadTs('src/app/api/dashboard/stats/route.ts', deps, clock).GET({});
  assert.equal(stats.status, 200);
  assert.equal((await stats.json()).monthlyPurchaseTotal, 100);
  const dashboard = await loadTs('src/app/dashboard/page.tsx', {
    ...deps, 'next/navigation': { redirect() { throw new Error('unexpected redirect'); } },
    '@/lib/dailyLedger': { METHOD_LABELS: {} }, './DashboardClient': { __esModule: true, default: () => null },
  }, clock).default();
  assert.equal(dashboard.props.stats.monthlyPurchaseTotal, 100);
  assert.equal(dashboard.props.trend.find((m) => m.label === '10月').purchase, 341);
  assert.equal(amounts.japanDateKey(dashboard.props.recentEntries.find((e) => e.id === 'backdated').date), '2026-10-29');
  assert.equal(dashboard.props.recentEntries.some((e) => e.id === 'future'), false);
  assert.equal(fetches, 3);

  let historyIndex = 0;
  const historyState = [slips.map((s) => ({ ...s, deliveryItems: [] })), false, null, false, null];
  const history = loadTs('src/app/delivery-history/page.tsx', {
    '@/lib/deliveryAmounts': amounts,
    react: { ...React, useEffect() {}, useState: () => [historyState[historyIndex++], () => {}] },
    'next/link': { __esModule: true, default: ({ children, ...props }) => React.createElement('a', props, children) },
  });
  const historyHtml = renderToStaticMarkup(React.createElement(history.default));
  assert.match(historyHtml, /2026\/10\/29/);
  assert.match(historyHtml, /登録日時:/);
  assert.match(historyHtml, /伝票日未記録：登録日（日本時間）の月に集計/);

  // OCRは模擬SDKのみ。実APIへ接続せず、日付を保持・不正日付を空欄にする。
  for (const day of ['2026-10-29', '2026-02-29', null]) {
    const ocr = loadTs('src/app/api/delivery-slips/ocr/route.ts', {
      '@/lib/deliveryAmounts': amounts,
      '@anthropic-ai/sdk': { __esModule: true, default: class { messages = { create: async () => ({ stop_reason: 'end_turn', content: [{ type: 'text', text: JSON.stringify({ documentDate: day, items: [] }) }] }) }; } },
    });
    // VMには架空キーのみ。実環境変数・実SDKへの経路は渡していない。
    const response = await ocr.POST({ formData: async () => ({ get: () => ({ type: 'image/jpeg', arrayBuffer: async () => new ArrayBuffer(0) }) }) });
    assert.equal(response.status, 200);
    assert.equal((await response.json()).documentDate, day === '2026-10-29' ? day : null);
  }
  if (process.argv[2]) {
    const dir = process.argv[2];
    const css = fs.readFileSync(path.join(root, 'src/app/globals.css'), 'utf8');
    fs.writeFileSync(path.join(dir, 'index.html'), `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Costra 税込照合・模擬データ</title><style>${css}\n*{box-sizing:border-box}body{margin:0;font-family:sans-serif}button,input,select{font:inherit}p{margin:0}a{color:inherit}</style></head><body>${html}</body></html>`);
  }
  console.log('PASS: 税込照合・保存制御・ロールバック、伝票日保存・OCR模擬応答、日本時間の月境界、後日入力の月別集計（レポート・統計API・実ダッシュボード）、旧履歴互換（実DB・課金AIなし）');
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
