# 🎉 飲食店利益率自動計算システム - 実装完了

## ✅ 実装内容

### 1️⃣ プロジェクトセットアップ
- Next.js 14 (App Router) + TypeScript
- SQLite データベース + Prisma ORM
- Tailwind CSS スタイリング
- Anthropic Claude Vision API 統合

### 2️⃣ データベーススキーマ
```
Ingredient (食材・調味料)
  ├─ id, name, unit (g/ml)
  ├─ costPerUnit (円/g or 円/ml)
  └─ lastUpdated

MenuItem (メニュー商品)
  ├─ id, name, sellingPrice
  ├─ category (任意)
  └─ recipeItems

RecipeItem (レシピ明細)
  ├─ menuItemId, ingredientId
  └─ quantity (使用量)

DeliverySlip (納品書)
  ├─ id, createdAt, processedAt
  ├─ ocrRawData (JSON)
  └─ deliveryItems

DeliveryItem (納品明細)
  ├─ ingredientId, quantity, unit
  └─ totalPrice
```

### 3️⃣ API エンドポイント実装

#### ダッシュボード
- `GET /api/dashboard/costs` - 全メニューの原価・利益・利益率

#### メニュー管理
- `GET /api/menu-items` - メニュー一覧取得
- `POST /api/menu-items` - メニュー新規登録

#### レシピ管理
- `POST /api/recipes` - レシピに食材追加

#### 食材管理
- `GET /api/ingredients` - 食材一覧取得
- `POST /api/ingredients` - 食材新規登録

#### 納品書 OCR
- `POST /api/delivery-slips/ocr` - 写真をアップロードしてOCR処理
- `GET /api/delivery-slips` - 納品履歴取得

### 4️⃣ ページ実装

| ページ | パス | 機能 |
|--------|------|------|
| ダッシュボード | `/` | 全メニューの原価・利益・利益率を一覧表示 |
| 納品書スキャン | `/delivery` | 写真をアップロード → Claude OCR → 食材原価更新 |
| メニュー管理 | `/menu` | メニュー新規登録・一覧表示 |
| レシピ編集 | `/menu/[id]/recipe` | 各メニューのレシピを管理・原価計算表示 |
| 食材・調味料管理 | `/ingredients` | 食材の一覧・新規登録・単価確認 |
| 納品履歴 | `/delivery-history` | 過去のOCR処理済み納品書を確認 |

### 5️⃣ 主要機能実装

#### ✨ Claude Vision OCR
```typescript
// 納品書の写真 → 食材データを自動抽出
- 商品名（日本語対応）
- 数量と単位（g/ml判定）
- 合計金額 → 単価計算
- 食材DB へ自動登録/更新
```

#### 📊 リアルタイム原価計算
```typescript
// 各メニューごとに自動計算
原価 = Σ(食材単価 × レシピ使用量)
利益 = 販売価格 - 原価
利益率 = (利益 ÷ 販売価格) × 100%
```

#### 🔄 自動更新メカニズム
- 納品書をスキャン → 食材原価更新
- 食材原価変更 → 全メニュー利益率が自動再計算
- ダッシュボードがリアルタイム表示

---

## 🚀 使い始めるには

### ステップ1: API キー設定
```bash
# .env.local ファイルを作成または編集
ANTHROPIC_API_KEY="sk-ant-your-actual-api-key"
```

### ステップ2: 開発サーバー起動
```bash
npm run dev
```

### ステップ3: http://localhost:3000 にアクセス

### ステップ4: データ登録
1. **食材を登録** → 食材・調味料管理ページ
   - 鶏もも肉 (g単位, ¥1/g)
   - ニラ (g単位, ¥0.5/g)
   - 調味料...

2. **メニューを登録** → メニュー管理ページ
   - 鶏ニラ炒め (¥800)
   - 豚肉炒め (¥850)

3. **レシピを設定** → メニューをクリック
   - 鶏ニラ炒め: 鶏もも肉150g + ニラ30g...

4. **納品書をスキャン** → 定期的に実施
   - 新しい納品書を写真 → アップロード
   - 食材単価が自動更新 → 全メニューの利益率が再計算

---

## 📁 ファイル構成

```
cost system/
├── src/
│   ├── app/
│   │   ├── layout.tsx                    # RootLayout
│   │   ├── page.tsx                      # ダッシュボード
│   │   ├── delivery/page.tsx             # 納品書スキャン
│   │   ├── menu/page.tsx                 # メニュー管理
│   │   ├── menu/[id]/recipe/page.tsx     # レシピ編集
│   │   ├── ingredients/page.tsx          # 食材管理
│   │   ├── delivery-history/page.tsx     # 納品履歴
│   │   └── api/
│   │       ├── dashboard/costs/route.ts      # ダッシュボードAPI
│   │       ├── delivery-slips/
│   │       │   ├── route.ts                  # 納品履歴取得
│   │       │   └── ocr/route.ts              # OCR処理 ⭐
│   │       ├── menu-items/route.ts           # メニューCRUD
│   │       ├── ingredients/route.ts          # 食材CRUD
│   │       └── recipes/route.ts              # レシピCRUD
│   └── lib/
│       ├── prisma.ts                    # DBクライアント
│       └── calculations.ts              # 原価計算ロジック
│
├── prisma/
│   ├── schema.prisma                    # DBスキーマ定義
│   └── migrations/                      # DBマイグレーション
│
├── public/                              # 静的ファイル
├── node_modules/                        # 依存パッケージ
├── .env                                 # 環境変数
├── .env.example                         # 環境変数テンプレート
├── SETUP.md                             # セットアップガイド
├── README_ja.md                         # 日本語README
├── IMPLEMENTATION_SUMMARY.md            # このファイル
├── package.json
├── tsconfig.json
├── next.config.ts
├── tailwind.config.ts
└── dev.db                               # SQLiteデータベース

```

---

## 🔧 カスタマイズ方法

### 1. デフォルト利益率の色分けを変更
**ファイル**: `src/app/page.tsx` (line 79)
```typescript
// 現在: 30% 以上は緑色
profitMargin >= 30 ? 'text-green-600' : 'text-orange-600'

// 変更例: 40% 以上を緑色にする
profitMargin >= 40 ? 'text-green-600' : 'text-orange-600'
```

### 2. OCRの食材名正規化ロジックを調整
**ファイル**: `src/app/api/delivery-slips/ocr/route.ts` (line 44-50)
```typescript
// Claude への指示文を変更することで精度向上が可能
text: `...レスポンス形式を調整...`
```

### 3. UIの言語を英語に変更
各 `.tsx` ファイルの日本語テキストを英語に変更

---

## 📊 動作フロー

```
【フロー1】初期セットアップ
food材登録 → メニュー登録 → レシピ設定 → ダッシュボード表示

【フロー2】定期的な原価更新
納品書撮影 → アップロード → Claude OCR → 
食材単価更新 → 全メニュー利益率自動再計算 → ダッシュボード更新

【フロー3】メニュー管理
メニュー追加 → レシピ追加 → 原価自動計算 → 
利益率表示 (リアルタイム)
```

---

## 🔐 セキュリティ考慮事項

- API キーは `.env` に格納（`.gitignore` に含める）
- SQLite は `dev.db` ファイルとして保存
- 本番環境では PostgreSQL への移行を推奨
- Vercel などでのデプロイ時は環境変数を安全に設定

---

## 📈 今後の拡張可能性

- [ ] 複数店舗対応 (店舗ID管理)
- [ ] ユーザー認証 (店長・スタッフ権限分け)
- [ ] 仕入先ごとの原価追跡
- [ ] グラフ化 (利益率トレンド表示)
- [ ] 在庫管理機能
- [ ] モバイルネイティブアプリ化
- [ ] 複数言語対応 (英語など)
- [ ] APIドキュメント (Swagger)

---

## 📞 トラブルシューティング

### Q: OCRが動作しない
**A**: 
1. API キーが正しく設定されているか確認
2. 画像ファイルが有効な形式か確認
3. ブラウザコンソール（F12）でエラーを確認

### Q: データベースエラーが出る
**A**:
```bash
rm dev.db
npx prisma migrate dev --name init
npm run dev
```

### Q: ポート3000が使用中
**A**:
```bash
npm run dev -- -p 3001  # 別のポートで起動
```

---

## 📝 ライセンス

このプロジェクトはMITライセンスの下で公開されています。

---

**🎉 プロジェクト実装完了！さあ使ってみましょう！**
