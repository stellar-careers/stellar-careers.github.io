# pickup-insight-for-carousel

ホームページの「お役立ち情報」カルーセル（insight carousel）を最新記事で更新するスキル。

## 手順

```bash
bash .claude/skills/pickup-insight-for-carousel/scripts/update-carousel.sh
```

このスクリプトが以下を自動で行う:

1. `docs/insight/index.html` の先頭 6 記事（最新順）を取得
2. 各記事の ID・タイトル・画像パスを抽出
3. カード画像パスを `_small.webp` → `_middle.webp` に変換
4. `docs/index.html` のカルーセル (`<div data-type="carousel" class="sd appear insight-carousel">`) を再構築

## 補足

- カルーセルの JS (`docs/assets/js/main.js`) は任意の数のスライドに対応（scroll-snap + インデックスラップ）
- 旧来の無限スクロール用複製スライドは不要
- `rN` クラス (r80〜r86) は CSS にルールが存在しないため不要（スクリプトは出力しない）
- `__ariaHidden` / `_playing` クラスも JS が動的に管理するため、静的 HTML には不要
