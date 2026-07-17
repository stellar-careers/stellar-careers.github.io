# -*- coding: utf-8 -*-
"""Excel の企業リストから Industry knowledge ページ(mock/industry-knowledge/index.html)を生成。"""
import re, sys, pathlib, html as htmlmod
import openpyxl
sys.stdout.reconfigure(encoding='utf-8')

BASE = pathlib.Path(__file__).resolve().parent.parent
XLSX = BASE / '応募企業リスト' / '応募企業リスト_20260420_vF.xlsx'
SHELL = BASE / 'mock' / 'insight-case' / 'index.html'
FIRM = BASE / 'mock' / 'insight-firm' / 'index.html'
OUT_DIR = BASE / 'mock' / 'industry-knowledge'
OUT = OUT_DIR / 'index.html'

# カテゴリ(Excel値の接頭) -> (アンカーID, 表示ラベル)
CATS = [
    ('1. 戦略',            'strategy',   '戦略コンサルファーム'),
    ('2. 総合',            'consulting', '総合/ITコンサルファーム'),
    ('3. 総研',            'research',   '総研'),
    ('4. ブティック',      'boutique',   'ブティックファーム'),
    ('5. AIファーム',      'ai',         'AIファーム'),
    ('6. 事業会社',        'startup',    'スタートアップ'),
]

# --- Excel 読み込み ---
wb = openpyxl.load_workbook(XLSX, data_only=True)
ws = wb.worksheets[0]
groups = {c[0]: [] for c in CATS}
for row in ws.iter_rows(min_row=1, values_only=True):
    vals = ['' if v is None else str(v).strip() for v in row]
    cat = next((v for v in vals if any(v.startswith(c[0]) for c in CATS)), None)
    if not cat:
        continue
    # 企業名は カテゴリ列の次の列
    idx = vals.index(cat)
    name = vals[idx + 1] if idx + 1 < len(vals) else ''
    if not name:
        continue
    key = next(c[0] for c in CATS if cat.startswith(c[0]))
    groups[key].append(name)

# --- カテゴリ手動調整（Excelの分類を上書き） ---
def _move(name, dst_key):
    found = False
    for k in groups:
        if name in groups[k]:
            groups[k].remove(name); found = True
    groups[dst_key].append(name)
    if not found:
        print('  [警告] 移動対象が見つかりません:', name)

# ブティック等 -> 総合/ITコンサル へ（記載順に末尾追加）
for _nm in ['イグニッションポイント', 'イグニッションポイントフォース',
            'ライズ・コンサルティング・グループ', 'ノースサンド', 'Dirbato',
            'リッジラインズ', 'クオンツコンサルティング', 'ビジョン・コンサルティング']:
    _move(_nm, '2. 総合')
# 総合/IT の最後尾に置く（ブティックから移動）
for _nm in ['Stellar Digital Consulting']:
    _move(_nm, '2. 総合')

# 表示名のリネーム（移動後に適用）
RENAME = {
    'イグニッションポイント': 'イグニション・ポイント',
    'イグニッションポイントフォース': 'イグニション・ポイントフォース',
}
for _k in groups:
    groups[_k] = [RENAME.get(_n, _n) for _n in groups[_k]]

# 戦略カテゴリの並び順（外資 -> 内資 -> ステラ）。サブ見出しは付けず順序のみに使用
STRATEGY_SUBGROUPS = [
    ('外資戦略ファーム', ['ボストン・コンサルティング・グループ', 'ベイン・アンド・カンパニー',
                          'A.T.カーニー', 'アーサー・ディ・リトル・ジャパン', 'ローランド・ベルガー', 'Slalom', 'YCP']),
    ('内資戦略ファーム', ['経営共創基盤', 'ドリームインキュベータ―', 'FIELD MANAGEMENT STRATEGY',
                          'P&Eディレクションズ', 'グロービング']),
    ('ステラグループ', None),  # None = Stellar* を自動収集（Excel順）
]

# --- コンテンツ HTML 生成 ---
def esc(s):
    return htmlmod.escape(s, quote=False)

# --- 各ファーム情報(insight-firm)の記事カードを抽出 ---
firm_html = FIRM.read_text(encoding='utf-8')
firm_cards = re.findall(
    r'<a href="(\.\./insight/[^"]+)"[^>]*class="[^"]*insight-cat-card"[^>]*>.*?<h3[^>]*>(.*?)</h3>.*?<img[^>]*src="([^"]+)"',
    firm_html, re.S)

parts = ['<section class="ik-wrap">']
parts.append(
    '  <div class="ik-intro">\n'
    '    <p class="ik-intro-lead">ステラキャリアズがご紹介できるコンサルファーム・企業の一覧です。'
    '6つのカテゴリに分けて掲載しています。各社の詳細情報は順次公開予定です。</p>\n'
    '  </div>')

# 詳細ページを持つ企業（企業名 -> industry-knowledge からの相対URL）
DETAIL_LINKS = {
    'ビジョン・コンサルティング': 'vision-consulting',
}

def render_list(names):
    parts.append('    <ul class="ik-company-list">')
    for name in names:
        url = DETAIL_LINKS.get(name)
        if url:
            parts.append(f'      <li class="ik-company ik-company--link"><a href="{url}">{esc(name)}</a></li>')
        else:
            parts.append(f'      <li class="ik-company">{esc(name)}</li>')
    parts.append('    </ul>')

for key, anchor, label in CATS:
    companies = groups[key]
    parts.append(f'  <section class="ik-cat" id="{anchor}">')
    parts.append('    <div class="ik-cat-head">')
    parts.append(f'      <h2 class="ik-cat-title">{esc(label)}</h2>')
    parts.append(f'      <span class="ik-cat-count">{len(companies)} 社</span>')
    parts.append('    </div>')
    if anchor == 'strategy':
        # 外資 -> 内資 -> ステラグループ の順に並べ替え（サブ見出しなし・単一リスト）
        ordered, remaining = [], list(companies)
        for _sub_label, members in STRATEGY_SUBGROUPS:
            if members is None:
                grp = [c for c in remaining if c.startswith('Stellar')]
            else:
                grp = [c for c in members if c in remaining]
            for c in grp:
                remaining.remove(c)
            ordered.extend(grp)
        if remaining:  # 未分類が残った場合の保険
            print('  [警告] 戦略の未分類企業:', remaining)
            ordered.extend(remaining)
        render_list(ordered)
    else:
        render_list(companies)
    parts.append('  </section>')

# --- ファーム研究記事セクション（企業リストの後） ---
if firm_cards:
    parts.append('  <section class="ik-cat" id="firm-articles">')
    parts.append('    <div class="ik-cat-head">')
    parts.append('      <h2 class="ik-cat-title">ファーム研究記事</h2>')
    parts.append(f'      <span class="ik-cat-count">{len(firm_cards)} 記事</span>')
    parts.append('    </div>')
    parts.append('    <ul class="sd appear insight-cat-grid">')
    for href, title, img in firm_cards:
        title_txt = re.sub(r'<[^>]+>', '', title).strip()
        parts.append(
            f'<a href="{href}" class="link sd appear insight-cat-card">'
            '<div class="sd appear insight-cat-card-body">'
            f'<h3 class="text sd appear insight-cat-card-title">{title_txt}</h3>'
            f'</div><img class="sd insight-cat-card-img" alt="" src="{img}"></a>')
    parts.append('    </ul>')
    parts.append('  </section>')

parts.append('  <p class="ik-note">※ 掲載企業は2026年4月時点の情報です。募集状況は変動する場合があります。</p>')
parts.append('</section>')
content = '\n      '.join(parts)

# --- シェル(insight-case)を流用して差し替え ---
shell = SHELL.read_text(encoding='utf-8')

# メタ・タイトル系
title = 'Industry knowledge - コンサルファーム企業一覧 | Stellar Careers'
desc  = 'ステラキャリアズがご紹介できる戦略・総合/IT・総研・ブティック・AI・スタートアップの各コンサルファーム／企業一覧。'
shell = shell.replace('転職体験記 - コンサル転職の実体験 | Stellar Careers', title)
shell = re.sub(r'(<meta name="description" content=")[^"]*(">)', r'\g<1>'+desc+r'\g<2>', shell)
shell = re.sub(r'(<meta property="og:description" content=")[^"]*(">)', r'\g<1>'+desc+r'\g<2>', shell)
shell = shell.replace('https://stellar-careers.com/insight-case', 'https://stellar-careers.com/industry-knowledge')

# ヒーロータイトル
shell = shell.replace(
    '<p class="text sd appear insight-cat-hero-title r8">転職体験記</p>',
    '<p class="text sd appear insight-cat-hero-title r8">Industry knowledge</p>')

# メインセクション(<section id="feature-1"...>...</section>)を丸ごと置換
shell = re.sub(r'<section id="feature-1".*?</section>', content, shell, count=1, flags=re.S)

OUT_DIR.mkdir(parents=True, exist_ok=True)
OUT.write_text(shell, encoding='utf-8')

total = sum(len(groups[c[0]]) for c in CATS)
print('生成:', OUT)
for c in CATS:
    print(f'  {c[2]}: {len(groups[c[0]])}社')
print('合計:', total, '社')
