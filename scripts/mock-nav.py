# -*- coding: utf-8 -*-
"""mock/ の全HTMLのヘッダー/フッターnavを新IAに差し替え、マッキンゼー等を置換する。"""
import re, sys, pathlib
sys.stdout.reconfigure(encoding='utf-8')

ROOT = pathlib.Path(__file__).resolve().parent.parent / 'mock'

def header_nav(P):
    return (
'<ul class="sd appear header-nav">\n'
f'            <li class="sd appear header-nav-item"><a href="https://stellar-careers.com/" class="text link sd appear header-nav-link">About us</a></li>\n'
f'            <li class="sd appear header-nav-item"><a href="{P}industry-knowledge" class="text link sd appear header-nav-link">Industry knowledge</a></li>\n'
f'            <li class="sd appear header-nav-item"><a href="{P}insight-case" class="text link sd appear header-nav-link">Success stories</a></li>\n'
f'            <li class="sd appear header-nav-item header-has-dropdown"><a href="{P}insight-interview" class="text link sd appear header-nav-link">Career tips</a>\n'
'              <ul class="header-dropdown">\n'
f'                <li><a href="{P}insight-interview" class="header-dropdown-link">面接対策</a></li>\n'
f'                <li><a href="{P}insight-work" class="header-dropdown-link">仕事術</a></li>\n'
f'                <li><a href="{P}blog" class="header-dropdown-link">ニュース・告知</a></li>\n'
'              </ul>\n'
'            </li>\n'
f'            <li class="sd appear header-nav-item"><a href="https://stellar-careers.com/stellar-coach/" class="text link sd appear header-nav-link">Stellar Coach</a></li>\n'
f'            <li class="sd appear header-nav-item"><a href="{P}company" class="text link sd appear header-nav-link">Company</a></li>\n'
'          </ul>')

def footer_nav(P):
    return (
'<ul class="sd appear footer-nav-list">\n'
f'              <li class="sd appear footer-nav-item"><a href="https://stellar-careers.com/" class="text link sd appear footer-nav-link">About us</a></li>\n'
f'              <li class="sd appear footer-nav-item"><a href="{P}industry-knowledge" class="text link sd appear footer-nav-link">Industry knowledge</a></li>\n'
f'              <li class="sd appear footer-nav-item"><a href="{P}insight-case" class="text link sd appear footer-nav-link">Success stories</a></li>\n'
f'              <li class="sd appear footer-nav-item"><a href="{P}insight-interview" class="text link sd appear footer-nav-link">Career tips</a></li>\n'
f'              <li class="sd appear footer-nav-item"><a href="https://stellar-careers.com/stellar-coach/" class="text link sd appear footer-nav-link">Stellar Coach</a></li>\n'
f'              <li class="sd appear footer-nav-item"><a href="{P}company" class="text link sd appear footer-nav-link">Company</a></li>\n'
'            </ul>')

HNAV = re.compile(r'<ul[^>]*class="[^"]*\bheader-nav\b[^"]*"[^>]*>.*?</ul>', re.S)
FNAV = re.compile(r'<ul[^>]*class="[^"]*\bfooter-nav-list\b[^"]*"[^>]*>.*?</ul>', re.S)
# insight系カテゴリページのカテゴリ選択タブ(すべて/転職体験記/面接対策/仕事術/各ファーム情報)を除去
CATTABS = re.compile(r'\s*<div class="sd appear insight-cat-tabs">.*?</div>(?=\s*<div class="sd appear insight-cat-articles">)', re.S)
CATTAB_PAGES = {'insight-case', 'insight-interview', 'insight-work', 'insight-firm'}

BRAND_REPL = [
    ('McKinsey and Company', '外資系コンサルファーム'),
    ('McKinsey & Company', '外資系コンサルファーム'),
    ('McKinsey&Company', '外資系コンサルファーム'),
    ('McKinsey', '外資系コンサルファーム'),
    ('マッキンゼー', '外資系コンサルファーム'),
]

stats = {'header':0,'footer':0,'brand':0,'files':0}
for f in ROOT.rglob('*.html'):
    depth = len(f.relative_to(ROOT).parts) - 1
    P = '../' * depth
    html = f.read_text(encoding='utf-8')
    orig = html
    if HNAV.search(html):
        html = HNAV.sub(lambda m: header_nav(P), html, count=1)
        stats['header'] += 1
    if FNAV.search(html):
        html = FNAV.sub(lambda m: footer_nav(P), html, count=1)
        stats['footer'] += 1
    b = 0
    for a, bb in BRAND_REPL:
        c = html.count(a)
        if c:
            html = html.replace(a, bb); b += c
    if b:
        stats['brand'] += b
    # insight系カテゴリページのカテゴリ選択タブを削除
    if f.relative_to(ROOT).parts[0] in CATTAB_PAGES:
        html = CATTABS.sub('', html, count=1)
    # ニュース・告知の遷移先(blogトップ)のヒーロー見出しを Blog -> News に
    if f.relative_to(ROOT) == pathlib.Path('blog/index.html'):
        html = html.replace(
            '<p class="text sd appear blog-list-hero-title r8">Blog</p>',
            '<p class="text sd appear blog-list-hero-title r8">News</p>')
    if html != orig:
        f.write_text(html, encoding='utf-8')
        stats['files'] += 1

print(stats)
