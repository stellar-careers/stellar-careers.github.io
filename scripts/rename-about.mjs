import { readFileSync, writeFileSync } from 'fs';

// Mapping from old sN class to new semantic name
const mapping = {
  s359: 'about-page',
  s361: 'about-main',
  s362: 'about-hero',
  s363: 'about-hero-overlay',
  s364: 'about-hero-content',
  s365: 'about-hero-heading-wrap',
  s366: 'about-hero-heading',
  s367: 'about-hero-gradient',
  s368: 'about-cta1',
  s369: 'about-cta1-inner',
  s370: 'about-cta1-text',
  s371: 'about-cta1-title',
  s372: 'about-cta1-desc',
  s373: 'about-cta1-img',
  s374: 'about-cta2',
  s375: 'about-cta2-inner',
  s376: 'about-cta2-text',
  s377: 'about-cta2-title',
  s378: 'about-cta2-desc',
  s379: 'about-cta2-img',
  s380: 'about-cta3',
  s381: 'about-cta3-inner',
  s382: 'about-cta3-text',
  s383: 'about-cta3-title',
  s384: 'about-cta3-desc',
  s385: 'about-cta3-img',
  s386: 'about-cta4',
  s387: 'about-cta4-inner',
  s388: 'about-cta4-img',
  s389: 'about-cta4-text',
  s390: 'about-cta4-title',
  s391: 'about-cta4-desc',
  s392: 'about-company',
  s393: 'about-company-info',
  s394: 'about-company-title',
  s395: 'about-company-list',
  s396: 'about-company-item',
  s397: 'about-company-label',
  s398: 'about-company-label-text',
  s399: 'about-company-value',
  s400: 'about-company-value-text',
  s401: 'about-company-cta',
  s402: 'about-company-cta-link',
  s403: 'about-company-cta-text',
  s404: 'about-company-cta-icon',
  s405: 'about-company-map',
};

// ── CSS replacements ──
const cssPath = '/Users/otiai10/proj/stellar/careers-homepage/docs/assets/css/style.css';
let css = readFileSync(cssPath, 'utf8');

for (const [old, sem] of Object.entries(mapping)) {
  // Base selector: .sd.sN { → .semantic-name {
  const baseRe = new RegExp(`\\.sd\\.${old}\\b(?=[^-\\w])`, 'g');
  css = css.replace(baseRe, `.${sem}`);
}

writeFileSync(cssPath, css, 'utf8');
console.log('CSS replacements done');

// ── HTML replacements ──
const htmlPath = '/Users/otiai10/proj/stellar/careers-homepage/docs/about-us/index.html';
let html = readFileSync(htmlPath, 'utf8');

for (const [old, sem] of Object.entries(mapping)) {
  // In class attributes: replace the bare sN token with semantic name
  // Use word boundary matching: sN surrounded by spaces, quotes, or class boundaries
  const htmlRe = new RegExp(`\\b${old}\\b`, 'g');
  html = html.replace(htmlRe, sem);
}

writeFileSync(htmlPath, html, 'utf8');
console.log('HTML replacements done');

// ── Verify no old references remain ──
const cssAfter = readFileSync(cssPath, 'utf8');
const htmlAfter = readFileSync(htmlPath, 'utf8');

let errors = 0;
for (const old of Object.keys(mapping)) {
  const cssMatches = cssAfter.match(new RegExp(`\\.sd\\.${old}\\b`, 'g'));
  if (cssMatches) {
    console.error(`CSS still has ${cssMatches.length} references to .sd.${old}`);
    errors++;
  }
  const htmlMatches = htmlAfter.match(new RegExp(`\\b${old}\\b`, 'g'));
  if (htmlMatches) {
    console.error(`HTML still has ${htmlMatches.length} references to ${old}`);
    errors++;
  }
}

if (errors === 0) {
  console.log('Verification passed: no old sN references remain');
} else {
  console.error(`Verification failed: ${errors} issues found`);
}
