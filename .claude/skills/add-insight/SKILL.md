# add-insight

Insight 記事（転職体験記・面接対策・仕事術）の新しい記事を追加するスキル。
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

以降、スラッグを `{slug}`、日本語ラベルを `{label}` として記載する。

### 3. 記事ページを作成

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

### 4. 一覧ページにカードを追加

以下の 2 ファイルの `<ul class="sd appear insight-cat-grid">` 直後にカードを追加（最新記事は先頭）:

- `docs/insight/index.html`（全記事一覧）
- `docs/{slug}/index.html`（該当カテゴリページ）

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

### 6. 確認事項

- [ ] `docs/insight/{id}/index.html` が正しく表示される
- [ ] `docs/{slug}/index.html` のカード一覧に新記事が追加されている
- [ ] `docs/insight/index.html` のカード一覧に新記事が追加されている
- [ ] `bash .claude/skills/pickup-insight-for-carousel/scripts/update-carousel.sh` が正常に完了した
- [ ] 画像ファイルが `docs/assets/images/` に存在する

### 7. PR の作成

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
