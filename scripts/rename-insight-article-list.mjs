#!/usr/bin/env node
/**
 * Phase 13+14: Rename insight article template classes (s686-s704)
 * and insight list page classes (s746-s765) to semantic names.
 *
 * CSS: .sd.sN  → .semantic-name  (remove .sd prefix from selector)
 * HTML: keep .sd on elements, replace sN with semantic-name
 */

import { readFileSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';

const ROOT = '/Users/otiai10/proj/stellar/careers-homepage/docs';
const CSS_PATH = `${ROOT}/assets/css/style.css`;

// Phase 13: Insight article template
const ARTICLE_MAP = {
  s686: 'insight-article-page',
  s687: 'insight-article-layout',
  s689: 'insight-article-content',
  s690: 'insight-article-main',
  s691: 'insight-article-section',
  s692: 'insight-article-hero-overlay',
  s693: 'insight-article-hero-inner',
  s694: 'insight-article-hero-title',
  s695: 'insight-article-body-wrap',
  s696: 'insight-article-body-inner',
  s697: 'insight-article-heading',
  s698: 'insight-article-card',
  s699: 'insight-article-cover',
  s700: 'insight-article-richtext',
  s701: 'insight-article-back-btn',
  s702: 'insight-article-back-icon',
  s703: 'insight-article-back-text',
  s704: 'insight-article-hero-bg',
};

// Phase 14: Insight list page
const LIST_MAP = {
  s746: 'insight-list-page',
  s747: 'insight-list-layout',
  s749: 'insight-list-hero',
  s750: 'insight-list-hero-inner',
  s751: 'insight-list-hero-title',
  s752: 'insight-list-feature',
  s753: 'insight-list-tabs',
  s754: 'insight-list-tab-btn',
  s755: 'insight-list-tab-text',
  s756: 'insight-list-tab-btn-alt',
  s757: 'insight-list-tab-text-alt',
  s758: 'insight-list-tab-btn-alt2',
  s759: 'insight-list-tab-text-alt2',
  s760: 'insight-list-grid-wrap',
  s761: 'insight-list-grid',
  s762: 'insight-list-card',
  s763: 'insight-list-card-info',
  s764: 'insight-list-card-title',
  s765: 'insight-list-card-img',
};

const ALL_MAP = { ...ARTICLE_MAP, ...LIST_MAP };

// ---- CSS Replacement ----
function replaceCss() {
  let css = readFileSync(CSS_PATH, 'utf8');
  let count = 0;

  for (const [oldClass, newName] of Object.entries(ALL_MAP)) {
    // Replace .sd.sN patterns in CSS selectors
    // Handles: .sd.sN {, .sd.sN.appear, .sd.sN:hover, .sd.sN>p, .sd.sN a, etc.
    const re = new RegExp(`\\.sd\\.${oldClass}(?=[\\s{:>.&,])`, 'g');
    const before = css;
    css = css.replace(re, `.${newName}`);
    const matches = (before.match(re) || []).length;
    if (matches > 0) {
      count += matches;
      console.log(`  CSS: .sd.${oldClass} → .${newName} (${matches} occurrences)`);
    }
  }

  writeFileSync(CSS_PATH, css);
  console.log(`\nCSS total: ${count} replacements in style.css\n`);
}

// ---- HTML Replacement ----
function replaceHtml() {
  // Find all insight article pages
  const articlePages = execSync(
    `find ${ROOT}/insight -name index.html -path '*/insight/*/index.html'`,
    { encoding: 'utf8' }
  ).trim().split('\n').filter(Boolean);

  // Also the insight list page
  const listPage = `${ROOT}/insight/index.html`;
  const allPages = [...articlePages, listPage];

  let totalCount = 0;

  for (const filePath of allPages) {
    let html = readFileSync(filePath, 'utf8');
    let fileCount = 0;

    for (const [oldClass, newName] of Object.entries(ALL_MAP)) {
      // In HTML: replace class="... sN ..." with class="... semantic-name ..."
      // Word-boundary-safe: match sN surrounded by class-boundary chars (space, quote, end)
      const re = new RegExp(`(?<=\\s|")${oldClass}(?=\\s|"|$)`, 'g');
      const before = html;
      html = html.replace(re, newName);
      const matches = (before.match(re) || []).length;
      fileCount += matches;
    }

    if (fileCount > 0) {
      writeFileSync(filePath, html);
      totalCount += fileCount;
      const rel = filePath.replace(ROOT, '');
      console.log(`  HTML: ${rel} (${fileCount} replacements)`);
    }
  }

  console.log(`\nHTML total: ${totalCount} replacements across ${allPages.length} files\n`);
}

// ---- Main ----
console.log('=== Phase 13+14: Insight Article + List Semantic Rename ===\n');
console.log('--- CSS Replacements ---');
replaceCss();
console.log('--- HTML Replacements ---');
replaceHtml();

// ---- Verification ----
console.log('--- Verification ---');
const oldClasses = Object.keys(ALL_MAP);
let residual = 0;

// Check CSS
const cssContent = readFileSync(CSS_PATH, 'utf8');
for (const oldClass of oldClasses) {
  const re = new RegExp(`\\.sd\\.${oldClass}(?=[\\s{:>.&,])`, 'g');
  const matches = (cssContent.match(re) || []).length;
  if (matches > 0) {
    console.log(`  WARNING: CSS still has .sd.${oldClass} (${matches} occurrences)`);
    residual += matches;
  }
}

// Check HTML
const allHtmlFiles = execSync(
  `find ${ROOT}/insight -name index.html`,
  { encoding: 'utf8' }
).trim().split('\n').filter(Boolean);

for (const filePath of allHtmlFiles) {
  const html = readFileSync(filePath, 'utf8');
  for (const oldClass of oldClasses) {
    const re = new RegExp(`(?<=\\s|")${oldClass}(?=\\s|"|$)`, 'g');
    const matches = (html.match(re) || []).length;
    if (matches > 0) {
      const rel = filePath.replace(ROOT, '');
      console.log(`  WARNING: HTML ${rel} still has ${oldClass} (${matches})`);
      residual += matches;
    }
  }
}

if (residual === 0) {
  console.log('  All old class references removed successfully!');
} else {
  console.log(`  ${residual} residual references remain.`);
}
