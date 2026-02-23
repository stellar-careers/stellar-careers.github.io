#!/usr/bin/env node
/**
 * Rename team section classes s20-s67 to semantic names
 * in docs/assets/css/style.css and docs/index.html
 */
import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

// Mapping from old class to new class
const mapping = {
  s20: 'team-section',
  s21: 'team-inner',
  s22: 'team-header',
  s23: 'team-title',
  s24: 'team-subtitle',
  s25: 'team-list',
  // Member 1
  s26: 'team-card-1',
  s27: 'team-card-info-1',
  s28: 'team-card-name-1',
  s29: 'team-card-role-1',
  s30: 'team-card-bio-1',
  s31: 'team-card-photo-wrap-1',
  s32: 'team-card-photo-1',
  // Member 2
  s33: 'team-card-2',
  s34: 'team-card-info-2',
  s35: 'team-card-name-2',
  s36: 'team-card-role-2',
  s37: 'team-card-bio-2',
  s38: 'team-card-photo-wrap-2',
  s39: 'team-card-photo-2',
  // Member 3
  s40: 'team-card-3',
  s41: 'team-card-info-3',
  s42: 'team-card-name-3',
  s43: 'team-card-role-3',
  s44: 'team-card-bio-3',
  s45: 'team-card-photo-wrap-3',
  s46: 'team-card-photo-3',
  // Member 4
  s47: 'team-card-4',
  s48: 'team-card-info-4',
  s49: 'team-card-name-4',
  s50: 'team-card-role-4',
  s51: 'team-card-bio-4',
  s52: 'team-card-photo-wrap-4',
  s53: 'team-card-photo-4',
  // Member 5
  s54: 'team-card-5',
  s55: 'team-card-info-5',
  s56: 'team-card-name-5',
  s57: 'team-card-role-5',
  s58: 'team-card-bio-5',
  s59: 'team-card-photo-wrap-5',
  s60: 'team-card-photo-5',
  // Member 6
  s61: 'team-card-6',
  s62: 'team-card-info-6',
  s63: 'team-card-name-6',
  s64: 'team-card-role-6',
  s65: 'team-card-bio-6',
  s66: 'team-card-photo-wrap-6',
  s67: 'team-card-photo-6',
};

// Sort keys by length descending to avoid partial matches (e.g. s3 matching before s30)
const sortedKeys = Object.keys(mapping).sort((a, b) => b.length - a.length);

function replaceInCSS(content) {
  let result = content;
  for (const old of sortedKeys) {
    // Replace .sd.sN patterns in CSS selectors
    // Match: .sd.s20  but not .sd.s200  (word boundary after number)
    const cssPattern = new RegExp(`\\.sd\\.${old}\\b`, 'g');
    result = result.replace(cssPattern, `.${mapping[old]}`);
  }
  return result;
}

function replaceInHTML(content) {
  let result = content;
  for (const old of sortedKeys) {
    // In HTML class attributes, class names are space-separated
    // Match sN as whole word in class context
    const htmlPattern = new RegExp(`\\b${old}\\b`, 'g');
    result = result.replace(htmlPattern, mapping[old]);
  }
  return result;
}

// Process CSS
const cssPath = resolve(root, 'docs/assets/css/style.css');
let css = readFileSync(cssPath, 'utf8');
const cssBefore = css;
css = replaceInCSS(css);
writeFileSync(cssPath, css);
const cssChanges = cssBefore !== css;
console.log(`CSS: ${cssChanges ? 'CHANGED' : 'NO CHANGES'}`);

// Process HTML
const htmlPath = resolve(root, 'docs/index.html');
let html = readFileSync(htmlPath, 'utf8');
const htmlBefore = html;
html = replaceInHTML(html);
writeFileSync(htmlPath, html);
const htmlChanges = htmlBefore !== html;
console.log(`HTML: ${htmlChanges ? 'CHANGED' : 'NO CHANGES'}`);

// Verify no old references remain
console.log('\n--- Verification ---');
const finalCss = readFileSync(cssPath, 'utf8');
const finalHtml = readFileSync(htmlPath, 'utf8');

let remaining = 0;
for (const old of Object.keys(mapping)) {
  // Check CSS for .sd.sN
  const cssMatches = finalCss.match(new RegExp(`\\.sd\\.${old}\\b`, 'g'));
  if (cssMatches) {
    console.log(`WARNING: CSS still has ${cssMatches.length} occurrences of .sd.${old}`);
    remaining += cssMatches.length;
  }
  // Check HTML for class="...sN..."
  const htmlMatches = finalHtml.match(new RegExp(`\\b${old}\\b`, 'g'));
  if (htmlMatches) {
    console.log(`WARNING: HTML still has ${htmlMatches.length} occurrences of ${old}`);
    remaining += htmlMatches.length;
  }
}

if (remaining === 0) {
  console.log('All old class references successfully replaced!');
} else {
  console.log(`\n${remaining} old references remain!`);
}

// Check that new classes exist
console.log('\n--- New class verification ---');
for (const [old, newCls] of Object.entries(mapping)) {
  const inCss = finalCss.includes(`.${newCls}`);
  const inHtml = finalHtml.includes(newCls);
  if (!inCss) console.log(`WARNING: .${newCls} (was ${old}) not found in CSS`);
  if (!inHtml) console.log(`WARNING: ${newCls} (was ${old}) not found in HTML`);
}
console.log('Done.');
