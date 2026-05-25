'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

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
  createdAt: string;
  processedAt: string | null;
  deliveryItems: DeliveryItem[];
}

interface EditState {
  itemId: string;
  quantity: string;
  totalPrice: string;
}

export default function DeliveryHistoryPage() {
  const [deliverySlips, setDeliverySlips] = useState<DeliverySlip[]>([]);
  const [loading, setLoading] = useState(true);
  const [editState, setEditState] = useState<EditState | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedItemId, setSavedItemId] = useState<string | null>(null);

  useEffect(() => {
    fetchDeliverySlips();
  }, []);

  const fetchDeliverySlips = async () => {
    try {
      const response = await fetch('/api/delivery-slips');
      if (response.ok) {
        const data = await response.json();
        setDeliverySlips(data);
      }
    } catch (error) {
      console.error('Error fetching delivery slips:', error);
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (item: DeliveryItem) => {
    setEditState({
      itemId: item.id,
      quantity: item.quantity.toString(),
      totalPrice: item.totalPrice.toString(),
    });
  };

  const cancelEdit = () => {
    setEditState(null);
  };

  const saveEdit = async () => {
    if (!editState) return;

    const qty = parseFloat(editState.quantity);
    const price = parseFloat(editState.totalPrice);

    if (isNaN(qty) || isNaN(price) || qty <= 0 || price < 0) {
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
          body: JSON.stringify({ quantity: qty, totalPrice: price }),
        }
      );

      if (!response.ok) {
        const err = await response.json();
        alert(err.error || '更新に失敗しました');
        return;
      }

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
      setEditState(null);

      // 保存完了表示を2秒後に消す
      setTimeout(() => setSavedItemId(null), 2000);
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
        <div className="mb-6 sm:mb-8">
          <Link href="/" className="text-amber-600 hover:text-amber-700">
            ← ダッシュボードに戻る
          </Link>
        </div>

        <h1 className="text-2xl sm:text-4xl font-bold mb-6 sm:mb-8">納品履歴</h1>

        {deliverySlips.length === 0 ? (
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
            {deliverySlips.map((slip) => (
              <div key={slip.id} className="bg-white rounded-lg shadow p-4 sm:p-6">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h2 className="text-lg sm:text-xl font-bold">
                      {new Date(slip.createdAt).toLocaleString('ja-JP')}
                    </h2>
                    {slip.processedAt && (
                      <p className="text-sm text-gray-600">
                        処理済み: {new Date(slip.processedAt).toLocaleString('ja-JP')}
                      </p>
                    )}
                  </div>
                  <div className="text-xs text-gray-400">#{slip.id.slice(0, 8)}</div>
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
                    ✏️ 修正すると食材の単価（円/g）も自動で再計算されます
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
