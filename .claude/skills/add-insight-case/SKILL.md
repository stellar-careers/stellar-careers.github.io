# add-insight-case

転職体験記（insight-case）の新しい記事を追加するスキル。
Issue テンプレート「記事追加：転職体験記」から起票された Issue を元に作業する。

## 手順

### 1. Issue から情報を取得

Issue のフォームから以下を取得する:

| フィールド | 用途 |
|-----------|------|
| 記事タイトル | `<h2>` 見出し、一覧カードの `<h3>` |
| カバー画像 (1200x630) | 記事ページ・一覧カード・ホームカルーセル共通 |
| 記事本文 (Markdown) | 記事本文（HTML に変換） |
| OGP 説明文 | `<meta>` description（任意） |

### 2. 記事ページを作成

1. ランダムな 8 文字の ID を生成（例: `RzP2RcvL`）
2. `docs/insight/{id}/index.html` を作成
   - テンプレート: `docs/insight/wbcTHhtv/index.html` を複製して編集
   - depth 2 なので asset パスは `../../assets/` 、他ページへのリンクは `../../{page}`
3. 画像ファイルを `docs/assets/images/` に配置
   - カバー画像: `*_middle.webp` として保存（記事ページ・一覧カード・カルーセルすべてで共通利用）
4. 本文の Markdown を HTML に変換
   - `###` 見出し → `<h3><strong>...</strong></h3>`
   - 段落 → `<p>...</p>`、改行 → `<br>`
5. CTA iframe は含めない（Studio.Design の残骸のため不要）

### 3. 一覧ページにカードを追加

以下の 2 ファイルの `<ul class="sd appear insight-cat-grid">` 直後にカードを追加（最新記事は先頭）:

- `docs/insight/index.html`（全記事一覧）
- `docs/insight-case/index.html`（転職体験記カテゴリ）

カード HTML の構造:
```html
<a href="../insight/{id}" class="link sd appear insight-cat-card">
  <div class="sd appear insight-cat-card-body">
    <h3 class="text sd appear insight-cat-card-title">{タイトル}</h3>
  </div><img class="sd insight-cat-card-img" alt="" src="../assets/images/{cover_image_middle.webp}">
</a>
```

### 4. ホームページのカルーセルを更新

```bash
bash .claude/skills/pickup-insight-for-carousel/scripts/update-carousel.sh
```

このスクリプトが `docs/insight/index.html` の先頭 6 記事を取得し、`docs/index.html` のカルーセルを自動再構築する。

### 5. 確認事項

- [ ] `docs/insight/{id}/index.html` が正しく表示される
- [ ] `docs/insight-case/index.html` のカード一覧に新記事が追加されている
- [ ] `docs/insight/index.html` のカード一覧に新記事が追加されている
- [ ] `bash .claude/skills/pickup-insight-for-carousel/scripts/update-carousel.sh` が正常に完了した
- [ ] 画像ファイルが `docs/assets/images/` に存在する
