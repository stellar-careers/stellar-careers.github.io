# update-homepage-blog

ホームページの Blog セクションを最新記事で更新するスキル。

## 手順

```bash
bash .claude/skills/update-homepage-blog/scripts/update-blog-cards.sh
```

このスクリプトが以下を自動で行う:

1. `docs/blog/index.html` の先頭 2 件の記事（最新順）を取得
2. 各記事のリンク・タイトル・抜粋文・画像パスを抽出
3. 画像パスを `_middle.webp` → `_small.webp` に変換（HP はカード画像を使用）
4. `docs/index.html` の `<ul class="sd appear blog-list">...</ul>` を再構築

## 補足

- HP の Blog セクションは現状 2 件表示（スクリプトもそれに合わせている）
- HP のカード画像は `_small.webp`、一覧ページのカード画像は `_middle.webp` を使用
- `rN` クラス（r115〜r119）は HP ローカルのスタイルなので、スクリプトが適切に付与する
