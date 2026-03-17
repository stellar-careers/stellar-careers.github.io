# Copilot Instructions

Refer to [CLAUDE.md](../CLAUDE.md) for full project conventions (directory structure, URL/path rules, CSS architecture, JS features, etc.).

## Language

- コミットメッセージ、PRタイトル・本文はすべて **日本語** で書く
- コード中のコメントも日本語
- 変数名・クラス名・ファイル名は英語のまま

## Linting

After editing any `.html` file, ALWAYS run `npx htmlhint <file>` and fix all reported errors before considering the task complete.

After editing any `.css` file, ALWAYS run `npx stylelint <file>` and fix all reported errors before considering the task complete.

## Issue-driven article creation

When assigned an Issue, check the Issue template label and follow the corresponding skill:

| Issue label | Skill to follow | What it does |
|-------------|----------------|--------------|
| `転職体験記` | `.claude/skills/add-insight-case/SKILL.md` | Create insight article, update listing pages, update homepage carousel |
| `blog` | `.claude/skills/add-blog/SKILL.md` | Create blog article, update listing page, update homepage Blog section |

Each skill contains step-by-step instructions including page creation, image handling, listing page updates, and homepage auto-update scripts. Follow every step in order.
