# -*- coding: utf-8 -*-
"""CEOメッセージ + About usの会社概要 をまとめた Company ページを生成。"""
import re, sys, pathlib
sys.stdout.reconfigure(encoding='utf-8')

BASE = pathlib.Path(__file__).resolve().parent.parent
CEO = BASE / 'mock' / 'ceo-message' / 'index.html'
ABOUT = BASE / 'mock' / 'about-us' / 'index.html'
OUT_DIR = BASE / 'mock' / 'company'
OUT = OUT_DIR / 'index.html'

shell = CEO.read_text(encoding='utf-8')
about = ABOUT.read_text(encoding='utf-8')

# --- about-us から会社概要 <section> を抽出 ---
i = about.find('会社概要')
start = about.rfind('<section', 0, i)
end = about.find('</section>', i) + len('</section>')
overview = about[start:end]
# 重複ID回避 + アンカー付与
overview = overview.replace('<section id="cta-2" class="sd appear about-company">',
                            '<section id="overview" class="sd appear about-company">')

# --- メタ・タイトル ---
title = 'Company - 会社情報 | Stellar Careers'
desc = 'Stellar careers株式会社の会社情報。代表メッセージ（CEO Message）と会社概要をまとめて掲載しています。'
shell = re.sub(r'<title>.*?</title>', f'<title>{title}</title>', shell, flags=re.S)
shell = re.sub(r'(<meta name="description" content=")[^"]*(">)', r'\g<1>'+desc+r'\g<2>', shell)
shell = re.sub(r'(<meta property="og:description" content=")[^"]*(">)', r'\g<1>'+desc+r'\g<2>', shell)
shell = re.sub(r'(<meta property="og:title" content=")[^"]*(">)', r'\g<1>'+title+r'\g<2>', shell)
shell = re.sub(r'(<meta name="apple-mobile-web-app-title" content=")[^"]*(">)', r'\g<1>'+title+r'\g<2>', shell)
shell = shell.replace('https://stellar-careers.com/ceo-message', 'https://stellar-careers.com/company')

# --- ヒーロータイトル: Message from CEO -> Company ---
shell = shell.replace(
    '<p class="text sd ceo-hero-title r8">Message from CEO</p>',
    '<p class="text sd ceo-hero-title r8">Company</p>')

# --- CEOメッセージ本文の上に見出しラベルを挿入 ---
shell = shell.replace(
    '<section id="cta-2" class="sd appear ceo-cta">',
    '<section id="ceo-message" class="sd appear ceo-cta">\n        <p class="company-lead-label">Message from CEO</p>',
    1)

# --- LINE面談予約ブロックを CEOメッセージ内から切り出し、会社概要の下へ移動 ---
m = re.search(r'\s*<div class="sd appear ceo-cta-line-box">.*?</div>\s*</div>', shell, flags=re.S)
line_box = ''
if m:
    line_box = m.group(0).strip()
    shell = shell[:m.start()] + shell[m.end():]
    # 独立セクションとして会社概要の後ろに置く
    line_box = ('\n      <section id="ceo-cta-line" class="sd appear ceo-cta">\n        '
                + line_box + '\n      </section>')

# --- 会社概要セクション + LINEブロック を footer の直前に挿入 ---
shell = shell.replace('<footer', overview + line_box + '\n      <footer', 1)

OUT_DIR.mkdir(parents=True, exist_ok=True)
OUT.write_text(shell, encoding='utf-8')
print('生成:', OUT)
print('会社概要セクション長:', len(overview))
