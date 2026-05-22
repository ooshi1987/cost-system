#!/bin/bash

# API キーを.env.localから読み込む
API_KEY=$(grep ANTHROPIC_API_KEY .env.local | cut -d'"' -f2)

if [ -z "$API_KEY" ]; then
  echo "❌ エラー: .env.local に ANTHROPIC_API_KEY が見つかりません"
  exit 1
fi

echo "✅ API キーを読み込みました"
echo "🚀 開発サーバーを起動中..."

# 環境変数を指定してサーバーを起動
ANTHROPIC_API_KEY="$API_KEY" npm run dev
