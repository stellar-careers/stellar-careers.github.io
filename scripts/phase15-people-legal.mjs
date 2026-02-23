#!/usr/bin/env node
/**
 * Phase 15: Rename people + legal (policy/privacy) page sN classes to semantic names
 *
 * Rules:
 * - CSS: `.sd.sN {` -> `.semantic-name {` (remove .sd from selector)
 * - HTML: keep .sd class on elements, replace sN with semantic-name
 * - Fix NaNpx bug in s809, s873, s885
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const DOCS = '/Users/otiai10/proj/stellar/careers-homepage/docs';

// ── Mapping ──────────────────────────────────────────────────────────────────

const MAP = {
  // Our People page
  s801: 'people-page',
  s802: 'people-page-inner',
  s804: 'people-hero',
  s805: 'people-hero-overlay',
  s806: 'people-hero-content',
  s807: 'people-hero-title-wrap',
  s808: 'people-hero-title',
  s809: 'people-hero-gradient',
  s810: 'people-section',
  s811: 'people-section-inner',
  s812: 'people-grid',
  s813: 'people-card-1',
  s814: 'people-card-1-info',
  s815: 'people-card-1-name',
  s816: 'people-card-1-role',
  s817: 'people-card-1-bio',
  s818: 'people-card-1-photo-wrap',
  s819: 'people-card-1-photo',
  s820: 'people-card-2',
  s821: 'people-card-2-info',
  s822: 'people-card-2-name',
  s823: 'people-card-2-role',
  s824: 'people-card-2-bio',
  s825: 'people-card-2-photo-wrap',
  s826: 'people-card-2-photo',
  s827: 'people-card-3',
  s828: 'people-card-3-info',
  s829: 'people-card-3-name',
  s830: 'people-card-3-role',
  s831: 'people-card-3-bio',
  s832: 'people-card-3-photo-wrap',
  s833: 'people-card-3-photo',
  s834: 'people-card-4',
  s835: 'people-card-4-info',
  s836: 'people-card-4-name',
  s837: 'people-card-4-role',
  s838: 'people-card-4-bio',
  s839: 'people-card-4-photo-wrap',
  s840: 'people-card-4-photo',
  s841: 'people-card-5',
  s842: 'people-card-5-info',
  s843: 'people-card-5-name',
  s844: 'people-card-5-role',
  s845: 'people-card-5-bio',
  s846: 'people-card-5-photo-wrap',
  s847: 'people-card-5-photo',
  s848: 'people-card-6',
  s849: 'people-card-6-info',
  s850: 'people-card-6-name',
  s851: 'people-card-6-role',
  s852: 'people-card-6-bio',
  s853: 'people-card-6-photo-wrap',
  s854: 'people-card-6-photo',
  s855: 'people-cta',
  s856: 'people-cta-inner',
  s857: 'people-cta-title',
  s858: 'people-cta-subtitle',
  s859: 'people-cta-details',
  s860: 'people-cta-btn-wrap',
  s861: 'people-cta-btn',
  s862: 'people-cta-btn-text',
  s863: 'people-cta-btn-icon',

  // Policy page
  s865: 'legal-policy-page',
  s867: 'legal-policy-inner',
  s868: 'legal-policy-hero',
  s869: 'legal-policy-hero-overlay',
  s870: 'legal-policy-hero-content',
  s871: 'legal-policy-hero-title-wrap',
  s872: 'legal-policy-hero-title',
  s873: 'legal-policy-hero-gradient',
  s874: 'legal-policy-body',
  s875: 'legal-policy-text',

  // Privacy page
  s877: 'legal-privacy-page',
  s879: 'legal-privacy-inner',
  s880: 'legal-privacy-hero',
  s881: 'legal-privacy-hero-overlay',
  s882: 'legal-privacy-hero-content',
  s883: 'legal-privacy-hero-title-wrap',
  s884: 'legal-privacy-hero-title',
  s885: 'legal-privacy-hero-gradient',
  s886: 'legal-privacy-body',
  s887: 'legal-privacy-text',
};

// ── CSS replacement ──────────────────────────────────────────────────────────

function replaceCss(css) {
  let result = css;
  let count = 0;

  for (const [old, sem] of Object.entries(MAP)) {
    // Base rule:  .sd.sN {  ->  .semantic-name {
    const baseRe = new RegExp(`\\.sd\\.${old}(\\s*\\{)`, 'g');
    result = result.replace(baseRe, (m, brace) => { count++; return `.${sem}${brace}`; });

    // .sd.sN.appear {  ->  .semantic-name.appear {
    const appearRe = new RegExp(`\\.sd\\.${old}\\.appear(\\s*\\{)`, 'g');
    // Already handled by base pattern above since .appear follows .sN and brace captures just {
    // Actually the base pattern captures .sd.sN{ but .sd.sN.appear{ has .appear before {
    // Let me handle this properly...
  }

  // Second pass: handle compound selectors that the base pattern missed
  // e.g. .sd.s812.appear { or .sd.s861:hover { or .sd.s861:hover .sd.s863 {
  // The base pattern `.sd.sN\s*{` only matches when { immediately follows sN
  // We need patterns for :hover, .appear, and nested selectors

  // Reset and do a proper single-pass approach
  result = css;
  count = 0;

  for (const [old, sem] of Object.entries(MAP)) {
    // Pattern: .sd.sN followed by various suffixes
    // Replace .sd.sN with .semantic-name everywhere it appears as a selector part
    const re = new RegExp(`\\.sd\\.${old}\\b`, 'g');
    result = result.replace(re, () => { count++; return `.${sem}`; });
  }

  console.log(`CSS: ${count} replacements`);
  return result;
}

// ── HTML replacement ─────────────────────────────────────────────────────────

function replaceHtml(html, file) {
  let result = html;
  let count = 0;

  for (const [old, sem] of Object.entries(MAP)) {
    // In class attributes: replace sN with semantic-name (keep .sd)
    // Word-boundary safe: match sN surrounded by quotes, spaces, or other class names
    const re = new RegExp(`\\b${old}\\b`, 'g');
    result = result.replace(re, () => { count++; return sem; });
  }

  console.log(`${file}: ${count} replacements`);
  return result;
}

// ── Fix NaNpx bug ────────────────────────────────────────────────────────────

function fixNaNpx(css) {
  const nanCount = (css.match(/NaNpx/g) || []).length;
  const result = css.replace(/right: NaNpx;/g, 'right: 0px;');
  const remaining = (result.match(/NaNpx/g) || []).length;
  console.log(`NaNpx fix: replaced ${nanCount - remaining} occurrences of "right: NaNpx" with "right: 0px" (${remaining} other NaNpx remain)`);
  return result;
}

// ── Main ─────────────────────────────────────────────────────────────────────

const cssPath = join(DOCS, 'assets/css/style.css');
let css = readFileSync(cssPath, 'utf8');

// Fix NaNpx first
css = fixNaNpx(css);

// Replace CSS selectors
css = replaceCss(css);
writeFileSync(cssPath, css);

// Replace HTML files
const htmlFiles = [
  'our-people/index.html',
];

for (const f of htmlFiles) {
  const p = join(DOCS, f);
  const html = readFileSync(p, 'utf8');
  writeFileSync(p, replaceHtml(html, f));
}

// Policy page
const policyPath = join(DOCS, 'policy/index.html');
const policyHtml = readFileSync(policyPath, 'utf8');
writeFileSync(policyPath, replaceHtml(policyHtml, 'policy/index.html'));

// Privacy page
const privacyPath = join(DOCS, 'privacy/index.html');
const privacyHtml = readFileSync(privacyPath, 'utf8');
writeFileSync(privacyPath, replaceHtml(privacyHtml, 'privacy/index.html'));

// ── Verify ───────────────────────────────────────────────────────────────────

console.log('\n=== Verification ===');

const finalCss = readFileSync(cssPath, 'utf8');
const finalPeople = readFileSync(join(DOCS, 'our-people/index.html'), 'utf8');
const finalPolicy = readFileSync(policyPath, 'utf8');
const finalPrivacy = readFileSync(privacyPath, 'utf8');

// Check no old sN references remain in scope
let stale = 0;
for (const old of Object.keys(MAP)) {
  const re = new RegExp(`\\b${old}\\b`);
  if (re.test(finalCss)) { console.log(`STALE CSS: ${old}`); stale++; }
  if (re.test(finalPeople)) { console.log(`STALE people HTML: ${old}`); stale++; }
  if (re.test(finalPolicy)) { console.log(`STALE policy HTML: ${old}`); stale++; }
  if (re.test(finalPrivacy)) { console.log(`STALE privacy HTML: ${old}`); stale++; }
}

if (stale === 0) {
  console.log('All old sN references replaced successfully!');
} else {
  console.log(`WARNING: ${stale} stale references found`);
}

// Check NaNpx in our ranges (s809, s873, s885)
for (const sem of ['people-hero-gradient', 'legal-policy-hero-gradient', 'legal-privacy-hero-gradient']) {
  const re = new RegExp(`\\.${sem}[^}]*NaNpx`, 's');
  if (re.test(finalCss)) {
    console.log(`NaNpx still present in ${sem}`);
  }
}

console.log('Done.');
