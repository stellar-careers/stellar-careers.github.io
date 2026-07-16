#!/usr/bin/env bash
# origin/main の docs から修正版確認用モック(mock/)を再構築する。
# 前提: git fetch 済み。既存 mock/ は削除して作り直す。
set -euo pipefail
cd "$(dirname "$0")/.."

echo "==> origin/main の docs を mock/ に展開"
rm -rf mock build-src
mkdir build-src
git archive origin/main docs | tar -x -C build-src
mv build-src/docs mock
rm -rf build-src

echo "==> モック用CSSを追記"
cat scripts/mock-additions.css >> mock/assets/css/style.css

echo "==> ナビ差し替え＋ブランド名置換"
python scripts/mock-nav.py

echo "==> Industry knowledge ページ生成"
python scripts/gen-industry-knowledge.py

echo "==> Company ページ生成"
python scripts/gen-company.py

echo "==> 遷移先の最新化＋不要ページ削除（Our people / Insight一覧）"
python scripts/mock-modernize.py

echo "==> 完了: mock/ を再構築しました"
