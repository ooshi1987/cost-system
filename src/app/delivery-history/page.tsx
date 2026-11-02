'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { calculateReceiptAmounts, readReceiptMetadata, getDeliveryDocumentDate, TAX_BASIS_LABELS, type ReceiptTaxBasis } from '@/lib/deliveryAmounts';

interface DeliveryItem {
  id: string;
  ingredient: {
    name: string;
  };
  quantity: number;
  unit: string;
  totalPrice: number;
}

interface DeliverySlip {
  id: string;
  vendor: string | null;
  ocrRawData: string | null;
  createdAt: string;
  processedAt: string | null;
  deliveryItems: DeliveryItem[];
}

interface EditState {
  itemId: string;
  quantity: string;
  totalPrice: string;
  expectedQuantity: number;
  expectedTotalPrice: number;
}

interface ReceiptEdit {
  slipId: string;
  expectedRaw: string;
  statedTotal: string;
  externalTax: string;
  taxBasis: ReceiptTaxBasis;
  confirmed: boolean;
}

export default function DeliveryHistoryPage() {
  const [deliverySlips, setDeliverySlips] = useState<DeliverySlip[]>([]);
  const [loading, setLoading] = useState(true);
  const [editState, setEditState] = useState<EditState | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedItemId, setSavedItemId] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [receiptEdit, setReceiptEdit] = useState<ReceiptEdit | null>(null);
  const [receiptError, setReceiptError] = useState<string | null>(null);

  useEffect(() => {
    fetchDeliverySlips();
  }, []);

  useEffect(() => {
    if (!loading && !loadError && window.location.hash) {
      document.getElementById(decodeURIComponent(window.location.hash.slice(1)))?.scrollIntoView();
    }
  }, [loading, loadError, deliverySlips]);

  const fetchDeliverySlips = async () => {
    try {
      const response = await fetch('/api/delivery-slips');
      if (!response.ok) throw new Error('納品履歴を取得できませんでした');
      const data = await response.json();
      if (!Array.isArray(data)) throw new Error('納品履歴を確認できませんでした');
      setDeliverySlips(data);
    } catch (error) {
      console.error('Error fetching delivery slips:', error);
      setLoadError('納品履歴を読み込めませんでした。再読み込みしてください。');
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (item: DeliveryItem) => {
    setEditState({
      itemId: item.id,
      quantity: item.quantity.toString(),
      totalPrice: item.totalPrice.toString(),
      expectedQuantity: item.quantity,
      expectedTotalPrice: item.totalPrice,
    });
  };

  const cancelEdit = () => {
    setEditState(null);
  };

  const saveReceipt = async () => {
    if (!receiptEdit || !receiptEdit.confirmed) return;
    const statedTotal = Number(receiptEdit.statedTotal);
    const externalTax = Number(receiptEdit.externalTax);
    if (!receiptEdit.statedTotal.trim() || !receiptEdit.externalTax.trim() || !Number.isFinite(statedTotal) || !Number.isFinite(externalTax) || statedTotal < 0 || externalTax < 0 || receiptEdit.taxBasis === 'unknown' || (receiptEdit.taxBasis === 'inclusive' && externalTax !== 0)) {
      setReceiptError('税込合計・外税・税区分を確認してください。');
      return;
    }
    setSaving(true);
    setReceiptError(null);
    try {
      const response = await fetch(`/api/delivery-slips/${receiptEdit.slipId}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ statedTotal, externalTax, taxBasis: receiptEdit.taxBasis, expectedRaw: receiptEdit.expectedRaw, confirmed: true }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || '更新できませんでした');
      const raw = JSON.parse(receiptEdit.expectedRaw);
      raw.receipt = { ...raw.receipt, statedTotal, externalTax, taxBasis: receiptEdit.taxBasis };
      setDeliverySlips((previous) => previous.map((slip) => slip.id === receiptEdit.slipId ? { ...slip, ocrRawData: JSON.stringify(raw) } : slip));
      setReceiptEdit(null);
    } catch (error) {
      setReceiptError(error instanceof Error ? error.message : '更新できませんでした');
    } finally {
      setSaving(false);
    }
  };

  const saveEdit = async () => {
    if (!editState) return;

    const qty = parseFloat(editState.quantity);
    const price = parseFloat(editState.totalPrice);

    if (!Number.isFinite(qty) || !Number.isFinite(price) || qty <= 0 || price < 0) {
      alert('正しい数値を入力してください（数量は1以上、金額は0以上）');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(
        `/api/delivery-slips/items/${editState.itemId}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ quantity: qty, totalPrice: price, expectedQuantity: editState.expectedQuantity, expectedTotalPrice: editState.expectedTotalPrice }),
        }
      );

      if (!response.ok) {
        const err = await response.json();
        alert(err.error || '更新に失敗しました');
        return;
      }
      const result = await response.json();

      // ローカルの状態を更新
      setDeliverySlips((prev) =>
        prev.map((slip) => ({
          ...slip,
          deliveryItems: slip.deliveryItems.map((item) =>
            item.id === editState.itemId
              ? { ...item, quantity: qty, totalPrice: price }
              : item
          ),
        }))
      );

      setSavedItemId(editState.itemId);
      setSavedMessage(result.priceUpdated ? '明細と食材単価を更新しました' : '明細を更新しました。現在の食材単価は変更していません。');
      setEditState(null);

      // 保存完了表示を2秒後に消す
      setTimeout(() => { setSavedItemId(null); setSavedMessage(null); }, 4000);
    } catch (error) {
      alert('エラーが発生しました');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-8">読み込み中...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto p-4 sm:p-8">
        <div className="mb-6 sm:mb-8 flex items-center justify-between">
          <Link href="/dashboard" className="text-amber-600 hover:text-amber-700">
            ← ダッシュボードに戻る
          </Link>
          <Link
            href="/help/history"
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-amber-600 px-2.5 py-1.5 rounded-lg hover:bg-amber-50 transition-colors border border-gray-200 hover:border-amber-200"
          >
            <span>？</span>
            <span>使い方</span>
          </Link>
        </div>

        <h1 className="text-2xl sm:text-4xl font-bold mb-6 sm:mb-8">納品履歴</h1>

        {loadError ? <p role="alert" className="text-amber-700">{loadError}</p> : deliverySlips.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-500 mb-4">納品記録がまだありません</p>
            <Link
              href="/delivery"
              className="inline-block bg-amber-500 text-white px-6 py-2 rounded hover:bg-amber-600"
            >
              納品書をスキャン
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {deliverySlips.map((slip) => {
              const receipt = readReceiptMetadata(slip.ocrRawData);
              const amounts = calculateReceiptAmounts(slip.deliveryItems, receipt?.statedTotal ?? null, receipt?.externalTax ?? null);
              return (
              <div key={slip.id} id={`receipt-${slip.id}`} className="bg-white rounded-lg shadow p-4 sm:p-6">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h2 className="text-lg sm:text-xl font-bold">
                      {getDeliveryDocumentDate(slip).replaceAll('-', '/')} {receipt?.documentDate ? 'の伝票' : '登録分'}
                    </h2>
                    {!receipt?.documentDate && <p className="text-xs text-amber-700">伝票日未記録：登録日（日本時間）の月に集計</p>}
                    <p className="text-xs text-gray-500">登録日時: {new Date(slip.createdAt).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}</p>
                    {slip.vendor && <p className="text-sm font-semibold">{slip.vendor}</p>}
                    {slip.processedAt && (
                      <p className="text-sm text-gray-600">
                        処理済み: {new Date(slip.processedAt).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}
                      </p>
                    )}
                  </div>
                  <div className="text-xs text-gray-400">#{slip.id.slice(0, 8)}</div>
                </div>

                <div className="mb-4 rounded-lg border border-gray-200 p-3 text-sm">
                  <div className="flex justify-between gap-3"><span>明細合計{receipt ? `（${TAX_BASIS_LABELS[receipt.taxBasis]}）` : ''}</span><span>¥{amounts.itemsTotal.toLocaleString()}</span></div>
                  {receipt ? <>
                    <div className="flex justify-between gap-3"><span>別途加算する外税</span><span>¥{receipt.externalTax.toLocaleString()}</span></div>
                    <div className="flex justify-between gap-3 font-bold"><span>伝票記載合計（税込）</span><span>¥{receipt.statedTotal.toLocaleString()}</span></div>
                    <p className={amounts.difference === 0 ? 'mt-2 text-green-700' : 'mt-2 text-amber-700'}>
                      {amounts.difference === 0 ? '✓ 明細合計＋外税と一致' : `差額 ¥${amounts.difference?.toLocaleString()} — 明細と原本を確認してください`}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">食材単価は明細金額で計算。仕入集計には税込の伝票合計を使用します。</p>
                    {receiptEdit?.slipId === slip.id ? (
                      <div className="mt-3 space-y-2 rounded-lg bg-amber-50 p-3">
                        <p className="text-xs text-amber-800">原本を見ながら修正してください。保存後の画像はこの画面に保管されません。</p>
                        <label className="block">税込合計 <input aria-label="税込合計" type="number" min="0" step="any" value={receiptEdit.statedTotal} onChange={(event) => setReceiptEdit({ ...receiptEdit, statedTotal: event.target.value, confirmed: false })} className="ml-2 w-32 rounded border p-1" /></label>
                        <label className="block">外税 <input aria-label="外税" type="number" min="0" step="any" value={receiptEdit.externalTax} onChange={(event) => setReceiptEdit({ ...receiptEdit, externalTax: event.target.value, confirmed: false })} className="ml-2 w-32 rounded border p-1" /></label>
                        <label className="block">税区分 <select aria-label="税区分" value={receiptEdit.taxBasis} onChange={(event) => setReceiptEdit({ ...receiptEdit, taxBasis: event.target.value as ReceiptTaxBasis, confirmed: false })} className="ml-2 rounded border p-1"><option value="unknown">税区分未確認</option><option value="exclusive">税抜明細</option><option value="inclusive">税込明細</option><option value="mixed">税抜・税込混在</option></select></label>
                        <label className="flex items-start gap-2"><input type="checkbox" checked={receiptEdit.confirmed} onChange={(event) => setReceiptEdit({ ...receiptEdit, confirmed: event.target.checked })} />原本の税込合計・外税・税区分と照合しました</label>
                        {receiptError && <p role="alert" className="text-red-700">{receiptError}</p>}
                        <div className="flex gap-3"><button disabled={saving || !receiptEdit.confirmed} onClick={saveReceipt} className="rounded bg-amber-600 px-3 py-2 text-white disabled:opacity-50">{saving ? '保存中…' : '修正を保存'}</button><button disabled={saving} onClick={() => { setReceiptEdit(null); setReceiptError(null); }} className="px-3 py-2">取消</button></div>
                      </div>
                    ) : <button className="mt-2 text-amber-700 underline" onClick={() => { if (slip.ocrRawData) setReceiptEdit({ slipId: slip.id, expectedRaw: slip.ocrRawData, statedTotal: String(receipt.statedTotal), externalTax: String(receipt.externalTax), taxBasis: receipt.taxBasis, confirmed: false }); setReceiptError(null); }}>税込合計・税額を修正</button>}
                  </> : <p className="mt-2 text-xs text-amber-700">過去形式の記録：税込合計・税額は未記録です。仕入集計には登録済みの明細合計を使用しています。</p>}
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-3 py-2 text-left">食材名</th>
                        <th className="px-3 py-2 text-right">数量</th>
                        <th className="px-3 py-2 text-left">単位</th>
                        <th className="px-3 py-2 text-right">合計金額</th>
                        {/* 単価はPCのみ表示 */}
                        <th className="px-3 py-2 text-right hidden sm:table-cell">単価</th>
                        <th className="px-3 py-2 text-center w-20">修正</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {slip.deliveryItems.map((item) => {
                        const isEditing = editState?.itemId === item.id;
                        const isSaved = savedItemId === item.id;
                        const unitPrice = item.quantity > 0
                          ? (item.totalPrice / item.quantity).toFixed(2) : '-';

                        return (
                          <tr key={item.id}
                            className={isEditing ? 'bg-yellow-50' : isSaved ? 'bg-green-50' : 'hover:bg-gray-50'}>

                            {/* 食材名 */}
                            <td className="px-3 py-3 font-medium text-sm">{item.ingredient.name}</td>

                            {/* 数量 */}
                            <td className="px-3 py-3 text-right">
                              {isEditing ? (
                                <input type="number" min="0.01" step="any"
                                  value={editState.quantity}
                                  onChange={(e) => setEditState({ ...editState, quantity: e.target.value })}
                                  className="w-20 border border-yellow-400 rounded-lg px-2 py-1.5 text-right text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
                                  autoFocus />
                              ) : item.quantity.toLocaleString()}
                            </td>

                            {/* 単位 */}
                            <td className="px-3 py-3 text-gray-500">{item.unit}</td>

                            {/* 合計金額 */}
                            <td className="px-3 py-3 text-right">
                              {isEditing ? (
                                <input type="number" min="0" step="1"
                                  value={editState.totalPrice}
                                  onChange={(e) => setEditState({ ...editState, totalPrice: e.target.value })}
                                  className="w-24 border border-yellow-400 rounded-lg px-2 py-1.5 text-right text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400" />
                              ) : (
                                <span className={isSaved ? 'text-green-600 font-semibold' : ''}>
                                  ¥{item.totalPrice.toLocaleString()}
                                </span>
                              )}
                            </td>

                            {/* 単価（PCのみ） */}
                            <td className="px-3 py-3 text-right text-gray-400 hidden sm:table-cell">
                              {isEditing ? (
                                <span className="text-yellow-600 text-xs">
                                  ¥{editState.quantity && editState.totalPrice
                                    ? (parseFloat(editState.totalPrice) / parseFloat(editState.quantity)).toFixed(2)
                                    : '-'}
                                </span>
                              ) : `¥${unitPrice}`}
                            </td>

                            {/* 操作ボタン */}
                            <td className="px-3 py-3 text-center">
                              {isEditing ? (
                                <div className="flex gap-1.5 justify-center">
                                  <button onClick={saveEdit} disabled={saving}
                                    className="bg-green-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-green-700 disabled:bg-gray-300">
                                    {saving ? '…' : '保存'}
                                  </button>
                                  <button onClick={cancelEdit} disabled={saving}
                                    className="bg-gray-200 text-gray-600 px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-gray-300">
                                    取消
                                  </button>
                                </div>
                              ) : isSaved ? (
                                <span className="text-green-600 text-xs font-semibold">✓</span>
                              ) : (
                                <button onClick={() => startEdit(item)} disabled={editState !== null}
                                  className="text-gray-300 hover:text-amber-500 disabled:opacity-20 disabled:cursor-not-allowed transition-colors p-1"
                                  title="修正する">
                                  ✏️
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* 編集中の注意書き */}
                {slip.deliveryItems.some((item) => editState?.itemId === item.id) && (
                  <p className="mt-2 text-xs text-yellow-700 bg-yellow-50 rounded px-3 py-1">
                    最新の伝票で、現在の価格が伝票由来の場合は食材単価も更新します。
                  </p>
                )}
                {slip.deliveryItems.some((item) => savedItemId === item.id) && savedMessage && <p role="status" className="mt-2 text-xs text-green-700">{savedMessage}</p>}
              </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
