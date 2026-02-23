#!/usr/bin/env node
/**
 * Rename sN classes for CEO message, contact-candidate, and contact-others pages.
 *
 * CSS rule:  .sd.sN {  -->  .semantic-name {   (drop .sd compound)
 * HTML rule: keep .sd on elements, replace sN with semantic-name
 *
 * Uses word-boundary-safe matching to avoid partial matches like s48 matching s480.
 */

import { readFileSync, writeFileSync } from 'fs';

// ── Mapping ──────────────────────────────────────────────────────────
const map = {
  // ── CEO message page: CTA / LINE section (s447-s457) ──
  s447: 'ceo-cta',
  s448: 'ceo-cta-body',
  s449: 'ceo-cta-signature',
  s450: 'ceo-cta-line-box',
  s451: 'ceo-cta-line-title',
  s452: 'ceo-cta-line-subtitle',
  s453: 'ceo-cta-line-items',
  s454: 'ceo-cta-line-btn-wrap',
  s455: 'ceo-cta-line-btn-link',
  s456: 'ceo-cta-line-btn-text',
  s457: 'ceo-cta-line-btn-icon',

  // ── CEO message page: page-level (s458-s466) ──
  s458: 'ceo-root',
  s460: 'ceo-body',
  s461: 'ceo-hero-img',
  s462: 'ceo-hero-overlay',
  s463: 'ceo-hero-content',
  s464: 'ceo-hero-title-wrap',
  s465: 'ceo-hero-title',
  s466: 'ceo-hero-divider',

  // ── Contact-candidate page: CTA / LINE section (s469-s477) ──
  s469: 'contact-cand-cta',
  s470: 'contact-cand-cta-line-box',
  s471: 'contact-cand-cta-line-title',
  s472: 'contact-cand-cta-line-subtitle',
  s473: 'contact-cand-cta-line-items',
  s474: 'contact-cand-cta-line-btn-wrap',
  s475: 'contact-cand-cta-line-btn-link',
  s476: 'contact-cand-cta-line-btn-text',
  s477: 'contact-cand-cta-line-btn-icon',

  // ── Contact-candidate page: page & form (s478-s522) ──
  s478: 'contact-cand-root',
  s480: 'contact-cand-form-section',
  s481: 'contact-cand-form-container',
  s482: 'contact-cand-form-header-bg',
  s483: 'contact-cand-form-header-content',
  s484: 'contact-cand-form-heading',
  s485: 'contact-cand-form-subheading',
  s486: 'contact-cand-form',
  s487: 'contact-cand-name-label',
  s488: 'contact-cand-name-header',
  s489: 'contact-cand-name-text',
  s490: 'contact-cand-name-badge-wrap',
  s491: 'contact-cand-name-badge',
  s492: 'contact-cand-name-input',
  s493: 'contact-cand-company-label',
  s494: 'contact-cand-company-header',
  s495: 'contact-cand-company-text',
  s496: 'contact-cand-company-badge-wrap',
  s497: 'contact-cand-company-badge',
  s498: 'contact-cand-company-input',
  s499: 'contact-cand-email-label',
  s500: 'contact-cand-email-header',
  s501: 'contact-cand-email-text',
  s502: 'contact-cand-email-badge-wrap',
  s503: 'contact-cand-email-badge',
  s504: 'contact-cand-email-input',
  s505: 'contact-cand-phone-label',
  s506: 'contact-cand-phone-header',
  s507: 'contact-cand-phone-text',
  s508: 'contact-cand-phone-badge-wrap',
  s509: 'contact-cand-phone-badge',
  s510: 'contact-cand-phone-input',
  s511: 'contact-cand-msg-label',
  s512: 'contact-cand-msg-header',
  s513: 'contact-cand-msg-text',
  s514: 'contact-cand-msg-badge-wrap',
  s515: 'contact-cand-msg-badge',
  s516: 'contact-cand-msg-textarea',
  s517: 'contact-cand-checkbox-label',
  s518: 'contact-cand-checkbox-input',
  s519: 'contact-cand-checkbox-richtext',
  s520: 'contact-cand-submit-btn',
  s521: 'contact-cand-submit-inner',
  s522: 'contact-cand-submit-text',

  // ── Contact-others page (s525-s565) ──
  s525: 'contact-other-root',
  s527: 'contact-other-form-section',
  s528: 'contact-other-form-container',
  s529: 'contact-other-form-header-bg',
  s530: 'contact-other-form-header-content',
  s531: 'contact-other-form-heading',
  s532: 'contact-other-form',
  s533: 'contact-other-name-label',
  s534: 'contact-other-name-header',
  s535: 'contact-other-name-text',
  s536: 'contact-other-name-badge-wrap',
  s537: 'contact-other-name-badge',
  s538: 'contact-other-name-input',
  s539: 'contact-other-company-label',
  s540: 'contact-other-company-header',
  s541: 'contact-other-company-text',
  s542: 'contact-other-company-badge-wrap',
  s543: 'contact-other-company-badge',
  s544: 'contact-other-company-input',
  s545: 'contact-other-email-label',
  s546: 'contact-other-email-header',
  s547: 'contact-other-email-text',
  s548: 'contact-other-email-badge-wrap',
  s549: 'contact-other-email-badge',
  s550: 'contact-other-email-input',
  s551: 'contact-other-phone-label',
  s552: 'contact-other-phone-header',
  s553: 'contact-other-phone-text',
  s554: 'contact-other-phone-badge-wrap',
  s555: 'contact-other-phone-badge',
  s556: 'contact-other-phone-input',
  s557: 'contact-other-msg-label',
  s558: 'contact-other-msg-header',
  s559: 'contact-other-msg-text',
  s560: 'contact-other-msg-badge-wrap',
  s561: 'contact-other-msg-badge',
  s562: 'contact-other-msg-textarea',
  s563: 'contact-other-submit-btn',
  s564: 'contact-other-submit-inner',
  s565: 'contact-other-submit-text',
};

// ── Helpers ──────────────────────────────────────────────────────────

/**
 * Replace in CSS: `.sd.sN` compound selectors become `.semantic-name`
 * Handles patterns like:
 *   .sd.s447 {          -->  .ceo-cta {
 *   .sd.s455:hover {    -->  .ceo-cta-line-btn-link:hover {
 *   .sd.s455:hover .sd.s457 {  -->  .ceo-cta-line-btn-link:hover .ceo-cta-line-btn-icon {
 *   .sd.s492::-webkit-input-placeholder {  -->  .contact-cand-name-input::-webkit-input-placeholder {
 *   .sd.s519 a {        -->  .contact-cand-checkbox-richtext a {
 *   .sd.s519>p {        -->  .contact-cand-checkbox-richtext>p {
 *   .sd.s482.appear {   -->  .contact-cand-form-header-bg.appear {
 */
function replaceCss(css) {
  // Sort keys by length descending so s510 is replaced before s51
  const sortedKeys = Object.keys(map).sort((a, b) => b.length - a.length);

  for (const oldClass of sortedKeys) {
    const newName = map[oldClass];
    // Match .sd.sN followed by word boundary, pseudo-element, pseudo-class, dot, space, >, +, ~, comma, or {
    // Replace .sd.sN with .newName
    const pattern = new RegExp(
      `\\.sd\\.${oldClass}(?=[^0-9a-zA-Z_-])`,
      'g'
    );
    css = css.replace(pattern, '.' + newName);
  }
  return css;
}

/**
 * Replace in HTML: within class="..." attributes, replace sN with semantic-name,
 * keeping .sd on the element.
 */
function replaceHtml(html) {
  const sortedKeys = Object.keys(map).sort((a, b) => b.length - a.length);

  for (const oldClass of sortedKeys) {
    const newName = map[oldClass];
    // Match sN as a whole word inside class attributes
    // We use a class-attribute-aware replacement
    html = html.replace(
      new RegExp(`(class="[^"]*?)\\b${oldClass}\\b([^"]*?")`, 'g'),
      `$1${newName}$2`
    );
  }
  return html;
}

// ── Main ─────────────────────────────────────────────────────────────

const cssPath = 'docs/assets/css/style.css';
const htmlFiles = [
  'docs/ceo-message/index.html',
  'docs/contact-candidate/index.html',
  'docs/contact-others/index.html',
];

// Process CSS
console.log('Processing CSS...');
let css = readFileSync(cssPath, 'utf8');
const cssBefore = css;
css = replaceCss(css);
const cssChanges = [...css].filter((c, i) => c !== cssBefore[i]).length;
writeFileSync(cssPath, css, 'utf8');
console.log(`  CSS: ${cssChanges > 0 ? 'modified' : 'no changes'}`);

// Verify no old .sd.sN patterns remain for our range
const sortedKeys = Object.keys(map).sort((a, b) => b.length - a.length);
for (const oldClass of sortedKeys) {
  const pat = new RegExp(`\\.sd\\.${oldClass}(?=[^0-9a-zA-Z_-])`, 'g');
  const remaining = css.match(pat);
  if (remaining) {
    console.error(`  WARNING: CSS still contains .sd.${oldClass} (${remaining.length} occurrences)`);
  }
}

// Process HTML files
for (const htmlFile of htmlFiles) {
  console.log(`Processing ${htmlFile}...`);
  let html = readFileSync(htmlFile, 'utf8');
  html = replaceHtml(html);
  writeFileSync(htmlFile, html, 'utf8');

  // Verify no old sN classes remain in this file's class attributes
  for (const oldClass of sortedKeys) {
    const pat = new RegExp(`class="[^"]*\\b${oldClass}\\b[^"]*"`, 'g');
    const remaining = html.match(pat);
    if (remaining) {
      console.error(`  WARNING: ${htmlFile} still contains ${oldClass} in class attribute (${remaining.length} occurrences)`);
    }
  }
}

console.log('Done!');
