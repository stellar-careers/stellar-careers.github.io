#!/usr/bin/env node
/**
 * Phase 9: Blog list + Blog post semantic CSS rename
 * Replaces .sd.sN selectors in CSS and sN classes in HTML
 */
import { readFileSync, writeFileSync } from 'fs';

const MAP = {
  // Blog list page
  s407: 'blog-list-page',
  s409: 'blog-list-body',
  s410: 'blog-list-hero',
  s411: 'blog-list-hero-overlay',
  s412: 'blog-list-hero-title',
  s413: 'blog-list-section',
  s414: 'blog-list-grid',
  s415: 'blog-list-card',
  s416: 'blog-list-card-img',
  s417: 'blog-list-card-body',
  s418: 'blog-list-card-date',
  s419: 'blog-list-card-title',
  s420: 'blog-list-card-excerpt',
  // Blog post pages
  s422: 'blog-post-page',
  s424: 'blog-post-body',
  s425: 'blog-post-main',
  s426: 'blog-post-section',
  s427: 'blog-post-hero-gradient',
  s428: 'blog-post-hero-content',
  s429: 'blog-post-hero-title',
  s430: 'blog-post-article-section',
  s431: 'blog-post-article-inner',
  s432: 'blog-post-meta',
  s433: 'blog-post-tag',
  s434: 'blog-post-date',
  s435: 'blog-post-heading',
  s436: 'blog-post-content',
  s437: 'blog-post-featured-img',
  s438: 'blog-post-richtext',
  s439: 'blog-post-back-btn',
  s440: 'blog-post-back-icon',
  s441: 'blog-post-back-text',
  s442: 'blog-post-bg-image',
  s443: 'blog-post-bg-reveal',
};

// --- CSS replacement ---
function replaceCss(filePath) {
  let css = readFileSync(filePath, 'utf8');
  let count = 0;
  for (const [old, sem] of Object.entries(MAP)) {
    // .sd.sN  ->  .semantic-name   (remove .sd prefix)
    // Handles: .sd.sN{  .sd.sN   .sd.sN.  .sd.sN:  .sd.sN>  .sd.sN&  .sd.sN(space)
    const re = new RegExp(`\\.sd\\.${old}(?=[\\s{.:>&])`, 'g');
    css = css.replace(re, `.${sem}`);
    const matches = css.match(re);
    // Count by checking how many remain (should be 0)
  }
  // Verify no old references remain
  for (const old of Object.keys(MAP)) {
    const check = new RegExp(`\\.sd\\.${old}(?=[\\s{.:>&])`, 'g');
    const remaining = (css.match(check) || []).length;
    if (remaining > 0) {
      console.error(`WARNING: ${remaining} remaining .sd.${old} in CSS`);
    }
  }
  writeFileSync(filePath, css);
  console.log(`CSS updated: ${filePath}`);
}

// --- HTML replacement ---
function replaceHtml(filePath) {
  let html = readFileSync(filePath, 'utf8');
  for (const [old, sem] of Object.entries(MAP)) {
    // In HTML class attributes, replace sN with semantic name (keep .sd on elements)
    // Word-boundary safe: sN must be bounded by space, quote, or start/end of class attr
    const re = new RegExp(`(?<=\\s|")${old}(?=\\s|")`, 'g');
    html = html.replace(re, sem);
  }
  // Verify no old references remain
  for (const old of Object.keys(MAP)) {
    const check = new RegExp(`(?<=\\s|")${old}(?=\\s|")`, 'g');
    const remaining = (html.match(check) || []).length;
    if (remaining > 0) {
      console.error(`WARNING: ${remaining} remaining ${old} in ${filePath}`);
    }
  }
  writeFileSync(filePath, html);
  console.log(`HTML updated: ${filePath}`);
}

const CSS_FILE = 'docs/assets/css/style.css';
const HTML_FILES = [
  'docs/blog/index.html',
  'docs/blog/jAE0iKDv/index.html',
  'docs/blog/lHJC6vQA/index.html',
];

replaceCss(CSS_FILE);
for (const f of HTML_FILES) {
  replaceHtml(f);
}

console.log('\nPhase 9 complete. Verifying...');

// Final verification
const cssContent = readFileSync(CSS_FILE, 'utf8');
let issues = 0;
for (const old of Object.keys(MAP)) {
  const re = new RegExp(`\\.sd\\.${old}\\b`, 'g');
  const m = (cssContent.match(re) || []).length;
  if (m > 0) { console.error(`ISSUE: ${m} .sd.${old} still in CSS`); issues++; }
}
for (const f of HTML_FILES) {
  const html = readFileSync(f, 'utf8');
  for (const old of Object.keys(MAP)) {
    const re = new RegExp(`\\b${old}\\b`, 'g');
    const m = (html.match(re) || []).length;
    if (m > 0) { console.error(`ISSUE: ${m} ${old} still in ${f}`); issues++; }
  }
}
if (issues === 0) {
  console.log('All clean - no old sN references remain.');
} else {
  console.error(`${issues} issues found.`);
}
