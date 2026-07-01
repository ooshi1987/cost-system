'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';

// ─── Types ───────────────────────────────────────────────

interface ImportItem {
  name: string;
  qty: number | null;
  unit: string;
  unitCost: number | null;
  lineCost: number | null;
  ingredientId: string | null;
  priceSource: string;
  vendor: string | null;
  deliveryDate: string | null;
}

type MatchMode = 'matched' | 'candidate' | 'new';

interface ImportCard {
  menuName: string;
  sellPrice: number | null;
  statedTotalCost: number | null;
  items: ImportItem[];
  matchMenuItemId: string | null;
  matchMenuName: string | null;
  matchMode: MatchMode;
  score: number;
  // クライアント側の状態
  targetMode: 'matched' | 'new';
  targetMenuItemId: string | null;
  targetMenuName: string;
  confirmed: boolean;
  excluded: boolean;
  itemsOpen: boolean;
}

interface ExistingMenuItem {
  id: string;
  name: string;
  sellingPrice: number;
}

type Step = 'idle' | 'uploading' | 'preview' | 'saving' | 'done';

// ─── Helpers ─────────────────────────────────────────────

function cardTotal(card: ImportCard): number {
  return card.items.reduce((sum, item) => {
    if (item.qty !== null && item.unitCost !== null) return sum + item.qty * item.unitCost;
    return sum + (item.lineCost ?? 0);
  }, 0);
}

function cardUnlinkedCount(card: ImportCard): number {
  return card.items.filter((i) => i.priceSource === 'unset').length;
}

function cardNeedsConfirm(card: ImportCard): boolean {
  if (card.excluded) return false;
  if (card.matchMode === 'candidate' && !card.confirmed) return true;
  if (cardUnlinkedCount(card) > 0) return true;
  if (card.statedTotalCost === null) return true;
  if (Math.abs(cardTotal(card) - card.statedTotalCost) >= 1) return true;
  return false;
}

// ─── Component ───────────────────────────────────────────

export default function RecipeBatchImportPage() {
  const [step, setStep] = useState<Step>('idle');
  const [error, setError] = useState<string | null>(null);
  const [lowConfidence, setLowConfidence] = useState<string[]>([]);
  const [cards, setCards] = useState<ImportCard[]>([]);
  const [existingMenus, setExistingMenus] = useState<ExistingMenuItem[]>([]);
  const [results, setResults] = useState<{ index: number; success: boolean; error?: string }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch('/api/menu-items')
      .then((res) => (res.ok ? res.json() : []))
      .then((data: { id: string; name: string; sellingPrice: number }[]) =>
        setExistingMenus(data.map((m) => ({ id: m.id, name: m.name, sellingPrice: m.sellingPrice })))
      )
      .catch(() => {});
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 15 * 1024 * 1024) { setError('ファイルが大きすぎます（15MB以下にしてください）'); return; }
    setError(null);
    setStep('uploading');
    if (fileInputRef.current) fileInputRef.current.value = '';
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/recipes/import', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) { setError(data.error || '読み取りに失敗しました'); setStep('idle'); return; }

      const newCards: ImportCard[] = data.recipes.map((r: {
        menuName: string; sellPrice: number | null; statedTotalCost: number | null; items: ImportItem[];
        matchMenuItemId: string | null; matchMenuName: string | null; matchMode: MatchMode; score: number;
      }) => ({
        menuName: r.menuName,
        sellPrice: r.sellPrice,
        statedTotalCost: r.statedTotalCost,
        items: r.items,
        matchMenuItemId: r.matchMenuItemId,
        matchMenuName: r.matchMenuName,
        matchMode: r.matchMode,
        score: r.score,
        targetMode: r.matchMode === 'new' ? 'new' : 'matched',
        targetMenuItemId: r.matchMenuItemId,
        targetMenuName: r.matchMode === 'new' ? r.menuName : (r.matchMenuName ?? r.menuName),
        confirmed: false,
        excluded: false,
        itemsOpen: false,
      }));
      setCards(newCards);
      setLowConfidence(data.lowConfidence ?? []);
      setStep('preview');
    } catch {
      setError('エラーが発生しました');
      setStep('idle');
    }
  };

  const updateCard = (i: number, patch: Partial<ImportCard>) => {
    setCards((prev) => prev.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));
  };

  const updateItem = (cardIdx: number, itemIdx: number, patch: Partial<ImportItem>) => {
    setCards((prev) => prev.map((c, idx) => {
      if (idx !== cardIdx) return c;
      const items = c.items.map((it, ii) => {
        if (ii !== itemIdx) return it;
        const next = { ...it, ...patch };
        if (patch.name !== undefined && patch.name !== it.name) {
          next.ingredientId = null;
          next.priceSource = next.unitCost && next.unitCost > 0 ? 'manual' : 'unset';
        }
        if (patch.unitCost !== undefined) {
          next.priceSource = patch.unitCost && patch.unitCost > 0 ? 'manual' : 'unset';
        }
        return next;
      });
      return { ...c, items };
    }));
  };

  const addItem = (cardIdx: number) => {
    setCards((prev) => prev.map((c, idx) => idx === cardIdx
      ? { ...c, items: [...c.items, { name: '', qty: null, unit: 'g', unitCost: null, lineCost: null, ingredientId: null, priceSource: 'unset', vendor: null, deliveryDate: null }] }
      : c));
  };

  const removeItem = (cardIdx: number, itemIdx: number) => {
    setCards((prev) => prev.map((c, idx) => idx === cardIdx
      ? { ...c, items: c.items.filter((_, ii) => ii !== itemIdx) }
      : c));
  };

  const needConfirmCount = cards.filter((c) => cardNeedsConfirm(c)).length;
  const activeCount = cards.filter((c) => !c.excluded).length;

  const handleCommit = async () => {
    setStep('saving');
    setError(null);
    const payload = cards
      .map((c, index) => ({ card: c, index }))
      .filter(({ card }) => !card.excluded)
      .map(({ card, index }) => ({
        index,
        mode: card.targetMode,
        menuItemId: card.targetMode === 'matched' ? card.targetMenuItemId : null,
        menuName: card.targetMenuName,
        sellPrice: card.sellPrice,
        items: card.items.filter((i) => i.name.trim()).map((i) => ({
          name: i.name,
          qty: i.qty,
          unit: i.unit,
          unitCost: i.unitCost,
          ingredientId: i.ingredientId,
        })),
      }));
    try {
      const res = await fetch('/api/recipes/import/commit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipes: payload }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || '登録に失敗しました'); setStep('preview'); return; }
      setResults(data.results.map((r: { index: number; success: boolean; error?: string }, i: number) => ({ ...r, index: payload[i].index })));
      setStep('done');
    } catch {
      setError('登録中にエラーが発生しました');
      setStep('preview');
    }
  };

  const reset = () => {
    setStep('idle'); setCards([]); setError(null); setLowConfidence([]); setResults([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="mb-4 flex items-center justify-between">
          <Link href="/menu" className="text-amber-600 hover:text-amber-700 text-sm">← メニュー管理に戻る</Link>
        </div>
        <h1 className="text-2xl font-bold mb-1">撮影で取込</h1>
        <p className="text-gray-500 text-sm mb-4">原価表・レシピ表の一覧を撮影すると、AIがメニューごとに分けて読み取り、登録済みメニューと照合して振り分けます。</p>

        {step === 'idle' && (
          <div className="bg-white rounded-xl shadow p-4">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full border-2 border-dashed border-amber-300 rounded-xl py-10 text-center hover:border-amber-400 hover:bg-amber-50 transition"
            >
              <div className="text-3xl mb-2">📷</div>
              <div className="font-semibold text-amber-600">画像を選択して取込</div>
              <div className="text-xs text-gray-400 mt-1">JPG・PNG・PDF対応（15MB以下）・複数メニューが並ぶ一覧でもOK</div>
            </button>
            {error && <div className="mt-3 text-red-600 bg-red-50 rounded-xl p-3 text-sm">❌ {error}</div>}
            <input ref={fileInputRef} type="file" accept="image/*,application/pdf" onChange={handleFileChange} className="hidden" />
          </div>
        )}

        {step === 'uploading' && (
          <div className="bg-white rounded-xl shadow p-10 text-center">
            <div className="text-3xl mb-3 animate-spin">⚙️</div>
            <p className="font-semibold text-gray-700">Claudeが原価表を読み取っています…</p>
          </div>
        )}

        {(step === 'preview' || step === 'saving' || step === 'done') && (
          <>
            {needConfirmCount > 0 ? (
              <div className="mb-4 flex items-center gap-2 bg-amber-50 border border-amber-300 rounded-xl px-4 py-3 text-sm text-amber-700">
                <span>⚠</span><span><span className="font-bold">要確認 {needConfirmCount}件</span> — 振り分け先・単価・合計をご確認ください</span>
              </div>
            ) : (
              <div className="mb-4 flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-700">
                <span>✓</span><span>{activeCount}件すべて振り分け済み・単価も確定しています</span>
              </div>
            )}

            {lowConfidence.length > 0 && (
              <div className="mb-4 text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                読み取りに自信のない項目: {lowConfidence.join('、')}
              </div>
            )}

            <div className="space-y-3 mb-4">
              {cards.map((card, i) => {
                const total = cardTotal(card);
                const unlinked = cardUnlinkedCount(card);
                const costRate = card.sellPrice && card.sellPrice > 0 ? (total / card.sellPrice) * 100 : null;
                const diff = card.statedTotalCost !== null ? total - card.statedTotalCost : null;
                const needsConfirm = cardNeedsConfirm(card);
                const cardResult = step === 'done' ? results.find((r) => r.index === i) : null;

                if (card.excluded) {
                  return (
                    <div key={i} className="bg-gray-50 border border-gray-200 rounded-xl p-3 flex items-center justify-between opacity-60">
                      <span className="text-sm text-gray-400 line-through">{card.menuName}</span>
                      {step === 'preview' && (
                        <button onClick={() => updateCard(i, { excluded: false })} className="text-xs text-amber-600 hover:underline">元に戻す</button>
                      )}
                    </div>
                  );
                }

                return (
                  <div key={i} className={`bg-white rounded-xl shadow p-4 border ${needsConfirm ? 'border-amber-300' : 'border-gray-100'}`}>
                    {/* 振り分け先 */}
                    <div className="mb-3">
                      <div className="text-xs text-gray-400 mb-1">読み取り: {card.menuName}</div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {step === 'preview' ? (
                          <select
                            value={card.targetMode === 'new' ? '__new__' : (card.targetMenuItemId ?? '__new__')}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val === '__new__') {
                                updateCard(i, { targetMode: 'new', targetMenuItemId: null, targetMenuName: card.menuName, confirmed: true });
                              } else {
                                const menu = existingMenus.find((m) => m.id === val);
                                updateCard(i, { targetMode: 'matched', targetMenuItemId: val, targetMenuName: menu?.name ?? card.menuName, confirmed: true });
                              }
                            }}
                            className="flex-1 min-w-0 border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-amber-400"
                          >
                            <option value="__new__">＋ 新規メニューとして登録</option>
                            {existingMenus.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                          </select>
                        ) : (
                          <span className="font-semibold text-sm">{card.targetMenuName}</span>
                        )}
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap ${
                          needsConfirm && card.matchMode === 'candidate' && !card.confirmed ? 'bg-amber-100 text-amber-700' :
                          card.targetMode === 'new' ? 'bg-gray-100 text-gray-600' :
                          'bg-green-100 text-green-700'
                        }`}>
                          {card.targetMode === 'new' ? '新規' : (card.matchMode === 'candidate' && !card.confirmed) ? '要確認' : '既存に統合'}
                        </span>
                      </div>
                      {step === 'preview' && card.targetMode === 'new' && (
                        <input
                          value={card.targetMenuName}
                          onChange={(e) => updateCard(i, { targetMenuName: e.target.value })}
                          placeholder="新規メニュー名"
                          className="mt-2 w-full border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-amber-400"
                        />
                      )}
                    </div>

                    {/* 販売価格・原価率 */}
                    <div className="flex items-center gap-3 mb-3">
                      <label className="flex items-center gap-1 text-sm">
                        <span className="text-gray-400 text-xs">販売価格 ¥</span>
                        {step === 'preview' ? (
                          <input
                            type="number"
                            value={card.sellPrice ?? ''}
                            onChange={(e) => updateCard(i, { sellPrice: e.target.value ? parseFloat(e.target.value) : null })}
                            className="w-24 border rounded-md px-2 py-1 text-sm focus:outline-none focus:border-amber-400"
                          />
                        ) : (
                          <span className="font-medium">{card.sellPrice?.toLocaleString() ?? '-'}</span>
                        )}
                      </label>
                      <span className={`text-sm font-bold px-2 py-0.5 rounded-full ${
                        costRate === null ? 'bg-gray-100 text-gray-400' :
                        unlinked > 0 ? 'bg-amber-100 text-amber-700' :
                        costRate <= 30 ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                      }`}>
                        {costRate !== null ? `${costRate.toFixed(1)}%` : '原価率算出不可'}
                      </span>
                    </div>

                    {/* 材料トグル */}
                    <button
                      onClick={() => updateCard(i, { itemsOpen: !card.itemsOpen })}
                      className="text-xs text-amber-600 mb-2"
                    >
                      材料 {card.items.length}件（材料費 ¥{total.toFixed(0)}）{unlinked > 0 && <span className="text-amber-600"> ・未連動{unlinked}件</span>} {card.itemsOpen ? '▲' : '▼'}
                    </button>

                    {card.itemsOpen && (
                      <div className="space-y-2 mb-3">
                        {card.items.map((item, ii) => {
                          const badge = item.priceSource === 'delivery'
                            ? { text: `仕入連動${item.vendor ? ` ${item.vendor}` : ''}・¥${item.unitCost?.toFixed(2)}/${item.unit}`, cls: 'bg-green-50 text-green-700' }
                            : item.priceSource === 'manual'
                            ? { text: `手入力単価 ¥${item.unitCost?.toFixed(2)}/${item.unit}`, cls: 'bg-gray-100 text-gray-600' }
                            : { text: '⚠ 単価未連動', cls: 'bg-amber-100 text-amber-700' };
                          return (
                            <div key={ii} className={`border rounded-lg p-2 ${item.priceSource === 'unset' ? 'bg-amber-50 border-amber-200' : 'border-gray-100'}`}>
                              {step === 'preview' ? (
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <input value={item.name} onChange={(e) => updateItem(i, ii, { name: e.target.value })}
                                    placeholder="材料名" className="flex-1 min-w-0 border rounded px-1.5 py-1 text-xs focus:outline-none focus:border-amber-400" />
                                  <input type="number" value={item.qty ?? ''} onChange={(e) => updateItem(i, ii, { qty: e.target.value ? parseFloat(e.target.value) : null })}
                                    className="w-14 border rounded px-1.5 py-1 text-xs focus:outline-none focus:border-amber-400" />
                                  <input value={item.unit} onChange={(e) => updateItem(i, ii, { unit: e.target.value })}
                                    className="w-12 border rounded px-1.5 py-1 text-xs text-center focus:outline-none focus:border-amber-400" />
                                  <span className="text-xs text-gray-400">¥</span>
                                  <input type="number" step="0.01" value={item.unitCost ?? ''} onChange={(e) => updateItem(i, ii, { unitCost: e.target.value ? parseFloat(e.target.value) : null })}
                                    className="w-16 border rounded px-1.5 py-1 text-xs focus:outline-none focus:border-amber-400" />
                                  <button onClick={() => removeItem(i, ii)} className="text-red-300 hover:text-red-500 text-sm px-1">✕</button>
                                </div>
                              ) : (
                                <div className="flex items-center justify-between text-xs">
                                  <span>{item.name} {item.qty}{item.unit}</span>
                                  <span className="font-medium">¥{((item.qty ?? 0) * (item.unitCost ?? 0)).toFixed(0)}</span>
                                </div>
                              )}
                              <div className={`mt-1 inline-block text-xs px-2 py-0.5 rounded-full ${badge.cls}`}>{badge.text}</div>
                            </div>
                          );
                        })}
                        {step === 'preview' && (
                          <button onClick={() => addItem(i)} className="w-full border-2 border-dashed border-gray-200 rounded-lg py-1.5 text-xs text-gray-400 hover:border-amber-300 hover:text-amber-600">
                            ＋ 材料を追加
                          </button>
                        )}
                      </div>
                    )}

                    {/* 合計照合 */}
                    {card.statedTotalCost !== null ? (
                      diff !== null && Math.abs(diff) < 1 && unlinked === 0 ? (
                        <div className="flex items-center gap-1.5 bg-green-50 border border-green-200 rounded-lg px-3 py-1.5 text-xs text-green-700">
                          ✓ 記載の合計（¥{card.statedTotalCost.toFixed(0)}）と一致
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-300 rounded-lg px-3 py-1.5 text-xs text-amber-700">
                          ⚠ 記載 ¥{card.statedTotalCost.toFixed(0)} と差額 {diff !== null ? `${diff >= 0 ? '+' : ''}¥${diff.toFixed(0)}` : ''}
                        </div>
                      )
                    ) : (
                      <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-300 rounded-lg px-3 py-1.5 text-xs text-amber-700">
                        ⚠ 合計を読み取れませんでした
                      </div>
                    )}

                    {step === 'preview' && (
                      <button onClick={() => updateCard(i, { excluded: true })} className="mt-2 text-xs text-gray-400 hover:text-red-500">
                        この読み取りを除外
                      </button>
                    )}
                    {cardResult && (
                      <div className={`mt-2 text-xs px-2 py-1 rounded-lg ${cardResult.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                        {cardResult.success ? '✅ 登録しました' : `❌ ${cardResult.error}`}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {error && <div className="mb-3 text-red-600 bg-red-50 rounded-xl p-3 text-sm">❌ {error}</div>}

            {step === 'preview' && (
              <div className="flex gap-2">
                <button
                  onClick={handleCommit}
                  disabled={activeCount === 0}
                  className="flex-1 bg-amber-500 text-white py-3 rounded-xl font-semibold hover:bg-amber-600 disabled:bg-gray-300"
                >
                  {activeCount}件を一括登録する
                </button>
                <button onClick={reset} className="px-4 py-3 border rounded-xl text-gray-600 hover:bg-gray-50">取消</button>
              </div>
            )}
            {step === 'saving' && <div className="text-center py-2 text-amber-600 font-semibold">登録中...</div>}
            {step === 'done' && (
              <div className="flex gap-2">
                <div className="flex-1 bg-green-50 border border-green-200 rounded-xl p-3 text-center text-green-700 font-semibold text-sm">
                  ✅ {results.filter((r) => r.success).length}件の登録が完了しました
                </div>
                <Link href="/menu" className="px-4 py-2 border rounded-xl text-gray-600 hover:bg-gray-50 flex items-center">メニュー管理へ</Link>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
