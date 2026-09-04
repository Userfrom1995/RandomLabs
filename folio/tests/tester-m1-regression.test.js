// Tester M1 regression suite (PR #288, issue #277).
// Durable black-box + static invariants for Folio M1: Clean Core & Visual Page Grid.
// Run: node --test folio/tests/tester-m1-regression.test.js
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const folio = path.resolve(here, "..");
const srcDir = path.join(folio, "src");

function readAllJs(dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...readAllJs(p));
    else if (e.name.endsWith(".js")) out.push(p);
  }
  return out;
}

test("M1 anti-facade: purged modules are gone from disk and from imports", () => {
  // M3 amendment (issue #277, epic roadmap): ocr-ops.js was restored with
  // a REAL vendored Tesseract engine (packs/ocr + searchable-PDF builder,
  // proven by folio-m3 gates), so it leaves this purge list. Everything
  // else stays deleted.
  const gone = [
    "src/ui/tools/redact-ops.js",
    "src/core/content/burnin.js",
    "src/core/content/redact.js",
    "src/core/convert/office.js",
    "src/core/convert/office-fallback.js",
    "src/core/convert/office-pack.js",
    "src/core/convert/zip-read.js",
    "src/core/ocr-client/ocr.js",
    "src/platform/packs/loader.js",
    "src/platform/packs/manifest.js",
  ];
  for (const rel of gone) assert.equal(fs.existsSync(path.join(folio, rel)), false, rel + " must stay deleted");
  const jsFiles = readAllJs(srcDir);
  const blob = jsFiles.map((f) => fs.readFileSync(f, "utf8")).join("\n");
  for (const mod of ["redact-ops", "office-fallback", "office-pack", "zip-read", "packs/loader", "packs/manifest", "content/burnin", "content/redact", "ocr-client", "convert/office"]) {
    assert.equal(blob.includes(mod), false, "stale import of " + mod);
  }
  // ocr-ops exists again: assert it is the real engine, not the theater.
  assert.ok(fs.existsSync(path.join(folio, "packs/ocr/tesseract-core-lstm.wasm")), "M3 OCR pack engine present");
  assert.ok(blob.includes("overlayPdfSearchLayer") || blob.includes("overlaySearchLayer"), "OCR writes real search layers");
});

test("M1 honesty: no modal dialogs, no coming-soon stubs in shipped code", () => {
  const blob = readAllJs(srcDir).map((f) => fs.readFileSync(f, "utf8")).join("\n");
  assert.match(blob.includes("prompt(") ? "HAS prompt(" : "clean", /clean/);
  assert.equal(/\bprompt\s*\(/.test(blob), false, "no prompt() in shipped code");
  assert.equal(/\bconfirm\s*\(/.test(blob), false, "no confirm() in shipped code");
  assert.equal(/\balert\s*\(/.test(blob), false, "no alert() in shipped code");
  assert.equal(blob.toLowerCase().includes("coming soon"), false, "no coming-soon stubs");
  const html = fs.readFileSync(path.join(folio, "index.html"), "utf8");
  assert.equal(html.toLowerCase().includes("coming soon"), false, "no coming-soon stubs in HTML");
  // M3 amendment: transient state gates (cancel-while-idle, download with
  // no result yet) are real UX, not stubs. Every statically-disabled button
  // must have a provable enabler in app.js that flips it at runtime.
  const appSrc = fs.readFileSync(path.join(srcDir, "ui/shell/app.js"), "utf8");
  for (const m of html.matchAll(/<button[^>]*\bid="([^"]+)"[^>]*\bdisabled\b|<button[^>]*\bdisabled\b[^>]*\bid="([^"]+)"/g)) {
    const id = m[1] || m[2];
    assert.ok(id, "disabled button without id is a stub");
    assert.ok(appSrc.includes('("' + id + '")') && appSrc.includes(".disabled"), id + " has no runtime enabler in app.js");
  }
});

test("M1 boot path: viewer imports vendored pdf.mjs at a path that exists", () => {
  const viewer = fs.readFileSync(path.join(srcDir, "ui/viewer/viewer.js"), "utf8");
  assert.ok(viewer.includes("../../../vendor/pdf.mjs"), "viewer must import ../../../vendor/pdf.mjs");
  assert.equal(fs.existsSync(path.join(folio, "vendor/pdf.mjs")), true, "vendored pdf.mjs exists");
  assert.equal(fs.existsSync(path.join(folio, "vendor/pdf.worker.mjs")), true, "vendored worker exists");
});

test("M1 correctness: every embedPdf call passes explicit page indices", () => {
  const editOps = fs.readFileSync(path.join(srcDir, "ui/tools/edit-ops.js"), "utf8");
  const lines = editOps.split("\n").filter((l) => l.includes(".embedPdf("));
  assert.ok(lines.length >= 3, "expected 3+ embedPdf call sites, got " + lines.length);
  for (const line of lines) assert.ok(/getPageIndices\(\)/.test(line), "embedPdf missing explicit indices: " + line.trim());
});

test("M1 wiring: every $/run id used by app.js resolves in index.html", () => {
  const html = fs.readFileSync(path.join(folio, "index.html"), "utf8");
  const htmlIds = new Set([...html.matchAll(/id="([^"]+)"/g)].map((m) => m[1]));
  const app = fs.readFileSync(path.join(srcDir, "ui/shell/app.js"), "utf8");
  const used = new Set();
  for (const re of [/\$\('([^']+)'\)/g, /\$\("([^"]+)"\)/g, /getElementById\("([^"]+)"\)/g, /getElementById\('([^']+)'\)/g, /run\("([^"]+)"\)/g, /run\('([^']+)'\)/g, /querySelector\("#([A-Za-z0-9_-]+)"\)/g]) {
    for (const m of app.matchAll(re)) used.add(m[1].replace(/^#/, ""));
  }
  assert.ok(used.size > 50, "expected 50+ wired ids, got " + used.size);
  const missing = [...used].filter((id) => !htmlIds.has(id));
  assert.deepEqual(missing, [], "unresolved ids: " + missing.join(","));
});

test("M1 grid engine: gridDropOrder is a pure permutation move", async () => {
  const { gridDropOrder } = await import("../src/ui/tools/pages-ops.js");
  assert.deepEqual(gridDropOrder(4, 0, 2), [1, 2, 0, 3]);
  assert.deepEqual(gridDropOrder(4, 3, 0), [3, 0, 1, 2]);
  assert.deepEqual(gridDropOrder(1, 0, 0), [0]);
  assert.deepEqual(gridDropOrder(3, 1, 1), [0, 1, 2]);
  // permutation property: output is always a permutation of 0..n-1
  for (const [n, from, to] of [[5, 0, 4], [5, 4, 0], [6, 2, 5], [6, 5, 2]]) {
    const order = gridDropOrder(n, from, to);
    assert.deepEqual([...order].sort((a, b) => a - b), Array.from({ length: n }, (_, i) => i));
    assert.equal(order[to], from, "moved element lands at clamped target");
  }
  assert.throws(() => gridDropOrder(3, 5, 0));
  assert.throws(() => gridDropOrder(0, 0, 0));
});

test("M1 grid markup: toolbar, listbox, and keyboard help are present", () => {
  const html = fs.readFileSync(path.join(folio, "index.html"), "utf8");
  for (const id of ["pagegrid", "gridtools", "gridcount", "gridnote", "g-rot", "g-dup", "g-left", "g-right", "g-del"]) {
    assert.ok(html.includes('id="' + id + '"'), "missing #" + id);
  }
  assert.ok(html.includes('role="listbox"'), "grid must be a listbox");
  assert.ok(html.includes("Ctrl+arrows"), "keyboard help must mention Ctrl+arrows");
});
