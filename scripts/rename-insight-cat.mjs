#!/usr/bin/env node
/**
 * Phase 12+14: Rename insight category page sN classes to semantic names.
 * Covers insight-case, insight-interview, insight-work, and insight (main listing).
 *
 * CSS rule:  .sd.sN { → .semantic-name {   (drop .sd compound)
 * HTML rule: keep .sd on elements, replace sN with semantic-name
 */

import { readFileSync, writeFileSync } from 'fs';

// Semantic names for each structural role
const SEMANTIC = {
  pageRoot:     'insight-cat-page',
  pageInner:    'insight-cat-wrap',
  hero:         'insight-cat-hero',
  heroOverlay:  'insight-cat-hero-overlay',
  heroTitle:    'insight-cat-hero-title',
  section:      'insight-cat-section',
  tabs:         'insight-cat-tabs',
  tabBtn:       'insight-cat-tab-btn',
  tabText:      'insight-cat-tab-text',
  tabBtnAlt1:   'insight-cat-tab-btn-alt1',
  tabTextAlt1:  'insight-cat-tab-text-alt1',
  tabBtnAlt2:   'insight-cat-tab-btn-alt2',
  tabTextAlt2:  'insight-cat-tab-text-alt2',
  articles:     'insight-cat-articles',
  grid:         'insight-cat-grid',
  card:         'insight-cat-card',
  cardBody:     'insight-cat-card-body',
  cardTitle:    'insight-cat-card-title',
  cardImg:      'insight-cat-card-img',
};

// Each page maps its sN numbers to the same template roles (in positional order)
const PAGES = [
  {
    name: 'insight-case',
    html: 'docs/insight-case/index.html',
    map: {
      s581: SEMANTIC.pageRoot,
      s582: SEMANTIC.pageInner,
      s584: SEMANTIC.hero,
      s585: SEMANTIC.heroOverlay,
      s586: SEMANTIC.heroTitle,
      s587: SEMANTIC.section,
      s588: SEMANTIC.tabs,
      s589: SEMANTIC.tabBtn,
      s590: SEMANTIC.tabText,
      s591: SEMANTIC.tabBtnAlt1,
      s592: SEMANTIC.tabTextAlt1,
      s593: SEMANTIC.tabBtnAlt2,
      s594: SEMANTIC.tabTextAlt2,
      s595: SEMANTIC.articles,
      s596: SEMANTIC.grid,
      s597: SEMANTIC.card,
      s598: SEMANTIC.cardBody,
      s599: SEMANTIC.cardTitle,
      s600: SEMANTIC.cardImg,
    },
  },
  {
    name: 'insight-interview',
    html: 'docs/insight-interview/index.html',
    map: {
      s616: SEMANTIC.pageRoot,
      s617: SEMANTIC.pageInner,
      s619: SEMANTIC.hero,
      s620: SEMANTIC.heroOverlay,
      s621: SEMANTIC.heroTitle,
      s622: SEMANTIC.section,
      s623: SEMANTIC.tabs,
      s624: SEMANTIC.tabBtn,
      s625: SEMANTIC.tabText,
      s626: SEMANTIC.tabBtnAlt1,
      s627: SEMANTIC.tabTextAlt1,
      s628: SEMANTIC.tabBtnAlt2,
      s629: SEMANTIC.tabTextAlt2,
      s630: SEMANTIC.articles,
      s631: SEMANTIC.grid,
      s632: SEMANTIC.card,
      s633: SEMANTIC.cardBody,
      s634: SEMANTIC.cardTitle,
      s635: SEMANTIC.cardImg,
    },
  },
  {
    name: 'insight-work',
    html: 'docs/insight-work/index.html',
    map: {
      s651: SEMANTIC.pageRoot,
      s652: SEMANTIC.pageInner,
      s654: SEMANTIC.hero,
      s655: SEMANTIC.heroOverlay,
      s656: SEMANTIC.heroTitle,
      s657: SEMANTIC.section,
      s658: SEMANTIC.tabs,
      s659: SEMANTIC.tabBtn,
      s660: SEMANTIC.tabText,
      s661: SEMANTIC.tabBtnAlt1,
      s662: SEMANTIC.tabTextAlt1,
      s663: SEMANTIC.tabBtnAlt2,
      s664: SEMANTIC.tabTextAlt2,
      s665: SEMANTIC.articles,
      s666: SEMANTIC.grid,
      s667: SEMANTIC.card,
      s668: SEMANTIC.cardBody,
      s669: SEMANTIC.cardTitle,
      s670: SEMANTIC.cardImg,
    },
  },
  {
    name: 'insight (main listing)',
    html: 'docs/insight/index.html',
    map: {
      s746: SEMANTIC.pageRoot,
      s747: SEMANTIC.pageInner,
      s749: SEMANTIC.hero,
      s750: SEMANTIC.heroOverlay,
      s751: SEMANTIC.heroTitle,
      s752: SEMANTIC.section,
      s753: SEMANTIC.tabs,
      s754: SEMANTIC.tabBtn,
      s755: SEMANTIC.tabText,
      s756: SEMANTIC.tabBtnAlt1,
      s757: SEMANTIC.tabTextAlt1,
      s758: SEMANTIC.tabBtnAlt2,
      s759: SEMANTIC.tabTextAlt2,
      s760: SEMANTIC.articles,
      s761: SEMANTIC.grid,
      s762: SEMANTIC.card,
      s763: SEMANTIC.cardBody,
      s764: SEMANTIC.cardTitle,
      s765: SEMANTIC.cardImg,
    },
  },
];

const ROOT = new URL('..', import.meta.url).pathname;

// ── CSS replacements ──
const cssPath = ROOT + 'docs/assets/css/style.css';
let css = readFileSync(cssPath, 'utf8');
let cssCount = 0;

for (const page of PAGES) {
  for (const [sN, semantic] of Object.entries(page.map)) {
    // Replace .sd.sN selectors (including :before/:after pseudo-elements)
    // .sd.sN  →  .semantic-name
    // .sd.sN: →  .semantic-name:
    const re = new RegExp(`\\.sd\\.${sN}\\b`, 'g');
    const before = css;
    css = css.replace(re, `.${semantic}`);
    const diff = (before.match(re) || []).length;
    if (diff > 0) {
      cssCount += diff;
      console.log(`  CSS: .sd.${sN} → .${semantic}  (${diff} occurrences)`);
    }
  }
}

writeFileSync(cssPath, css, 'utf8');
console.log(`\nCSS total: ${cssCount} replacements in style.css\n`);

// ── HTML replacements ──
let htmlTotal = 0;

for (const page of PAGES) {
  const htmlPath = ROOT + page.html;
  let html = readFileSync(htmlPath, 'utf8');
  let pageCount = 0;

  for (const [sN, semantic] of Object.entries(page.map)) {
    // In class attributes, replace sN with semantic (word-boundary safe)
    const re = new RegExp(`\\b${sN}\\b`, 'g');
    const before = html;
    html = html.replace(re, semantic);
    const diff = (before.match(re) || []).length;
    if (diff > 0) {
      pageCount += diff;
    }
  }

  writeFileSync(htmlPath, html, 'utf8');
  console.log(`  HTML: ${page.name} — ${pageCount} replacements`);
  htmlTotal += pageCount;
}

console.log(`\nHTML total: ${htmlTotal} replacements across ${PAGES.length} files`);
console.log('\nDone!');
