#!/usr/bin/env node
/**
 * Phase 5: Rename stories section classes s97-s188 to semantic names.
 * Each card keeps its own class because CSS custom property chains differ.
 */
import { readFileSync, writeFileSync } from 'node:fs';

// ── mapping ──────────────────────────────────────────────────────────
const mapping = {
  // Section wrapper
  s97:  'stories-section',
  s98:  'stories-header',
  s99:  'stories-title',
  s100: 'stories-subtitle',
  s101: 'stories-viewport',
  s102: 'stories-track',
  s103: 'stories-list',

  // Card 1
  s104: 'stories-card-1',
  s105: 'stories-card-1-top',
  s106: 'stories-card-1-info',
  s107: 'stories-card-1-result',
  s108: 'stories-card-1-metric',
  s109: 'stories-card-1-name',
  s110: 'stories-card-1-photo',
  s111: 'stories-card-1-quote',
  s112: 'stories-card-1-qicon',
  s113: 'stories-card-1-qtext',

  // Card 2
  s114: 'stories-card-2',
  s115: 'stories-card-2-top',
  s116: 'stories-card-2-info',
  s117: 'stories-card-2-result',
  s118: 'stories-card-2-metric',
  s119: 'stories-card-2-name',
  s120: 'stories-card-2-photo',
  s121: 'stories-card-2-quote',
  s122: 'stories-card-2-qicon',
  s123: 'stories-card-2-qtext',

  // Card 3
  s124: 'stories-card-3',
  s125: 'stories-card-3-top',
  s126: 'stories-card-3-info',
  s127: 'stories-card-3-result',
  s128: 'stories-card-3-metric',
  s129: 'stories-card-3-name',
  s130: 'stories-card-3-photo',
  s131: 'stories-card-3-quote',
  s132: 'stories-card-3-qicon',
  s133: 'stories-card-3-qtext',

  // Card 4
  s134: 'stories-card-4',
  s135: 'stories-card-4-top',
  s136: 'stories-card-4-info',
  s137: 'stories-card-4-result',
  s138: 'stories-card-4-metric',
  s139: 'stories-card-4-name',
  s140: 'stories-card-4-photo',
  s141: 'stories-card-4-quote',
  s142: 'stories-card-4-qicon',
  s143: 'stories-card-4-qtext',

  // Card 5
  s144: 'stories-card-5',
  s145: 'stories-card-5-top',
  s146: 'stories-card-5-info',
  s147: 'stories-card-5-result',
  s148: 'stories-card-5-metric',
  s149: 'stories-card-5-name',
  s150: 'stories-card-5-photo',
  s151: 'stories-card-5-quote',
  s152: 'stories-card-5-qicon',
  s153: 'stories-card-5-qtext',

  // Card 6
  s154: 'stories-card-6',
  s155: 'stories-card-6-top',
  s156: 'stories-card-6-info',
  s157: 'stories-card-6-result',
  s158: 'stories-card-6-metric',
  s159: 'stories-card-6-name',
  s160: 'stories-card-6-photo',
  s161: 'stories-card-6-quote',
  s162: 'stories-card-6-qicon',
  s163: 'stories-card-6-qtext',

  // Card 7
  s164: 'stories-card-7',
  s165: 'stories-card-7-top',
  s166: 'stories-card-7-info',
  s167: 'stories-card-7-result',
  s168: 'stories-card-7-metric',
  s169: 'stories-card-7-name',
  s170: 'stories-card-7-photo',
  s171: 'stories-card-7-quote',
  s172: 'stories-card-7-qicon',
  s173: 'stories-card-7-qtext',

  // Card 8
  s174: 'stories-card-8',
  s175: 'stories-card-8-top',
  s176: 'stories-card-8-info',
  s177: 'stories-card-8-result',
  s178: 'stories-card-8-metric',
  s179: 'stories-card-8-name',
  s180: 'stories-card-8-photo',
  s181: 'stories-card-8-quote',
  s182: 'stories-card-8-qicon',
  s183: 'stories-card-8-qtext',

  // Scroll indicator (below cards, outside <ul>)
  s184: 'stories-scroll',
  s185: 'stories-scroll-line',
  s186: 'stories-scroll-btn',
  s187: 'stories-scroll-label',
  s188: 'stories-scroll-icon',
};

// ── helpers ──────────────────────────────────────────────────────────
function replaceInFile(filePath, dryRun = false) {
  let content = readFileSync(filePath, 'utf8');
  const original = content;
  let totalReplacements = 0;

  // Sort by numeric suffix descending so s188 is replaced before s18, s110 before s11, etc.
  const sorted = Object.entries(mapping).sort((a, b) => {
    const na = parseInt(a[0].slice(1), 10);
    const nb = parseInt(b[0].slice(1), 10);
    return nb - na;
  });

  for (const [old, sem] of sorted) {
    // In CSS:  .sd.sN  →  .stories-xxx   (drop .sd. prefix)
    // In HTML: class="... sN ..."  →  class="... stories-xxx ..."
    // In JS:   '.sN'  →  '.stories-xxx'

    if (filePath.endsWith('.css')) {
      // Replace .sd.sN with .stories-xxx  (word-boundary safe via the dot prefix)
      const cssRe = new RegExp(`\\.sd\\.${old}\\b`, 'g');
      const before = content;
      content = content.replace(cssRe, `.${sem}`);
      const count = (before.length - content.length !== 0) ? (before.match(cssRe) || []).length : 0;
      totalReplacements += count;
    } else if (filePath.endsWith('.html')) {
      // In HTML class attributes: match sN as a whole word in class strings
      // Use word boundary to avoid matching s1 inside s10, s100 etc.
      const htmlRe = new RegExp(`\\b${old}\\b`, 'g');
      const before = content;
      content = content.replace(htmlRe, sem);
      const count = (before.length - content.length !== 0) ? (before.match(htmlRe) || []).length : 0;
      totalReplacements += count;
    } else if (filePath.endsWith('.js')) {
      // In JS: '.sN' selector strings
      const jsRe = new RegExp(`\\.${old}\\b`, 'g');
      const before = content;
      content = content.replace(jsRe, `.${sem}`);
      const count = (before.length - content.length !== 0) ? (before.match(jsRe) || []).length : 0;
      totalReplacements += count;
    }
  }

  if (content !== original && !dryRun) {
    writeFileSync(filePath, content, 'utf8');
  }
  return totalReplacements;
}

// ── main ─────────────────────────────────────────────────────────────
const cssFile = 'docs/assets/css/style.css';
const htmlFile = 'docs/index.html';
const jsFile  = 'docs/assets/js/main.js';

console.log('Phase 5: Renaming stories section classes (s97-s188)...\n');

const cssCount  = replaceInFile(cssFile);
const htmlCount = replaceInFile(htmlFile);
const jsCount   = replaceInFile(jsFile);

console.log(`CSS  replacements: ${cssCount}`);
console.log(`HTML replacements: ${htmlCount}`);
console.log(`JS   replacements: ${jsCount}`);
console.log(`Total: ${cssCount + htmlCount + jsCount}`);

// ── verify no leftover sN references in the range ────────────────────
console.log('\nVerifying no leftover s97-s188 references...');
let hasLeftover = false;
for (const f of [cssFile, htmlFile, jsFile]) {
  const text = readFileSync(f, 'utf8');
  for (let i = 97; i <= 188; i++) {
    // Check for class-like usage patterns
    const patterns = [
      new RegExp(`\\.sd\\.s${i}\\b`),           // CSS selector
      new RegExp(`\\bclass="[^"]*\\bs${i}\\b`), // HTML class
      new RegExp(`'\\.s${i}\\b`),                // JS selector string
    ];
    for (const p of patterns) {
      if (p.test(text)) {
        console.log(`  LEFTOVER in ${f}: pattern ${p.source} still matches`);
        hasLeftover = true;
      }
    }
  }
}

if (!hasLeftover) {
  console.log('  All clear! No leftover references found.');
} else {
  console.log('  WARNING: Some leftover references remain!');
  process.exit(1);
}
