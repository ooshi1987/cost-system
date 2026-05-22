'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';

interface ProcessedItem {
  name: string;
  quantity: number;
  unit: string;
  totalPrice: number;
  pricePerUnit: string;
}

export default function DeliveryPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    itemsProcessed: number;
    items: ProcessedItem[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const compressImage = async (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          const maxSize = 2000;
          if (width > height) {
            if (width > maxSize) {
              height = Math.round((height * maxSize) / width);
              width = maxSize;
            }
          } else {
            if (height > maxSize) {
              width = Math.round((width * maxSize) / height);
              height = maxSize;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
          }

          canvas.toBlob((blob) => {
            if (blob) resolve(blob);
            else reject(new Error('画像変換に失敗しました'));
          }, 'image/jpeg', 0.7);
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      // 画像を圧縮
      const compressedBlob = await compressImage(file);
      const compressedFile = new File([compressedBlob], file.name, {
        type: 'image/jpeg',
      });

      // プレビュー表示
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreview(e.target?.result as string);
        setResult(null);
        setError(null);
      };
      reader.readAsDataURL(compressedFile);

      // ファイルを置き換え
      if (fileInputRef.current) {
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(compressedFile);
        fileInputRef.current.files = dataTransfer.files;
      }
    } catch (err) {
      setError('画像の圧縮に失敗しました');
    }
  };

  const handleUpload = async () => {
    if (!fileInputRef.current?.files?.[0]) {
      setError('ファイルを選択してください');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('image', fileInputRef.current.files[0]);

      const response = await fetch('/api/delivery-slips/ocr', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'アップロードに失敗しました');
      }

      const data = await response.json();
      setResult(data);
      setPreview(null);
      fileInputRef.current.value = '';
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto p-4 sm:p-8">
        <div className="mb-6 sm:mb-8">
          <Link href="/" className="text-blue-600 hover:text-blue-700">
            ← ダッシュボードに戻る
          </Link>
        </div>

        <h1 className="text-2xl sm:text-4xl font-bold mb-6 sm:mb-8">納品書をスキャン</h1>

        <div className="bg-white rounded-lg shadow-lg p-4 sm:p-8">
          {!result ? (
            <>
              <div className="mb-6">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 sm:p-8 text-center">
                  {preview ? (
                    <div>
                      <img src={preview} alt="Preview" className="max-w-full max-h-96 mx-auto mb-4" />
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="text-blue-600 hover:text-blue-700 font-semibold"
                      >
                        別の画像を選択
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="text-5xl mb-4">📸</div>
                      <p className="text-gray-600 mb-4">納品書の写真を撮影またはアップロード</p>
                      <div className="flex flex-col sm:flex-row gap-2 justify-center">
                        <button
                          onClick={() => {
                            if (fileInputRef.current) {
                              fileInputRef.current.setAttribute('capture', 'environment');
                              fileInputRef.current.click();
                            }
                          }}
                          className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-semibold"
                        >
                          📷 カメラで撮影
                        </button>
                        <button
                          onClick={() => {
                            if (fileInputRef.current) {
                              fileInputRef.current.removeAttribute('capture');
                              fileInputRef.current.click();
                            }
                          }}
                          className="bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 font-semibold"
                        >
                          🖼️ ファイルを選択
                        </button>
                      </div>
                    </>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>

              {preview && (
                <button
                  onClick={handleUpload}
                  disabled={uploading}
                  className="w-full bg-green-600 text-white py-3 rounded font-semibold hover:bg-green-700 disabled:bg-gray-400"
                >
                  {uploading ? '処理中...' : 'OCR処理を実行'}
                </button>
              )}

              {error && (
                <div className="mt-4 bg-red-50 border border-red-200 rounded p-4 text-red-700">
                  {error}
                </div>
              )}
            </>
          ) : (
            <div>
              <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded">
                <p className="text-green-700 font-semibold">
                  ✓ {result.itemsProcessed}件の食材情報を取得しました
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-100 border-b">
                    <tr>
                      <th className="px-4 py-2 text-left">食材名</th>
                      <th className="px-4 py-2 text-right">数量</th>
                      <th className="px-4 py-2 text-left">単位</th>
                      <th className="px-4 py-2 text-right">合計金額</th>
                      <th className="px-4 py-2 text-right">単価</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {result.items.map((item, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-4 py-2">{item.name}</td>
                        <td className="px-4 py-2 text-right">{item.quantity.toLocaleString()}</td>
                        <td className="px-4 py-2">{item.unit}</td>
                        <td className="px-4 py-2 text-right">¥{item.totalPrice.toLocaleString()}</td>
                        <td className="px-4 py-2 text-right font-semibold">¥{item.pricePerUnit}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-6 space-y-2">
                <button
                  onClick={() => {
                    setResult(null);
                    setPreview(null);
                  }}
                  className="w-full bg-blue-600 text-white py-3 rounded font-semibold hover:bg-blue-700"
                >
                  別の納品書をスキャン
                </button>
                <Link
                  href="/"
                  className="block text-center bg-gray-600 text-white py-3 rounded font-semibold hover:bg-gray-700"
                >
                  ダッシュボードに戻る
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
