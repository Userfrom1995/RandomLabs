// macOS exact-case link audit (Refs #759).
//
// APFS is case-insensitive by default, so a link such as `Docs/Web.html` can
// open locally while GitHub Pages returns 404 because production is
// case-sensitive. This audit walks every local href/src in the shipped HTML
// and verifies that each path component matches the on-disk spelling exactly.
// No npm packages and no HTTP server are required.
//
// Usage: node web/e2e/macos-case-audit.js
// Exit 0 when every local target matches case; exit 1 on any mismatch.

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const SKIP_DIRS = new Set(['.git', 'node_modules', 'target']);
const ATTR = /(?:^|\s)(?:href|src)\s*=\s*(?:"([^"]*)"|'([^']*)')/gi;

function walkHtml(dir, out = []) {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const stat = fs.lstatSync(full);
    if (stat.isDirectory()) {
      if (!SKIP_DIRS.has(name) && !name.startsWith('.tmp-')) walkHtml(full, out);
    } else if (stat.isFile() && /\.html?$/i.test(name)) {
      out.push(full);
    }
  }
  return out;
}

function lineAt(html, index) {
  return html.slice(0, index).split('\n').length;
}

function decode(value) {
  return value.replace(/&amp;/g, '&').replace(/&#38;/g, '&');
}

function exactCase(relParts) {
  let parent = ROOT;
  for (const part of relParts) {
    const entries = fs.readdirSync(parent);
    if (entries.includes(part)) {
      parent = path.join(parent, part);
      continue;
    }
    const folded = entries.find((entry) => entry.toLowerCase() === part.toLowerCase());
    if (folded) {
      return `case mismatch: link has '${part}', disk has '${folded}'`;
    }
    return `missing '${part}' in '${path.relative(ROOT, parent) || '.'}'`;
  }
  return '';
}

const files = walkHtml(ROOT).sort();
const failures = [];
let attrs = 0;
let checked = 0;
let skippedExternal = 0;
let skippedEmpty = 0;
let skippedRoot = 0;
let skippedTemplate = 0;

for (const file of files) {
  const html = fs.readFileSync(file, 'utf8');
  const relFile = path.relative(ROOT, file);
  for (const match of html.matchAll(ATTR)) {
    attrs++;
    let raw = decode(match[1] !== undefined ? match[1] : match[2]).trim();
    const line = lineAt(html, match.index);
    if (!raw || raw.startsWith('#')) {
      skippedEmpty++;
      continue;
    }
    if (raw.includes('{{')) {
      skippedTemplate++;
      continue;
    }
    if (/^[a-z][a-z0-9+.-]*:/i.test(raw) || raw.startsWith('//')) {
      skippedExternal++;
      continue;
    }
    if (raw.startsWith('/')) {
      skippedRoot++;
      continue;
    }
    const cut = raw.search(/[?#]/);
    if (cut >= 0) raw = raw.slice(0, cut);
    if (!raw) {
      skippedEmpty++;
      continue;
    }
    let decoded;
    try {
      decoded = decodeURIComponent(raw);
    } catch {
      failures.push(`${relFile}:${line} ${raw}: malformed percent-encoding`);
      continue;
    }
    const target = path.resolve(path.dirname(file), decoded);
    const rel = path.relative(ROOT, target);
    if (!rel || rel === '.') {
      checked++;
      continue;
    }
    if (rel.startsWith('..') || path.isAbsolute(rel)) {
      failures.push(`${relFile}:${line} ${decoded}: escapes site root`);
      continue;
    }
    const reason = exactCase(rel.split(path.sep).filter(Boolean));
    if (reason) {
      failures.push(`${relFile}:${line} ${decoded}: ${reason}`);
      continue;
    }
    checked++;
  }
}

if (failures.length) {
  for (const failure of failures) console.log(`FAIL ${failure}`);
  console.log(`MACOS-CASE-AUDIT FAIL: ${failures.length} case or path problems; ${checked} local targets checked in ${files.length} HTML files.`);
  process.exitCode = 1;
} else {
  console.log(`MACOS-CASE-AUDIT PASS: ${checked} local href/src targets match on-disk case in ${files.length} HTML files.`);
}
console.log(`attrs ${attrs}; skipped external ${skippedExternal}, fragment/query-only ${skippedEmpty}, root-absolute ${skippedRoot}, template ${skippedTemplate}.`);
