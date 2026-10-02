# -*- coding: utf-8 -*-
"""docs/ 配下のページから docs/sitemap.xml を作る。

使い方:
    python scripts/gen-sitemap.py           # sitemap.xml を書き出す
    python scripts/gen-sitemap.py --check   # 書き出さずに、載るべきURLと今の sitemap.xml の差を見る（CI用）

載せるページ:
    docs/**/index.html のうち、検索に出すページ（scripts/seo.py の indexable）だけ。
    noindex のページ（申し込み完了など）と、転送ページ（待ち時間0の meta refresh）は載せない。
URL は末尾スラッシュ付き（canonical と同じ形）。
lastmod は git の最終コミット日。未コミットの変更があるページは実行した日。
履歴の浅い clone（shallow）では日付が正しく取れないので、書き出しを止める（--check は URL だけを見るので動く）。

経緯: 手で更新する運用だったため、ファーム記事69本とステラコーチが一度も載らず、
43件のまま止まっていた（2026-10 SEO施策2で自動化）。
"""
import datetime, io, os, re, subprocess, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import seo  # noqa: E402  ページの読み取りと「検索に出すか」の判定を共通にする

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
ROOT, DOCS, SITE = seo.ROOT, seo.DOCS, seo.SITE
OUT = os.path.join(DOCS, "sitemap.xml")


def git(*args):
    return subprocess.run(["git", *args], cwd=ROOT, capture_output=True, text=True, encoding="utf-8").stdout


def items(with_dates):
    dirty = set()
    if with_dates:
        # -z: 区切りは NUL。行頭の空白（" M"）を落とさないよう strip しない
        for rec in git("status", "--porcelain", "-z", "--", "docs").split("\0"):
            if len(rec) > 3:
                dirty.add(rec[3:])
    today = datetime.date.today().isoformat()
    out = []
    for path in seo.all_pages():
        if not seo.indexable(seo.parse(path)):
            continue
        rel = seo.rel_of(path)
        lastmod = None
        if with_dates:
            repo_path = "docs/" + (rel + "/" if rel else "") + "index.html"
            lastmod = today if repo_path in dirty else (git("log", "-1", "--format=%cs", "--", repo_path).strip() or today)
        out.append((seo.url_of(rel), lastmod))
    return sorted(out, key=lambda x: (x[0] != SITE + "/", x[0]))


def render(rows):
    lines = ['<?xml version="1.0" encoding="UTF-8"?>',
             '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for url, lastmod in rows:
        lines.append("  <url><loc>%s</loc><lastmod>%s</lastmod></url>" % (url, lastmod))
    lines.append("</urlset>")
    return "\n".join(lines) + "\n"


if __name__ == "__main__":
    if "--check" in sys.argv:
        want = {u for u, _ in items(False)}
        have = set(re.findall(r"<loc>([^<]+)</loc>", io.open(OUT, encoding="utf-8").read())) if os.path.exists(OUT) else set()
        miss, extra = sorted(want - have), sorted(have - want)
        for u in miss:
            print("サイトマップに無い:", u)
        for u in extra:
            print("サイトマップに余分（ページが無い・noindex・転送ページ）:", u)
        print("サイトマップ: 載るべき %d件 / 載っている %d件 / 不足 %d件 / 余分 %d件" % (len(want), len(have), len(miss), len(extra)))
        sys.exit(1 if (miss or extra) else 0)
    if git("rev-parse", "--is-shallow-repository").strip() == "true":
        sys.exit("履歴の浅い clone では lastmod が正しく取れないため中止した。git fetch --unshallow してから実行する")
    rows = items(True)
    io.open(OUT, "w", encoding="utf-8", newline="\n").write(render(rows))
    print("書き出し: %s（%d件）" % (OUT, len(rows)))
