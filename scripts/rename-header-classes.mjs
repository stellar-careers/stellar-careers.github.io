#!/usr/bin/env node
/**
 * Phase 1: Rename header component classes from .sd.sN to semantic names.
 *
 * CSS:  .sd.sN  →  .semantic-name   (remove .sd prefix)
 * HTML: class="sd ... sN ..."  →  class="sd ... semantic-name ..."  (keep .sd)
 * JS:   .sN  →  .semantic-name
 */

import fs from 'fs';
import path from 'path';

const DOCS = path.resolve('docs');

// Mapping: sN → semantic name
const MAP = {
  s2:  'header-bar',
  s3:  'header-inner',
  s4:  'header-logo-link',
  s5:  'header-logo-img',
  s6:  'header-actions',
  s7:  'header-nav',
  s8:  'header-nav-item',
  s9:  'header-nav-link',
  s10: 'header-nav-item-alt',
  s11: 'header-nav-link-alt',
  s12: 'header-cta-primary',
  s13: 'header-cta-primary-btn',
  s14: 'header-cta-primary-text',
  s15: 'header-cta-secondary',
  s16: 'header-cta-secondary-btn',
  s17: 'header-cta-secondary-text',
  s18: 'header-hamburger',
  s19: 'header-hamburger-icon',
};

// Sort by descending numeric value so s19 is replaced before s1, s18 before s1, etc.
const SORTED_KEYS = Object.keys(MAP).sort((a, b) => {
  const na = parseInt(a.slice(1), 10);
  const nb = parseInt(b.slice(1), 10);
  return nb - na;
});

// ─── CSS ────────────────────────────────────────────────────────────────
function processCSS(filePath) {
  let css = fs.readFileSync(filePath, 'utf8');
  let count = 0;

  for (const key of SORTED_KEYS) {
    const num = key.slice(1); // e.g. "2", "19"
    const sem = MAP[key];
    // Match .sd.sN where N is followed by non-digit (space, {, :, ., newline, etc.)
    // Replace with .semantic-name (removing the .sd prefix)
    const re = new RegExp(`\\.sd\\.s${num}(?=[^0-9])`, 'g');
    const before = css;
    css = css.replace(re, `.${sem}`);
    const matches = (before.match(re) || []).length;
    if (matches > 0) {
      count += matches;
      console.log(`  CSS: .sd.s${num} → .${sem}  (${matches} occurrences)`);
    }
  }

  fs.writeFileSync(filePath, css, 'utf8');
  console.log(`  CSS total replacements: ${count}`);
}

// ─── HTML ───────────────────────────────────────────────────────────────
function processHTML(filePath) {
  let html = fs.readFileSync(filePath, 'utf8');
  let count = 0;

  for (const key of SORTED_KEYS) {
    const num = key.slice(1);
    const sem = MAP[key];
    // Match sN as a whole word inside class attributes
    // Word boundary: preceded by space or " and followed by space or "
    // We replace inside class="..." values only
    const re = new RegExp(`(class="[^"]*?)\\bs${num}\\b([^"]*?")`, 'g');
    const before = html;
    html = html.replace(re, `$1${sem}$2`);
    // Count replacements
    const matches = (before.match(re) || []).length;
    if (matches > 0) {
      count += matches;
    }
  }

  if (count > 0) {
    fs.writeFileSync(filePath, html, 'utf8');
    console.log(`  HTML: ${path.relative(DOCS, filePath)} — ${count} replacements`);
  }
  return count;
}

// ─── JS ─────────────────────────────────────────────────────────────────
function processJS(filePath) {
  let js = fs.readFileSync(filePath, 'utf8');
  let count = 0;

  for (const key of SORTED_KEYS) {
    const num = key.slice(1);
    const sem = MAP[key];
    // Match .sN as CSS selector in JS strings (e.g., '.s18')
    // Must be preceded by ' or " and followed by ' or " or other selector chars
    // Use word boundary after the number
    const re = new RegExp(`(\\.s${num})(?=[^0-9a-zA-Z_-])`, 'g');
    const before = js;
    js = js.replace(re, `.${sem}`);
    const matches = (before.match(re) || []).length;
    if (matches > 0) {
      count += matches;
      console.log(`  JS: .s${num} → .${sem}  (${matches} occurrences)`);
    }
  }

  fs.writeFileSync(filePath, js, 'utf8');
  console.log(`  JS total replacements: ${count}`);
}

// ─── Collect all HTML files ─────────────────────────────────────────────
function collectHTMLFiles(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'assets') continue; // skip assets dir for HTML
      results.push(...collectHTMLFiles(full));
    } else if (entry.name.endsWith('.html')) {
      results.push(full);
    }
  }
  return results;
}

// ─── Main ───────────────────────────────────────────────────────────────
console.log('=== Phase 1: Header Semantic Rename ===\n');

console.log('Processing CSS...');
processCSS(path.join(DOCS, 'assets/css/style.css'));

console.log('\nProcessing HTML...');
const htmlFiles = collectHTMLFiles(DOCS);
let totalHTML = 0;
for (const f of htmlFiles) {
  totalHTML += processHTML(f);
}
console.log(`HTML total replacements: ${totalHTML} across ${htmlFiles.length} files`);

console.log('\nProcessing JS...');
processJS(path.join(DOCS, 'assets/js/main.js'));

console.log('\n=== Done ===');
