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
    - サイト内リンク（<a href>）のうち、ページのディレクトリを指すものに末尾スラッシュを付ける。
      GitHub Pages は /about-us を /about-us/ へ301で転送するので、スラッシュが無いとクリックのたびに転送を挟む。
      404.html はどの階層の URL でも配信されるので、相対パスを / 始まりにする（2026-10。PR #116 の続き）
    - サイト内リンク（<a href>）の自社の絶対URL（https://stellar-careers.com/…）を相対パスにする。
      絶対URLのままだとプレビューで本番に飛ぶ（2026-10。O-01）。canonical・og:*・構造化データ・フォームの値は絶対URLのまま
    - Insight 記事の末尾に、無料相談ボタンと同じカテゴリのほかの記事（最大3本）を入れ、戻るボタンをカテゴリ一覧へ向ける。
      カテゴリはカテゴリ一覧ページ（insight-case など）のカードから決める。どのカテゴリにも無い記事は相談ボタンだけで、
      戻り先は Career tips。旧サイト（Studio）の空の埋め込みは消す（2026-10。C-03・C-04）
    - 画像に遅延読み込み（loading="lazy" decoding="async"）を付ける。ロゴ・記事の表紙・ブログの表紙は
      開いてすぐ見えるので付けない（EAGER_IMG）（2026-10。P-03）
    - 画像に元の寸法（width / height）を付け、読み込み中に表示がずれないようにする。見た目の大きさは CSS のまま（2026-10。P-05）
    - 記事・ブログの表紙画像に fetchpriority="high" を付け、fonts.googleapis.com へ preconnect する（2026-10。LCP）
    - 企業記事に「この会社が出てくる記事」（Insight 記事の社名リンクの逆向き。最大5本）を入れる（2026-10）
    - 企業一覧と Insight のカテゴリ一覧に、並んでいる記事の構造化データ（CollectionPage・ItemList）を入れる（2026-10）
    - アクセシビリティ: ロゴの代替テキストを「ステラキャリアズ」にし、別タブで開くリンクに rel="noopener" を付け、
      Insight 記事の本文の h1 を h2（class="rt-h1"。見た目は h1 と同じ）にする（2026-10。A-02・A-06・S-04）。
      <main> は apply では入れない（ページの骨組みごとに入れる位置が違うため）。check で無いページをNGにする
    - Google Fonts の <link> を1本にまとめる（書体・太さはそのまま）（2026-10。P-06）
    - ファーム記事に「よくある質問」があれば、構造化データ（FAQPage）を入れる（2026-10。SEO施策5）
    - Insight 記事の本文に企業記事のある社名が出てきたら、記事ごとに最初の1か所を企業記事へリンクする
      （class="ia-firm-link"。呼び方の一覧は FIRM_ALIASES）（2026-10）
日付の方針（確かなものだけ入れる）:
    - ブログ … 画面に出ている日付（blog-post-date）を datePublished にする
    - Insight・ファーム記事 … 画面に日付が無く、旧サイトから移した記事は元の公開日も分からないので、
      datePublished / dateModified を入れない（git のコミット日は公開日ではないため使わない）
転送ページ（待ち時間0の meta refresh）は対象外。サイトマップにも載らない（gen-sitemap.py）。

check が見るもの（NG）:
    title・description の欠落と重複、タイトル末尾の社名、og:title と og:site_name、h1 が無い、lang が ja でない、
    canonical が1つだけで自分の URL か、og:url との一致、構造化データが読めない・必須項目が無い・
    パンくずの最後が自分の URL でない・組織の名前がページ内に無い、ブログの日付が画面と違う、
    サイト内リンク切れ・画像の参照切れ（大文字小文字を区別）、想定外の noindex、転送先が無い、
    サイト内リンクの末尾スラッシュと絶対URL（404.html は / 始まりか）
（注意）: h1 が2つ以上、alt 属性の無い画像、タイトルが長い、サイト内のどこからもリンクされていないページ
"""
import glob, html as H, io, json, os, posixpath, re, sys
from html.parser import HTMLParser
from urllib.parse import urljoin, urlparse, unquote

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DOCS = os.path.join(ROOT, "docs")
SITE = "https://stellar-careers.com"
BRAND = "ステラキャリアズ"
LEGAL = "ステラキャリアズ株式会社"
TOP_TITLE = "ステラキャリアズ（Stellar careers）| コンサル特化の転職エージェント"
PAGE_404 = os.path.join(DOCS, "404.html")
ORG_ID = SITE + "/#organization"
WEBSITE_ID = SITE + "/#website"
LOGO = SITE + "/assets/images/favicon.png"          # 正方形（1080×1080）
GENERIC_OG = SITE + "/assets/images/og-image.png"     # サイト共通の画像（記事の代表画像としては使わない）

# 検索に出さないページ（noindex を付けてよいページ）。転送ページはこの一覧に入れなくてよい
NOINDEX_OK = {"contact-candidate/thanks", "contact-others/thanks"}
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


def slash_fix(href, page_url, root_abs=False):
    """サイト内のページ（ディレクトリ）を指すのに末尾スラッシュが無いリンクを、直した値にして返す。
    直す必要が無ければ None。?query と #fragment は残す。
    root_abs=True（404.html 用）のときは、相対パスを / 始まりにする"""
    raw = href.strip()
    if not raw or raw.startswith(("#", "mailto:", "tel:", "javascript:", "data:")):
        return None
    path, suffix = re.match(r"([^?#]*)(.*)$", raw, re.S).groups()
    u = urlparse(urljoin(page_url, H.unescape(path)))
    if u.scheme not in ("http", "https") or u.netloc not in ("stellar-careers.com", "www.stellar-careers.com"):
        return None
    target = unquote(u.path).strip("/")
    if target.startswith("homepage-preview"):
        return None
    if root_abs and not re.match(r"[a-z][a-z0-9+.-]*:|/", path, re.I):
        new = "/" + target + ("/" if not target or is_dir_page(target) else "")
        return None if new + suffix == raw else new + suffix
    # 「.」「..」「../..」はブラウザがスラッシュ付きのディレクトリとして解決するので触らない
    if path.endswith("/") or re.search(r"(^|/)\.\.?$", path) or not is_dir_page(target):
        return None
    return path + "/" + suffix


SELF_ABS = re.compile(r"https?://(?:www\.)?stellar-careers\.com(?=[/?#]|$)", re.I)


def abs_to_rel(href, page_url, root_abs=False):
    """自社の絶対URL（https://stellar-careers.com/…）のリンクを、相対パスにして返す。対象外なら None。
    絶対URLのままだと、プレビュー（/homepage-preview/）で押したときに本番へ飛んでしまう（2026-10。O-01）。
    root_abs=True（404.html 用）のときは / 始まりにする。トップへのリンクは CLAUDE.md の決まりどおり「.」「..」「../..」"""
    raw = href.strip()
    m = SELF_ABS.match(raw)
    if not m:
        return None
    path, suffix = re.match(r"([^?#]*)(.*)$", raw[m.end():], re.S).groups()
    target = unquote(path).strip("/")
    if target.startswith("homepage-preview"):
        return None
    tail = "/" if target and is_dir_page(target) else ""
    if root_abs:
        return "/" + target + tail + suffix
    base = urlparse(page_url).path            # 例: /insight/abc/
    rel = posixpath.relpath("/" + target, base.rstrip("/") or "/")
    if rel != "." and not rel.endswith(".."):
        rel += tail
    return rel + suffix


def fix_href(href, page_url, root_abs=False):
    """サイト内リンクを決まりの形（相対パス・ページは末尾スラッシュ付き）にした値。直す必要が無ければ None"""
    v = abs_to_rel(href, page_url, root_abs) or href
    v = slash_fix(v, page_url, root_abs) or v
    return None if v == href else v


A_TAG = re.compile(r"<a\b[^>]*>", re.I)
A_HREF = re.compile(r'(\bhref=")([^"]*)(")')


def fix_links(h, page_url, root_abs=False):
    def tag(m):
        return A_HREF.sub(lambda a: a.group(1) + (fix_href(a.group(2), page_url, root_abs) or a.group(2)) + a.group(3), m.group(0))
    return A_TAG.sub(tag, h)


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


def insight_cards():
    """カテゴリ一覧ページのカード（掲載順）。{カテゴリのslug: [(記事ID, 題名), ...]}"""
    out = {}
    for slug, _ in INSIGHT_CATS:
        h = read(os.path.join(DOCS, slug, "index.html"))
        out[slug] = [(aid, H.unescape(re.sub(r"<[^>]+>", "", t)).strip()) for aid, t in re.findall(
            r'<a href="\.\./insight/([^"/]+)/?"[^>]*class="[^"]*insight-cat-card"[^>]*>.*?<h3[^>]*>(.*?)</h3>', h, re.S)]
    return out


# ---------- Insight 記事の末尾（2026-10。診断 C-03・C-04） ----------
# 記事を読み終えた場所に、無料相談ボタンと同じカテゴリのほかの記事を置き、戻るボタンをカテゴリ一覧へ向ける。
# 旧サイト（Studio）の埋め込みは、中身を送る仕組みが無く空白（高さ197px）になっていたので消す
CTA_TEXT = "無料でキャリア相談する"
STUDIO_EMBED = re.compile(r'\s*<div data-type="embed_code"[^>]*>\s*<iframe src="https://[A-Za-z0-9]+\.studioiframesandbox\.com"[^>]*>\s*</iframe>\s*</div>')
IA_END = re.compile(r'\s*<aside class="ia-end".*?</aside>', re.S)
BACK_BTN = re.compile(r'(</div>)(\s*<a href=")[^"]*(" class="link sd insight-article-back-btn">.*?'
                      r'<p class="text sd appear insight-article-back-text[^"]*">)[^<]*(</p>)', re.S)


def nearby(items, key, limit=3):
    """掲載順で近いものから最大 limit 件。前後に交互に広げて選ぶ（ファーム記事の関連リンクと同じ選び方）"""
    keys = [k for k, _ in items]
    if key not in keys:
        return []
    i, picked = keys.index(key), []
    for d in range(1, len(items)):
        for j in (i + d, i - d):
            if 0 <= j < len(items) and len(picked) < limit and items[j][0] != key and items[j] not in picked:
                picked.append(items[j])
    return picked


def fix_article_end(h, aid, cats, cards):
    h = STUDIO_EMBED.sub("", h)
    h = IA_END.sub("", h)
    cat = cats.get(aid)
    back_slug, back_label = cat if cat else ("insight-interview", "Career tips")
    block = ('<div class="ia-cta"><p class="ia-cta-lead">転職の進め方や選考対策について、無料でご相談いただけます。</p>'
             '<a class="ia-cta-btn" href="../../contact-candidate/">%s</a></div>' % CTA_TEXT)
    picked = nearby(cards.get(cat[0], []), aid) if cat else []
    if picked:
        lis = "".join('<li><a href="../%s/">%s</a></li>' % (a, H.escape(t, quote=False)) for a, t in picked)
        block += ('<nav class="ia-related" aria-label="%sのほかの記事"><p class="ia-related-title">%sのほかの記事</p>'
                  '<ul class="ia-related-list">%s</ul><a class="ia-related-all" href="../../%s/">%sの一覧を見る</a></nav>'
                  % (back_label, back_label, lis, back_slug, back_label))
    block = '\n                  <aside class="ia-end">%s</aside>' % block
    return BACK_BTN.sub(lambda m: m.group(1) + block + m.group(2) + "../../%s/" % back_slug + m.group(3)
                        + "%sの一覧へ" % back_label + m.group(4), h, count=1)


# ---------- 画像の遅延読み込み（2026-10。診断 P-03） ----------
# 画面を開いてすぐ見える画像（ロゴ・記事の表紙・ブログの表紙）以外は、スクロールして近づいたときに読み込む
EAGER_IMG = ("header-logo-img", "insight-article-cover", "blog-post-featured-img")
IMG_TAG = re.compile(r"<img\b[^>]*>", re.I)


def needs_lazy(tag):
    return not re.search(r"\bloading=", tag, re.I) and not any(c in tag for c in EAGER_IMG)


def lazy_images(h):
    return IMG_TAG.sub(lambda m: m.group(0)[:4] + ' loading="lazy" decoding="async"' + m.group(0)[4:]
                       if needs_lazy(m.group(0)) else m.group(0), h)


# ---------- 画像の寸法（2026-10。診断 P-05） ----------
# <img> に元の画像の width / height を書くと、ブラウザが読み込む前に縦横比どおりの場所を空けておけるので、
# 読み込み中に下の文章がずれない（CLS）。見た目の大きさは今までどおり CSS で決まる
# （style.css の :where(img[width][height]) で width / height を auto に戻している）。
# 画像の形式は中身の先頭で見分ける（拡張子が .webp で中身が PNG のファイルがあるため）。読めないものは付けない
IMG_SRC = re.compile(r'\bsrc="([^"]+)"')


def image_size(path):
    """画像ファイルの (幅, 高さ) px。PNG・JPEG・GIF・WebP・SVG。読めないときは None（Pillow を使わず標準ライブラリだけで読む）"""
    try:
        with open(path, "rb") as f:
            b = f.read()
    except OSError:
        return None
    try:
        if b.startswith(b"\x89PNG\r\n\x1a\n") and b[12:16] == b"IHDR":
            return int.from_bytes(b[16:20], "big"), int.from_bytes(b[20:24], "big")
        if b[:6] in (b"GIF87a", b"GIF89a"):
            return int.from_bytes(b[6:8], "little"), int.from_bytes(b[8:10], "little")
        if b[:4] == b"RIFF" and b[8:12] == b"WEBP":
            kind = b[12:16]
            if kind == b"VP8X":
                return 1 + int.from_bytes(b[24:27], "little"), 1 + int.from_bytes(b[27:30], "little")
            if kind == b"VP8 ":
                return int.from_bytes(b[26:28], "little") & 0x3FFF, int.from_bytes(b[28:30], "little") & 0x3FFF
            if kind == b"VP8L":
                bits = int.from_bytes(b[21:25], "little")
                return (bits & 0x3FFF) + 1, ((bits >> 14) & 0x3FFF) + 1
            return None
        if b[:3] == b"\xff\xd8\xff":
            i = 2
            while i + 9 < len(b):
                if b[i] != 0xFF:
                    i += 1
                    continue
                m = b[i + 1]
                if m in (0xC0, 0xC1, 0xC2, 0xC3, 0xC5, 0xC6, 0xC7, 0xC9, 0xCA, 0xCB, 0xCD, 0xCE, 0xCF):
                    return int.from_bytes(b[i + 7:i + 9], "big"), int.from_bytes(b[i + 5:i + 7], "big")
                if m in (0xD8, 0x01) or 0xD0 <= m <= 0xD7:
                    i += 2
                    continue
                i += 2 + int.from_bytes(b[i + 2:i + 4], "big")
            return None
        head = b[:4096].decode("utf-8", "ignore")
        svg = re.search(r"<svg\b[^>]*>", head)
        if svg:
            t = svg.group(0)
            w, hh = re.search(r'\bwidth="([\d.]+)(?:px)?"', t), re.search(r'\bheight="([\d.]+)(?:px)?"', t)
            if w and hh:
                return round(float(w.group(1))), round(float(hh.group(1)))
            vb = re.search(r'\bviewBox="\s*[-\d.]+[\s,]+[-\d.]+[\s,]+([\d.]+)[\s,]+([\d.]+)', t)
            if vb:
                return round(float(vb.group(1))), round(float(vb.group(2)))
    except (IndexError, ValueError):
        return None
    return None


def img_file(src, page_path):
    """<img src> が指す docs 内のファイル。外部の画像・data: は None"""
    src = H.unescape(src.split("?")[0].split("#")[0])
    if re.match(r"^(?:[a-z]+:)?//|^data:", src, re.I):
        return None
    if src.startswith("/"):
        p = os.path.join(DOCS, unquote(src.lstrip("/")).replace("/", os.sep))
    else:
        p = os.path.normpath(os.path.join(os.path.dirname(page_path), unquote(src).replace("/", os.sep)))
    return p if p.startswith(DOCS) and os.path.isfile(p) else None


def missing_size(tag, page_path):
    """寸法を付けられるのに付いていない <img> なら (幅, 高さ)。付いている・付けられないものは None"""
    if re.search(r"\b(?:width|height)=", tag, re.I):
        return None
    m = IMG_SRC.search(tag)
    f = img_file(m.group(1), page_path) if m else None
    wh = image_size(f) if f else None
    return wh if wh and wh[0] > 0 and wh[1] > 0 else None


def size_images(h, page_path):
    def rep(m):
        wh = missing_size(m.group(0), page_path)
        return m.group(0)[:4] + ' width="%d" height="%d"' % wh + m.group(0)[4:] if wh else m.group(0)
    return IMG_TAG.sub(rep, h)


# ---------- 開いてすぐ見える画像を先に読む（2026-10。LCP） ----------
# 記事の表紙・ブログの表紙は、ページを開いて最初に見える一番大きな画像（LCP）になる。
# fetchpriority="high" で、ほかの画像より先に読み込ませる。Google Fonts の CSS を置いているサーバーへも先に接続しておく
LCP_IMG = ("insight-article-cover", "blog-post-featured-img")
FONT_PRECONNECT = '<link rel="preconnect" href="https://fonts.googleapis.com">'


def needs_priority(tag):
    return any(c in tag for c in LCP_IMG) and not re.search(r"\bfetchpriority=", tag, re.I)


def prioritize(h):
    h = IMG_TAG.sub(lambda m: m.group(0)[:4] + ' fetchpriority="high"' + m.group(0)[4:] if needs_priority(m.group(0)) else m.group(0), h)
    if FONT_LINK.search(h) and FONT_PRECONNECT not in h:
        m = re.search(r'[ \t]*<link rel="preconnect" href="https://fonts\.gstatic\.com"[^>]*>', h) or FONT_LINK.search(h)
        indent = re.match(r"[ \t]*", m.group(0)).group(0)
        h = h[:m.start()] + indent + FONT_PRECONNECT + "\n" + h[m.start():]
    return h


# ---------- アクセシビリティ（2026-10。診断 A-02・A-04・A-06・S-04） ----------
# ロゴはトップへのリンクで、ほかに文字が無いので、代替テキストが空だと読み上げでリンク先が分からない
LOGO_IMG = re.compile(r'(<img\b[^>]*class="[^"]*\b(?:header-logo-img|insight-cat-footer-logo)\b[^"]*"[^>]*\balt=")\s*(")')
A_BLANK = re.compile(r'<a\b[^>]*\btarget="_blank"[^>]*>', re.I)
RT_REGION = re.compile(r'(<div class="richText sd insight-article-richtext[^"]*">)(.*?)(<aside class="ia-end"|</div><a href="[^"]*" class="link sd insight-article-back-btn")', re.S)


def fix_logo_alt(h):
    return LOGO_IMG.sub(lambda m: m.group(1) + BRAND + m.group(2), h)


def fix_noopener(h):
    """別タブで開くリンクに rel="noopener" を付ける（開いた先のページから元のページを操作させない）"""
    def rep(m):
        t = m.group(0)
        if re.search(r'\brel="[^"]*\bnoopener\b', t):
            return t
        if re.search(r'\brel="', t):
            return re.sub(r'\brel="', 'rel="noopener ', t, count=1)
        return t[:-1] + ' rel="noopener">'
    return A_BLANK.sub(rep, h)


def fix_body_h1(h):
    """Insight 記事の本文にある h1 を h2 にする（h1 は題名の1つだけにする）。
    見た目は class="rt-h1" で h1 のときと同じにしてある（style.css）"""
    def rep(m):
        body = re.sub(r"<h1\b([^>]*)>", lambda x: "<h2 class=\"rt-h1\"%s>" % x.group(1) if "class=" not in x.group(1)
                      else "<h2%s>" % re.sub(r'class="', 'class="rt-h1 ', x.group(1), count=1), m.group(2))
        return m.group(1) + body.replace("</h1>", "</h2>") + m.group(3)
    return RT_REGION.sub(rep, h, count=1)


# ---------- Insight 記事の本文から企業記事へのリンク（2026-10） ----------
# 本文に企業記事のある社名が出てきたら、記事ごとに最初の1か所だけ企業記事（industry-knowledge）へリンクする。
# 呼び方は取り違えの無いものだけを並べる（「クオンツ」だけ・「MRI」・「LTS」・「ADL」・「キャディ」などは
# 別の意味にも読めるので入れない）。企業記事が無い社（マッキンゼー・Slalom など）はリンクしない。
# 見出しの中と、すでにリンクになっている文字はリンクしない。企業記事を足したら、ここに呼び方を足す
FIRM_ALIASES = {
    "bcg": ["ボストン・コンサルティング・グループ", "ボストンコンサルティンググループ", "BCG"],
    "bain": ["ベイン・アンド・カンパニー", "ベイン"],
    "at-kearney": ["A.T.カーニー", "A.T. カーニー", "ATカーニー", "Kearney"],
    "adl": ["アーサー・ディ・リトル"],
    "roland-berger": ["ローランド・ベルガー", "ローランドベルガー"],
    "ycp": ["YCP"],
    "igpi": ["経営共創基盤", "IGPI"],
    "dream-incubator": ["ドリームインキュベータ"],
    "fms": ["FIELD MANAGEMENT STRATEGY"],
    "pe-directions": ["P&Eディレクションズ"],
    "globing": ["グロービング"],
    "pragmateches": ["pragmateches"],
    "deloitte": ["デロイト トーマツ コンサルティング", "デロイト トーマツ", "デロイト", "Deloitte"],
    "pwc": ["PwCコンサルティング", "PwC"],
    "ey": ["EYストラテジー・アンド・コンサルティング", "EY"],
    "kpmg": ["KPMGコンサルティング", "KPMG"],
    "accenture": ["アクセンチュア", "Accenture"],
    "abeam": ["アビームコンサルティング", "アビーム"],
    "baycurrent": ["ベイカレント・コンサルティング", "ベイカレント"],
    "fortience": ["フォーティエンスコンサルティング", "フォーティエンス", "クニエ"],
    "yamada-cg": ["山田コンサルティンググループ", "山田コンサルティング"],
    "ignition-point-force": ["イグニション・ポイント フォース", "イグニション・ポイントフォース"],
    "ignition-point": ["イグニション・ポイント", "イグニッション・ポイント", "イグニッションポイント", "イグニションポイント"],
    "rise-cg": ["ライズ・コンサルティング・グループ", "ライズ・コンサルティング"],
    "northsand": ["ノースサンド"],
    "dirbato": ["Dirbato", "ディルバート"],
    "ridgelinez": ["Ridgelinez", "リッジラインズ"],
    "quants": ["クオンツ・コンサルティング", "クオンツコンサルティング"],
    "vision-consulting": ["ビジョン・コンサルティング"],
    "uls": ["ULSコンサルティング", "ウルシステムズ"],
    "stellar-digital": ["ステラデジタルコンサルティング", "Stellar Digital Consulting"],
    "nri": ["野村総合研究所", "野村総研", "NRI"],
    "mri": ["三菱総合研究所", "三菱総研"],
    "murc": ["三菱UFJリサーチ&コンサルティング", "三菱UFJリサーチ＆コンサルティング", "MURC"],
    "funai": ["船井総合研究所", "船井総研"],
    "gientech": ["GienTech"],
    "lts": ["エル・ティー・エス"],
    "metateam": ["METATEAM", "メタチーム"],
    "neovista": ["ネオビスタ", "NeoVista"],
    "unite-partners": ["Unite Partners", "ユナイトパートナーズ"],
    "intelligentforce": ["インテリジェントフォース"],
    "intloop": ["INTLOOP", "イントループ"],
    "xspear": ["Xspear", "クロスピア"],
    "brisis": ["ブライシス"],
    "regrit-partners": ["リグリットパートナーズ", "Re-grit Partners"],
    "lib-consulting": ["リブ・コンサルティング"],
    "revamp": ["リヴァンプ"],
    "activarch": ["アクティヴァーチ"],
    "velcore": ["ベルコア"],
    "pksha": ["PKSHA"],
    "abeja": ["ABEJA"],
    "exawizards": ["エクサウィザーズ"],
    "matsuo-institute": ["松尾研究所"],
    "peoplex": ["PeopleX"],
    "bringout": ["ブリングアウト"],
    "upsider": ["UPSIDER"],
    "smarthr": ["SmartHR"],
    "progrit": ["プログリット"],
    "loglass": ["ログラス"],
    "timee": ["タイミー"],
    "arches": ["アーチーズ"],
    "caddi": ["CADDi"],
    "asuene": ["アスエネ"],
    "kaminashi": ["カミナシ"],
    "hacobu": ["Hacobu"],
}
# 文脈から企業記事へ送るのがふさわしくない組み合わせ（記事ID, 社）。
# h7Nq2LpD は「本当はドリームインキュベータではなくBCGに行きたかった」人の話で、ドリームインキュベータの紹介ではない。
# wlaxgLwX の「元デロイト」は、記事末尾の当社の紹介（無料相談への案内）の中で、ほかの記事へ送る場所ではない
FIRM_LINK_SKIP = {("h7Nq2LpD", "dream-incubator"), ("wlaxgLwX", "deloitte")}
FIRM_LINK = re.compile(r'<a class="ia-firm-link" href="[^"]*">(.*?)</a>', re.S)
NO_LINK_TAGS = ("a", "h1", "h2", "h3", "h4", "h5", "h6", "script", "style")


def firm_pattern():
    """社名の正規表現と {本文での表記: 社}。長い呼び方を先に試す。英字の社名は英字の続きの中では拾わない（KEY の EY など）"""
    slug_of, alts = {}, []
    for slug, names in FIRM_ALIASES.items():
        if not is_dir_page("industry-knowledge/" + slug):
            continue
        for n in names:
            e = H.escape(n, quote=False)
            slug_of[e] = slug
            p = re.escape(e)
            if re.match(r"[A-Za-z0-9]", n[0]):
                p = r"(?<![A-Za-z0-9])" + p
            if re.match(r"[A-Za-z0-9]", n[-1]):
                p += r"(?![A-Za-z0-9])"
            if n == "ベイン":
                p += "(?!キャピタル)"    # ベインキャピタル（投資ファンド）は別の会社
            alts.append((len(e), p))
    alts.sort(key=lambda x: -x[0])
    return re.compile("|".join(p for _, p in alts)), slug_of


def link_firms(h, aid):
    pat, slug_of = firm_pattern()

    def rep(m):
        body = FIRM_LINK.sub(r"\1", m.group(2))
        done = {s for a, s in FIRM_LINK_SKIP if a == aid}
        out, inside = [], []

        def link(mm):
            s = slug_of[mm.group(0)]
            if s in done:
                return mm.group(0)
            done.add(s)
            return '<a class="ia-firm-link" href="../../industry-knowledge/%s/">%s</a>' % (s, mm.group(0))
        for part in re.split(r"(<[^>]+>)", body):
            t = re.match(r"<(/?)([A-Za-z0-9]+)", part)
            if t:
                if t.group(2).lower() in NO_LINK_TAGS:
                    if t.group(1):
                        inside = inside[:-1]
                    elif not part.endswith("/>"):
                        inside.append(t.group(2).lower())
                out.append(part)
            else:
                out.append(part if inside or part.startswith("<") else pat.sub(link, part))
        return m.group(1) + "".join(out) + m.group(3)
    return RT_REGION.sub(rep, h, count=1)


# ---------- 企業記事から、その社が出てくる Insight 記事へ（2026-10） ----------
# link_firms の逆向き。企業記事の「あわせて読みたい（同じカテゴリのほかの企業）」の下に、
# その社へリンクしている Insight 記事を最大5本並べる。並びはカテゴリ一覧の掲載順（一覧に無い記事は後ろ）
FIRM_MENTIONS = re.compile(r'<nav class="vc-related vc-mentions".*?</nav>', re.S)
FIRM_RELATED = re.compile(r'<nav class="vc-related"[^>]*>.*?</nav>', re.S)
MENTIONS_MAX = 5


def firm_mentions(cards):
    """{企業記事の slug: [(記事ID, 題名), ...]}。Insight 記事に link_firms をかけた結果から作る"""
    order = [a for slug, _ in INSIGHT_CATS for a, _ in cards.get(slug, [])]
    out = {}
    for f in sorted(glob.glob(os.path.join(DOCS, "insight", "*", "index.html"))):
        aid = os.path.basename(os.path.dirname(f))
        h = read(f)
        pg = parse_str(h)
        m = re.search(r'<h1[^>]*insight-article-heading[^>]*>(.*?)</h1>', h, re.S)
        if is_redirect(pg) or not indexable(pg) or not m:
            continue
        title = H.unescape(re.sub(r"<[^>]+>", "", m.group(1))).strip()
        linked = re.findall(r'class="ia-firm-link" href="\.\./\.\./industry-knowledge/([^/"]+)/"', link_firms(h, aid))
        for s in dict.fromkeys(linked):
            out.setdefault(s, []).append((aid, title))
    pos = lambda x: order.index(x[0]) if x[0] in order else len(order)
    return {s: sorted(v, key=pos) for s, v in out.items()}


def fix_firm_mentions(h, slug, mentions):
    h = FIRM_MENTIONS.sub("", h)
    items = mentions.get(slug, [])[:MENTIONS_MAX]
    if not items:
        return h
    lis = "".join('<li><a href="../../insight/%s/">%s</a></li>' % (a, H.escape(t, quote=False)) for a, t in items)
    block = ('<nav class="vc-related vc-mentions" aria-label="この会社が出てくる記事"><p class="vc-related-title">'
             'この会社が出てくる記事</p><ul class="vc-related-list">%s</ul></nav>' % lis)
    m = FIRM_RELATED.search(h) or re.search(r'(?=<a href="[^"]*" class="link sd insight-article-back-btn")', h)
    return h[:m.end()] + block + h[m.end():] if m else h


# ---------- 一覧ページの構造化データ（2026-10） ----------
# 企業一覧と Insight のカテゴリ一覧に、「何が並んでいる一覧か」（CollectionPage と ItemList）を入れる
LIST_PAGES = ("industry-knowledge", "insight-case", "insight-interview", "insight-work", "insight-firm")


def list_items(rel, raw):
    """一覧ページに並んでいる (URL, 名前)。画面の並び順"""
    clean = lambda s: re.sub(r"\s+", " ", H.unescape(re.sub(r"<[^>]+>", " ", s))).strip()
    if rel == "industry-knowledge":
        seen, items = set(), []
        for s, t in re.findall(r'<a href="([a-z0-9-]+)/"[^>]*>(.*?)</a>', raw, re.S):
            if s not in seen and is_dir_page("industry-knowledge/" + s) and clean(t):
                seen.add(s)
                items.append((url_of("industry-knowledge/" + s), clean(t)))
        return items
    return [(url_of("insight/" + a), clean(t)) for a, t in re.findall(
        r'<a href="\.\./insight/([^"/]+)/?"[^>]*class="[^"]*insight-cat-card"[^>]*>.*?<h3[^>]*>(.*?)</h3>', raw, re.S)]


# ---------- Google Fonts の読み込みを1本にまとめる（2026-10。診断 P-06） ----------
# 1書体・1太さごとに別の <link> で読み込んでいた（多いページで8本）。同じ書体と太さを1本の URL で取る
FONT_LINK = re.compile(r'[ \t]*<link href="https://fonts\.googleapis\.com/css\?([^"]*)" rel="stylesheet">\r?\n?')


def merge_fonts(h):
    links = list(FONT_LINK.finditer(h))
    if len(links) < 2:
        return h
    fams = {}
    for m in links:
        q = H.unescape(m.group(1))
        for part in re.search(r"family=([^&]*)", q).group(1).split("|"):
            name, _, weights = unquote(part).partition(":")
            for w in (weights.split(",") if weights else ["400"]):
                fams.setdefault(name, [])
                if w not in fams[name]:
                    fams[name].append(w)
    fam = "%7C".join("%s%%3A%s" % (n.replace(" ", "+"), ",".join(sorted(ws, key=int) if all(w.isdigit() for w in ws) else ws))
                     for n, ws in fams.items())
    indent = re.match(r"[ \t]*", links[0].group(0)).group(0)
    merged = '%s<link href="https://fonts.googleapis.com/css?display=swap&amp;family=%s" rel="stylesheet">\n' % (indent, fam)
    out, pos = [], 0
    for i, m in enumerate(links):
        out.append(h[pos:m.start()])
        if i == 0:
            out.append(merged)
        pos = m.end()
    out.append(h[pos:])
    return "".join(out)


def crumbs(items):
    return {"@type": "BreadcrumbList", "itemListElement": [
        {"@type": "ListItem", "position": i + 1, "name": n, "item": u} for i, (n, u) in enumerate(items)]}


def blog_date(pg):
    d = pg.texts.get("blog-post-date", "")
    m = re.match(r"(\d{4})/(\d{1,2})/(\d{1,2})$", d)
    return "%s-%02d-%02d" % (m.group(1), int(m.group(2)), int(m.group(3))) if m else None


FAQ_SECTION = re.compile(r'<h3 id="index_faq">.*?</h3>(.*?)(?=<h3 |<p class="vc-note"|</div>)', re.S)
FAQ_PAIR = re.compile(r'<h4 class="vc-faq-q">(.*?)</h4>\s*<p>(.*?)</p>', re.S)


def extract_faq(raw):
    """ファーム記事の「よくある質問」（h3#index_faq の後ろの h4 と直後の段落）を (問い, 答え) の並びで返す"""
    m = FAQ_SECTION.search(raw or "")
    if not m:
        return []
    text = lambda s: H.unescape(re.sub(r"<[^>]+>", "", s)).strip()
    return [(text(q), text(a)) for q, a in FAQ_PAIR.findall(m.group(1))]


def page_ld(rel, pg, cats, raw=""):
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
    faq = extract_faq(raw) if k == "industry-knowledge" else []
    if faq:
        # よくある質問（2026-10 SEO施策5）。画面の問いと答えをそのまま使う
        graph.append({"@type": "FAQPage", "@id": url + "#faq", "mainEntity": [
            {"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in faq]})
    items = list_items(rel, raw) if rel in LIST_PAGES else []
    if items:
        graph.append({"@type": "CollectionPage", "@id": url + "#page", "url": url, "name": name, "inLanguage": "ja",
                      "isPartOf": {"@id": WEBSITE_ID}, "mainEntity": {
                          "@type": "ItemList", "numberOfItems": len(items), "itemListElement": [
                              {"@type": "ListItem", "position": i + 1, "url": u, "name": t} for i, (u, t) in enumerate(items)]}})
    if rel:
        graph.append(crumbs(trail))
    return {"@context": "https://schema.org", "@graph": graph}


def apply(paths):
    cats = insight_category_map()
    cards = insight_cards()
    mentions = firm_mentions(cards)
    changed = 0
    for p in paths:
        h0 = h = read(p)
        if p == PAGE_404:
            h = size_images(merge_fonts(fix_noopener(fix_logo_alt(fix_links(h, SITE + "/", root_abs=True)))), p)
            if h != h0:
                write(p, h)
                changed += 1
            continue
        pg = parse(p)
        rel = rel_of(p)
        url = url_of(rel)
        h = fix_links(h, url)
        if is_redirect(pg):
            if h != h0:
                write(p, h)
                changed += 1
            continue
        h = fix_urls(h, url)
        h = set_meta(h, "property", "og:site_name", BRAND)
        h = set_meta(h, "property", "og:title", TOP_TITLE if not rel else bare_title(pg.title))
        if kind(rel):
            h = set_meta(h, "property", "og:type", "article")
        if kind(rel) == "insight" and indexable(pg):
            h = fix_article_end(h, rel.split("/")[1], cats, cards)
            h = fix_body_h1(h)
            h = link_firms(h, rel.split("/")[1])
        if kind(rel) == "industry-knowledge" and indexable(pg):
            h = fix_firm_mentions(h, rel.split("/")[1], mentions)
        h = lazy_images(h)
        h = size_images(h, p)
        h = prioritize(h)
        h = fix_logo_alt(h)
        h = fix_noopener(h)
        h = merge_fonts(h)
        img = pg.meta("og:image")
        if img and bigger_image(img) != img:
            h = set_meta(h, "property", "og:image", bigger_image(img))
            h = set_meta(h, "property", "twitter:image", bigger_image(img))
        if rel in ("", "company"):
            h = put_ld(h, "ld-organization", ORG)
        if indexable(pg):
            h = put_ld(h, "ld-page", page_ld(rel, parse_str(h), cats, h))
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


def is_dir_page(rel_path):
    """docs 内の rel_path が、index.html を持つディレクトリか（大文字小文字を区別）"""
    parts = [x for x in rel_path.split("/") if x]
    return bool(parts) and exists_exact(rel_path) and os.path.isfile(os.path.join(DOCS, *parts, "index.html"))


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
    mentions = firm_mentions(insight_cards())
    for p, pg in parsed.items():
        rel = rel_of(p)
        where = rel or "(トップ)"
        url = url_of(rel)
        for href in pg.links:
            r = urlparse(urljoin(url, H.unescape(href)))
            if r.netloc == "stellar-careers.com":
                linked.add(unquote(r.path).strip("/"))
        abs_links = [h for h in pg.links if abs_to_rel(h, url)]
        if abs_links:
            err.append((where, "サイト内リンクが絶対URL %d件（例: %s）。python scripts/seo.py apply で相対パスに直る"
                        % (len(abs_links), ", ".join(abs_links[:3]))))
        no_slash = [h for h in pg.links if not abs_to_rel(h, url) and slash_fix(h, url)]
        if no_slash:
            err.append((where, "サイト内リンクの末尾にスラッシュが無い %d件（例: %s）。python scripts/seo.py apply で直る"
                        % (len(no_slash), ", ".join(no_slash[:3]))))
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
        raw_all = read(p)
        if extract_faq(raw_all) and '"FAQPage"' not in raw_all:
            err.append((where, "よくある質問があるのに構造化データ（FAQPage）が無い。python scripts/seo.py apply で入る"))
        if len(FONT_LINK.findall(raw_all)) > 1:
            err.append((where, "Google Fonts を %d 本に分けて読み込んでいる。python scripts/seo.py apply で1本にまとまる" % len(FONT_LINK.findall(raw_all))))
        if "<main" not in raw_all:
            err.append((where, "本文の範囲を示す <main> が無い（読み上げソフトが本文へ飛べない）"))
        if LOGO_IMG.search(raw_all):
            err.append((where, "ロゴの代替テキスト（alt）が空。python scripts/seo.py apply で入る"))
        no_opener = [t for t in A_BLANK.findall(raw_all) if not re.search(r'\brel="[^"]*\bnoopener\b', t)]
        if no_opener:
            err.append((where, "別タブで開くリンクに rel=\"noopener\" が無い %d件。python scripts/seo.py apply で付く" % len(no_opener)))
        not_lazy = [t for t in IMG_TAG.findall(read(p)) if needs_lazy(t)]
        if not_lazy:
            err.append((where, "遅延読み込み（loading=\"lazy\"）の無い画像 %d枚。python scripts/seo.py apply で付く" % len(not_lazy)))
        no_size = [t for t in IMG_TAG.findall(raw_all) if missing_size(t, p)]
        if no_size:
            err.append((where, "寸法（width/height）の無い画像 %d枚（読み込み中に表示がずれる）。python scripts/seo.py apply で付く" % len(no_size)))
        if [t for t in IMG_TAG.findall(raw_all) if needs_priority(t)]:
            err.append((where, "記事の表紙画像に fetchpriority=\"high\" が無い（最初に見える画像が後回しになる）。python scripts/seo.py apply で付く"))
        if FONT_LINK.search(raw_all) and FONT_PRECONNECT not in raw_all:
            err.append((where, "Google Fonts のサーバー（fonts.googleapis.com）への preconnect が無い。python scripts/seo.py apply で入る"))
        if kind(rel) == "industry-knowledge" and fix_firm_mentions(raw_all, rel.split("/")[1], mentions) != raw_all:
            err.append((where, "「この会社が出てくる記事」の一覧が無い・古い。python scripts/seo.py apply で直る"))
        if kind(rel) == "insight":
            raw = read(p)
            if 'class="ia-end"' not in raw:
                err.append((where, "記事末尾の無料相談ボタン・関連記事が無い。python scripts/seo.py apply で入る"))
            if "studioiframesandbox.com" in raw:
                err.append((where, "旧サイト（Studio）の埋め込みが残っている（中身が表示されず空白になる）。python scripts/seo.py apply で消える"))
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
    if os.path.isfile(PAGE_404):
        bad = [h for h in parse(PAGE_404).links if fix_href(h, SITE + "/", root_abs=True)]
        if bad:
            err.append(("404.html", "相対パス・絶対URL・末尾スラッシュ無しのリンク %d件（例: %s）。404 はどの階層の URL でも出るので / 始まりにする。"
                        "python scripts/seo.py apply で直る" % (len(bad), ", ".join(bad[:3]))))
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
        apply([os.path.abspath(p) for p in only] if only else all_pages() + [PAGE_404])
    elif cmd == "check":
        sys.exit(check())
    else:
        sys.exit("使い方: python scripts/seo.py apply | check")
