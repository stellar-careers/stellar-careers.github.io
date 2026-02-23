#!/usr/bin/env node
/**
 * Phase 2: Rename footer component classes from .sd.sN to semantic names.
 *
 * CSS:  .sd.sN  → .semantic-name  (remove .sd prefix)
 * HTML: class="sd ... sN" → class="sd ... semantic-name" (keep .sd)
 */

import { readFileSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';

const DOCS = '/Users/otiai10/proj/stellar/careers-homepage/docs';

// Complete mapping: sN → semantic-name
const MAP = {
  s68: 'footer',
  s69: 'footer-inner',
  s70: 'footer-nav',
  s71: 'footer-brand',
  s72: 'footer-brand-link',
  s73: 'footer-nav-list',
  s74: 'footer-nav-item',
  s75: 'footer-nav-link',
  s76: 'footer-actions',
  s77: 'footer-action-btn',
  s78: 'footer-action-text',
  s79: 'footer-divider',
  s80: 'footer-bottom',
  s81: 'footer-copyright',
};

// ── CSS replacements ──
const cssPath = `${DOCS}/assets/css/style.css`;
let css = readFileSync(cssPath, 'utf8');

for (const [old, sem] of Object.entries(MAP)) {
  // Replace .sd.sN with .semantic-name in CSS selectors
  // Handles: .sd.s68 { / .sd.s68.appear { / .sd.s68:hover { / .sd.s68.appear-active {
  // Use a regex that matches .sd.sN followed by various CSS continuations
  const re = new RegExp(`\\.sd\\.${old}(?=[\\s{:.,])`, 'g');
  css = css.replace(re, `.${sem}`);
}

writeFileSync(cssPath, css, 'utf8');
console.log('CSS updated.');

// ── HTML replacements ──
// Find all HTML files
const htmlFiles = execSync(`find ${DOCS} -name '*.html' -type f`, { encoding: 'utf8' })
  .trim().split('\n');

let totalHtmlChanges = 0;

for (const file of htmlFiles) {
  let html = readFileSync(file, 'utf8');
  const orig = html;

  for (const [old, sem] of Object.entries(MAP)) {
    // In HTML class attributes, sN is surrounded by spaces or quote boundaries
    // Replace word-boundary sN with semantic name
    // Use word boundary matching: sN preceded by space or " and followed by space or "
    const re = new RegExp(`(?<=[\\s"])${old}(?=[\\s"])`, 'g');
    html = html.replace(re, sem);
  }

  if (html !== orig) {
    writeFileSync(file, html, 'utf8');
    totalHtmlChanges++;
  }
}

console.log(`HTML updated: ${totalHtmlChanges} files changed.`);

// ── Verification ──
// Check no old .sd.sN references remain in CSS
let cssVerify = readFileSync(cssPath, 'utf8');
let cssIssues = 0;
for (const old of Object.keys(MAP)) {
  const re = new RegExp(`\\.sd\\.${old}\\b`);
  if (re.test(cssVerify)) {
    console.error(`CSS still contains .sd.${old}`);
    cssIssues++;
  }
}

// Check no old sN class references remain in HTML
let htmlIssues = 0;
for (const file of htmlFiles) {
  const html = readFileSync(file, 'utf8');
  for (const old of Object.keys(MAP)) {
    // Check for sN in class attributes with word boundaries
    const re = new RegExp(`(?<=[\\s"])${old}(?=[\\s"])`, 'g');
    if (re.test(html)) {
      console.error(`HTML ${file} still contains class ${old}`);
      htmlIssues++;
    }
  }
}

if (cssIssues === 0 && htmlIssues === 0) {
  console.log('Verification passed: all old class names replaced.');
} else {
  console.error(`Verification FAILED: ${cssIssues} CSS issues, ${htmlIssues} HTML issues.`);
  process.exit(1);
}
