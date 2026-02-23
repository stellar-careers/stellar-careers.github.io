/**
 * Phase 7: Rename homepage sections s184-s314 (plus s0, s1) to semantic names.
 * Also renames s315-s349 (CSS-only blog card orphans).
 *
 * Targets: style.css, docs/index.html, docs/assets/js/main.js
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(import.meta.dirname, '..');

// ── Mapping ──────────────────────────────────────────────────────────────────

const mapping = {
  // Carousel control wrappers (currently s0 and s1)
  s0: 'insight-carousel-controls',
  s1: 'yt-carousel-controls',

  // Stories scroll indicator (end of Success Stories section)
  s184: 'stories-scroll-wrap',
  s185: 'stories-scroll-divider',
  s186: 'stories-scroll-btn',
  s187: 'stories-scroll-text',
  s188: 'stories-scroll-icon',

  // Features section (#feature-4)
  s189: 'features-section',
  s190: 'features-inner',
  s191: 'features-heading',
  s192: 'features-title',
  s193: 'features-subtitle',
  s194: 'features-list',
  s195: 'features-bg-img',

  // Track Record section (#logo-4)
  s196: 'track-section',
  s197: 'track-inner',
  s198: 'track-subtitle',
  s199: 'track-title',
  s200: 'track-logos',
  // 20 company logo items (s201-s240) — each pair: item wrapper + text
  s201: 'track-logo-1',
  s202: 'track-logo-1-text',
  s203: 'track-logo-2',
  s204: 'track-logo-2-text',
  s205: 'track-logo-3',
  s206: 'track-logo-3-text',
  s207: 'track-logo-4',
  s208: 'track-logo-4-text',
  s209: 'track-logo-5',
  s210: 'track-logo-5-text',
  s211: 'track-logo-6',
  s212: 'track-logo-6-text',
  s213: 'track-logo-7',
  s214: 'track-logo-7-text',
  s215: 'track-logo-8',
  s216: 'track-logo-8-text',
  s217: 'track-logo-9',
  s218: 'track-logo-9-text',
  s219: 'track-logo-10',
  s220: 'track-logo-10-text',
  s221: 'track-logo-11',
  s222: 'track-logo-11-text',
  s223: 'track-logo-12',
  s224: 'track-logo-12-text',
  s225: 'track-logo-13',
  s226: 'track-logo-13-text',
  s227: 'track-logo-14',
  s228: 'track-logo-14-text',
  s229: 'track-logo-15',
  s230: 'track-logo-15-text',
  s231: 'track-logo-16',
  s232: 'track-logo-16-text',
  s233: 'track-logo-17',
  s234: 'track-logo-17-text',
  s235: 'track-logo-18',
  s236: 'track-logo-18-text',
  s237: 'track-logo-19',
  s238: 'track-logo-19-text',
  s239: 'track-logo-20',
  s240: 'track-logo-20-text',

  // Career Insight Carousel (#gallery-5)
  s241: 'insight-section',
  s242: 'insight-inner',
  s243: 'insight-heading',
  s244: 'insight-subtitle',
  s245: 'insight-title',
  s246: 'insight-carousel',
  s247: 'insight-carousel-slide',
  s248: 'insight-carousel-card',
  s249: 'insight-carousel-img',
  s250: 'insight-carousel-caption',
  s251: 'insight-carousel-prev',
  s252: 'insight-carousel-prev-icon',
  s253: 'insight-carousel-pause',
  s254: 'insight-carousel-pause-wrap',
  s255: 'insight-carousel-pause-icon',
  s256: 'insight-carousel-256',    // CSS-only orphan
  s257: 'insight-carousel-257',    // CSS-only orphan
  s258: 'insight-carousel-next',
  s259: 'insight-carousel-next-icon',

  // CTA section (#cta-5)
  s261: 'cta-section',
  s262: 'cta-inner',
  s263: 'cta-bg-img',
  s264: 'cta-content',
  s265: 'cta-title',
  s266: 'cta-description',
  s267: 'cta-btn-wrap',
  s268: 'cta-btn',
  s269: 'cta-btn-text',
  s270: 'cta-btn-icon',

  // Media section (#cta-5-2)
  s271: 'media-section',
  s272: 'media-inner',
  s273: 'media-content',
  s274: 'media-label',
  s275: 'media-title',
  s276: 'media-description',
  s277: 'media-socials',
  s278: 'media-social-ig-wrap',
  s279: 'media-social-ig-link',
  s280: 'media-social-ig-icon',
  s281: 'media-social-tt-wrap',
  s282: 'media-social-tt-link',
  s283: 'media-social-tt-icon',
  s284: 'media-social-yt-wrap',
  s285: 'media-social-yt-link',
  s286: 'media-social-yt-icon',
  s287: 'media-video',

  // YouTube carousel (#gallery-5-3)
  s288: 'yt-section',
  s289: 'yt-heading-wrap',
  s290: 'yt-heading',
  s291: 'yt-heading-text',
  s292: 'yt-carousel',
  s293: 'yt-carousel-slide',
  s294: 'yt-carousel-link',
  s295: 'yt-carousel-img',
  s296: 'yt-carousel-prev',
  s297: 'yt-carousel-prev-icon',
  s298: 'yt-carousel-pause',
  s299: 'yt-carousel-pause-wrap',
  s300: 'yt-carousel-pause-icon',
  s301: 'yt-carousel-301',    // CSS-only orphan
  s302: 'yt-carousel-302',    // CSS-only orphan
  s303: 'yt-carousel-next',
  s304: 'yt-carousel-next-icon',

  // Blog Preview section (#feature-2)
  s305: 'blog-section',
  s306: 'blog-inner',
  s307: 'blog-heading',
  s308: 'blog-heading-text',
  s309: 'blog-list',
  s310: 'blog-card',
  s311: 'blog-card-content',
  s312: 'blog-card-title',
  s313: 'blog-card-excerpt',
  s314: 'blog-card-img',

  // Blog card orphans (CSS-only, s315-s349, groups of 5)
  s315: 'blog-card-o3',
  s316: 'blog-card-o3-content',
  s317: 'blog-card-o3-title',
  s318: 'blog-card-o3-excerpt',
  s319: 'blog-card-o3-img',
  s320: 'blog-card-o4',
  s321: 'blog-card-o4-content',
  s322: 'blog-card-o4-title',
  s323: 'blog-card-o4-excerpt',
  s324: 'blog-card-o4-img',
  s325: 'blog-card-o5',
  s326: 'blog-card-o5-content',
  s327: 'blog-card-o5-title',
  s328: 'blog-card-o5-excerpt',
  s329: 'blog-card-o5-img',
  s330: 'blog-card-o6',
  s331: 'blog-card-o6-content',
  s332: 'blog-card-o6-title',
  s333: 'blog-card-o6-excerpt',
  s334: 'blog-card-o6-img',
  s335: 'blog-card-o7',
  s336: 'blog-card-o7-content',
  s337: 'blog-card-o7-title',
  s338: 'blog-card-o7-excerpt',
  s339: 'blog-card-o7-img',
  s340: 'blog-card-o8',
  s341: 'blog-card-o8-content',
  s342: 'blog-card-o8-title',
  s343: 'blog-card-o8-excerpt',
  s344: 'blog-card-o8-img',
  s345: 'blog-card-o9',
  s346: 'blog-card-o9-content',
  s347: 'blog-card-o9-title',
  s348: 'blog-card-o9-excerpt',
  s349: 'blog-card-o9-img',
};

// ── Replacement logic ────────────────────────────────────────────────────────

/**
 * Replace all occurrences of sN class names with semantic names.
 * Uses word-boundary-safe patterns to avoid partial matches.
 */
function replaceInFile(filePath, isCSS = false) {
  let content = readFileSync(filePath, 'utf8');
  const original = content;
  let changeCount = 0;

  // Sort keys by numeric value descending so s293 is replaced before s29, etc.
  const sortedKeys = Object.keys(mapping).sort((a, b) => {
    const numA = parseInt(a.slice(1));
    const numB = parseInt(b.slice(1));
    return numB - numA;
  });

  for (const sKey of sortedKeys) {
    const semantic = mapping[sKey];

    if (isCSS) {
      // CSS: .sd.sN  → .sd.semantic-name
      // Matches: .sd.s0 { , .sd.s0. , .sd.s0: , .sd.s0 (space)
      const cssPattern = new RegExp(
        `\\.sd\\.${sKey}(?=[\\s{.:,])`,
        'g'
      );
      const before = content;
      content = content.replace(cssPattern, `.sd.${semantic}`);
      if (content !== before) {
        const count = (before.match(cssPattern) || []).length;
        changeCount += count;
      }
    } else {
      // HTML/JS: class="... sN ..." or '.sN' selector in JS
      // For HTML: word boundary before and after sN class
      // Pattern: sN followed by word boundary (space, ", end of attr, etc.)
      const htmlPattern = new RegExp(
        `(?<=[\\s"'])${sKey}(?=[\\s"'.:,;})\\]])`,
        'g'
      );
      const before = content;
      content = content.replace(htmlPattern, semantic);
      if (content !== before) {
        const count = (before.match(htmlPattern) || []).length;
        changeCount += count;
      }
    }
  }

  if (content !== original) {
    writeFileSync(filePath, content);
    console.log(`  Updated ${filePath} (${changeCount} replacements)`);
  } else {
    console.log(`  No changes in ${filePath}`);
  }
}

// ── Main ─────────────────────────────────────────────────────────────────────

console.log('Phase 7: Renaming homepage sections s184-s314 (+ s0, s1, s315-s349)');
console.log('');

const cssFile = resolve(ROOT, 'docs/assets/css/style.css');
const htmlFile = resolve(ROOT, 'docs/index.html');
const jsFile = resolve(ROOT, 'docs/assets/js/main.js');

console.log('Processing CSS...');
replaceInFile(cssFile, true);

console.log('Processing HTML...');
replaceInFile(htmlFile, false);

console.log('Processing JS...');
replaceInFile(jsFile, false);

console.log('');
console.log('Done. Verifying no old references remain...');

// Verification: check for any remaining sN references in target range
const cssContent = readFileSync(cssFile, 'utf8');
const htmlContent = readFileSync(htmlFile, 'utf8');
const jsContent = readFileSync(jsFile, 'utf8');

let issues = [];

for (const sKey of Object.keys(mapping)) {
  const num = sKey.slice(1);
  // Check CSS
  const cssRe = new RegExp(`\\.sd\\.${sKey}(?=[\\s{.:,])`, 'g');
  const cssMatches = cssContent.match(cssRe);
  if (cssMatches) {
    issues.push(`CSS still has ${cssMatches.length}x .sd.${sKey}`);
  }
  // Check HTML
  const htmlRe = new RegExp(`(?<=[\\s"'])${sKey}(?=[\\s"'.:,;})\\]])`, 'g');
  const htmlMatches = htmlContent.match(htmlRe);
  if (htmlMatches) {
    issues.push(`HTML still has ${htmlMatches.length}x ${sKey}`);
  }
  // Check JS
  const jsMatches = jsContent.match(htmlRe);
  if (jsMatches) {
    issues.push(`JS still has ${jsMatches.length}x ${sKey}`);
  }
}

if (issues.length > 0) {
  console.log('ISSUES FOUND:');
  issues.forEach(i => console.log(`  - ${i}`));
  process.exit(1);
} else {
  console.log('All clear - no remaining old references in target files.');
}
