#!/usr/bin/env node
/**
 * Cleanup remaining .sd.sN classes:
 * - Group 1 (s567-s580): Footer classes in 3 insight category pages (CSS + HTML)
 * - Group 2 (s601-s614, s636-s649, s671-s684, s766-s779): CSS-only orphans
 */

import { readFileSync, writeFileSync } from 'fs';

const CSS_PATH = '/Users/otiai10/proj/stellar/careers-homepage/docs/assets/css/style.css';
const HTML_FILES = [
  '/Users/otiai10/proj/stellar/careers-homepage/docs/insight-case/index.html',
  '/Users/otiai10/proj/stellar/careers-homepage/docs/insight-interview/index.html',
  '/Users/otiai10/proj/stellar/careers-homepage/docs/insight-work/index.html',
];

// Group 1: s567-s580 footer classes (in HTML + CSS)
// These are the insight category page footer, structurally same as main footer
// but with different CSS custom property variable numbers.
const footerMap = {
  s567: 'insight-cat-footer',
  s568: 'insight-cat-footer-inner',
  s569: 'insight-cat-footer-nav',
  s570: 'insight-cat-footer-brand',
  s571: 'insight-cat-footer-logo',
  s572: 'insight-cat-footer-nav-list',
  s573: 'insight-cat-footer-nav-item',
  s574: 'insight-cat-footer-nav-link',
  s575: 'insight-cat-footer-divider',
  s576: 'insight-cat-footer-bottom',
  s577: 'insight-cat-footer-links',
  s578: 'insight-cat-footer-privacy',
  s579: 'insight-cat-footer-terms',
  s580: 'insight-cat-footer-copyright',
};

// Group 2: CSS-only orphans - card components for different page variants
// Each group of 14 = 3 cards (card2, card3, card4) with wrapper/body/title/excerpt/thumbnail
// Pattern within each group of 14:
//   +0: card2-wrap, +1: card2-body, +2: card2-title, +3: card2-thumb
//   +4: card3-wrap, +5: card3-body, +6: card3-title, +7: card3-excerpt, +8: card3-thumb
//   +9: card4-wrap, +10: card4-body, +11: card4-title, +12: card4-excerpt, +13: card4-thumb

function makeOrphanCardNames(prefix) {
  return {
    0: `${prefix}-card2-wrap`,
    1: `${prefix}-card2-body`,
    2: `${prefix}-card2-title`,
    3: `${prefix}-card2-thumb`,
    4: `${prefix}-card3-wrap`,
    5: `${prefix}-card3-body`,
    6: `${prefix}-card3-title`,
    7: `${prefix}-card3-excerpt`,
    8: `${prefix}-card3-thumb`,
    9: `${prefix}-card4-wrap`,
    10: `${prefix}-card4-body`,
    11: `${prefix}-card4-title`,
    12: `${prefix}-card4-excerpt`,
    13: `${prefix}-card4-thumb`,
  };
}

const orphanGroups = [
  { start: 601, prefix: 'insight-case-orphan' },
  { start: 636, prefix: 'insight-interview-orphan' },
  { start: 671, prefix: 'insight-work-orphan' },
  { start: 766, prefix: 'insight-list-orphan' },
];

// Build full orphan map: sN -> semantic-name
const orphanMap = {};
for (const { start, prefix } of orphanGroups) {
  const names = makeOrphanCardNames(prefix);
  for (let i = 0; i < 14; i++) {
    orphanMap[`s${start + i}`] = names[i];
  }
}

// Combine all mappings
const allMappings = { ...footerMap, ...orphanMap };

console.log('=== Replacement mappings ===');
for (const [sn, name] of Object.entries(allMappings)) {
  console.log(`  ${sn} -> ${name}`);
}
console.log(`Total: ${Object.keys(allMappings).length} mappings\n`);

// --- CSS replacements ---
let css = readFileSync(CSS_PATH, 'utf8');
let cssCount = 0;

for (const [sn, name] of Object.entries(allMappings)) {
  // Replace .sd.sN { with .semantic-name { (remove .sd from selector)
  const cssPattern = new RegExp(`\\.sd\\.${sn}(?=\\s*\\{)`, 'g');
  const before = css;
  css = css.replace(cssPattern, `.${name}`);
  const replacements = (before.length - css.length + css.split(`.${name}`).length - before.split(`.${name}`).length);
  if (css !== before) {
    const count = (before.match(cssPattern) || []).length;
    cssCount += count;
    console.log(`CSS: .sd.${sn} -> .${name} (${count} occurrences)`);
  }
}

writeFileSync(CSS_PATH, css);
console.log(`\nCSS: ${cssCount} total replacements in style.css\n`);

// --- HTML replacements (only Group 1 footer classes) ---
let htmlTotal = 0;
for (const htmlPath of HTML_FILES) {
  let html = readFileSync(htmlPath, 'utf8');
  let fileCount = 0;

  for (const [sn, name] of Object.entries(footerMap)) {
    // In HTML: replace sN with semantic name (word-boundary safe)
    // Classes are space-separated, so we match sN preceded by space/quote and followed by space/quote
    const htmlPattern = new RegExp(`\\b${sn}\\b`, 'g');
    const before = html;
    html = html.replace(htmlPattern, name);
    if (html !== before) {
      const count = (before.match(htmlPattern) || []).length;
      fileCount += count;
    }
  }

  writeFileSync(htmlPath, html);
  htmlTotal += fileCount;
  console.log(`HTML: ${htmlPath.split('/').pop()} in ${htmlPath.split('/').slice(-2, -1)[0]}/ - ${fileCount} replacements`);
}

console.log(`\nHTML: ${htmlTotal} total replacements across ${HTML_FILES.length} files\n`);

// --- Verification ---
const cssAfter = readFileSync(CSS_PATH, 'utf8');
const remaining = cssAfter.match(/\.sd\.s\d+/g);
if (remaining) {
  console.log('WARNING: Remaining .sd.sN patterns in CSS:');
  const unique = [...new Set(remaining)];
  for (const r of unique) {
    console.log(`  ${r}`);
  }
} else {
  console.log('SUCCESS: No remaining .sd.sN patterns in CSS!');
}

// Verify no sN classes left in HTML files
for (const htmlPath of HTML_FILES) {
  const html = readFileSync(htmlPath, 'utf8');
  const sNmatches = html.match(/\bs\d{3}\b/g);
  if (sNmatches) {
    const unique = [...new Set(sNmatches)];
    console.log(`WARNING: Remaining sN classes in ${htmlPath}: ${unique.join(', ')}`);
  }
}
