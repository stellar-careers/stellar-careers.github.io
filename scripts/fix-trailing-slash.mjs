/**
 * URL の末尾スラッシュを統一する。
 *
 * 背景:
 *   GitHub Pages は拡張子なしURLを末尾スラッシュ付きへ 301 リダイレクトする。
 *     /about-us  →  301  →  /about-us/  →  200
 *   しかし canonical / og:url / sitemap / 内部リンクはすべてスラッシュなしで
 *   書かれていたため、全ページが「自分自身ではなくリダイレクトするURL」を
 *   正規URLとして宣言していた。内部リンクもクリックごとに 301 を経由していた。
 *
 * このスクリプトが直すもの:
 *   1. 内部リンク（相対パス）    ディレクトリを指すものに末尾スラッシュを付ける
 *   2. canonical                 末尾スラッシュを付ける
 *   3. og:url                    末尾スラッシュを付ける
 *   4. 自社の絶対URL             末尾スラッシュを付ける
 *   5. sitemap.xml の <loc>      末尾スラッシュを付ける
 *
 * 触らないもの:
 *   - 外部URL（fonts.googleapis.com 等）
 *   - mailto: / tel:
 *   - フラグメントのみのリンク（#voice-1）
 *   - ファイルを指すパス（.css / .png / .webp 等）
 *   - `.` `..` `../..` 形式（すでにディレクトリとして解決される）
 *   - og:image / twitter:image（画像ファイルを指すため）
 *
 * 使い方:
 *   node scripts/fix-trailing-slash.mjs           # 変更を書き込む
 *   node scripts/fix-trailing-slash.mjs --dry-run # 差分だけ表示する
 */

import { readdirSync, readFileSync, writeFileSync, existsSync, statSync } from 'fs';
import { join, dirname, resolve, relative, extname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DOCS = resolve(__dirname, '..', 'docs');
const ORIGIN = 'https://stellar-careers.com';
const DRY = process.argv.includes('--dry-run');

const BOM = Buffer.from([0xef, 0xbb, 0xbf]);

/** BOM を保持したまま読み書きする */
function readText(file) {
  const buf = readFileSync(file);
  const hasBom = buf.length >= 3 && buf.subarray(0, 3).equals(BOM);
  return { text: buf.subarray(hasBom ? 3 : 0).toString('utf8'), hasBom };
}
function writeText(file, text, hasBom) {
  const body = Buffer.from(text, 'utf8');
  writeFileSync(file, hasBom ? Buffer.concat([BOM, body]) : body);
}

function walk(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

/** URL を「パス部分」と「?query#fragment」に分ける */
function splitSuffix(url) {
  const i = url.search(/[?#]/);
  return i === -1 ? [url, ''] : [url.slice(0, i), url.slice(i)];
}

/** そのパスは index.html を持つディレクトリを指しているか */
function isServedDirectory(absPath) {
  return existsSync(absPath) && statSync(absPath).isDirectory() && existsSync(join(absPath, 'index.html'));
}

/**
 * 相対リンクを1つ処理する。付けるべきなら末尾スラッシュを付けて返す。
 * fileDir はそのHTMLファイルが置かれているディレクトリ（= URL の基準）。
 */
function fixRelative(url, fileDir) {
  if (/^(https?:|mailto:|tel:|data:|\/\/)/.test(url)) return null; // 外部
  const [path, suffix] = splitSuffix(url);
  if (path === '') return null;              // フラグメントのみ
  if (path.endsWith('/')) return null;        // すでに付いている
  if (extname(path) !== '') return null;      // ファイル（.css / .png など）
  if (/(^|\/)\.\.?$/.test(path)) return null; // `.` `..` `../..` 形式

  const target = path.startsWith('/') ? join(DOCS, path) : resolve(fileDir, path);
  if (!isServedDirectory(target)) return null;
  return path + '/' + suffix;
}

/** 自社の絶対URLを1つ処理する */
function fixAbsolute(url) {
  if (!url.startsWith(ORIGIN)) return null;
  const [path, suffix] = splitSuffix(url);
  const rest = path.slice(ORIGIN.length);
  if (rest === '' || rest === '/') return null; // トップは既に正しい
  if (rest.endsWith('/')) return null;
  if (extname(rest) !== '') return null;        // 画像などのファイル
  return path + '/' + suffix;
}

// ---------------------------------------------------------------- HTML

const htmlFiles = walk(DOCS).filter((f) => f.endsWith('.html'));
let filesChanged = 0;
const tally = { href: 0, canonical: 0, ogUrl: 0, absolute: 0, loc: 0 };

for (const file of htmlFiles) {
  const { text, hasBom } = readText(file);
  const fileDir = dirname(file);
  let out = text;

  // 1) href の相対リンク・絶対URL
  out = out.replace(/href="([^"]+)"/g, (whole, url) => {
    const rel = fixRelative(url, fileDir);
    if (rel !== null) {
      tally.href++;
      return `href="${rel}"`;
    }
    const abs = fixAbsolute(url);
    if (abs !== null) {
      // canonical かどうかは前後を見ないと分からないので、まとめて absolute として数える
      tally.absolute++;
      return `href="${abs}"`;
    }
    return whole;
  });

  // 2) og:url（content 属性。og:image は拡張子があるため fixAbsolute 側で除外される）
  out = out.replace(/(<meta\s+property="og:url"\s+content=")([^"]+)(")/g, (whole, pre, url, post) => {
    const abs = fixAbsolute(url);
    if (abs === null) return whole;
    tally.ogUrl++;
    return pre + abs + post;
  });

  if (out !== text) {
    filesChanged++;
    if (!DRY) writeText(file, out, hasBom);
  }
}

// ---------------------------------------------------------------- sitemap

const sitemap = join(DOCS, 'sitemap.xml');
if (existsSync(sitemap)) {
  const { text, hasBom } = readText(sitemap);
  const out = text.replace(/<loc>([^<]+)<\/loc>/g, (whole, url) => {
    const abs = fixAbsolute(url);
    if (abs === null) return whole;
    tally.loc++;
    return `<loc>${abs}</loc>`;
  });
  if (out !== text) {
    filesChanged++;
    if (!DRY) writeText(sitemap, out, hasBom);
  }
}

// ---------------------------------------------------------------- 結果

console.log(DRY ? '--- dry run（書き込みなし） ---' : '--- 適用しました ---');
console.log(`  内部リンク（相対）      : ${tally.href} 箇所`);
console.log(`  自社の絶対URL（href）    : ${tally.absolute} 箇所`);
console.log(`  og:url                  : ${tally.ogUrl} 箇所`);
console.log(`  sitemap.xml の <loc>     : ${tally.loc} 箇所`);
console.log(`  変更ファイル数           : ${filesChanged}`);
