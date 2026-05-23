#!/bin/bash

# API キーを.env.localから読み込む
API_KEY=$(grep ANTHROPIC_API_KEY .env.local | cut -d'"' -f2)

if [ -z "$API_KEY" ]; then
  echo "❌ エラー: .env.local に ANTHROPIC_API_KEY が見つかりません"
  exit 1
fi

# 現在のLAN IPを自動取得
LOCAL_IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || echo "不明")

echo "✅ API キーを読み込みました"
echo "🚀 開発サーバーを起動中..."
echo ""
echo "📱 アクセスURL:"
echo "   PC    : http://localhost:3000"
echo "   スマホ : http://${LOCAL_IP}:3000"
echo ""

# 全インターフェースでListenして起動
ANTHROPIC_API_KEY="$API_KEY" npm run dev
