# -*- coding: utf-8 -*-
"""SEO の共通処理（2026-10 SEO施策4）。

使い方:
    python scripts/seo.py apply            # 全ページに構造化データと canonical の形をそろえて書き込む
    python scripts/seo.py apply --only docs/insight/xxx/index.html ...   # 指定したページだけ
    python scripts/seo.py check            # 検査だけ（書き換えない）。エラーがあれば終了コード1（CI用）

apply がページに入れるもの:
    - 組織とサイトの構造化データ（トップと会社情報。id="ld-organization"）
    - ページの構造化データ（id="ld-page"）
        Insight 記事・ブログ記事・ファーム記事 … 記事（Article / BlogPosting）＋パンくず
        そのほかのページ                         … パンくず
      公開日・更新日は git の最初と最後のコミット日。未コミットのページは実行した日
    - canonical / og:url を末尾スラッシュ付きにそろえる

check が見るもの（エラー）:
    title・description の欠落と重複、タイトル末尾の社名、h1 が無い、lang が ja でない、
    canonical が自分の URL（末尾スラッシュ付き）でない、og:url と canonical の食い違い、
    構造化データが読めない・必須項目が無い、サイト内リンク切れ、想定外の noindex
（注意）: h1 が2つ以上、画像の alt 属性が無い、タイトルが長い、画像の参照切れ

経緯: Studio.Design から移したページの <head> が共通のままだった（Insight 39本のタイトルが全部同じ）、
サイトマップを手で更新する手順が無くファーム記事が一度も載らなかった、canonical の雛形が
末尾スラッシュなしだった、など。人が気をつけるだけでは再発するので、作り方と検査に組み込む。
"""
import datetime, glob, html as H, io, json, os, re, subprocess, sys
from urllib.parse import urlparse, unquote

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DOCS = os.path.join(ROOT, "docs")
SITE = "https://stellar-careers.com"
BRAND = "ステラキャリアズ"
ORG_ID = SITE + "/#organization"
WEBSITE_ID = SITE + "/#website"

# 検索に出さないページ（noindex を付けてよいページ）
#   our-people: 旧URL → トップの所属エージェントへ転送 / insight/Hx7mK3pQ: 重複ページ → insight/OWsiXgjE へ転送
NOINDEX_OK = {"contact-candidate/thanks", "our-people", "insight/Hx7mK3pQ"}
# Insight のカテゴリ（パンくずの中間）
INSIGHT_CATS = [("insight-case", "転職体験記"), ("insight-interview", "面接対策"),
                ("insight-work", "仕事術"), ("insight-firm", "各ファーム情報")]

ORG = {
    "@context": "https://schema.org",
    "@graph": [
        {
            "@type": "Organization",
            "@id": ORG_ID,
            "name": "ステラキャリアズ株式会社",
            "alternateName": [BRAND, "Stellar careers", "Stellar Careers"],
            "url": SITE + "/",
            "logo": SITE + "/assets/images/og-image.png",
            "foundingDate": "2024-08",
            "founder": {"@type": "Person", "name": "村木 勇也"},
            "address": {
                "@type": "PostalAddress", "postalCode": "141-0021", "addressCountry": "JP",
                "addressRegion": "東京都", "addressLocality": "品川区",
                "streetAddress": "上大崎三丁目2番1号 目黒センタービル8階",
            },
            # 国税庁 法人番号公表サイトで確認（2024-08-06 指定）
            "identifier": {"@type": "PropertyValue", "propertyID": "法人番号", "value": "9010701046365"},
            "sameAs": [
                "https://www.youtube.com/@StellarCareers2024",
                "https://www.instagram.com/stellarcareers_/",
                "https://www.tiktok.com/@stellarcareers",
                "https://line.me/R/ti/p/%40578jhnfn",
                "https://note.com/stellar_careers",
            ],
        },
        {
            "@type": "WebSite", "@id": WEBSITE_ID, "url": SITE + "/", "name": BRAND,
            "alternateName": "Stellar careers", "inLanguage": "ja", "publisher": {"@id": ORG_ID},
        },
    ],
}


# ---------- 共通 ----------
def read(p):
    return io.open(p, encoding="utf-8").read()


def write(p, s):
    io.open(p, "w", encoding="utf-8", newline="").write(s)


def rel_of(path):
    """docs からの相対ディレクトリ（トップは ""）"""
    r = os.path.relpath(os.path.dirname(path), DOCS).replace(os.sep, "/")
    return "" if r == "." else r


def url_of(rel):
    return SITE + "/" + (rel + "/" if rel else "")


def all_pages():
    out = []
    for p in glob.glob(os.path.join(DOCS, "**", "index.html"), recursive=True):
        if os.sep + "assets" + os.sep in p:
            continue
        out.append(p)
    return sorted(out)


def text(s):
    return re.sub(r"\s+", " ", H.unescape(re.sub(r"<[^>]+>", "", s)).replace("\xa0", " ")).strip()


def meta(h, attr, key):
    m = re.search(r'<meta %s="%s" content="([^"]*)"' % (attr, re.escape(key)), h)
    return H.unescape(m.group(1)) if m else None


def title_of(h):
    m = re.search(r"<title>([^<]*)</title>", h)
    return H.unescape(m.group(1)).strip() if m else None


def bare_title(t):
    """タイトルから末尾の社名を外す"""
    return re.sub(r"\s*\|\s*%s$" % re.escape(BRAND), "", t or "").strip()


def short_name(t):
    """パンくずの名前。「About us - …」のような副題を外す"""
    return re.split(r"\s+-\s+", bare_title(t), maxsplit=1)[0]


def noindex(h):
    return bool(re.search(r'<meta name="robots" content="[^"]*noindex', h))


_git_cache = {}


def git_dates(path):
    """(最初のコミット日, 最後のコミット日)。未コミットの変更があれば最後は今日"""
    if path in _git_cache:
        return _git_cache[path]
    rp = os.path.relpath(path, ROOT).replace(os.sep, "/")
    run = lambda *a: subprocess.run(["git", *a], cwd=ROOT, capture_output=True, text=True, encoding="utf-8").stdout.strip()
    today = datetime.date.today().isoformat()
    first = (run("log", "--diff-filter=A", "--format=%cs", "--", rp).splitlines() or [""])[-1] or today
    dirty = bool(run("status", "--porcelain", "--", rp))
    last = today if dirty else (run("log", "-1", "--format=%cs", "--", rp) or today)
    _git_cache[path] = (first, last)
    return first, last


def slash_urls(h):
    def fix(m):
        u = m.group(2)
        if u.endswith("/") or re.search(r"\.[a-z]{2,4}$", u):
            return m.group(0)
        return m.group(1) + u + "/" + m.group(3)
    h = re.sub(r'(<link rel="canonical" href=")(https://stellar-careers\.com/[^"]*)(")', fix, h)
    return re.sub(r'(<meta property="og:url" content=")(https://stellar-careers\.com/[^"]*)(")', fix, h)


def put_ld(h, ld_id, data):
    tag = '<script type="application/ld+json" id="%s">%s</script>' % (
        ld_id, json.dumps(data, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/"))
    pat = r'<script type="application/ld\+json" id="%s">.*?</script>' % re.escape(ld_id)
    if re.search(pat, h, re.S):
        return re.sub(pat, lambda m: tag, h, count=1, flags=re.S)
    return h.replace("</head>", "  " + tag + "\n</head>", 1)


# ---------- ページの構造化データ ----------
def insight_category_map():
    m = {}
    for slug, label in INSIGHT_CATS:
        h = read(os.path.join(DOCS, slug, "index.html"))
        for aid in re.findall(r'<a href="\.\./insight/([^"/]+)"', h):
            m.setdefault(aid, (slug, label))
    return m


def crumbs(items):
    return {"@type": "BreadcrumbList", "itemListElement": [
        {"@type": "ListItem", "position": i + 1, "name": n, "item": u} for i, (n, u) in enumerate(items)]}


def page_ld(path, h, cats):
    rel = rel_of(path)
    if rel == "" or noindex(h):
        return None
    url = url_of(rel)
    name = short_name(title_of(h))
    top = ("トップ", SITE + "/")
    parts = rel.split("/")
    graph = []
    article = None
    if parts[0] == "insight" and len(parts) == 2:
        cat = cats.get(parts[1])
        trail = [top, ("Insight", url_of("insight"))] + ([(cat[1], url_of(cat[0]))] if cat else []) + [(name, url)]
        article = "Article"
    elif parts[0] == "blog" and len(parts) == 2:
        trail = [top, ("News", url_of("blog")), (name, url)]
        article = "BlogPosting"
    elif parts[0] == "industry-knowledge" and len(parts) == 2:
        trail = [top, ("Industry knowledge", url_of("industry-knowledge")), (name, url)]
        article = "Article"
    elif parts[0] in dict(INSIGHT_CATS) and len(parts) == 1:
        trail = [top, ("Insight", url_of("insight")), (name, url)]
    elif len(parts) == 2:
        trail = [top, (short_name(title_of(read(os.path.join(DOCS, parts[0], "index.html")))), url_of(parts[0])), (name, url)]
    else:
        trail = [top, (name, url)]
    if article:
        first, last = git_dates(path)
        a = {"@type": article, "@id": url + "#article", "headline": bare_title(title_of(h))[:110],
             "description": meta(h, "name", "description") or "", "url": url,
             "mainEntityOfPage": url, "inLanguage": "ja",
             "datePublished": first, "dateModified": last,
             "author": {"@id": ORG_ID}, "publisher": {"@id": ORG_ID}}
        img = meta(h, "property", "og:image")
        if img:
            a["image"] = img
        graph.append(a)
    graph.append(crumbs(trail))
    return {"@context": "https://schema.org", "@graph": graph}


def apply(paths):
    cats = insight_category_map()
    changed = 0
    for p in paths:
        h0 = h = read(p)
        h = slash_urls(h)
        rel = rel_of(p)
        if rel in ("", "company"):
            h = put_ld(h, "ld-organization", ORG)
        ld = page_ld(p, h, cats)
        if ld:
            h = put_ld(h, "ld-page", ld)
        if h != h0:
            write(p, h)
            changed += 1
    print("apply: %dページを確認 / %dページを更新" % (len(paths), changed))


# ---------- 検査 ----------
def resolve(rel_dir, href):
    """サイト内リンクの行き先が docs にあるか。対象外なら None"""
    href = href.strip()
    if not href or href.startswith(("#", "mailto:", "tel:", "javascript:", "data:")):
        return None
    u = urlparse(href)
    if u.scheme in ("http", "https"):
        if u.netloc not in ("stellar-careers.com", "www.stellar-careers.com"):
            return None
        path = unquote(u.path).lstrip("/")
    elif u.scheme:
        return None
    else:
        path = os.path.normpath(os.path.join(rel_dir, unquote(u.path))).replace(os.sep, "/")
        if path == ".":
            path = ""
    if path.startswith("homepage-preview"):
        return None
    full = os.path.join(DOCS, path)
    return os.path.isfile(full) or os.path.isfile(os.path.join(full, "index.html"))


def check():
    err, warn = [], []
    titles, descs = {}, {}
    for p in all_pages():
        h = read(p)
        rel = rel_of(p)
        where = rel or "(トップ)"
        url = url_of(rel)
        ni = noindex(h)
        if ni and rel not in NOINDEX_OK:
            err.append((where, "想定外の noindex"))
        if not re.search(r'<html lang="ja"', h):
            err.append((where, 'html の lang が "ja" ではない'))
        t = title_of(h)
        if not t:
            err.append((where, "title が無い")); t = ""
        elif rel and not ni and not t.endswith("| " + BRAND):
            err.append((where, "タイトル末尾が「| %s」ではない: %s" % (BRAND, t[-30:])))
        if len(bare_title(t)) > 60:
            warn.append((where, "タイトルが長い（%d字）" % len(bare_title(t))))
        d = meta(h, "name", "description")
        if not ni:
            if not d:
                err.append((where, "description が無い"))
            titles.setdefault(t, []).append(where)
            if d:
                descs.setdefault(d, []).append(where)
        n1 = len(re.findall(r"<h1[\s>]", h))
        if n1 == 0 and not ni:
            err.append((where, "h1 が無い"))
        elif n1 > 1:
            warn.append((where, "h1 が %d 個" % n1))
        canon = re.search(r'<link rel="canonical" href="([^"]+)"', h)
        ogu = meta(h, "property", "og:url")
        if not ni:
            if not canon:
                err.append((where, "canonical が無い"))
            elif canon.group(1) != url:
                err.append((where, "canonical が自分のURLでない: %s（正: %s）" % (canon.group(1), url)))
            if ogu and canon and ogu != canon.group(1):
                err.append((where, "og:url と canonical が違う"))
        for ld_id, body in re.findall(r'<script type="application/ld\+json" id="([^"]+)">(.*?)</script>', h, re.S):
            try:
                data = json.loads(body)
            except ValueError as e:
                err.append((where, "構造化データ %s が読めない: %s" % (ld_id, e))); continue
            for g in data.get("@graph", [data]):
                if g.get("@type") == "BreadcrumbList":
                    items = g.get("itemListElement") or []
                    if not items or items[-1].get("item") != url:
                        err.append((where, "パンくずの最後が自分のURLでない（雛形から写した構造化データが残っている）"))
                if g.get("@type") in ("Article", "BlogPosting"):
                    miss = [k for k in ("headline", "datePublished", "dateModified", "author", "publisher") if not g.get(k)]
                    if miss:
                        err.append((where, "記事の構造化データに %s が無い" % ", ".join(miss)))
        if not ni and rel and 'id="ld-page"' not in h:
            err.append((where, "ページの構造化データ（ld-page）が無い。python scripts/seo.py apply を実行する"))
        for href in re.findall(r'<a [^>]*href="([^"]+)"', h):
            ok = resolve(rel, H.unescape(href))
            if ok is False:
                err.append((where, "リンク切れ: %s" % href))
        for img in re.findall(r"<img\b[^>]*>", h):
            if " alt=" not in img:
                warn.append((where, "alt 属性の無い画像"))
            src = re.search(r'src="([^"]+)"', img)
            if src and resolve(rel, src.group(1)) is False:
                warn.append((where, "画像の参照切れ: %s" % src.group(1)))
    for t, ws in titles.items():
        if len(ws) > 1:
            err.append((", ".join(ws[:4]) + (" ほか" if len(ws) > 4 else ""), "タイトルが重複（%d件）: %s" % (len(ws), t[:40])))
    for d, ws in descs.items():
        if len(ws) > 1:
            err.append((", ".join(ws[:4]) + (" ほか" if len(ws) > 4 else ""), "description が重複（%d件）" % len(ws)))
    # 注意は種類ごとにまとめて出す
    wsum = {}
    for w, m in warn:
        key = re.sub(r"[:（].*$", "", m)
        wsum.setdefault(key, set()).add(w)
    for e in err:
        print("[NG] %s | %s" % e)
    for k, ws in sorted(wsum.items()):
        print("[注意] %s: %dページ（例: %s）" % (k, len(ws), ", ".join(sorted(ws)[:3])))
    print("SEO検査: NG %d件 / 注意 %d種類" % (len(err), len(wsum)))
    return 1 if err else 0


if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else "check"
    if cmd == "apply":
        only = sys.argv[sys.argv.index("--only") + 1:] if "--only" in sys.argv else None
        apply([os.path.abspath(p) for p in only] if only else all_pages())
    elif cmd == "check":
        sys.exit(check())
    else:
        sys.exit("使い方: python scripts/seo.py apply | check")
