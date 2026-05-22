# 飲食店利益率計算システム - セットアップガイド

## システム概要

このシステムは、飲食店の利益率を自動で計算するWebアプリケーションです。

### 主な機能

1. **納品書OCR機能**: スマートフォンで撮影した納品書を自動でデータ化
2. **食材・原価管理**: 食材の単価を一元管理（自動的に最新の原価で上書き）
3. **メニュー・レシピ管理**: メニュー毎のレシピを作成・編集
4. **利益率ダッシュボード**: リアルタイムで全メニューの原価・利益・利益率を表示

---

## 初期セットアップ

### 1. Anthropic API キーの設定

OCR機能を使用するには、Anthropic APIキーが必要です。

1. [Anthropic Console](https://console.anthropic.com) にアクセス
2. API キーを取得
3. `.env`ファイルを編集して以下のように設定:

```env
ANTHROPIC_API_KEY="sk-ant-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
```

### 2. 開発サーバーの起動

```bash
npm run dev
```

ブラウザで `http://localhost:3000` にアクセスしてください。

### 3. 初期データの登録

#### ステップ1: 食材を登録
- "食材・調味料管理" ページで食材を登録
- 単位（g または ml）と単価を設定
- 例：鶏もも肉 1g = ¥1

#### ステップ2: メニューを登録
- "メニュー管理" ページで商品を登録
- 商品名と販売価格を設定
- 例：鶏ニラ炒め ¥800

#### ステップ3: レシピを設定
- メニュー一覧からメニューをクリック
- 食材を追加（グラム数/ミリリットル数を指定）
- 例：鶏もも肉 150g + ニラ 30g + 調味料...

#### ステップ4: 原価を更新（定期的）
- "納品書をスキャン" で納品書写真をアップロード
- Claude Vision が自動的にデータ抽出
- 食材の単価が自動的に更新される

---

## 各ページの説明

### ダッシュボード (`/`)
- すべてのメニューの原価・販売価格・利益・利益率を一覧表示
- 最新データは自動的に計算・反映

### 納品書をスキャン (`/delivery`)
- 納品書の写真をアップロード
- Claude Vision API が食材名・数量・金額を自動抽出
- 食材データベースが自動更新

### メニュー管理 (`/menu`)
- メニュー（商品）を新規登録
- 既存メニューをクリックでレシピ編集ページへ

### メニューレシピ編集 (`/menu/[id]/recipe`)
- 各メニューの食材を追加・管理
- リアルタイムで原価・利益・利益率を表示

### 食材・調味料管理 (`/ingredients`)
- 全食材の一覧を表示
- 新しい食材を手動登録
- 最終更新日を確認

### 納品履歴 (`/delivery-history`)
- 過去にOCR処理した納品書の履歴を表示
- OCR結果を確認可能

---

## データ構造

### Ingredient（食材）
- name: 食材名（例：鶏もも肉）
- unit: 単位（"g" または "ml"）
- costPerUnit: 単価（例：1.0 = 1円/g）
- lastUpdated: 最終更新日時

### MenuItem（メニュー商品）
- name: 商品名
- sellingPrice: 販売価格（円）
- category: カテゴリー（任意）

### RecipeItem（レシピ明細）
- menuItemId: 商品ID
- ingredientId: 食材ID
- quantity: 使用量（g/ml）

### DeliverySlip（納品書）
- createdAt: 作成日時
- processedAt: OCR処理日時
- ocrRawData: Claude OCRの抽出データ（JSON）

### DeliveryItem（納品明細）
- deliverySlipId: 納品書ID
- ingredientId: 食材ID
- quantity: 納品数量
- totalPrice: 合計金額
- unit: 単位

---

## 使用している技術

- **フレームワーク**: Next.js 14 (App Router)
- **データベース**: SQLite + Prisma ORM
- **スタイル**: Tailwind CSS
- **OCR**: Anthropic Claude Vision API
- **言語**: TypeScript

---

## 納品書OCR の使い方

### サポートされる形式
- PNG, JPEG, GIF, WebP

### 抽出される情報
- 食材・調味料の名前
- 数量と単位
- 合計金額

### 注意点
- 鮮明な写真を撮ってください
- 文字が読みやすい角度で撮影
- 照明が適切に当たっていることを確認

---

## トラブルシューティング

### OCR処理に失敗する場合
- API キーが正しく設定されているか確認
- 画像ファイルが有効な形式か確認
- 納品書のテキストが鮮明か確認

### データベースエラーが出る場合
```bash
# データベースをリセット
rm dev.db
npx prisma migrate dev --name init
```

---

## デプロイ

Vercelへのデプロイ：

```bash
npm install -g vercel
vercel
```

環境変数 `ANTHROPIC_API_KEY` をVercelダッシュボードで設定してください。

---

## サポート

問題が発生した場合は、ブラウザの開発者コンソール（F12）でエラーメッセージを確認してください。
