# -*- coding: utf-8 -*-
"""docs/insight/index.html（Insight 記事の一覧）を作る。

使い方:
    python scripts/gen-insight-index.py

- 雛形は docs/insight-case/index.html（同じ深さ・同じカード構造）
- カードは4つのカテゴリページ（転職体験記・面接対策・仕事術・各ファーム情報）から集め、
  カテゴリの順に並べる。カテゴリページに載っていない記事は EXTRA の順で末尾に足す
- 記事を追加したら、カテゴリページを更新したあとにこのスクリプトを実行する

経緯: /insight/ が404のまま検索結果に残っていた。あわせて、旧サイトから移した記事の
うち10本がどのカテゴリページにも載っておらず、サイト内からたどれなかった
（2026-10 SEO施策2で新設）。
"""
import glob, html as H, io, os, re, sys

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DOCS = os.path.join(ROOT, "docs")
SHELL = os.path.join(DOCS, "insight-case", "index.html")
OUT = os.path.join(DOCS, "insight", "index.html")
CATS = ["insight-case", "insight-interview", "insight-work", "insight-firm"]

# カテゴリページに載っていないが、公開している記事（旧サイトのサイトマップに載っていたもの）
EXTRA = ["-ilnF14x", "8SEZNhnw", "8VZi0K92", "I0IvMIFT", "KNPdyxKl",
         "WllaCZ-7", "j3o4DTia", "pvdzfOHV", "tmE-tX2M", "vePk267w"]
# 掲載を確認できていない記事（一覧にもサイトマップにも出さない）
EXCLUDE = {"Hx7mK3pQ"}

TITLE = "Insight - コンサル転職の体験記・面接対策・仕事術の記事一覧"
DESC = ("コンサル転職の体験記、ケース面接などの面接対策、コンサルタントの仕事術、各ファームの情報など、"
        "ステラキャリアズのInsight記事の一覧です。")
CARD = ('<a href="../insight/{id}" class="link sd appear insight-cat-card">\n'
        '              <div class="sd appear insight-cat-card-body">\n'
        '                <h3 class="text sd appear insight-cat-card-title">{title}</h3>\n'
        '              </div><img class="sd insight-cat-card-img" alt="" src="{img}">\n'
        '            </a>')


def clean(s):
    return re.sub(r"\s+", " ", H.unescape(re.sub(r"<[^>]+>", "", s)).replace("\xa0", " ")).strip()


def collect():
    seen, cards = set(), []
    for cat in CATS:
        h = io.open(os.path.join(DOCS, cat, "index.html"), encoding="utf-8").read()
        for m in re.finditer(r'<a href="\.\./insight/([^"/]+)"[^>]*>(.*?)</a>', h, re.S):
            aid = m.group(1)
            if aid in seen or aid in EXCLUDE:
                continue
            t = re.search(r"<h3[^>]*>(.*?)</h3>", m.group(2), re.S)
            img = re.search(r'<img[^>]*src="([^"]+)"', m.group(2))
            cards.append((aid, clean(t.group(1)), img.group(1) if img else "../assets/images/og-image.png"))
            seen.add(aid)
    for aid in EXTRA:
        if aid in seen or aid in EXCLUDE:
            continue
        h = io.open(os.path.join(DOCS, "insight", aid, "index.html"), encoding="utf-8").read()
        t = re.search(r'<h[12] class="text sd appear insight-article-heading[^"]*">(.*?)</h[12]>', h, re.S)
        og = re.search(r'<meta property="og:image" content="https://stellar-careers\.com/assets/images/([^"]+)"', h)
        cards.append((aid, clean(t.group(1)), "../assets/images/" + (og.group(1) if og else "og-image.png")))
        seen.add(aid)
    # 実在しない記事を指していないか
    exist = {os.path.basename(os.path.dirname(p)) for p in glob.glob(os.path.join(DOCS, "insight", "*", "index.html"))}
    missing = [c[0] for c in cards if c[0] not in exist]
    if missing:
        raise SystemExit("記事ページが無い: %s" % ", ".join(missing))
    return cards


def build(cards):
    h = io.open(SHELL, encoding="utf-8").read()
    n = {}

    def sub(pat, rep, key, flags=0):
        nonlocal h
        h, c = re.subn(pat, rep, h, count=1, flags=flags)
        n[key] = c

    e = lambda s: H.escape(s, quote=True)
    sub(r"<title>[^<]*</title>", lambda m: "<title>%s | Stellar Careers</title>" % e(TITLE), "title")
    sub(r'(<meta property="og:title" content=")[^"]*(")', lambda m: m.group(1) + e(TITLE) + m.group(2), "og:title")
    sub(r'(<meta property="og:description" content=")[^"]*(")', lambda m: m.group(1) + e(DESC) + m.group(2), "og:desc")
    sub(r'(<meta name="description" content=")[^"]*(")', lambda m: m.group(1) + e(DESC) + m.group(2), "desc")
    sub(r'(<meta property="og:url" content=")[^"]*(")', r"\g<1>https://stellar-careers.com/insight/\g<2>", "og:url")
    sub(r'(<link rel="canonical" href=")[^"]*(")', r"\g<1>https://stellar-careers.com/insight/\g<2>", "canonical")
    sub(r'(<h1 class="text sd appear insight-cat-hero-title[^"]*">)[^<]*(</h1>)', r"\g<1>Insight\g<2>", "h1")
    grid = "".join(CARD.format(id=e(a), title=e(t), img=e(i)) for a, t, i in cards)
    sub(r'(<ul class="sd appear insight-cat-grid">).*?(</ul>)', lambda m: m.group(1) + grid + m.group(2), "grid", re.S)
    zero = [k for k, v in n.items() if v == 0]
    if zero:
        raise SystemExit("置換0件: %s（雛形の構造が変わっていないか確認）" % ", ".join(zero))
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    io.open(OUT, "w", encoding="utf-8", newline="\n").write(h)


if __name__ == "__main__":
    cards = collect()
    build(cards)
    print("書き出し: %s（記事 %d本。うちカテゴリ外 %d本）" % (OUT, len(cards), sum(1 for c in cards if c[0] in EXTRA)))
