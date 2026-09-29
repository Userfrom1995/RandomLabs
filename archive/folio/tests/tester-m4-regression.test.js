// Tester M4 regression suite (PR #292, issue #277).
// Durable black-box + adversarial invariants for Folio M4 (Modern UX +
// direct canvas manipulation). Every test re-derives its expectation
// independently rather than trusting builder helpers:
// - overlay math checked against hand-computed values (not roundtrip only)
// - every placement mode commits REAL bytes through the real M1/M2 engines
// - raw-coordinate inputs must exist ONLY as a11y <details> fallbacks
// - corrupt input must reject loudly, never freeze silently
// Run: node --test folio/tests/tester-m4-regression.test.js
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const here = path.dirname(fileURLToPath(import.meta.url));
const folio = path.resolve(here, "..");
const require = createRequire(import.meta.url);
const PDFLib = require("../vendor/pdf-lib.min.js");

const overlay = await import("../src/ui/viewer/overlay.js");
const Annotate = await import("../src/ui/tools/annotate-ops.js");
const FormOps = await import("../src/ui/tools/form-ops.js");
const PhaseE = await import("../src/ui/tools/phaseE-ops.js");
const ImageOps = await import("../src/ui/tools/image-ops.js");
const Security = await import("../src/ui/tools/security-ops.js");

const LETTER = { width: 612, height: 792 };
const CANVAS = { width: 600, height: 777 }; // non-uniform scale stresses axis math

async function blankLetter(pages = 1) {
  const doc = await PDFLib.PDFDocument.create();
  for (let i = 0; i < pages; i++) doc.addPage([612, 792]);
  return doc.save();
}

async function subtypesOf(bytes) {
  const doc = await PDFLib.PDFDocument.load(bytes);
  return Annotate.listAnnotations(doc, PDFLib).map((a) => a.subtype);
}

// 1x1 transparent PNG (68 bytes) - smallest real image the engine must embed.
const TINY_PNG = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
  0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
  0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4, 0x89, 0x00, 0x00, 0x00,
  0x0a, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
  0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49,
  0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
]);

test("M4 overlay math is independently correct (hand-computed, not roundtrip)", () => {
  // pdfToCss: css.x = pdf.x * cw/pw; css.y = ch - (pdf.y+pdf.h) * ch/ph.
  // pdf {x:0,y:0,w:612,h:100} bottom strip -> css.y+h must equal canvas height.
  const css = overlay.pdfToCss({ x: 0, y: 0, w: 612, h: 100 }, LETTER, CANVAS);
  assert.equal(css.w, 600, "full-width maps to full canvas width");
  assert.equal(Math.round(css.y + css.h), CANVAS.height);
  // Hand-computed: x scale 600/612 = 0.98039; pdf x=306 -> css ~300.
  const mid = overlay.pdfToCss({ x: 306, y: 396, w: 61.2, h: 79.2 }, LETTER, CANVAS);
  assert.ok(Math.abs(mid.x - 300) < 1, "x scale hand-check, got " + mid.x);
  // y: ch - (396+79.2)*777/792 = 777 - 475.2*0.98106 = ~310.8
  assert.ok(Math.abs(mid.y - 310.8) < 1.5, "y flip hand-check, got " + mid.y);
  // Adversarial: zero-size rect must not produce NaN; negative drag normalizes.
  const zero = overlay.normalizeDragBox(100, 100, 100, 100, CANVAS);
  assert.ok(Number.isFinite(zero.x) && Number.isFinite(zero.w));
  const inv = overlay.normalizeDragBox(400, 500, 100, 200, CANVAS);
  assert.deepEqual([inv.x, inv.y, inv.w, inv.h], [100, 200, 300, 300]);
  // Resize past the edge clamps inside the canvas, never escapes.
  const edge = overlay.resizeBox({ x: 550, y: 700, w: 60, h: 60 }, "se", 500, 500, CANVAS);
  assert.ok(edge.x + edge.w <= CANVAS.width && edge.y + edge.h <= CANVAS.height);
  const moved = overlay.moveBox({ x: 0, y: 0, w: 100, h: 100 }, -999, -999, CANVAS);
  assert.deepEqual([moved.x, moved.y], [0, 0]);
});

test("M4 all 8 placement modes commit real bytes (anti-facade gate)", async () => {
  const base = await blankLetter();
  // note -> /Text
  const n = overlay.commitRect("note", { x: 300, y: 300, w: 0, h: 0 }, LETTER, CANVAS);
  const noted = await Annotate.addStickyNote(base, { page: 0, x: n.x, y: n.y, contents: "tester note" }, PDFLib);
  assert.ok((await subtypesOf(noted)).includes("Text"), "note click must land as /Text");
  // shape -> /Square
  const s = overlay.commitRect("shape", { x: 100, y: 100, w: 200, h: 80 }, LETTER, CANVAS);
  const shaped = await Annotate.addGeomAnnot(base, { page: 0, kind: "rect", rect: s }, PDFLib);
  assert.ok((await subtypesOf(shaped.bytes)).includes("Square"), "shape drag must land as /Square");
  // link page:2 -> /Link with real destination
  const l = overlay.commitRect("link", { x: 50, y: 60, w: 220, h: 24 }, LETTER, CANVAS);
  const two = await blankLetter(2);
  const linked = await Annotate.addLink(two, { page: 0, rect: l, ...overlay.parsePlaceTarget("page:2", 2) }, PDFLib);
  assert.ok((await subtypesOf(linked)).includes("Link"), "link drag must land as /Link");
  assert.throws(() => overlay.parsePlaceTarget("page:99", 2), /within/, "out-of-range link target must reject");
  // stamp + sign change bytes (content-stream writes, not annotation subtypes)
  const stamped = await Annotate.addStamp(base, { page: 0, text: "APPROVED", x: 100, y: 600 }, PDFLib);
  assert.ok(stamped.length > base.length, "stamp must grow the file");
  const signed = await Security.signatureStamp(base, { page: 0, text: "Tester", x: 100, y: 120 }, PDFLib);
  assert.ok(signed.length > base.length, "signature must grow the file");
  assert.ok((await PDFLib.PDFDocument.load(signed)).getPageCount() === 1, "signed doc still parses");
  // image frame embeds real pixels
  const framed = overlay.commitRect("image", { x: 50, y: 50, w: 300, h: 200 }, LETTER, CANVAS);
  const imged = await ImageOps.insertImage(base, { page: 0, imageBytes: TINY_PNG, kind: "png", x: framed.x, y: framed.y, maxW: framed.w, maxH: framed.h }, PDFLib);
  assert.ok(imged.length > base.length, "image frame must embed pixels");
  // field rect commits through createField and describes back
  const f = overlay.commitRect("field", { x: 56, y: 600, w: 200, h: 24 }, LETTER, CANVAS);
  const formed = await FormOps.createField(base, { name: "testerCanvas", type: "text", page: 1, rect: f }, PDFLib);
  const fields = await FormOps.describeForm(formed, PDFLib);
  assert.ok(fields.some((x) => x.name === "testerCanvas"), "field drag must create a real field");
  // crop rect shrinks the crop box through the real engine
  const cropCss = overlay.normalizeDragBox(50, 50, 550, 727, CANVAS);
  const raw = overlay.cssToPdf(cropCss, LETTER, CANVAS);
  const cropped = await PhaseE.cropPages(base, { x: raw.x, y: raw.y, w: raw.w, h: raw.h }, PDFLib);
  const cb = (await PDFLib.PDFDocument.load(cropped)).getPages()[0].getCropBox();
  assert.ok(cb.width < 612 && cb.height < 792, "crop drag must shrink the box, got " + cb.width + "x" + cb.height);
});

test("M4 form overlay loop: geometry export positions input, change commits one field", async () => {
  const doc = await PDFLib.PDFDocument.create();
  doc.addPage([612, 792]);
  let bytes = await doc.save();
  bytes = await FormOps.createField(bytes, { name: "solo", type: "text", page: 1, rect: { x: 56, y: 600, w: 200, h: 24 } }, PDFLib);
  bytes = await FormOps.createField(bytes, { name: "other", type: "text", page: 1, rect: { x: 56, y: 500, w: 200, h: 24 } }, PDFLib);
  bytes = (await FormOps.fillForm(bytes, { solo: "before", other: "untouched" }, PDFLib)).bytes;  const descs = await FormOps.describeFields(bytes, PDFLib);
  assert.equal(descs.length, 2);
  const solo = descs.find((d) => d.name === "solo");
  assert.equal(solo.page, 1);
  assert.ok(Math.abs(solo.rect.x - 56) < 2 && Math.abs(solo.rect.w - 200) < 2, "geometry must match creation rect: " + JSON.stringify(solo.rect));
  // Overlay positioning roundtrip: reported rect -> css -> back, sub-point drift.
  const css = overlay.pdfToCss(solo.rect, LETTER, CANVAS);
  assert.ok(css.x >= 0 && css.y >= 0 && css.x + css.w <= CANVAS.width + 1, "overlay input stays on canvas");
  const back = overlay.cssToPdf(css, LETTER, CANVAS);
  assert.ok(Math.abs(back.x - solo.rect.x) < 0.5 && Math.abs(back.w - solo.rect.w) < 0.5, "overlay maps back onto the field");
  // Single-field commit leaves the sibling intact.
  const filled = (await FormOps.fillForm(bytes, { solo: "after" }, PDFLib)).bytes;
  const re = await FormOps.describeFields(filled, PDFLib);
  assert.equal(re.find((d) => d.name === "solo").value, "after");
  assert.equal(re.find((d) => d.name === "other").value, "untouched");
});

test("M4 bookmark tree edits serialize into the real bookmark engine", async () => {
  const tree = [];
  overlay.addBookmarkNode(tree, { title: "A", page: 1 });
  overlay.addBookmarkNode(tree, { title: "B", page: 2 });
  assert.equal(overlay.indentNode(tree, [0]), false, "first node cannot indent");
  assert.equal(overlay.indentNode(tree, [1]), true, "B indents under A");
  assert.equal(overlay.outdentNode(tree, [0, 0]), true, "B outdents back");
  assert.equal(overlay.moveNode(tree, [1], -1), true, "B moves above A");
  assert.deepEqual(tree.map((n) => n.title), ["B", "A"]);
  const rows = overlay.treeToRows(tree);
  assert.deepEqual(rows.map((r) => [r.title, r.page, r.depth]), [["B", 2, 0], ["A", 1, 0]]);
  // Rows commit through the real engine and survive a TOC build.
  const base = await blankLetter(2);
  const set = await Annotate.setBookmarks(base, rows, PDFLib);
  assert.ok(set.count === 2 && set.bytes.length > base.length, "edited tree must set 2 real bookmarks");
  const toc = await Annotate.addTocPage(base, rows, PDFLib);
  assert.ok((await PDFLib.PDFDocument.load(toc.bytes || toc)).getPageCount() >= 2, "TOC build must keep pages");
});

test("M4 shell is pointer-first: toolbar present, coordinates only a11y fallbacks", () => {
  const html = fs.readFileSync(path.join(folio, "index.html"), "utf8");
  const app = fs.readFileSync(path.join(folio, "src", "ui", "shell", "app.js"), "utf8");
  for (const mode of ["crop", "note", "shape", "link", "stamp", "sign", "image", "field"]) {
    assert.ok(html.includes('data-mode="' + mode + '"'), "toolbar must arm " + mode + " by click, no typing");
  }
  for (const id of ["overlay", "canvaswrap", "formlayer", "bmtree", "placetoolbar", "overlayhint"]) {
    assert.ok(html.includes('id="' + id + '"'), "shell must have #" + id);
  }
  // Raw-coordinate inputs survive ONLY inside collapsed a11y <details>.
  for (const id of ["notexy", "shapexy", "linkrect", "imgxy", "fldrect", "ext-crop"]) {
    const idx = html.indexOf('id="' + id + '"');
    assert.ok(idx >= 0, "fallback keeps #" + id);
    const det = html.lastIndexOf("<details", idx);
    assert.ok(det >= 0 && html.slice(det, det + 200).includes("a11y"), "#" + id + " must live inside details.a11y");
    assert.ok(html.indexOf("</details>", idx) > idx, "#" + id + " details must close");
  }
  assert.ok(!html.includes('id="bmtext"') && !html.includes('id="ext-bmtext"'), "pipe-delimited bookmark textareas must be gone");
  // Dropzone is keyboard-operable and guarded against accidental navigation.
  assert.ok(/tabindex|keydown|keypress|keyup/.test(html + app), "dropzone must be keyboard operable");
  assert.ok(/dragover|drop/.test(app), "window-level drag guard must exist");
  assert.ok(/preventDefault/.test(app), "drop must not navigate the browser away");
  // Every overlay mode has a commit path through a real engine op in app.js.
  for (const op of ["addStickyNote", "addGeomAnnot", "addLink", "addStamp", "signatureStamp", "insertImage", "createField", "cropPages", "fillForm", "setBookmarks"]) {
    assert.ok(app.includes(op), "app.js must commit through " + op);
  }
});

test("M4 ingestion resilience: corrupt bytes reject, loader errors toast, OPFS degrades", async () => {
  // Corrupt / truncated / encrypted-looking inputs must throw loudly (app
  // surfaces these via toast + encrypted hint, never a silent stall).
  await assert.rejects(() => PDFLib.PDFDocument.load(new Uint8Array([0, 1, 2, 3, 4])));
  await assert.rejects(() => PDFLib.PDFDocument.load(new Uint8Array(0)));
  const app = fs.readFileSync(path.join(folio, "src", "ui", "shell", "app.js"), "utf8");
  assert.ok(/try\s*\{/.test(app) && app.includes("toast("), "loader must try/catch into a visible toast");
  assert.ok(/ncrypt/i.test(app), "loader must hint at encrypted files");
  // OPFS SecurityError degrades to memory instead of losing the session.
  globalThis.__folioNavigator = { storage: { getDirectory: async () => ({ getDirectoryHandle: async () => { const e = new Error("denied"); e.name = "SecurityError"; throw e; } }) } };
  Object.defineProperty(globalThis, "navigator", { value: globalThis.__folioNavigator, configurable: true });
  try {
    const opfs = await import("../src/platform/storage/opfs.js?testerM4=1");
    assert.equal((await opfs.initStorage()).backend, "opfs");
    const w = await opfs.writeFile("folio/work/t/m4.pdf", new Uint8Array([9, 9]));
    assert.equal(w.backend, "memory", "denied OPFS write must degrade to memory");
    assert.deepEqual([...(await opfs.readFile("folio/work/t/m4.pdf"))], [9, 9], "degraded write must still be readable");
  } finally {
    delete globalThis.navigator;
    delete globalThis.__folioNavigator;
  }
});
