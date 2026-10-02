# -*- coding: utf-8 -*-
"""docs/ 配下のページから docs/sitemap.xml を作る。

使い方:
    python scripts/gen-sitemap.py           # sitemap.xml を書き出す
    python scripts/gen-sitemap.py --check   # 書き出さずに、載るべきURLと今の sitemap.xml の差を見る（CI用）

載せるページ:
    docs/**/index.html のうち、次のものを除いた全部
    - <meta name="robots"> に noindex があるページ（申し込み完了ページなど）
    - assets/ 配下
    - EXCLUDE に書いたページ（掲載前の記事など）
URL は末尾スラッシュ付き（canonical と同じ形）。lastmod は git の最終コミット日。
未コミットの変更があるページは、実行した日の日付にする。

経緯: 手で更新する運用だったため、ファーム記事69本とステラコーチが一度も載らず、
43件のまま止まっていた（2026-10 SEO施策2で自動化）。
"""
import datetime, io, os, re, subprocess, sys

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DOCS = os.path.join(ROOT, "docs")
SITE = "https://stellar-careers.com"
OUT = os.path.join(DOCS, "sitemap.xml")

# 掲載を確認できていないページ。確認がとれたら外す
EXCLUDE = {
    "insight/Hx7mK3pQ",  # 2026-03-27 追加。一覧ページにもサイトマップにも未掲載のまま（運用者に確認中）
}


def git(*args):
    return subprocess.run(["git", *args], cwd=ROOT, capture_output=True, text=True, encoding="utf-8").stdout.strip()


def pages():
    dirty = set(git("status", "--porcelain", "--", "docs").splitlines())
    dirty = {l[3:].strip().strip('"') for l in dirty}
    today = datetime.date.today().isoformat()
    out = []
    for cur, dirs, files in os.walk(DOCS):
        dirs[:] = sorted(d for d in dirs if d != "assets")
        if "index.html" not in files:
            continue
        rel = os.path.relpath(cur, DOCS).replace(os.sep, "/")
        rel = "" if rel == "." else rel
        if rel in EXCLUDE:
            continue
        path = os.path.join(cur, "index.html")
        head = io.open(path, encoding="utf-8").read(6000)
        if re.search(r'<meta name="robots" content="[^"]*noindex', head):
            continue
        repo_path = "docs/" + (rel + "/" if rel else "") + "index.html"
        lastmod = today if repo_path in dirty else (git("log", "-1", "--format=%cs", "--", repo_path) or today)
        url = SITE + "/" + (rel + "/" if rel else "")
        out.append((url, lastmod))
    # トップを先頭に、あとはURL順
    return sorted(out, key=lambda x: (x[0] != SITE + "/", x[0]))


def render(items):
    lines = ['<?xml version="1.0" encoding="UTF-8"?>',
             '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for url, lastmod in items:
        lines.append("  <url><loc>%s</loc><lastmod>%s</lastmod></url>" % (url, lastmod))
    lines.append("</urlset>")
    return "\n".join(lines) + "\n"


if __name__ == "__main__":
    items = pages()
    if "--check" in sys.argv:
        # lastmod は実行日で揺れるので、URL の集合だけを比べる
        want = {u for u, _ in items}
        have = set(re.findall(r"<loc>([^<]+)</loc>", io.open(OUT, encoding="utf-8").read())) if os.path.exists(OUT) else set()
        miss, extra = sorted(want - have), sorted(have - want)
        for u in miss:
            print("サイトマップに無い:", u)
        for u in extra:
            print("サイトマップに余分（ページが無い・noindex・除外）:", u)
        print("サイトマップ: 載るべき %d件 / 載っている %d件 / 不足 %d件 / 余分 %d件" % (len(want), len(have), len(miss), len(extra)))
        sys.exit(1 if (miss or extra) else 0)
    io.open(OUT, "w", encoding="utf-8", newline="\n").write(render(items))
    print("書き出し: %s（%d件）" % (OUT, len(items)))
