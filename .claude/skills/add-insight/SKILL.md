# add-insight

Insight 記事（転職体験記・面接対策・仕事術・各ファーム情報）の新しい記事を追加するスキル。
Issue テンプレート「記事追加：Insight」から起票された Issue を元に作業する。

## 手順

### 1. Issue から情報を取得

Issue のフォームから以下を取得する:

| フィールド | 用途 |
|-----------|------|
| 記事カテゴリ (dropdown) | どのカテゴリページに追加するか決定 |
| 記事タイトル | `<h2>` 見出し、一覧カードの `<h3>` |
| カバー画像 (1200x630) | 記事ページ・一覧カード・ホームカルーセル共通 |
| 記事本文 (Markdown) | 記事本文（HTML に変換） |
| OGP 説明文 | `<meta>` description（任意） |

### 2. カテゴリを判定

ドロップダウンの値から括弧内のスラッグを取得し、以下のマッピングで対象ファイルを決定する:

| ドロップダウン値 | スラッグ | カテゴリページ | 日本語ラベル |
|----------------|---------|--------------|------------|
| `転職体験記（insight-case）` | `insight-case` | `docs/insight-case/index.html` | 転職体験記 |
| `面接対策（insight-interview）` | `insight-interview` | `docs/insight-interview/index.html` | 面接対策 |
| `仕事術（insight-work）` | `insight-work` | `docs/insight-work/index.html` | 仕事術 |
| `各ファーム情報（insight-firm）` | `insight-firm` | `docs/insight-firm/index.html` | 各ファーム情報 |

以降、スラッグを `{slug}`、日本語ラベルを `{label}` として記載する。

### 3. 記事ページを作成

1. ランダムな 8 文字の ID を生成（例: `RzP2RcvL`）
2. `docs/insight/{id}/index.html` を作成
   - 既存記事 `docs/insight/wbcTHhtv/index.html` を複製して `<body>` の構造を流用する
   - depth 2 なので asset パスは `../../assets/` 、他ページへのリンクは `../../{page}`
3. **`<head>` ブロックは `.claude/skills/add-insight/templates/head.html.template` で丸ごと置き換える**（`<!DOCTYPE html>` から `</head>` まで全体）。プレースホルダを以下で置換:
   - `{{TITLE}}` → 記事タイトル（テンプレ側で `| ステラキャリアズ` サフィックスが付く）
   - `{{OG_DESCRIPTION}}` → OGP 説明文（未入力時は本文冒頭から抜粋）
   - `{{COVER_IMAGE_BASENAME}}` → カバー画像のファイル名（例: `insight_bcg_200interviews_middle.webp`）
   - `{{ARTICLE_ID}}` → 生成した記事 ID
4. 画像ファイルを `docs/assets/images/` に配置
   - カバー画像: `*_middle.webp` として保存（記事ページ・一覧カード・カルーセルすべてで共通利用）
   - GitHub 添付画像は JPEG/PNG なので、必ず WebP に変換してから保存する（`cwebp` 等）
5. 本文の Markdown を HTML に変換
   - `###` 見出し → `<h3><strong>...</strong></h3>`
   - 段落 → `<p>...</p>`、改行 → `<br>`
   - 本文に Studio.Design 残骸属性 (`data-uid`, `data-time`, `data-has-link`) があれば全て除去
6. CTA iframe は含めない（Studio.Design の残骸のため不要）

### 4. 一覧ページにカードを追加

`docs/{slug}/index.html`（該当カテゴリページ）の `<ul class="sd appear insight-cat-grid">` 直後にカードを追加する（最新記事は先頭）。

全記事一覧 `docs/insight/index.html` は**手で編集しない**。カテゴリページを更新したあとに次で作り直す
（4つのカテゴリページから集めて、追加日の新しい順に並べる。2026-10 SEO施策2で自動化）:

```bash
python scripts/gen-insight-index.py
```

カード HTML の構造:
```html
<a href="../insight/{id}" class="link sd appear insight-cat-card">
  <div class="sd appear insight-cat-card-body">
    <h3 class="text sd appear insight-cat-card-title">{タイトル}</h3>
  </div><img class="sd insight-cat-card-img" alt="" src="../assets/images/{cover_image_middle.webp}">
</a>
```

### 5. ホームページのカルーセルを更新

```bash
bash .claude/skills/pickup-insight-for-carousel/scripts/update-carousel.sh
```

このスクリプトが `docs/insight/index.html` の先頭 6 記事を取得し、`docs/index.html` のカルーセルを自動再構築する。

### 6. SEO の仕上げ（2026-10 SEO施策4）

構造化データ（記事・パンくず）とサイトマップを入れ、検査を通す。PR では同じ検査が自動で走る（`.github/workflows/seo-check.yml`）。

```bash
python scripts/seo.py apply      # 構造化データ・canonical をそろえる
python scripts/gen-sitemap.py    # サイトマップに新しい記事を載せる
python scripts/seo.py check      # NG 0件になるまで直す
```

- 記事の題名は本文の `<h1 class="text sd appear insight-article-heading ...">` に入れる（カテゴリ名「Insight」は `<p>`）。
  雛形の `docs/insight/wbcTHhtv/index.html` はこの形になっている
- タイトル末尾の社名・表記は CLAUDE.md の「社名・ブランドの表記」に従う

### 7. 確認事項

- [ ] `docs/insight/{id}/index.html` が正しく表示される
- [ ] `docs/{slug}/index.html` のカード一覧に新記事が追加されている
- [ ] `python scripts/gen-insight-index.py` で `docs/insight/index.html` の先頭に新記事が入った
- [ ] `python scripts/seo.py check` が NG 0件
- [ ] `python scripts/gen-sitemap.py --check` で不足・余分が0件
- [ ] `bash .claude/skills/pickup-insight-for-carousel/scripts/update-carousel.sh` が正常に完了した
- [ ] 画像ファイルが `docs/assets/images/` に存在する

### 8. PR の作成

PR のタイトルと説明を以下の形式で日本語で作成する。

**タイトル:**
```
{label}追加：{記事タイトル}
```

例:
- `転職体験記追加：【体験記】コンサルtoコンサル転職：年収150万アップを実現`
- `面接対策追加：【面接対策】ケース面接の基本と対策法`
- `仕事術追加：【仕事術】生産性を上げるタスク管理術`

**説明:**
```
Closes #{Issue番号}

## 変更内容

Issue #{Issue番号} に基づき、以下の{label}記事を追加しました。

- 記事タイトル: {記事タイトル}
- 記事URL: https://stellar-careers.com/insight/{id}

## 変更ファイル

- `docs/insight/{id}/index.html` — 新規記事ページ
- `docs/insight/index.html` — 全記事一覧にカードを追加
- `docs/{slug}/index.html` — {label}カテゴリにカードを追加
- `docs/index.html` — ホームページのカルーセルを更新
- `docs/assets/images/{カバー画像ファイル名}` — カバー画像
```
