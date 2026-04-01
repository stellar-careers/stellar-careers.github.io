# add-blog

Blog の新しい記事を追加するスキル。
Issue テンプレート「記事追加：Blog」から起票された Issue を元に作業する。

## 手順

### 1. Issue から情報を取得

Issue のフォームから以下を取得する:

| フィールド | 用途 |
|-----------|------|
| 記事タイトル | `<h2>` 見出し、一覧カードのタイトル、HP カードの `<h3>` |
| 公開日 | 記事の日付表示 (`YYYY/MM/DD`) |
| カバー画像 (1200x675) | 記事ページのカバー画像・一覧ページのカード画像 |
| カード画像 (600x337) | ホームページ Blog セクションのカード画像 |
| 記事本文 (Markdown) | 記事本文（HTML に変換） |
| 抜粋文 | 一覧ページ・HP カードの要約テキスト |
| OGP 説明文 | `<meta>` description（任意、未入力時は抜粋文を流用） |

### 2. 記事ページを作成

1. ランダムな 8 文字の ID を生成（例: `Ab3xYz9K`）
   - 英数字 [A-Za-z0-9] のみ使用
   - 先頭が `_` にならないこと（GitHub Pages の Jekyll 制約）
2. `docs/blog/{id}/index.html` を作成
   - テンプレート: `docs/blog/lHJC6vQA/index.html` を複製して編集
   - depth 2 なので asset パスは `../../assets/`、他ページへのリンクは `../../{page}`
   - `robots: all`（Blog 記事はインデックス可）
3. テンプレートから変更する箇所:
   - `<meta property="og:url">` → `https://stellar-careers.com/blog/{id}`
   - `<link rel="canonical">` → `https://stellar-careers.com/blog/{id}`
   - `<meta property="og:description">` → OGP 説明文（未入力時は抜粋文）
   - `<meta name="description">` → OGP 説明文（未入力時は抜粋文）
   - `<p class="text sd blog-post-date r8">` → 公開日
   - `<h2 class="text sd blog-post-heading r9">` → 記事タイトル
   - `<img class="sd blog-post-featured-img">` の `src` → カバー画像パス
   - `<div class="richText sd blog-post-richtext">` の中身 → 本文 HTML
   - `<a href="../../4"` → `<a href="../../blog"` （戻るリンクを修正）

### 3. 画像を配置

1. Issue に添付された画像を `docs/assets/images/` にダウンロード
   - カバー画像: `blog_{id}_middle.webp` として保存
   - カード画像: `blog_{id}_small.webp` として保存
2. GitHub の添付画像 URL から `curl -L -o` でダウンロード

### 4. 本文の Markdown を HTML に変換

- `##` 見出し → `<h2>...</h2>`
- `###` 見出し → `<h3>...</h3>`
- 段落 → `<p>...</p>`
- 改行 → `<br>`
- `**太字**` → `<strong>...</strong>`
- `[テキスト](URL)` → `<a target="_blank" href="URL">テキスト</a>`
- `- リスト` → `<ul><li><p>...</p></li></ul>`
- `---` → `<hr>`

### 5. 一覧ページにカードを追加

`docs/blog/index.html` の `<div class="sd appear blog-list-grid">` 直後にカードを追加（最新記事は先頭）:

```html
<a href="../blog/{id}" class="link sd appear blog-list-card"><img class="sd blog-list-card-img" alt="" src="../assets/images/blog_{id}_middle.webp">
            <div class="sd appear blog-list-card-body">
              <p class="text sd appear blog-list-card-date r9">{公開日}</p>
              <p class="text sd appear blog-list-card-title r10">{タイトル}</p>
              <p class="text sd appear blog-list-card-excerpt r11">{抜粋文}</p>
            </div>
          </a>
```

注意: `rN` クラスは既存カードと同じ番号を使う（ページ内で共通のスタイル）。

### 6. ホームページの Blog セクションを更新

```bash
bash .claude/skills/update-homepage-blog/scripts/update-blog-cards.sh
```

このスクリプトが `docs/blog/index.html` の先頭 2 件を取得し、`docs/index.html` の Blog セクションを自動再構築する。

### 7. 確認事項

- [ ] `docs/blog/{id}/index.html` が正しく表示される
- [ ] `docs/blog/index.html` のカード一覧に新記事が先頭に追加されている
- [ ] `bash .claude/skills/update-homepage-blog/scripts/update-blog-cards.sh` が正常に完了した
- [ ] `docs/index.html` の Blog セクションが更新されている
- [ ] 画像ファイルが `docs/assets/images/` に存在する

### 8. PR の作成

PR のタイトルと説明を以下の形式で日本語で作成する。

**タイトル:**
```
Blog記事追加：{記事タイトル}
```

**説明:**
```
Closes #{Issue番号}

## 変更内容

Issue #{Issue番号} に基づき、以下のBlog記事を追加しました。

- 記事タイトル: {記事タイトル}
- 公開日: {公開日}
- 記事URL: https://stellar-careers.com/blog/{id}

## 変更ファイル

- `docs/blog/{id}/index.html` — 新規記事ページ
- `docs/blog/index.html` — 記事一覧にカードを追加
- `docs/index.html` — ホームページのBlogセクションを更新
- `docs/assets/images/blog_{id}_middle.webp` — カバー画像
- `docs/assets/images/blog_{id}_small.webp` — カード画像
```
