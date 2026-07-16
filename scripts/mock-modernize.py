# -*- coding: utf-8 -*-
"""新IAに合わせて mock/ 内の遷移先(リンク先)を最新化し、不要ページを削除する。
build-mock.sh で mock-nav.py の後に実行する想定。冪等。"""
import re, sys, pathlib, shutil
sys.stdout.reconfigure(encoding='utf-8')

ROOT = pathlib.Path(__file__).resolve().parent.parent / 'mock'

# --- 1. 不要ページの削除 ---
# Our people（新IAに存在せず、被リンクもなし）
op = ROOT / 'our-people'
if op.exists():
    shutil.rmtree(op)
    print('削除:', op)
# Insight 一覧トップ（記事 /insight/{id} は残す）
ins_top = ROOT / 'insight' / 'index.html'
if ins_top.exists():
    ins_top.unlink()
    print('削除:', ins_top)

# insight系カテゴリページのカテゴリ選択タブ除去（mock-nav.py と同一・冪等）
CATTABS = re.compile(r'\s*<div class="sd appear insight-cat-tabs">.*?</div>(?=\s*<div class="sd appear insight-cat-articles">)', re.S)
CATTAB_PAGES = {'insight-case', 'insight-interview', 'insight-work', 'insight-firm'}

# --- 2. リンク先の張り替え（全HTML・階層対応） ---
stats = {'ceo':0, 'more':0, 'back':0, 'tabs':0, 'files':0}
for f in ROOT.rglob('*.html'):
    html = f.read_text(encoding='utf-8')
    orig = html

    # カテゴリ選択タブの削除
    if f.relative_to(ROOT).parts[0] in CATTAB_PAGES:
        html, n = CATTABS.subn('', html)
        stats['tabs'] += n

    # CEO Message ボタン等 -> Company ページ内の CEO セクション（相対 ../ を維持）
    html, n = re.subn(r'href="((?:\.\./)*)ceo-message"', r'href="\1company#ceo-message"', html)
    stats['ceo'] += n

    # トップの「さらにCareer tipsを見る」等: 旧Insight一覧 -> Career tips(面接対策)
    html, n = re.subn(r'href="((?:\.\./)*)insight"(\s+class="insight-grid-more-btn")',
                      r'href="\1insight-interview"\2', html)
    stats['more'] += n

    # 記事の「Go back to Insight」ボタン: 旧Insight一覧 -> トップページ
    # href="../../insight" -> href="../../"（= サイトルートのindex）
    html, n = re.subn(
        r'href="((?:\.\./)*)insight"(\s+class="link sd insight-article-back-btn")',
        lambda m: f'href="{m.group(1) or "."}"{m.group(2)}', html)
    if n:
        stats['back'] += n
        html = html.replace('>Go back to Insight<', '>Back to top<')

    if html != orig:
        f.write_text(html, encoding='utf-8')
        stats['files'] += 1

print(stats)
