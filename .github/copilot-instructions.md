# Copilot Instructions

Refer to [CLAUDE.md](../CLAUDE.md) for full project conventions (directory structure, URL/path rules, CSS architecture, JS features, etc.).

## Language

- コミットメッセージ、PRタイトル・本文はすべて **日本語** で書く
- コード中のコメントも日本語
- 変数名・クラス名・ファイル名は英語のまま

## Linting

After editing any `.html` file, ALWAYS run `npx htmlhint <file>` and fix all reported errors before considering the task complete.

After editing any `.css` file, ALWAYS run `npx stylelint <file>` and fix all reported errors before considering the task complete.

## PR の作成ルール

Issue を元に作業した場合、PR のタイトルと説明は以下のルールに従う。

### 最重要: PR 本文の1行目は必ず `Closes #Issue番号`

PR 本文の **1行目** に、対象 Issue を閉じるクロージングキーワードを **必ず** 書く。
これを書かないと PR をマージしても Issue が自動クローズされず、対応済みなのに OPEN
のまま取り残される（実例: PR #68 が `Closes #67` を書き漏らし、#67 が取り残された）。

- 1行目は厳密に `Closes #<番号>` の形式（例: `Closes #67`）
- 本文の途中や末尾ではなく、必ず **冒頭1行目**
- 説明文を書く場合は、この1行の後に空行を挟んでから続ける

正しい例:
```
Closes #67

## 変更内容
...
```

### タイトル

日本語で記述し、Issue 固有の情報（記事タイトルなど）を含める。

- 例: `転職体験記追加：【体験記】コンサルtoコンサル転職：年収150万アップを実現`
- 例: `面接対策追加：【面接対策】ケース面接の基本と対策法`
- 例: `仕事術追加：【仕事術】生産性を上げるタスク管理術`
- 例: `Blog記事追加：ケース面接対策セミナーを開催します`

### 説明

日本語で記述し、上記の `Closes #Issue番号` に続けて、追加した記事タイトル・記事URL・
変更ファイルの一覧を記載する。

### PR 作成前の最終チェック

- [ ] PR 本文の1行目が `Closes #<対象Issue番号>` になっているか

## Issue-driven article creation

When assigned an Issue, check the Issue template label and follow the corresponding skill:

| Issue label | Skill to follow | What it does |
|-------------|----------------|--------------|
| `insight記事` | `.claude/skills/add-insight/SKILL.md` | Create insight article (any category), update listing pages, update homepage carousel |
| `blog` | `.claude/skills/add-blog/SKILL.md` | Create blog article, update listing page, update homepage Blog section |

Each skill contains step-by-step instructions including page creation, image handling, listing page updates, and homepage auto-update scripts. Follow every step in order.
