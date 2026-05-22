# 🍽️ 飲食店利益率自動計算システム

飲食店の利益率を自動で計算するスマート食材原価管理システムです。

## 🚀 クイックスタート

### 前提条件
- Node.js 18以上
- Anthropic API キー（[console.anthropic.com](https://console.anthropic.com)で取得）

### インストール & 実行

```bash
# 1. API キーを設定
echo 'ANTHROPIC_API_KEY="your-api-key"' >> .env.local

# 2. 開発サーバー起動
npm run dev

# 3. ブラウザで http://localhost:3000 にアクセス
```

## 📋 使い方

### 1️⃣ 食材を登録
「食材・調味料管理」ページで、使用する食材を登録
- 例：鶏もも肉 (g単位、¥1/g)

### 2️⃣ メニューを登録
「メニュー管理」ページで商品を登録
- 例：鶏ニラ炒め (販売価格 ¥800)

### 3️⃣ レシピを設定
メニューをクリック → レシピに食材を追加
- 例：鶏もも肉150g + ニラ30g...

### 4️⃣ 納品書をスキャン（定期的に）
「📸 納品書をスキャン」で写真をアップロード
- Claude Vision が自動抽出 → 食材原価が自動更新

### 5️⃣ ダッシュボードで確認
すべてのメニューの原価・利益・利益率がリアルタイム表示

## 📊 ダッシュボード機能

| 項目 | 説明 |
|------|------|
| **販売価格** | メニューの売上価格 |
| **原価** | 使用食材の原価合計 |
| **利益** | 販売価格 - 原価 |
| **利益率** | (利益 ÷ 販売価格) × 100% |

## 🏗️ システム構成

```
.
├── src/
│   ├── app/
│   │   ├── page.tsx              # ダッシュボード
│   │   ├── delivery/             # 納品書スキャン
│   │   ├── menu/                 # メニュー管理
│   │   ├── ingredients/          # 食材管理
│   │   ├── delivery-history/     # 納品履歴
│   │   └── api/                  # API エンドポイント
│   │       ├── delivery-slips/ocr/   # Claude Vision OCR
│   │       ├── menu-items/           # メニュー CRUD
│   │       ├── recipes/              # レシピ CRUD
│   │       └── ingredients/          # 食材 CRUD
│   └── lib/
│       ├── prisma.ts             # DB クライアント
│       └── calculations.ts       # 原価計算ロジック
├── prisma/
│   ├── schema.prisma             # DB スキーマ
│   └── migrations/               # マイグレーション
└── dev.db                        # SQLite DB
```

## 📱 API エンドポイント

### デッシュボード
- `GET /api/dashboard/costs` → 全メニュー原価一覧

### メニュー
- `GET /api/menu-items` → メニュー一覧
- `POST /api/menu-items` → メニュー新規登録

### レシピ
- `POST /api/recipes` → レシピに食材追加

### 食材
- `GET /api/ingredients` → 食材一覧
- `POST /api/ingredients` → 食材新規登録

### 納品書 OCR
- `POST /api/delivery-slips/ocr` → 写真→食材データ化
- `GET /api/delivery-slips` → 納品履歴

## 🔑 主な機能

✅ **OCR自動化**: 納品書の写真から食材データを自動抽出
✅ **リアルタイム計算**: 食材原価が変わると自動的に利益率が更新
✅ **マルチ単位対応**: グラム / ミリリットル両対応
✅ **履歴管理**: 過去の納品記録を保存
✅ **シンプルUI**: スマホでも使いやすいインターフェース

## 🛠️ 技術スタック

- **フロントエンド**: React + TypeScript + Tailwind CSS
- **バックエンド**: Next.js 14 (App Router)
- **データベース**: SQLite + Prisma ORM
- **OCR**: Anthropic Claude 3.5 Sonnet Vision
- **デプロイ**: Vercel対応

## 📝 ライセンス

MIT

## 💬 サポート

問題が発生した場合、SETUP.mdを参照してください。
