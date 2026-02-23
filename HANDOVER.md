# Handover Notes

## `data-s-{uuid}` 属性のリファクタリング

### 背景

全HTMLファイルに `data-s-{uuid}` という属性が大量に存在する。これは Studio.Design（ノーコードSaaS）がCSSスコーピングのために自動生成したもの。

### 仕組み

```html
<!-- inline <style> 内でセレクタとして使用 -->
<style>
  .sd[data-s-17ef50b8-95d4-4cc4-839f-432dc7a3bca8] {
    background: #333333;
    padding: 15px;
  }
  @media screen and (max-width: 540px) {
    .sd[data-s-17ef50b8-95d4-4cc4-839f-432dc7a3bca8] {
      width: calc(50% - ...);
    }
  }
</style>

<!-- HTML要素のターゲットとして使用 -->
<button data-s-17ef50b8-95d4-4cc4-839f-432dc7a3bca8="" class="button sd appear">
```

- JSからは参照されていない。純粋にCSSセレクタ用途のみ。
- `data-r-{path}_{uuid}` という属性も存在する（レスポンシブ関連と推測）。

### 規模

- **46ファイル、約11,370箇所**に `data-s-{uuid}` が存在
- 各ページにインライン `<style>` ブロックがあり、数百のUUIDベースのCSSルールを含む

### 問題点

- HTML/CSSが膨大に肥大化している
- セレクタの specificity が `.sd[data-s-...]` = (0,2,0) と高く、後からCSSを上書きしにくい（例: insight タブの active スタイルで `!important` が必要だった）
- 人間が読み書きするコードとして可読性が非常に低い

### リファクタリング方針（合意済み）

ハイブリッド方式で、スクリプトによる自動変換を行う：

1. 各ページのインライン `<style>` のルールを抽出
2. メディアクエリを含むルールは `style.css` に移動（クラスベースに変換）
3. メディアクエリなしのルールは要素の `style=""` 属性に変換
4. `data-s-{uuid}` 属性とインライン `<style>` ブロックを削除

### ステータス

**未着手** — 方針合意まで完了、実装はこれから。
