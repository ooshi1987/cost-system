'use client';

import Link from 'next/link';
import { useState } from 'react';

// ── サンプルデータ ──────────────────────────────
const MENU_ITEMS = [
  { name: '醤油ラーメン',    price: 850,  cost: 212, rate: 24.9, status: 'good' },
  { name: '味噌ラーメン',    price: 900,  cost: 243, rate: 27.0, status: 'good' },
  { name: '塩ラーメン',      price: 850,  cost: 221, rate: 26.0, status: 'good' },
  { name: 'チャーシュー丼',  price: 450,  cost: 162, rate: 36.0, status: 'warning' },
  { name: '餃子（6個）',     price: 380,  cost: 95,  rate: 25.0, status: 'good' },
  { name: 'から揚げ定食',    price: 950,  cost: 399, rate: 42.0, status: 'danger' },
];

const INGREDIENTS = [
  { name: '豚バラ肉',   unit: 'kg',  price: 890,  category: '肉類' },
  { name: 'チャーシュー', unit: 'kg', price: 1200, category: '肉類' },
  { name: '醤油タレ',   unit: 'L',   price: 450,  category: '調味料' },
  { name: '味噌',       unit: 'kg',  price: 680,  category: '調味料' },
  { name: '中太麺',     unit: 'kg',  price: 320,  category: '麺類' },
  { name: 'メンマ',     unit: 'kg',  price: 560,  category: '野菜' },
  { name: '長ネギ',     unit: 'kg',  price: 280,  category: '野菜' },
  { name: '煮干し',     unit: 'kg',  price: 1100, category: 'だし' },
];

const DELIVERY_ITEMS = [
  { name: '豚バラ肉 2kg',   amount: 1780, prev: 1740, diff: '+40' },
  { name: '中太麺 5kg',     amount: 1600, prev: 1600, diff: '±0' },
  { name: 'チャーシュー 1kg', amount: 1200, prev: 1150, diff: '+50' },
  { name: '長ネギ 3kg',     amount: 840,  prev: 900,  diff: '-60' },
];

const TABS = ['ダッシュボード', 'メニュー', '食材', '納品書スキャン'] as const;
type Tab = typeof TABS[number];

function StatusBadge({ rate }: { rate: number }) {
  if (rate <= 30) return <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">{rate}%</span>;
  if (rate <= 35) return <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">{rate}%</span>;
  return <span className="text-xs font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded-full">{rate}%</span>;
}

export default function DemoPage() {
  const [activeTab, setActiveTab] = useState<Tab>('ダッシュボード');
  const [scanning, setScanning] = useState(false);
  const [scanned, setScanned] = useState(false);

  const handleScan = () => {
    setScanning(true);
    setTimeout(() => { setScanning(false); setScanned(true); }, 2000);
  };

  return (
    <div className="min-h-screen bg-gray-50">

      {/* デモバナー */}
      <div className="bg-amber-500 text-white text-center text-xs font-bold py-2 px-4 flex items-center justify-center gap-3">
        <span>🎮 デモモード — サンプルデータを表示中</span>
        <Link href="/signup" className="bg-white text-amber-600 px-3 py-0.5 rounded-full text-xs font-bold hover:bg-amber-50 transition-colors">
          無料で始める →
        </Link>
      </div>

      {/* ヘッダー */}
      <div className="max-w-xl mx-auto px-4 pt-5 pb-2">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs text-gray-400 font-medium tracking-wide uppercase">Demo</p>
            <h1 className="text-xl font-bold text-gray-800">原価管理システム</h1>
          </div>
          <Link href="/signup" className="text-xs bg-amber-500 hover:bg-amber-600 text-white font-bold px-3 py-1.5 rounded-lg transition-colors">
            無料登録
          </Link>
        </div>

        {/* タブ */}
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-5 overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => { setActiveTab(tab); setScanned(false); }}
              className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === tab ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* ── ダッシュボード ── */}
        {activeTab === 'ダッシュボード' && (
          <div>
            <div className="grid grid-cols-3 gap-3 mb-5">
              {[
                { icon: '📋', label: 'メニュー', value: '24品', color: 'bg-blue-50 text-blue-600' },
                { icon: '🥦', label: '食材・調味料', value: '68種', color: 'bg-green-50 text-green-600' },
                { icon: '📊', label: '平均原価率', value: '28%', color: 'bg-amber-50 text-amber-600' },
              ].map((card) => (
                <div key={card.label} className={`${card.color} rounded-2xl p-3 text-center`}>
                  <div className="text-xl mb-1">{card.icon}</div>
                  <div className="text-xl font-bold">{card.value}</div>
                  <div className="text-[10px] font-medium mt-0.5 opacity-80">{card.label}</div>
                </div>
              ))}
            </div>

            <div className="bg-amber-500 rounded-2xl py-3.5 text-center text-white font-bold flex items-center justify-center gap-2 mb-4 opacity-70 cursor-not-allowed">
              <span>📸</span><span>納品書をスキャン</span>
            </div>

            <div className="bg-white rounded-2xl shadow-sm p-4 mb-3">
              <div className="text-xs font-bold text-gray-500 mb-3">⚠️ 要注意メニュー（原価率35%超）</div>
              {MENU_ITEMS.filter(m => m.status !== 'good').map(m => (
                <div key={m.name} className="flex items-center justify-between py-2 border-b last:border-0 border-gray-50">
                  <span className="text-sm font-medium text-gray-700">{m.name}</span>
                  <StatusBadge rate={m.rate} />
                </div>
              ))}
            </div>

            <div className="bg-white rounded-2xl shadow-sm p-4">
              <div className="text-xs font-bold text-gray-500 mb-3">📦 直近の仕入れ（昨日）</div>
              {DELIVERY_ITEMS.slice(0, 3).map(item => (
                <div key={item.name} className="flex items-center justify-between py-2 border-b last:border-0 border-gray-50">
                  <span className="text-sm text-gray-700">{item.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-gray-800">¥{item.amount.toLocaleString()}</span>
                    <span className={`text-xs ${item.diff.startsWith('+') ? 'text-red-400' : item.diff === '±0' ? 'text-gray-400' : 'text-green-500'}`}>{item.diff}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── メニュー ── */}
        {activeTab === 'メニュー' && (
          <div className="space-y-2">
            <div className="text-xs text-gray-400 mb-1">全{MENU_ITEMS.length}品 · 色は原価率を示します</div>
            {MENU_ITEMS.map((item) => (
              <div key={item.name} className="bg-white rounded-2xl shadow-sm px-4 py-3 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-sm text-gray-800">{item.name}</div>
                  <div className="text-xs text-gray-400 mt-0.5">売価 ¥{item.price} · 原価 ¥{item.cost}</div>
                </div>
                <StatusBadge rate={item.rate} />
              </div>
            ))}
          </div>
        )}

        {/* ── 食材 ── */}
        {activeTab === '食材' && (
          <div className="space-y-2">
            <div className="text-xs text-gray-400 mb-1">全{INGREDIENTS.length}種</div>
            {INGREDIENTS.map((item) => (
              <div key={item.name} className="bg-white rounded-2xl shadow-sm px-4 py-3 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-sm text-gray-800">{item.name}</div>
                  <div className="text-xs text-gray-400 mt-0.5">{item.category}</div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-sm text-gray-800">¥{item.price.toLocaleString()}</div>
                  <div className="text-xs text-gray-400">/{item.unit}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── 納品書スキャン ── */}
        {activeTab === '納品書スキャン' && (
          <div>
            {!scanned ? (
              <div>
                <div
                  onClick={!scanning ? handleScan : undefined}
                  className={`bg-white rounded-3xl border-2 border-dashed border-gray-200 p-10 text-center mb-4 transition-all ${!scanning ? 'cursor-pointer hover:border-amber-400 hover:bg-amber-50' : 'opacity-70'}`}
                >
                  {scanning ? (
                    <div>
                      <div className="text-4xl mb-3 animate-pulse">📸</div>
                      <div className="text-sm font-bold text-amber-600">AI解析中...</div>
                      <div className="text-xs text-gray-400 mt-1">納品書を読み取っています</div>
                      <div className="mt-3 flex justify-center gap-1">
                        {[0,1,2].map(i => (
                          <div key={i} className="w-2 h-2 rounded-full bg-amber-400 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="text-5xl mb-3">📷</div>
                      <div className="text-sm font-bold text-gray-700">ここをタップしてスキャン</div>
                      <div className="text-xs text-gray-400 mt-1">納品書の写真を撮影します</div>
                    </div>
                  )}
                </div>
                <p className="text-xs text-gray-400 text-center">※ デモのため実際の撮影はしません</p>
              </div>
            ) : (
              <div>
                <div className="bg-green-50 border border-green-200 rounded-2xl p-4 mb-4 flex items-center gap-3">
                  <span className="text-2xl">✅</span>
                  <div>
                    <div className="font-bold text-green-700 text-sm">スキャン完了！</div>
                    <div className="text-xs text-green-600">4品目を自動認識しました</div>
                  </div>
                </div>
                <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-4">
                  <div className="px-4 py-3 border-b border-gray-50 text-xs font-bold text-gray-500">認識結果</div>
                  {DELIVERY_ITEMS.map((item, i) => (
                    <div key={i} className="flex items-center justify-between px-4 py-3 border-b last:border-0 border-gray-50">
                      <div>
                        <div className="text-sm font-medium text-gray-800">{item.name}</div>
                        <div className={`text-xs mt-0.5 ${item.diff.startsWith('+') ? 'text-red-400' : item.diff === '±0' ? 'text-gray-400' : 'text-green-500'}`}>
                          前回比 {item.diff}円
                        </div>
                      </div>
                      <div className="font-bold text-gray-800">¥{item.amount.toLocaleString()}</div>
                    </div>
                  ))}
                </div>
                <div className="bg-amber-500 rounded-2xl py-3 text-center text-white font-bold text-sm mb-3">
                  原価に反映する
                </div>
                <button onClick={() => setScanned(false)} className="w-full text-center text-xs text-gray-400 hover:text-gray-600 py-2">
                  もう一度スキャン
                </button>
              </div>
            )}
          </div>
        )}

        {/* 登録CTA */}
        <div className="mt-8 bg-amber-50 border border-amber-200 rounded-2xl p-5 text-center">
          <div className="text-lg font-bold text-gray-800 mb-1">このまま使ってみませんか？</div>
          <div className="text-sm text-gray-500 mb-4">登録2分・クレジットカード不要</div>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white font-bold px-6 py-3 rounded-xl text-sm transition-colors"
          >
            <span>🚀</span><span>無料で始める</span>
          </Link>
        </div>

      </div>
    </div>
  );
}
