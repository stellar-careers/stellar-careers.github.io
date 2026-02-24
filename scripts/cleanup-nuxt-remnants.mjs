#!/usr/bin/env node
/**
 * Remove Nuxt.js/Vue/Studio.Design remnants from all HTML files and CSS.
 *
 * HTML changes:
 *   - Remove <meta name="generator" content="Studio.Design">
 *   - Unwrap the Nuxt shell: __nuxt > container > TitleAnnouncer/DynamicAnnouncer/modals/StudioCanvas
 *   - Keep page content (inside StudioCanvas) + inline :root <style> block
 *   - Remove stray <!----> Vue hydration comments
 *   - Dedent content (was nested 12 spaces → 2 spaces)
 *
 * CSS changes:
 *   - Remove Vue scoped style rules (data-v-*)
 *   - Remove page transition rules, rebranding vars, spinner/keyframes
 *   - Remove .StudioCanvas rule, convert .StudioCanvas > .sd → body > .sd
 *   - Remove .design-canvas__modal rules
 *   - Remove .TitleAnnouncer/.DynamicAnnouncer rules
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { resolve, dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DOCS = resolve(__dirname, '..', 'docs');

// ── Collect all HTML files ──────────────────────────────────────────────

function collectHTML(dir) {
  const results = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry === 'assets') continue; // skip asset directory
      results.push(...collectHTML(full));
    } else if (entry === 'index.html') {
      results.push(full);
    }
  }
  return results;
}

const htmlFiles = collectHTML(DOCS);

// ── Dedent helper ───────────────────────────────────────────────────────

function dedent(str, amount) {
  return str.split('\n').map(line => {
    if (line.trim() === '') return '';
    const currentIndent = line.search(/\S/);
    if (currentIndent === -1) return '';
    const newIndent = Math.max(0, currentIndent - amount);
    return ' '.repeat(newIndent) + line.trimStart();
  }).join('\n');
}

// ── Process HTML files ──────────────────────────────────────────────────

let htmlCount = 0;

for (const file of htmlFiles) {
  let html = readFileSync(file, 'utf-8');
  const original = html;

  // 1. Remove <meta name="generator" content="Studio.Design">
  html = html.replace(/\s*<meta name="generator" content="Studio\.Design">\n/, '\n');

  // 2. Find boundaries
  const bodyStartTag = '<body>';
  const bodyStartIdx = html.indexOf(bodyStartTag);
  if (bodyStartIdx === -1) continue;
  const afterBodyTag = bodyStartIdx + bodyStartTag.length;

  const bodyEndIdx = html.indexOf('</body>');
  // Find <script> only within <body>, not <head>
  const bodySection = html.substring(afterBodyTag, bodyEndIdx);
  const scriptInBody = bodySection.lastIndexOf('<script');
  const scriptIdx = scriptInBody !== -1 ? afterBodyTag + scriptInBody : -1;
  // Use </body> as boundary if no <script> tag in body
  const contentBoundary = scriptIdx !== -1 ? scriptIdx : bodyEndIdx;

  // 3. Find StudioCanvas opening tag
  const studioMarker = '<div class="StudioCanvas"';
  const studioStart = html.indexOf(studioMarker);
  if (studioStart === -1) {
    console.log(`  SKIP (no StudioCanvas): ${file}`);
    continue;
  }
  const studioTagEnd = html.indexOf('>', studioStart) + 1;

  // 4. Find :root <style> block (last </style> before <script> or </body>)
  const bodyContent = html.substring(afterBodyTag, contentBoundary);
  const lastStyleCloseInBody = bodyContent.lastIndexOf('</style>');
  if (lastStyleCloseInBody === -1) {
    console.log(`  SKIP (no :root style): ${file}`);
    continue;
  }
  const absoluteStyleClose = afterBodyTag + lastStyleCloseInBody + '</style>'.length;

  // 5. Extract content: from after StudioCanvas opening tag to end of :root style
  let content = html.substring(studioTagEnd, absoluteStyleClose);

  // 6. Remove stray <!---->  Vue hydration comments
  content = content.replace(/<!---->/g, '');

  // 7. Dedent by 10 spaces (12 → 2 for outermost elements)
  content = dedent(content, 10);

  // 8. Clean up multiple blank lines
  content = content.replace(/\n{3,}/g, '\n\n');

  // 9. Reassemble HTML
  const beforeBody = html.substring(0, afterBodyTag);
  const afterContent = html.substring(contentBoundary);

  html = beforeBody + '\n' + content.trimEnd() + '\n' + (scriptIdx !== -1 ? '  ' : '') + afterContent;

  if (html !== original) {
    writeFileSync(file, html);
    htmlCount++;
  }
}

console.log(`\nHTML: ${htmlCount} files cleaned up`);

// ── Process CSS ─────────────────────────────────────────────────────────

const cssFile = resolve(DOCS, 'assets/css/style.css');
let css = readFileSync(cssFile, 'utf-8');
const originalCSS = css;
const lines = css.split('\n');

// Identify line ranges to remove (0-indexed):
// Lines 0-96:  page transitions, rebranding vars, data-v-* rules, spinner, keyframes
// Lines 117-122: .StudioCanvas { ... }  (keep 123 empty line)
// Lines 123-126: .StudioCanvas > .sd → change to body > .sd
// Lines 1096-1231: snackbar + data-v-757b86f2 rules + fade transitions
// Lines 1232-1292: .design-canvas__modal + .TitleAnnouncer/.DynamicAnnouncer

// Strategy: build new lines array excluding removed ranges, with replacements

const newLines = [];
let i = 0;

// Skip lines 0-96 (page transitions through loading keyframes + trailing blank)
// Find the line that starts the @font-face for grandam
const fontFaceStart = lines.findIndex(l => l.startsWith('@font-face {') || l.includes('font-family: grandam'));
// Actually find the first @font-face block
const firstFontFace = lines.findIndex((l, idx) => idx > 0 && l === '@font-face {');

if (firstFontFace > 0) {
  // Skip everything before the first @font-face
  i = firstFontFace;
  // Also skip any blank line right before it
  // (we want to start clean)
}

while (i < lines.length) {
  const line = lines[i];

  // Remove .StudioCanvas { ... } block (5 lines including closing brace + blank)
  if (line === '.StudioCanvas {') {
    // Skip until closing brace + blank line
    while (i < lines.length && lines[i] !== '') i++;
    i++; // skip the blank line
    continue;
  }

  // Replace .StudioCanvas > .sd with body > .sd
  if (line === '.StudioCanvas > .sd {') {
    newLines.push('body > .sd {');
    i++;
    continue;
  }

  // Remove data-v-* rule blocks
  if (line.includes('[data-v-')) {
    // Skip this rule block (until blank line or next rule)
    while (i < lines.length && lines[i] !== '') i++;
    i++; // skip blank line
    continue;
  }

  // Remove @keyframes with data-v hash
  if (line.startsWith('@keyframes loading-spin-')) {
    // Skip @keyframes block (nested braces)
    let braceCount = 0;
    while (i < lines.length) {
      if (lines[i].includes('{')) braceCount++;
      if (lines[i].includes('}')) braceCount--;
      i++;
      if (braceCount === 0) break;
    }
    if (i < lines.length && lines[i] === '') i++; // skip trailing blank
    continue;
  }

  // Remove @media blocks that only contain data-v-* rules
  if (line.startsWith('@media') && i + 1 < lines.length && lines[i + 1].includes('[data-v-')) {
    let braceCount = 0;
    const blockStart = i;
    while (i < lines.length) {
      if (lines[i].includes('{')) braceCount++;
      if (lines[i].includes('}')) braceCount--;
      i++;
      if (braceCount === 0) break;
    }
    if (i < lines.length && lines[i] === '') i++; // skip trailing blank
    continue;
  }

  // Remove .design-canvas__modal blocks
  if (line.startsWith('.design-canvas__modal')) {
    while (i < lines.length && lines[i] !== '') i++;
    i++; // skip blank line
    continue;
  }

  // Remove .TitleAnnouncer, .DynamicAnnouncer block
  if (line === '.TitleAnnouncer,' || line === '.TitleAnnouncer, .DynamicAnnouncer {' ||
      (line === '.TitleAnnouncer,' && i + 1 < lines.length && lines[i + 1] === '.DynamicAnnouncer {')) {
    while (i < lines.length && lines[i] !== '') i++;
    i++; // skip blank line
    continue;
  }

  // Remove .page-enter-active, .page-leave-active, .page-enter-from/.page-leave-to
  if (line.startsWith('.page-enter') || line.startsWith('.page-leave')) {
    while (i < lines.length && lines[i] !== '') i++;
    i++;
    continue;
  }

  // Remove :root with --rebranding vars
  if (line === ':root {' && i + 1 < lines.length && lines[i + 1].includes('--rebranding')) {
    while (i < lines.length && lines[i] !== '') i++;
    i++;
    continue;
  }

  newLines.push(line);
  i++;
}

// Clean up multiple consecutive blank lines
const cleanedLines = [];
let prevBlank = false;
for (const line of newLines) {
  if (line === '') {
    if (prevBlank) continue; // skip consecutive blanks
    prevBlank = true;
  } else {
    prevBlank = false;
  }
  cleanedLines.push(line);
}

// Remove leading blank lines
while (cleanedLines.length > 0 && cleanedLines[0] === '') {
  cleanedLines.shift();
}

const newCSS = cleanedLines.join('\n');
if (newCSS !== originalCSS) {
  writeFileSync(cssFile, newCSS);
  const removedLines = lines.length - cleanedLines.length;
  console.log(`CSS: ${removedLines} lines removed (${lines.length} → ${cleanedLines.length})`);
} else {
  console.log('CSS: no changes');
}
