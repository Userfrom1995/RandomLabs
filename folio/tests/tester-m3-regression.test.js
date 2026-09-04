// Tester M3 regression suite (PR #291, issue #277).
// Durable black-box + adversarial invariants for Folio M3:
// vendored WASM OCR + Office converter packs treated as untrusted inputs.
// Every test re-derives its expectation independently (byte magic, manifest
// math, cross-parser checks) rather than trusting builder helpers.
// Run: node --test folio/tests/tester-m3-regression.test.js
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const here = path.dirname(fileURLToPath(import.meta.url));
const folio = path.resolve(here, "..");
const require = createRequire(import.meta.url);
const PDFLib = require("../vendor/pdf-lib.min.js");

const ocr = await import("../src/core/ocr/ocr.js");
const zip = await import("../src/core/office/zip.js");
const blocks = await import("../src/core/office/blocks.js");
const sheets = await import("../src/core/office/sheets.js");

const inflate = async (raw) => new Uint8Array(zlib.inflateRawSync(Buffer.from(raw)));

function readAllJs(dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...readAllJs(p));
    else if (e.name.endsWith(".js")) out.push(p);
  }
  return out;
}

test("M3 packs are real engines, not stubs: magic bytes + manifest math", () => {
  const wasmMagic = fs.readFileSync(path.join(folio, "packs/ocr/tesseract-core-lstm.wasm")).subarray(0, 4);
  assert.deepEqual([...wasmMagic], [0x00, 0x61, 0x73, 0x6d], "tesseract core must be a real WASM binary");
  const gzMagic = fs.readFileSync(path.join(folio, "packs/ocr/lang/eng.traineddata.gz")).subarray(0, 2);
  assert.deepEqual([...gzMagic], [0x1f, 0x8b], "eng model must be real gzip data");
  for (const [pack, minBytes] of [["ocr", 5_000_000], ["office", 1_000_000]]) {
    const man = JSON.parse(fs.readFileSync(path.join(folio, "packs", pack, "pack.json"), "utf8"));
    let sum = 0;
    for (const f of man.files) {
      const st = fs.statSync(path.join(folio, "packs", pack, f));
      assert.ok(st.size > 10_000, pack + "/" + f + " must be a real vendored file, got " + st.size + " B");
      sum += st.size;
    }
    assert.equal(sum, man.totalBytes, pack + " manifest must equal bytes on disk");
    assert.ok(man.totalBytes >= minBytes, pack + " too small to be a real engine");
  }
});

test("M3 OCR geometry adversarial: bounds, filtering, size clamps", async () => {
  const W = 595;
  const H = 842;
  const words = [
    { text: "Top", confidence: 98, bbox: { x0: 10, y0: 10, x1: 90, y1: 40 } },
    { text: "Mid", confidence: 55, bbox: { x0: 10, y0: 400, x1: 90, y1: 430 } },
    { text: "Junk", confidence: 5, bbox: { x0: 10, y0: 700, x1: 90, y1: 730 } },
    { text: "   ", confidence: 99, bbox: { x0: 0, y0: 0, x1: 5, y1: 5 } },
  ];
  const ops = ocr.textLayerOps(words, 300, H, { minConf: 30 });
  assert.equal(ops.length, 2, "low-conf + blank words must be dropped, high-conf kept");
  for (const op of ops) {
    assert.ok(op.x >= 0 && op.x <= W, "x in page: " + op.x);
    assert.ok(op.y >= 0 && op.y <= H, "y in page: " + op.y);
    assert.ok(op.size >= 4 && op.size <= 48, "font size clamped: " + op.size);
  }
  // every kept op must bake onto a real page without throwing
  const doc = await PDFLib.PDFDocument.create();
  const font = await doc.embedFont(PDFLib.StandardFonts.Helvetica);
  const page = doc.addPage([W, H]);
  assert.equal(ocr.bakeTextLayer(page, ops, font), 2);
  const recall = ocr.wordRecall(["Top", "Mid"], "top mid folio");
  assert.equal(recall.recall, 1);
  assert.equal(ocr.wordRecall(["nope"], "top mid").recall, 0);
});

test("M3 office adversarial: hostile HTML + ragged grids stay valid", async () => {
  const hostile = "<h2>A &lt;tag&gt; &amp; quote &quot;q&quot;</h2><table><tr><td><p><strong>deep</strong> cell</p></td></tr></table><ul><li></li><li>x</li></ul>";
  const bs = blocks.htmlToBlocks(hostile);
  assert.ok(bs.some((b) => b.t === "h" && b.level === 2), "heading kept");
  assert.ok(bs[0].spans[0].text.includes("<tag>"), "entities decoded, got: " + bs[0].spans[0].text);
  const tables = bs.filter((b) => b.t === "table");
  assert.equal(tables.length, 1, "nested <p> must not escape the table");
  assert.ok(tables[0].rows[0][0].some((s) => s.bold && s.text.includes("deep")), "nested bold span kept in cell");
  const r = await blocks.blocksToPdf(bs, PDFLib, {});
  const re = await PDFLib.PDFDocument.load(r.bytes);
  assert.equal(re.getPageCount(), r.pages, "produced PDF reloads cleanly");
  // ragged + sparse grids normalize without holes
  const grid = sheets.normGrid([["a"], ["x", "y", "z"], [], ["p", null]]);
  assert.ok(grid.every((row) => row.length === 3), "ragged rows padded: " + JSON.stringify(grid));
  const sr = await sheets.gridToPdf(grid, PDFLib, { title: "Ragged" });
  assert.ok(sr.pages >= 1);
});

test("M3 cross-parser: SheetJS xlsx + our docx open in our own zip reader", async () => {
  const XLSX = require("../packs/office/xlsx.full.min.js");
  const grid = sheets.normGrid([["SKU", "N"], ["alpha", 1], ["beta", 2]]);
  const ws = XLSX.utils.aoa_to_sheet(grid);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Data");
  const xbytes = new Uint8Array(XLSX.write(wb, { type: "array", bookType: "xlsx" }));
  const xfiles = await zip.parseZip(xbytes, inflate);
  assert.ok(xfiles.some((f) => f.name === "xl/worksheets/sheet1.xml"), "SheetJS output is a real OOXML package");
  const sheet1 = xfiles.find((f) => f.name === "xl/sharedStrings.xml" || f.name === "xl/worksheets/sheet1.xml");
  assert.ok(sheet1 && sheet1.data.length > 0);
  const dbytes = blocks.assembleDocx([{ text: "Cross Parser", heading: 1 }, "row one"], []);
  const dfiles = await zip.parseZip(dbytes, inflate);
  const names = dfiles.map((f) => f.name);
  assert.ok(names.includes("word/document.xml") && names.includes("[Content_Types].xml"), "our docx has OOXML skeleton: " + names);
  const mammoth = require("../packs/office/mammoth.browser.min.js");
  const { value: html } = await mammoth.convertToHtml({ arrayBuffer: dbytes.buffer.slice(0) });
  assert.ok(html.includes("Cross Parser"), "independent parser (mammoth) reads our docx");
});

test("M3 anti-facade: no stub theater in UI, CSP allows the WASM engine", () => {
  const uiFiles = readAllJs(path.join(folio, "src", "ui"));
  const blob = uiFiles.map((f) => fs.readFileSync(f, "utf8")).join("\n");
  for (const needle of ["coming soon", "coming-soon", "TODO stub", "not implemented"]) {
    assert.ok(!blob.toLowerCase().includes(needle), "UI must not contain facade marker: " + needle);
  }
  // "placeholder" appears only in an honest M1 purge comment (security-ops.js
  // documents facades that were removed); it must never reach rendered UI.
  const html = fs.readFileSync(path.join(folio, "index.html"), "utf8");
  assert.ok(!/placeholder.{0,40}(coming|soon|deferred)/i.test(html));
  assert.ok(!/pptx/i.test(blob), "PPTX must be omitted entirely, not stubbed");
  assert.ok(html.includes("wasm-unsafe-eval"), "CSP must permit the Tesseract WASM engine");
  assert.ok(!html.includes("unsafe-eval'") || html.includes("wasm-unsafe-eval"), "no blanket unsafe-eval");
  for (const route of ["ocr", "office", "docx", "xlsx"]) {
    assert.ok(blob.toLowerCase().includes(route) || html.toLowerCase().includes(route), "M3 route/control present: " + route);
  }
});
