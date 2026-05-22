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

export default function DeliveryHistoryPage() {
  const [deliverySlips, setDeliverySlips] = useState<DeliverySlip[]>([]);
  const [loading, setLoading] = useState(true);

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

  if (loading) {
    return <div className="p-8">読み込み中...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto p-8">
        <div className="mb-8">
          <Link href="/" className="text-blue-600 hover:text-blue-700">
            ← ダッシュボードに戻る
          </Link>
        </div>

        <h1 className="text-4xl font-bold mb-8">納品履歴</h1>

        {deliverySlips.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-500 mb-4">納品記録がまだありません</p>
            <Link
              href="/delivery"
              className="inline-block bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
            >
              納品書をスキャン
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {deliverySlips.map((slip) => (
              <div key={slip.id} className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h2 className="text-xl font-bold">
                      {new Date(slip.createdAt).toLocaleString('ja-JP')}
                    </h2>
                    {slip.processedAt && (
                      <p className="text-sm text-gray-600">
                        処理済み: {new Date(slip.processedAt).toLocaleString('ja-JP')}
                      </p>
                    )}
                  </div>
                  <div className="text-sm text-gray-500">ID: {slip.id.slice(0, 8)}</div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-100 border-b">
                      <tr>
                        <th className="px-4 py-2 text-left">食材名</th>
                        <th className="px-4 py-2 text-right">数量</th>
                        <th className="px-4 py-2 text-left">単位</th>
                        <th className="px-4 py-2 text-right">合計金額</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {slip.deliveryItems.map((item) => (
                        <tr key={item.id} className="hover:bg-gray-50">
                          <td className="px-4 py-2">{item.ingredient.name}</td>
                          <td className="px-4 py-2 text-right">{item.quantity.toLocaleString()}</td>
                          <td className="px-4 py-2">{item.unit}</td>
                          <td className="px-4 py-2 text-right font-semibold">
                            ¥{item.totalPrice.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
