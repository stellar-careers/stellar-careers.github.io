# -*- coding: utf-8 -*-
"""SEO の共通処理（2026-10 SEO施策4。同月に独立レビューの指摘を受けて改訂）。

使い方:
    python scripts/seo.py apply            # 全ページに構造化データとメタ情報の形をそろえて書き込む
    python scripts/seo.py apply --only docs/insight/xxx/index.html ...   # 指定したページだけ
    python scripts/seo.py check            # 検査だけ（書き換えない）。NG があれば終了コード1（CI用）

apply がそろえるもの:
    - canonical / og:url を末尾スラッシュ付きの自分の URL にする
    - og:site_name を「ステラキャリアズ」、og:title を「タイトルから末尾の社名を除いたもの」にする
    - 記事ページ（Insight・ブログ・ファーム記事）の og:type を article にする
    - og:image が小さい版（_small.webp）で、大きい版（_middle.webp）があればそちらにする
    - 組織とサイトの構造化データ（トップと会社情報。id="ld-organization"）
    - ページの構造化データ（id="ld-page"）。どのページにも組織（名前・URL・ロゴ）を入れ、
      記事には Article / BlogPosting、全ページにパンくずを入れる
日付の方針（確かなものだけ入れる）:
    - ブログ … 画面に出ている日付（blog-post-date）を datePublished にする
    - Insight・ファーム記事 … 画面に日付が無く、旧サイトから移した記事は元の公開日も分からないので、
      datePublished / dateModified を入れない（git のコミット日は公開日ではないため使わない）
転送ページ（待ち時間0の meta refresh）は対象外。サイトマップにも載らない（gen-sitemap.py）。

check が見るもの（NG）:
    title・description の欠落と重複、タイトル末尾の社名、og:title と og:site_name、h1 が無い、lang が ja でない、
    canonical が1つだけで自分の URL か、og:url との一致、構造化データが読めない・必須項目が無い・
    パンくずの最後が自分の URL でない・組織の名前がページ内に無い、ブログの日付が画面と違う、
    サイト内リンク切れ・画像の参照切れ（大文字小文字を区別）、想定外の noindex、転送先が無い
（注意）: h1 が2つ以上、alt 属性の無い画像、タイトルが長い、サイト内のどこからもリンクされていないページ
"""
import glob, html as H, io, json, os, re, sys
from html.parser import HTMLParser
from urllib.parse import urljoin, urlparse, unquote

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DOCS = os.path.join(ROOT, "docs")
SITE = "https://stellar-careers.com"
BRAND = "ステラキャリアズ"
LEGAL = "ステラキャリアズ株式会社"
TOP_TITLE = "ステラキャリアズ（Stellar careers）| コンサル特化の転職エージェント"
ORG_ID = SITE + "/#organization"
WEBSITE_ID = SITE + "/#website"
LOGO = SITE + "/assets/images/favicon.png"          # 正方形（1080×1080）
GENERIC_OG = SITE + "/assets/images/og-image.png"     # サイト共通の画像（記事の代表画像としては使わない）

# 検索に出さないページ（noindex を付けてよいページ）。転送ページはこの一覧に入れなくてよい
NOINDEX_OK = {"contact-candidate/thanks"}
# サイト内のどこからもリンクされていなくてよいページ（2026-07 のリニューアルで一覧から外した記事など）
ORPHAN_OK_PREFIX = ("insight/",)
INSIGHT_CATS = [("insight-case", "転職体験記"), ("insight-interview", "面接対策"),
                ("insight-work", "仕事術"), ("insight-firm", "各ファーム情報")]

ORG_MIN = {"@type": "Organization", "@id": ORG_ID, "name": LEGAL, "url": SITE + "/", "logo": LOGO}
ORG = {
    "@context": "https://schema.org",
    "@graph": [
        dict(ORG_MIN, **{
            "alternateName": [BRAND, "Stellar careers", "Stellar Careers"],
            "foundingDate": "2024-08",
            "founder": {"@type": "Person", "name": "村木 勇也"},
            "address": {
                "@type": "PostalAddress", "postalCode": "141-0021", "addressCountry": "JP",
                "addressRegion": "東京都", "addressLocality": "品川区",
                "streetAddress": "上大崎三丁目2番1号 目黒センタービル8階",
            },
            # 国税庁 法人番号公表サイトで確認（2024-08-06 指定）。0188 は法人番号を表す ISO 6523 のコード
            "identifier": {"@type": "PropertyValue", "propertyID": "法人番号", "value": "9010701046365"},
            "iso6523Code": "0188:9010701046365",
            # 公式アカウント。LINE はサイトの申し込みページが案内している公式アカウントのプロフィール
            "sameAs": [
                "https://www.youtube.com/@StellarCareers2024",
                "https://www.instagram.com/stellarcareers_/",
                "https://www.tiktok.com/@stellarcareers",
                "https://page.line.me/071ncncf",
                "https://note.com/stellar_careers",
            ],
        }),
        {"@type": "WebSite", "@id": WEBSITE_ID, "url": SITE + "/", "name": BRAND,
         "alternateName": "Stellar careers", "inLanguage": "ja", "publisher": {"@id": ORG_ID}},
    ],
}


# ---------- 読み取り ----------
class Page(HTMLParser):
    """1ページ分の SEO に関わる要素を集める（属性の順番・大文字小文字に依存しない）"""

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.lang = None; self.title = None; self.metas = []; self.canonicals = []
        self.ld = []; self.links = []; self.imgs = []; self.h1 = 0; self.refresh = None
        self._in = None; self._buf = []; self._ld_id = None; self._cls = []; self.texts = {}

    def handle_starttag(self, tag, attrs):
        a = {k.lower(): (v or "") for k, v in attrs}
        cls = a.get("class", "")
        if tag == "html":
            self.lang = a.get("lang")
        elif tag == "title":
            self._in, self._buf = "title", []
        elif tag == "meta":
            self.metas.append(a)
            if a.get("http-equiv", "").lower() == "refresh":
                m = re.search(r"url\s*=\s*(.+)$", a.get("content", ""), re.I)
                self.refresh = m.group(1).strip() if m else ""
        elif tag == "link" and "canonical" in a.get("rel", "").lower().split():
            self.canonicals.append(a.get("href", ""))
        elif tag == "script" and a.get("type", "").lower() == "application/ld+json":
            self._in, self._buf, self._ld_id = "ld", [], a.get("id")
        elif tag == "a" and "href" in a:
            self.links.append(a["href"])
        elif tag == "img":
            self.imgs.append(a)
        if tag == "h1":
            self.h1 += 1
        for key in ("blog-post-date", "vc-breadcrumb-current"):
            if key in cls.split():
                self._in, self._buf = key, []

    def handle_endtag(self, tag):
        if self._in == "title" and tag == "title":
            self.title = "".join(self._buf).strip(); self._in = None
        elif self._in == "ld" and tag == "script":
            self.ld.append((self._ld_id, "".join(self._buf))); self._in = None
        elif self._in in ("blog-post-date", "vc-breadcrumb-current") and tag in ("p", "span", "div"):
            self.texts[self._in] = re.sub(r"\s+", " ", "".join(self._buf)).strip(); self._in = None

    def handle_data(self, data):
        if self._in:
            self._buf.append(data)

    def meta(self, key):
        """name / property のどちらで書かれていても拾う"""
        for m in self.metas:
            if m.get("name", "").lower() == key or m.get("property", "").lower() == key:
                return m.get("content")
        return None

    def robots(self):
        vals = [m.get("content", "").lower() for m in self.metas if m.get("name", "").lower() in ("robots", "googlebot", "bingbot")]
        return ",".join(vals)


def parse(path):
    p = Page()
    p.feed(io.open(path, encoding="utf-8").read())
    return p


def read(p):
    return io.open(p, encoding="utf-8").read()


def write(p, s):
    io.open(p, "w", encoding="utf-8", newline="").write(s)


def rel_of(path):
    r = os.path.relpath(os.path.dirname(path), DOCS).replace(os.sep, "/")
    return "" if r == "." else r


def url_of(rel):
    return SITE + "/" + (rel + "/" if rel else "")


def all_pages():
    return sorted(p for p in glob.glob(os.path.join(DOCS, "**", "index.html"), recursive=True)
                  if os.sep + "assets" + os.sep not in p)


def is_redirect(pg):
    return pg.refresh is not None


def is_noindex(pg):
    return "noindex" in pg.robots()


def indexable(pg):
    return not is_redirect(pg) and not is_noindex(pg)


def bare_title(t):
    return re.sub(r"\s*\|\s*(%s|Stellar [Cc]areers)$" % re.escape(BRAND), "", t or "").strip()


def short_name(t):
    return re.split(r"\s+-\s+", bare_title(t), maxsplit=1)[0]


def kind(rel):
    parts = rel.split("/") if rel else []
    if len(parts) == 2 and parts[0] in ("insight", "blog", "industry-knowledge"):
        return parts[0]
    return None


# ---------- 書き込み ----------
def set_meta(h, attr, key, val):
    """<meta attr="key" content="..."> の値を置き換える（無ければ og:description の直後に足す）"""
    pat = r'(<meta %s="%s" content=")[^"]*(">)' % (attr, re.escape(key))
    v = H.escape(val, quote=True)
    if re.search(pat, h):
        return re.sub(pat, lambda m: m.group(1) + v + m.group(2), h, count=1)
    tag = '<meta %s="%s" content="%s">' % (attr, key, v)
    return re.sub(r'(\n\s*)(<meta property="og:description"[^>]*>)', lambda m: m.group(1) + m.group(2) + m.group(1) + tag, h, count=1)


def put_ld(h, ld_id, data):
    body = json.dumps(data, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/")
    tag = '<script type="application/ld+json" id="%s">%s</script>' % (ld_id, body)
    pat = r'<script type="application/ld\+json" id="%s">.*?</script>' % re.escape(ld_id)
    if re.search(pat, h, re.S):
        return re.sub(pat, lambda m: tag, h, count=1, flags=re.S)
    return h.replace("</head>", "  " + tag + "\n</head>", 1)


def fix_urls(h, url):
    h = re.sub(r'(<link rel="canonical" href=")[^"]*(")', lambda m: m.group(1) + url + m.group(2), h, count=1)
    return re.sub(r'(<meta property="og:url" content=")[^"]*(")', lambda m: m.group(1) + url + m.group(2), h, count=1)


def bigger_image(img):
    """og:image が _small.webp で、_middle.webp が実在すればそちら"""
    if img and img.endswith("_small.webp"):
        mid = img[:-len("_small.webp")] + "_middle.webp"
        if os.path.isfile(os.path.join(DOCS, mid[len(SITE) + 1:].replace("/", os.sep))):
            return mid
    return img


def insight_category_map():
    m = {}
    for slug, label in INSIGHT_CATS:
        for aid in re.findall(r'<a href="\.\./insight/([^"/]+)', read(os.path.join(DOCS, slug, "index.html"))):
            m.setdefault(aid, (slug, label))
    return m


def crumbs(items):
    return {"@type": "BreadcrumbList", "itemListElement": [
        {"@type": "ListItem", "position": i + 1, "name": n, "item": u} for i, (n, u) in enumerate(items)]}


def blog_date(pg):
    d = pg.texts.get("blog-post-date", "")
    m = re.match(r"(\d{4})/(\d{1,2})/(\d{1,2})$", d)
    return "%s-%02d-%02d" % (m.group(1), int(m.group(2)), int(m.group(3))) if m else None


def page_ld(rel, pg, cats):
    url = url_of(rel)
    name = short_name(pg.title)
    top = ("トップ", SITE + "/")
    k = kind(rel)
    graph = [dict(ORG_MIN)]
    if k == "insight":
        cat = cats.get(rel.split("/")[1])
        trail = [top] + ([(cat[1], url_of(cat[0]))] if cat else []) + [(name, url)]
    elif k == "blog":
        trail = [top, ("News", url_of("blog")), (name, url)]
    elif k == "industry-knowledge":
        trail = [top, ("Industry knowledge", url_of("industry-knowledge")),
                 (pg.texts.get("vc-breadcrumb-current") or name, url)]
    else:
        trail = [top, (name, url)]
    if k:
        a = {"@type": "BlogPosting" if k == "blog" else "Article", "@id": url + "#article",
             "headline": bare_title(pg.title)[:110], "description": pg.meta("description") or "",
             "url": url, "mainEntityOfPage": url, "inLanguage": "ja",
             "author": {"@id": ORG_ID}, "publisher": {"@id": ORG_ID}}
        if k == "blog" and blog_date(pg):
            a["datePublished"] = blog_date(pg)
        img = pg.meta("og:image")
        if img and img != GENERIC_OG:
            a["image"] = img
        graph.append(a)
    if rel:
        graph.append(crumbs(trail))
    return {"@context": "https://schema.org", "@graph": graph}


def apply(paths):
    cats = insight_category_map()
    changed = 0
    for p in paths:
        pg = parse(p)
        if is_redirect(pg):
            continue
        rel = rel_of(p)
        url = url_of(rel)
        h0 = h = read(p)
        h = fix_urls(h, url)
        h = set_meta(h, "property", "og:site_name", BRAND)
        h = set_meta(h, "property", "og:title", TOP_TITLE if not rel else bare_title(pg.title))
        if kind(rel):
            h = set_meta(h, "property", "og:type", "article")
        img = pg.meta("og:image")
        if img and bigger_image(img) != img:
            h = set_meta(h, "property", "og:image", bigger_image(img))
            h = set_meta(h, "property", "twitter:image", bigger_image(img))
        if rel in ("", "company"):
            h = put_ld(h, "ld-organization", ORG)
        if indexable(pg):
            h = put_ld(h, "ld-page", page_ld(rel, parse_str(h), cats))
        if h != h0:
            write(p, h)
            changed += 1
    print("apply: %dページを確認 / %dページを更新" % (len(paths), changed))


def parse_str(h):
    p = Page()
    p.feed(h)
    return p


# ---------- 検査 ----------
def exists_exact(rel_path):
    """docs 内に、大文字小文字まで一致するファイル／ディレクトリ（index.html）があるか（本番の GitHub Pages は区別する）"""
    parts = [x for x in rel_path.split("/") if x]
    cur = DOCS
    for i, part in enumerate(parts):
        try:
            names = os.listdir(cur)
        except OSError:
            return False
        if part not in names:
            return False
        cur = os.path.join(cur, part)
    return os.path.isfile(cur) or os.path.isfile(os.path.join(cur, "index.html"))


def resolve(page_url, href):
    """サイト内リンクの行き先が docs にあるか。対象外（外部・アンカーだけ等）は None"""
    href = H.unescape(href.strip())
    if not href or href.startswith(("#", "mailto:", "tel:", "javascript:", "data:")):
        return None
    u = urlparse(urljoin(page_url, href))
    if u.scheme not in ("http", "https") or u.netloc not in ("stellar-careers.com", "www.stellar-careers.com"):
        return None
    path = unquote(u.path).lstrip("/")
    if path.startswith("homepage-preview"):
        return None
    if ".." in path.split("/"):
        return False
    return exists_exact(path)


def check():
    err, warn = [], []
    titles, descs, linked = {}, {}, set()
    pages = all_pages()
    parsed = {p: parse(p) for p in pages}
    for p, pg in parsed.items():
        rel = rel_of(p)
        where = rel or "(トップ)"
        url = url_of(rel)
        for href in pg.links:
            r = urlparse(urljoin(url, H.unescape(href)))
            if r.netloc == "stellar-careers.com":
                linked.add(unquote(r.path).strip("/"))
        if is_redirect(pg):
            target = urljoin(url, pg.refresh)
            if resolve(url, pg.refresh) is False:
                err.append((where, "転送先が無い: %s" % pg.refresh))
            if pg.canonicals and urljoin(url, pg.canonicals[0]).split("#")[0] != target.split("#")[0]:
                err.append((where, "転送ページの canonical が転送先と違う"))
            continue
        ni = is_noindex(pg)
        if ni and rel not in NOINDEX_OK:
            err.append((where, "想定外の noindex（%s）" % pg.robots()))
        if pg.lang != "ja":
            err.append((where, 'html の lang が "ja" ではない'))
        t = pg.title or ""
        if not t:
            err.append((where, "title が無い"))
        elif rel and not ni and not t.endswith("| " + BRAND):
            err.append((where, "タイトル末尾が「| %s」ではない: …%s" % (BRAND, t[-24:])))
        if ni:
            continue
        if len(bare_title(t)) > 60:
            warn.append((where, "タイトルが長い"))
        d = pg.meta("description")
        if not d:
            err.append((where, "description が無い"))
        else:
            descs.setdefault(d, []).append(where)
        titles.setdefault(t, []).append(where)
        if pg.meta("og:site_name") != BRAND:
            err.append((where, "og:site_name が「%s」ではない" % BRAND))
        want_ogt = TOP_TITLE if not rel else bare_title(t)
        if (pg.meta("og:title") or "") != want_ogt:
            err.append((where, "og:title がタイトルと合っていない: %s" % (pg.meta("og:title") or "（無し）")[:30]))
        if pg.h1 == 0:
            err.append((where, "h1 が無い"))
        elif pg.h1 > 1:
            warn.append((where, "h1 が2つ以上"))
        if len(pg.canonicals) != 1:
            err.append((where, "canonical が %d 個" % len(pg.canonicals)))
        elif pg.canonicals[0] != url:
            err.append((where, "canonical が自分のURLでない: %s" % pg.canonicals[0]))
        if (pg.meta("og:url") or url) != url:
            err.append((where, "og:url が自分のURLでない"))
        ids = [i for i, _ in pg.ld]
        if "ld-page" not in ids and rel:
            err.append((where, "ページの構造化データ（ld-page）が無い。python scripts/seo.py apply を実行する"))
        org_named = False
        for ld_id, body in pg.ld:
            try:
                data = json.loads(body)
            except ValueError as e:
                err.append((where, "構造化データ（id=%s）が読めない: %s" % (ld_id, e))); continue
            for g in data.get("@graph", [data]):
                typ = g.get("@type")
                if typ == "Organization" and g.get("@id") == ORG_ID and g.get("name"):
                    org_named = True
                if typ == "BreadcrumbList":
                    items = g.get("itemListElement") or []
                    if not items or items[-1].get("item") != url:
                        err.append((where, "パンくずの最後が自分のURLでない"))
                if typ in ("Article", "BlogPosting"):
                    miss = [k for k in ("headline", "author", "publisher") if not g.get(k)]
                    if miss:
                        err.append((where, "記事の構造化データに %s が無い" % ", ".join(miss)))
                    if typ == "BlogPosting" and g.get("datePublished") != blog_date(pg):
                        err.append((where, "ブログの datePublished が画面の日付と違う"))
                    if g.get("image") == GENERIC_OG:
                        err.append((where, "記事の代表画像にサイト共通の画像を使っている"))
        if pg.ld and not org_named:
            err.append((where, "組織（@id=%s）の名前がページ内に無い" % ORG_ID))
        for href in pg.links:
            if resolve(url, href) is False:
                err.append((where, "リンク切れ: %s" % href))
        for img in pg.imgs:
            if "alt" not in img:
                warn.append((where, "alt 属性の無い画像"))
            if img.get("src") and resolve(url, img["src"]) is False:
                err.append((where, "画像の参照切れ: %s" % img["src"]))
    for p, pg in parsed.items():
        rel = rel_of(p)
        if rel and indexable(pg) and rel not in linked and not rel.startswith(ORPHAN_OK_PREFIX):
            warn.append((rel, "サイト内のどこからもリンクされていない"))
    for t, ws in titles.items():
        if len(ws) > 1:
            err.append((", ".join(ws[:4]), "タイトルが重複（%d件）" % len(ws)))
    for d, ws in descs.items():
        if len(ws) > 1:
            err.append((", ".join(ws[:4]), "description が重複（%d件）" % len(ws)))
    wsum = {}
    for w, m in warn:
        wsum.setdefault(m, set()).add(w)
    for e in err:
        print("[NG] %s | %s" % e)
    for k, ws in sorted(wsum.items()):
        print("[注意] %s: %dページ（例: %s）" % (k, len(ws), ", ".join(sorted(ws)[:4])))
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
