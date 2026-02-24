#!/usr/bin/env node
/**
 * Convert all absolute paths in docs/ HTML files to relative paths.
 *
 * This is a one-time migration script. After running, the site works
 * on any hosting path without a build step.
 *
 * Also converts og:image / twitter:image to full URLs for social media crawlers.
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname, relative } from 'path';
import { fileURLToPath } from 'url';
import { globSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DOCS = resolve(__dirname, '..', 'docs');
const DOMAIN = 'https://stellar-careers.com';

const htmlFiles = globSync('**/index.html', { cwd: DOCS }).map(f => resolve(DOCS, f));

let totalFiles = 0;

for (const file of htmlFiles) {
  let html = readFileSync(file, 'utf-8');
  const original = html;

  // Calculate depth: number of directories between docs/ and index.html
  const rel = relative(DOCS, file); // e.g. "index.html", "about-us/index.html", "insight/8SEZNhnw/index.html"
  const parts = rel.split('/').filter(p => p !== 'index.html');
  const depth = parts.length; // 0, 1, or 2

  // Prefix for relative paths: "" for depth 0, "../" for depth 1, "../../" for depth 2
  const prefix = '../'.repeat(depth);

  // Home link replacement: href="/" → ".", "..", "../.."
  const homeTarget = depth === 0 ? '.' : '../'.repeat(depth).replace(/\/$/, '');

  // === Step 1: Convert og:image and twitter:image to full URLs ===
  // Match: content="/assets/..." on og:image or twitter:image meta tags
  html = html.replace(
    /(<meta\s+property=["'](?:og:image|twitter:image)["']\s+content=["'])\/(?!\/|https?:)(.*?)(["'])/g,
    `$1${DOMAIN}/$2$3`
  );
  // Also handle reversed attribute order: content="..." property="og:image"
  html = html.replace(
    /(content=["'])\/(?!\/|https?:)(assets\/images\/[^"']*)(["'][^>]*property=["'](?:og:image|twitter:image)["'])/g,
    `$1${DOMAIN}/$2$3`
  );

  // === Step 2: Convert href="/" (home link) ===
  html = html.replace(
    /(href=["'])\/(?=["'])/g,
    `$1${homeTarget}`
  );

  // === Step 3: Convert href/src/content with internal absolute paths ===
  // Match ="/..." but NOT "//...", "https://...", "http://..."
  // For content=, only match content="/assets/..." (avoid text content values)
  html = html.replace(
    /((?:href|src)=["'])\/(?!\/|https?:)(.*?)(["'])/g,
    `$1${prefix}$2$3`
  );
  // content= only for paths starting with /assets/ (og:image already handled above)
  html = html.replace(
    /(content=["'])\/(?!\/|https?:)(assets\/.*?)(["'])/g,
    `$1${prefix}$2$3`
  );

  // === Step 4: Convert url() in inline <style> blocks ===
  // url("/assets/...") and url('/assets/...')
  html = html.replace(
    /(url\(["'])\/(?!\/|https?:|data:)(.*?)(["']\))/g,
    `$1${prefix}$2$3`
  );

  if (html !== original) {
    writeFileSync(file, html);
    totalFiles++;
  }
}

console.log(`Converted ${totalFiles} files to relative paths`);
