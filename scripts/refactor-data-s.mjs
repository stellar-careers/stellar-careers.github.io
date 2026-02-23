/**
 * Refactor data-s-{uuid} attributes to short class names.
 *
 * Phase 1: Analyze & build mapping
 * Phase 2: Generate CSS for style.css (Tier B rules)
 * Phase 3: Transform HTML files
 * Phase 4: Update main.js selectors
 */

import fs from 'fs';
import path from 'path';

const DOCS = path.resolve('docs');
const STYLE_CSS = path.join(DOCS, 'assets/css/style.css');
const MAIN_JS = path.join(DOCS, 'assets/js/main.js');
const MAPPING_FILE = path.resolve('scripts/uuid-mapping.json');

// ============================================================
// Utility: parse inline <style> blocks from HTML
// ============================================================
function extractStyleBlocks(html) {
  const blocks = [];
  const re = /<style(?:\s[^>]*)?>([^]*?)<\/style>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    blocks.push({
      fullMatch: m[0],
      css: m[1],
      index: m.index,
      // Does it have an id attribute?
      hasId: /id\s*=/.test(m[0].slice(0, m[0].indexOf('>'))),
    });
  }
  return blocks;
}

// ============================================================
// Parse CSS text into a list of rule objects
// Each rule: { selector, body, mediaQuery (null or string), raw }
// ============================================================
function parseCssRules(cssText) {
  const rules = [];
  let i = 0;
  const len = cssText.length;

  function skipWhitespace() {
    while (i < len && /\s/.test(cssText[i])) i++;
  }

  function readBlock() {
    // Expects i pointing at '{'
    let depth = 0;
    const start = i;
    while (i < len) {
      if (cssText[i] === '{') depth++;
      else if (cssText[i] === '}') {
        depth--;
        if (depth === 0) { i++; return cssText.slice(start + 1, i - 1); }
      }
      i++;
    }
    return cssText.slice(start + 1);
  }

  while (i < len) {
    skipWhitespace();
    if (i >= len) break;

    // Read selector / at-rule
    const selectorStart = i;
    while (i < len && cssText[i] !== '{') i++;
    if (i >= len) break;
    const selector = cssText.slice(selectorStart, i).trim();

    if (selector.startsWith('@media')) {
      // Parse @media block - extract inner rules
      const mediaQuery = selector;
      const blockContent = readBlock();
      // Parse inner rules
      const innerRules = parseCssRules(blockContent);
      for (const r of innerRules) {
        rules.push({ ...r, mediaQuery });
      }
    } else if (selector.startsWith(':root')) {
      // :root block - keep as-is
      const body = readBlock();
      rules.push({ selector, body: body.trim(), mediaQuery: null, isRoot: true });
    } else if (selector.startsWith('@font-face')) {
      const body = readBlock();
      rules.push({ selector, body: body.trim(), mediaQuery: null, isFontFace: true });
    } else {
      const body = readBlock();
      rules.push({ selector: selector.trim(), body: body.trim(), mediaQuery: null });
    }
  }
  return rules;
}

// ============================================================
// Extract UUID from a CSS selector like .sd[data-s-{uuid}]
// Returns null if not a data-s selector
// ============================================================
function extractUuidFromSelector(selector) {
  const m = selector.match(/\[data-s-([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})\]/);
  return m ? m[1] : null;
}

// ============================================================
// Classify a rule into Tier A, B, or C
// ============================================================
function classifyRule(rule) {
  if (rule.isRoot || rule.isFontFace) return 'keep'; // Keep :root and @font-face blocks

  const uuid = extractUuidFromSelector(rule.selector);
  if (!uuid) return 'unknown';

  // Tier C: Empty rules or rules with only invalid values
  const bodyTrimmed = rule.body.trim();
  if (!bodyTrimmed) return 'C';

  // Check if all declarations are empty/invalid
  const decls = bodyTrimmed.split(';').map(d => d.trim()).filter(d => d);
  const validDecls = decls.filter(d => {
    const colonIdx = d.indexOf(':');
    if (colonIdx === -1) return false;
    const value = d.slice(colonIdx + 1).trim();
    return value !== '' && value !== ';';
  });
  if (validDecls.length === 0) return 'C';

  // Tier B: Has pseudo-classes, state modifiers, or is in a media query
  if (rule.mediaQuery) return 'B';
  if (/\.(appear-active|appear)\s*$/.test(rule.selector)) return 'B';
  if (/\.(appear-active|appear)\s*\{/.test(rule.selector)) return 'B';
  if (/\.appear-active/.test(rule.selector)) return 'B';
  if (/\.appear(?!\s*-)/.test(rule.selector) && rule.selector !== rule.selector.replace(/\.appear.*$/, '')) {
    // .sd[data-s-xxx].appear
    if (/\.sd\[data-s-[a-f0-9-]+\]\.appear\s*$/.test(rule.selector)) return 'B';
  }
  if (/:hover|:focus|:focus-visible/.test(rule.selector)) return 'B';
  if (/\._animatingNext|\._animatingPrev/.test(rule.selector)) return 'B';

  // Check for .appear at end of selector
  if (rule.selector.endsWith('.appear')) return 'B';

  // Tier A: Simple .sd[data-s-{uuid}] { ... }
  const simpleRe = /^\.sd\[data-s-[a-f0-9-]{36}\]\s*$/;
  if (simpleRe.test(rule.selector)) return 'A';

  // If selector has more than just .sd[data-s-xxx], it's Tier B
  return 'B';
}

// ============================================================
// Parse CSS declarations string into key-value pairs
// ============================================================
function parseDeclarations(body) {
  const decls = [];
  // Split by semicolons, but be careful with values containing semicolons in quotes
  let current = '';
  let inParens = 0;
  let inQuote = null;

  for (let i = 0; i < body.length; i++) {
    const ch = body[i];
    if (inQuote) {
      current += ch;
      if (ch === inQuote) inQuote = null;
    } else if (ch === '\'' || ch === '"') {
      current += ch;
      inQuote = ch;
    } else if (ch === '(') {
      current += ch;
      inParens++;
    } else if (ch === ')') {
      current += ch;
      inParens--;
    } else if (ch === ';' && inParens === 0) {
      const trimmed = current.trim();
      if (trimmed) decls.push(trimmed);
      current = '';
    } else {
      current += ch;
    }
  }
  const trimmed = current.trim();
  if (trimmed) decls.push(trimmed);

  const result = [];
  for (const decl of decls) {
    const colonIdx = decl.indexOf(':');
    if (colonIdx === -1) continue;
    const prop = decl.slice(0, colonIdx).trim();
    const value = decl.slice(colonIdx + 1).trim();
    if (value === '') continue; // Empty value like `transform: ;`
    result.push({ prop, value });
  }
  return result;
}

// ============================================================
// Phase 1: Analyze all HTML files, build UUID mapping
// ============================================================
function phase1() {
  console.log('Phase 1: Analyzing HTML files...');

  const htmlFiles = [];
  function walk(dir) {
    for (const entry of fs.readdirSync(dir)) {
      const full = path.join(dir, entry);
      const stat = fs.statSync(full);
      if (stat.isDirectory()) walk(full);
      else if (entry === 'index.html') htmlFiles.push(full);
    }
  }
  walk(DOCS);
  htmlFiles.sort();

  // Reorder: homepage first, then others alphabetically
  const homepageIdx = htmlFiles.indexOf(path.join(DOCS, 'index.html'));
  if (homepageIdx > 0) {
    const [hp] = htmlFiles.splice(homepageIdx, 1);
    htmlFiles.unshift(hp);
  }

  // Collect all UUIDs in order of first appearance (homepage first)
  const uuidOrder = [];
  const uuidSet = new Set();

  // Also collect all rules per file for later phases
  const fileData = [];

  // Collect gap variable UUIDs
  const gapUuids = new Set();

  for (const filePath of htmlFiles) {
    const html = fs.readFileSync(filePath, 'utf8');
    const relPath = path.relative(DOCS, filePath);
    const blocks = extractStyleBlocks(html);
    const fileRules = [];
    const fileGapUuids = new Set();

    for (const block of blocks) {
      const rules = parseCssRules(block.css);
      for (const rule of rules) {
        const uuid = extractUuidFromSelector(rule.selector);
        if (uuid && !uuidSet.has(uuid)) {
          uuidSet.add(uuid);
          uuidOrder.push(uuid);
        }
        // Track gap variables
        const gapMatches = rule.body ? rule.body.match(/--gap-[hv]-([a-f0-9-]{36})/g) : null;
        if (gapMatches) {
          for (const gm of gapMatches) {
            const gu = gm.match(/--gap-[hv]-([a-f0-9-]{36})/)[1];
            gapUuids.add(gu);
            fileGapUuids.add(gu);
          }
        }
        // Also check for gap-uuid definition
        if (rule.body) {
          const gapUuidMatch = rule.body.match(/--gap-uuid:\s*([a-f0-9-]{36})/);
          if (gapUuidMatch) {
            gapUuids.add(gapUuidMatch[1]);
          }
        }

        fileRules.push(rule);
      }
    }

    // Also extract UUIDs from HTML elements
    const htmlUuidMatches = html.match(/data-s-([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})=""/g) || [];
    for (const m of htmlUuidMatches) {
      const uuid = m.match(/data-s-([a-f0-9-]{36})/)[1];
      if (!uuidSet.has(uuid)) {
        uuidSet.add(uuid);
        uuidOrder.push(uuid);
      }
    }

    fileData.push({
      filePath,
      relPath,
      rules: fileRules,
      gapUuids: fileGapUuids,
    });
  }

  // Build UUID → short class mapping
  const uuidToClass = {};
  for (let i = 0; i < uuidOrder.length; i++) {
    uuidToClass[uuidOrder[i]] = `s${i}`;
  }

  // Build gap variable mapping
  const gapHMapping = {};
  const gapVMapping = {};
  let gapIdx = 0;
  // Use same numbering as the UUID class mapping
  for (const uuid of uuidOrder) {
    if (gapUuids.has(uuid)) {
      gapHMapping[`--gap-h-${uuid}`] = `--gh-${gapIdx}`;
      gapVMapping[`--gap-v-${uuid}`] = `--gv-${gapIdx}`;
      gapIdx++;
    }
  }

  const mapping = {
    uuidToClass,
    gapHMapping,
    gapVMapping,
    gapUuidMapping: {}, // --gap-uuid: uuid → short
  };

  // Build gap-uuid mapping
  for (const uuid of uuidOrder) {
    if (gapUuids.has(uuid)) {
      // Find the index in gapH
      const ghKey = `--gap-h-${uuid}`;
      if (gapHMapping[ghKey]) {
        const idx = gapHMapping[ghKey].replace('--gh-', '');
        mapping.gapUuidMapping[uuid] = idx;
      }
    }
  }

  fs.writeFileSync(MAPPING_FILE, JSON.stringify(mapping, null, 2));
  console.log(`  ${uuidOrder.length} unique UUIDs mapped`);
  console.log(`  ${gapIdx} gap variable pairs mapped`);

  return { fileData, mapping, htmlFiles };
}

// ============================================================
// Replace gap variable references in a CSS value string
// ============================================================
function replaceGapVars(value, mapping) {
  let result = value;
  // Replace --gap-h-{uuid} and --gap-v-{uuid} in var() references
  result = result.replace(/var\(--gap-h-([a-f0-9-]{36})\)/g, (match, uuid) => {
    const key = `--gap-h-${uuid}`;
    return mapping.gapHMapping[key] ? `var(${mapping.gapHMapping[key]})` : match;
  });
  result = result.replace(/var\(--gap-v-([a-f0-9-]{36})\)/g, (match, uuid) => {
    const key = `--gap-v-${uuid}`;
    return mapping.gapVMapping[key] ? `var(${mapping.gapVMapping[key]})` : match;
  });
  return result;
}

// ============================================================
// Replace gap variable definitions in declarations
// --gap-h-{uuid}: value → --gh-N: value
// --gap-v-{uuid}: value → --gv-N: value
// --gap-uuid: {uuid} → removed or kept with short ref
// ============================================================
function replaceGapVarDefs(prop, value, mapping) {
  let newProp = prop;
  let newValue = value;

  const ghMatch = prop.match(/^--gap-h-([a-f0-9-]{36})$/);
  if (ghMatch) {
    const key = `--gap-h-${ghMatch[1]}`;
    if (mapping.gapHMapping[key]) newProp = mapping.gapHMapping[key];
  }

  const gvMatch = prop.match(/^--gap-v-([a-f0-9-]{36})$/);
  if (gvMatch) {
    const key = `--gap-v-${gvMatch[1]}`;
    if (mapping.gapVMapping[key]) newProp = mapping.gapVMapping[key];
  }

  // --gap-uuid: {uuid} → remove
  if (prop === '--gap-uuid') {
    return null; // Signal to remove this declaration
  }

  // Replace var() references in the value
  newValue = replaceGapVars(newValue, mapping);

  return { prop: newProp, value: newValue };
}

// ============================================================
// Rewrite a CSS selector: replace data-s-{uuid} with .sN
// ============================================================
function rewriteSelector(selector, mapping) {
  return selector.replace(
    /\[data-s-([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})\]/g,
    (match, uuid) => {
      const cls = mapping.uuidToClass[uuid];
      return cls ? `.${cls}` : match;
    }
  );
}

// ============================================================
// Rewrite CSS body: replace gap variable defs and refs
// ============================================================
function rewriteCssBody(body, mapping) {
  const decls = parseDeclarations(body);
  const newDecls = [];

  for (const { prop, value } of decls) {
    const result = replaceGapVarDefs(prop, value, mapping);
    if (result === null) continue; // Remove this declaration
    newDecls.push(`${result.prop}: ${result.value}`);
  }

  return newDecls.join(';\n  ');
}

// ============================================================
// Phase 2: Generate CSS for style.css from Tier A + Tier B rules
// Tier A (base rules) and Tier B (hover/appear/media) both go to style.css.
// We do NOT inline Tier A to style="" because inline styles would override
// media query rules in style.css due to higher specificity.
// ============================================================
function phase2(fileData, mapping) {
  console.log('Phase 2: Generating CSS for style.css...');

  // Collect rules, deduplicated
  const baseRules = []; // Tier A base rules (no pseudo, no media)
  const normalRules = []; // Tier B non-media rules (hover, focus, appear, state)
  const media840Rules = [];
  const media540Rules = [];
  const media320Rules = [];
  const otherMediaRules = [];

  // Track dedup: key = rewritten selector + rewritten body + mediaQuery
  const seen = new Set();

  for (const { rules } of fileData) {
    for (const rule of rules) {
      const tier = classifyRule(rule);
      if (tier !== 'A' && tier !== 'B') continue;

      const newSelector = rewriteSelector(rule.selector, mapping);
      const newBody = rewriteCssBody(rule.body, mapping);

      // Skip empty body after rewrite
      if (!newBody.trim()) continue;

      const dedupKey = `${rule.mediaQuery || ''}|${newSelector}|${newBody}`;
      if (seen.has(dedupKey)) continue;
      seen.add(dedupKey);

      const ruleStr = `${newSelector} {\n  ${newBody};\n}`;

      if (tier === 'A') {
        baseRules.push(ruleStr);
      } else if (!rule.mediaQuery) {
        normalRules.push(ruleStr);
      } else if (/max-width:\s*840px/.test(rule.mediaQuery)) {
        media840Rules.push(ruleStr);
      } else if (/max-width:\s*540px/.test(rule.mediaQuery)) {
        media540Rules.push(ruleStr);
      } else if (/max-width:\s*320px/.test(rule.mediaQuery)) {
        media320Rules.push(ruleStr);
      } else {
        otherMediaRules.push({ media: rule.mediaQuery, rule: ruleStr });
      }
    }
  }

  // Build the CSS block
  let css = '\n\n/* ========================================\n';
  css += '   Refactored data-s rules\n';
  css += '   ======================================== */\n\n';

  if (baseRules.length) {
    css += '/* Base rules */\n';
    css += baseRules.join('\n\n') + '\n\n';
  }

  if (normalRules.length) {
    css += '/* Hover, focus, appear, state rules */\n';
    css += normalRules.join('\n\n') + '\n\n';
  }

  if (media840Rules.length) {
    css += '@media screen and (max-width: 840px) {\n';
    css += media840Rules.map(r => '  ' + r.replace(/\n/g, '\n  ')).join('\n\n');
    css += '\n}\n\n';
  }

  if (media540Rules.length) {
    css += '@media screen and (max-width: 540px) {\n';
    css += media540Rules.map(r => '  ' + r.replace(/\n/g, '\n  ')).join('\n\n');
    css += '\n}\n\n';
  }

  if (media320Rules.length) {
    css += '@media screen and (max-width: 320px) {\n';
    css += media320Rules.map(r => '  ' + r.replace(/\n/g, '\n  ')).join('\n\n');
    css += '\n}\n\n';
  }

  for (const { media, rule } of otherMediaRules) {
    css += `${media} {\n`;
    css += '  ' + rule.replace(/\n/g, '\n  ');
    css += '\n}\n\n';
  }

  // Append to style.css
  const existingCss = fs.readFileSync(STYLE_CSS, 'utf8');
  fs.writeFileSync(STYLE_CSS, existingCss + css);

  console.log(`  ${baseRules.length} base rules`);
  console.log(`  ${normalRules.length} normal rules`);
  console.log(`  ${media840Rules.length} @media 840px rules`);
  console.log(`  ${media540Rules.length} @media 540px rules`);
  console.log(`  ${media320Rules.length} @media 320px rules`);
}

// ============================================================
// Phase 3: Transform HTML files
// ============================================================
function phase3(fileData, mapping) {
  console.log('Phase 3: Transforming HTML files...');

  for (const { filePath } of fileData) {
    let html = fs.readFileSync(filePath, 'utf8');
    html = transformHtmlFile(html, mapping);
    fs.writeFileSync(filePath, html);
  }

  console.log(`  ${fileData.length} files transformed`);
}

function transformHtmlFile(html, mapping) {
  // Step 1: Analyze all <style> blocks
  // All Tier A/B rules are now in style.css, so we only keep data-r/:root/font-face blocks
  const blocks = extractStyleBlocks(html);

  const blockInfos = [];
  for (const block of blocks) {
    const rules = parseCssRules(block.css);
    let hasDataR = block.css.includes('data-r-');
    let hasRoot = false;
    let hasFontFace = false;

    for (const rule of rules) {
      if (rule.isRoot) { hasRoot = true; }
      if (rule.isFontFace) { hasFontFace = true; }
    }

    blockInfos.push({
      block,
      rules,
      hasDataR,
      hasRoot,
      hasFontFace,
    });
  }

  // Step 2: Remove/rewrite <style> blocks
  // Process in reverse order to preserve indices
  for (let i = blockInfos.length - 1; i >= 0; i--) {
    const { block, rules, hasDataR, hasRoot, hasFontFace } = blockInfos[i];

    if (hasRoot) {
      // Keep :root blocks as-is
      continue;
    }

    if (hasDataR && !hasFontFace) {
      // data-r style blocks: rewrite selectors but keep the block
      let newCss = block.css;
      // Replace data-r- attributes with short class in selectors
      // These use data-r-{path}_{uuid} pattern - we'll handle these with page-local r-classes
      // For now keep them as-is (data-r blocks stay)
      // BUT if the block also has data-s rules, only keep the data-r parts

      const dataRRules = [];
      const otherRules = [];
      for (const rule of rules) {
        if (rule.selector && rule.selector.includes('data-r-')) {
          dataRRules.push(rule);
        } else {
          otherRules.push(rule);
        }
      }

      if (dataRRules.length > 0 && otherRules.length === 0) {
        // Pure data-r block - keep as-is
        continue;
      }

      if (dataRRules.length > 0) {
        // Mixed block - rebuild with only data-r rules
        let newContent = '\n';
        for (const r of dataRRules) {
          newContent += `${r.selector} {\n  ${r.body}\n}\n`;
        }
        html = html.slice(0, block.index) + `<style>${newContent}</style>` + html.slice(block.index + block.fullMatch.length);
        continue;
      }
    }

    // Has font-face but also has data-s rules
    if (hasFontFace) {
      const fontFaceRules = rules.filter(r => r.isFontFace);
      const dataSRules = rules.filter(r => !r.isFontFace && extractUuidFromSelector(r.selector));
      if (fontFaceRules.length > 0 && dataSRules.length > 0) {
        // Keep only font-face rules plus any data-s Tier A rules already processed
        let newContent = '\n';
        for (const r of fontFaceRules) {
          newContent += `${r.selector} {\n  ${r.body}\n}\n`;
        }
        // Check if block has an id attribute
        const idMatch = block.fullMatch.match(/<style\s+([^>]*?)>/);
        const openTag = idMatch ? `<style ${idMatch[1]}>` : '<style>';
        html = html.slice(0, block.index) + `${openTag}${newContent}</style>` + html.slice(block.index + block.fullMatch.length);
        continue;
      }

      if (fontFaceRules.length > 0 && dataSRules.length === 0) {
        // Only font-face, keep as-is
        continue;
      }
    }

    // If block only has data-s rules (no data-r, no :root, no font-face), remove it
    const hasNonDataS = rules.some(r => {
      if (r.isRoot || r.isFontFace) return true;
      if (r.selector && r.selector.includes('data-r-')) return true;
      return false;
    });

    if (!hasNonDataS) {
      // Remove the entire <style> block
      html = html.slice(0, block.index) + html.slice(block.index + block.fullMatch.length);
    }
  }

  // Step 3: Replace data-s-{uuid}="" with short class
  // (Tier A rules are in style.css, not inlined to style="")
  // Handle both long UUIDs and short (8-char) orphan IDs
  html = html.replace(
    / ?data-s-([a-f0-9][a-f0-9-]*)=""/g,
    (match, id) => {
      // Long UUID with CSS rules → add class
      if (id.length === 36) {
        const cls = mapping.uuidToClass[id];
        if (cls) {
          // We'll add the class to the class attribute later
          return `%%%ADD_CLASS_${cls}%%%`;
        }
      }
      // Short (8-char) orphan → remove entirely
      return '';
    }
  );

  // Now process the %%%ADD_CLASS_xxx%%% markers
  // For each marker, add the class to the element's class attribute
  let marker;
  const markerRe = /%%%ADD_CLASS_(s\d+)%%%/;
  while ((marker = markerRe.exec(html)) !== null) {
    const cls = marker[1];
    const markerPos = marker.index;

    // Find the class="" attribute in this tag
    // Look backwards for <
    const tagStart = html.lastIndexOf('<', markerPos);
    const tagEnd = html.indexOf('>', markerPos);

    if (tagStart === -1 || tagEnd === -1) {
      // Can't find tag, just remove marker
      html = html.slice(0, markerPos) + html.slice(markerPos + marker[0].length);
      continue;
    }

    // Remove the marker first
    html = html.slice(0, markerPos) + html.slice(markerPos + marker[0].length);

    // Re-find tag boundaries after removal
    const newTagEnd = html.indexOf('>', tagStart);
    const tagContent = html.slice(tagStart, newTagEnd + 1);

    // Find class attribute
    const classMatch = tagContent.match(/\sclass="([^"]*)"/);
    if (classMatch) {
      const existingClasses = classMatch[1];
      const newClasses = existingClasses + ' ' + cls;
      const newTag = tagContent.replace(/\sclass="[^"]*"/, ` class="${newClasses}"`);
      html = html.slice(0, tagStart) + newTag + html.slice(newTagEnd + 1);
    } else {
      // No class attribute, add one
      const insertPos = tagStart + tagContent.indexOf(' ');
      if (insertPos > tagStart) {
        html = html.slice(0, insertPos) + ` class="${cls}"` + html.slice(insertPos);
      }
    }
  }

  // Step 4: Handle data-r- attributes
  // Replace long data-r- attributes with short page-local classes
  let rCounter = 0;
  const dataRMap = {};

  // Find all data-r- attributes in HTML elements
  html = html.replace(
    / ?data-r-([^\s"=]+)=""/g,
    (match, rId) => {
      if (!dataRMap[rId]) {
        dataRMap[rId] = `r${rCounter++}`;
      }
      return `%%%ADD_CLASS_R_${dataRMap[rId]}%%%`;
    }
  );

  // Also update data-r selectors in remaining <style> blocks
  for (const [oldRId, newClass] of Object.entries(dataRMap)) {
    // Replace in CSS selectors: [data-r-{oldRId}] → .{newClass}
    html = html.replace(
      new RegExp(`\\[data-r-${escapeRegex(oldRId)}\\]`, 'g'),
      `.${newClass}`
    );
  }

  // Process R class markers
  const rMarkerRe = /%%%ADD_CLASS_R_(r\d+)%%%/;
  while ((marker = rMarkerRe.exec(html)) !== null) {
    const cls = marker[1];
    const markerPos = marker.index;
    const tagStart = html.lastIndexOf('<', markerPos);
    const tagEnd = html.indexOf('>', markerPos);

    if (tagStart === -1 || tagEnd === -1) {
      html = html.slice(0, markerPos) + html.slice(markerPos + marker[0].length);
      continue;
    }

    html = html.slice(0, markerPos) + html.slice(markerPos + marker[0].length);
    const newTagEnd = html.indexOf('>', tagStart);
    const tagContent = html.slice(tagStart, newTagEnd + 1);

    const classMatch = tagContent.match(/\sclass="([^"]*)"/);
    if (classMatch) {
      const newClasses = classMatch[1] + ' ' + cls;
      const newTag = tagContent.replace(/\sclass="[^"]*"/, ` class="${newClasses}"`);
      html = html.slice(0, tagStart) + newTag + html.slice(newTagEnd + 1);
    } else {
      const insertPos = tagStart + tagContent.indexOf(' ');
      if (insertPos > tagStart) {
        html = html.slice(0, insertPos) + ` class="${cls}"` + html.slice(insertPos);
      }
    }
  }

  // Step 5: Replace gap variable references in remaining inline styles
  html = html.replace(/var\(--gap-h-([a-f0-9-]{36})\)/g, (match, uuid) => {
    const key = `--gap-h-${uuid}`;
    return mapping.gapHMapping[key] ? `var(${mapping.gapHMapping[key]})` : match;
  });
  html = html.replace(/var\(--gap-v-([a-f0-9-]{36})\)/g, (match, uuid) => {
    const key = `--gap-v-${uuid}`;
    return mapping.gapVMapping[key] ? `var(${mapping.gapVMapping[key]})` : match;
  });

  return html;
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ============================================================
// Phase 4: Update main.js selectors
// ============================================================
function phase4(mapping) {
  console.log('Phase 4: Updating main.js...');

  let js = fs.readFileSync(MAIN_JS, 'utf8');

  // Replace [data-s-{uuid}] selectors with .sN
  js = js.replace(
    /'\[data-s-([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})\]'/g,
    (match, uuid) => {
      const cls = mapping.uuidToClass[uuid];
      if (cls) return `'.${cls}'`;
      console.warn(`  WARNING: UUID ${uuid} in main.js not found in mapping`);
      return match;
    }
  );

  fs.writeFileSync(MAIN_JS, js);
  console.log('  main.js updated');
}

// ============================================================
// Main
// ============================================================
function main() {
  console.log('Starting data-s refactoring...\n');

  const { fileData, mapping } = phase1();
  phase2(fileData, mapping);
  phase3(fileData, mapping);
  phase4(mapping);

  console.log('\nDone! Run verification:');
  console.log('  grep -r "data-s-" docs/ | grep -v "data-s-font" | head -20');
  console.log('  npm run lint');
}

main();
