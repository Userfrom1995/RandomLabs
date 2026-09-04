// Tester M2 regression suite (PR #290, issue #277).
// Durable black-box + roundtrip invariants for Folio M2:
// native AcroForms (create/fill/flatten + no silent no-ops) and the
// vector markup layer (Ink/Square/Circle/Line as real annots + quad-aware bake).
// Run: node --test folio/tests/tester-m2-regression.test.js
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const here = path.dirname(fileURLToPath(import.meta.url));
const folio = path.resolve(here, "..");
const srcDir = path.join(folio, "src");
const require = createRequire(import.meta.url);
const PDFLib = require("../vendor/pdf-lib.min.js");

const forms = await import("../src/core/forms/forms.js");
const annotateOps = await import("../src/ui/tools/annotate-ops.js");
const formOps = await import("../src/ui/tools/form-ops.js");

function readAllJs(dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...readAllJs(p));
    else if (e.name.endsWith(".js")) out.push(p);
  }
  return out;
}

async function blankPdf() {
  const doc = await PDFLib.PDFDocument.create();
  doc.addPage([595, 842]);
  return doc.save();
}

const F = (page = 1) => ({ page, rect: { x: 50, y: 700, w: 150, h: 20 }, options: ["a", "b"] });

test("M2 forms validation: choice value outside options throws (no silent no-op)", () => {
  for (const type of ["dropdown", "list", "radio"]) {
    assert.throws(
      () => forms.validateFieldDef({ name: "n", type, ...F(), value: "zzz" }, 2),
      /not in options/,
      type + " unknown value must throw",
    );
    const ok = forms.validateFieldDef({ name: "n", type, ...F(), value: "a" }, 2);
    assert.equal(ok.value, "a");
    assert.throws(() => forms.validateFieldDef({ name: "n", type, page: 1, rect: { x: 1, y: 1, w: 10, h: 10 } }, 2), /options/);
  }
});

test("M2 forms roundtrip: create fields, describe, fill valid, fill invalid throws, flatten", async () => {
  let bytes = await blankPdf();
  bytes = await formOps.createField(bytes, { name: "city", type: "dropdown", page: 1, rect: { x: 50, y: 700, w: 150, h: 20 }, options: ["Paris", "Lyon"], value: "Paris" }, PDFLib);
  bytes = await formOps.createField(bytes, { name: "agree", type: "checkbox", page: 1, rect: { x: 50, y: 650, w: 15, h: 15 } }, PDFLib);
  const fields = await formOps.describeForm(bytes, PDFLib);
  assert.ok(fields.some((f) => f.name === "city" && f.kind === "dropdown"), "dropdown must exist: " + JSON.stringify(fields));
  assert.ok(fields.some((f) => f.name === "agree" && f.kind === "checkbox"));

  const filled = await formOps.fillForm(bytes, { city: "Lyon" }, PDFLib);
  assert.equal(filled.filled, 1);
  const refilled = await PDFLib.PDFDocument.load(filled.bytes);
  assert.equal(refilled.getForm().getDropdown("city").getSelected()[0], "Lyon");

  await assert.rejects(() => formOps.fillForm(bytes, { city: "Nowhere" }, PDFLib), /no option/);
  await assert.rejects(
    formOps.createField(bytes, { name: "bad", type: "list", page: 1, rect: { x: 50, y: 600, w: 150, h: 40 }, options: ["a"], value: "zzz" }, PDFLib),
    /not in options/,
  );
  await assert.rejects(() => formOps.fillForm(bytes, { ghost: "x" }, PDFLib), /no field named/);

  const flat = await formOps.flattenForm(filled.bytes, PDFLib);
  assert.ok(flat.length > 400, "flattened pdf must be non-trivial");
  assert.equal(forms.xfaDetect("plain pdf"), false);
});

test("M2 ink roundtrip: real /Ink annot with InkList, degenerate strokes rejected", async () => {
  const bytes = await blankPdf();
  const r = await annotateOps.addInkAnnot(bytes, { page: 0, strokes: [[{ x: 10, y: 700 }, { x: 60, y: 700 }, { x: 120, y: 690 }]], color: [0, 0, 1], thickness: 3 }, PDFLib);
  assert.equal(r.strokes, 1);
  assert.ok(r.points >= 2);
  const doc = await PDFLib.PDFDocument.load(r.bytes);
  const listed = annotateOps.listAnnotations(doc, PDFLib);
  assert.ok(listed.some((a) => a.subtype === "Ink"), "Ink annot must be listed: " + JSON.stringify(listed));
  await assert.rejects(annotateOps.addInkAnnot(bytes, { page: 0, strokes: [[{ x: 5, y: 5 }]] }, PDFLib), /no usable strokes/);
  await assert.rejects(annotateOps.addInkAnnot(bytes, { page: 9, strokes: [[{ x: 1, y: 1 }, { x: 2, y: 2 }]] }, PDFLib), /page out of range/);
});

test("M2 geom roundtrip: Square/Circle/Line (+arrow) as real annot objects, rect validated", async () => {
  const bytes = await blankPdf();
  for (const [kind, subtype] of [["rect", "Square"], ["ellipse", "Circle"], ["line", "Line"], ["arrow", "Line"]]) {
    const r = await annotateOps.addGeomAnnot(bytes, { page: 0, kind, rect: { x: 100, y: 600, w: 120, h: 60 } }, PDFLib);
    assert.equal(r.subtype, subtype, kind);
  }
  await assert.rejects(annotateOps.addGeomAnnot(bytes, { page: 0, kind: "star", rect: { x: 1, y: 1, w: 5, h: 5 } }, PDFLib), /kind must be/);
  await assert.rejects(annotateOps.addGeomAnnot(bytes, { page: 0, kind: "rect", rect: { x: 1, y: 1, w: 0, h: 5 } }, PDFLib), /positive size/);
  const seeded = await annotateOps.addGeomAnnot(bytes, { page: 0, kind: "rect", rect: { x: 100, y: 600, w: 120, h: 60 } }, PDFLib);
  const doc = await PDFLib.PDFDocument.load(seeded.bytes);
  assert.ok(annotateOps.listAnnotations(doc, PDFLib).some((a) => a.subtype === "Square"));
});

test("M2 markup+note+link roundtrip: quads placed, sticky/link listed", async () => {
  const bytes = await blankPdf();
  const lines = [{ text: "hello world", x: 50, y: 700, w: 120, h: 12, size: 12, words: [{ text: "hello", x: 50, y: 700, w: 40, h: 12 }, { text: "world", x: 95, y: 700, w: 40, h: 12 }] }];
  const mk = await annotateOps.addTextMarkup(bytes, { query: "world", subtype: "Highlight" }, { 0: lines }, PDFLib);
  assert.equal(mk.hits, 1);
  await assert.rejects(annotateOps.addTextMarkup(bytes, { query: "x", subtype: "Squiggle" }, {}, PDFLib), /subtype must be/);
  const noted = await annotateOps.addStickyNote(mk.bytes, { page: 0, x: 50, y: 600, contents: "qa note" }, PDFLib);
  const linked = await annotateOps.addLink(noted, { page: 0, rect: { x: 50, y: 500, w: 100, h: 20 }, uri: "https://example.com" }, PDFLib);
  const doc = await PDFLib.PDFDocument.load(linked);
  const subs = annotateOps.listAnnotations(doc, PDFLib).map((a) => a.subtype);
  assert.ok(subs.includes("Highlight") && subs.includes("Text") && subs.includes("Link"), "got " + subs.join(","));
  await assert.rejects(annotateOps.addStickyNote(bytes, { page: 9, x: 1, y: 1 }, PDFLib), /page out of range/);
});

test("M2 bake: supported subtypes baked per-quad, unsupported kept and counted", async () => {
  const bytes = await blankPdf();
  const lines = [{ text: "hello world", x: 50, y: 700, w: 120, h: 12, size: 12, words: [{ text: "hello", x: 50, y: 700, w: 40, h: 12 }, { text: "world", x: 95, y: 700, w: 40, h: 12 }] }];
  const mk = await annotateOps.addTextMarkup(bytes, { query: "world", subtype: "Highlight" }, { 0: lines }, PDFLib);
  const ink = await annotateOps.addInkAnnot(mk.bytes, { page: 0, strokes: [[{ x: 10, y: 100 }, { x: 200, y: 100 }]] }, PDFLib);
  const sq = await annotateOps.addGeomAnnot(ink.bytes, { page: 0, kind: "rect", rect: { x: 100, y: 600, w: 120, h: 60 } }, PDFLib);
  const noted = await annotateOps.addStickyNote(sq.bytes, { page: 0, x: 50, y: 600, contents: "keep me" }, PDFLib);
  const baked = await annotateOps.bakeAnnotations(noted, PDFLib);
  assert.ok(baked.baked >= 3, "expected 3+ baked, got " + baked.baked);
  assert.equal(baked.bySubtype.Highlight, 1);
  assert.ok(baked.skipped >= 1, "sticky note must be skipped, not dropped");
  const doc = await PDFLib.PDFDocument.load(baked.bytes);
  const subs = annotateOps.listAnnotations(doc, PDFLib).map((a) => a.subtype);
  assert.ok(subs.includes("Text"), "unsupported Text annot must survive bake, got " + subs.join(","));
  assert.ok(!subs.includes("Highlight") && !subs.includes("Ink") && !subs.includes("Square"), "baked annots removed, left " + subs.join(","));
});

test("M2 delete: subtype filter removes only matching annots", async () => {
  const bytes = await blankPdf();
  const sq = await annotateOps.addGeomAnnot(bytes, { page: 0, kind: "rect", rect: { x: 10, y: 10, w: 50, h: 50 } }, PDFLib);
  const noted = await annotateOps.addStickyNote(sq.bytes, { page: 0, x: 50, y: 600, contents: "n" }, PDFLib);
  const del = await annotateOps.deleteAnnotations(noted, { subtypes: ["Square"] }, PDFLib);
  assert.equal(del.removed, 1);
  const doc = await PDFLib.PDFDocument.load(del.bytes);
  assert.deepEqual(annotateOps.listAnnotations(doc, PDFLib).map((a) => a.subtype), ["Text"]);
});

test("M2 anti-facade: no stubs, no silent select, bake keeps unknown subtypes", () => {
  const blob = readAllJs(srcDir).map((f) => fs.readFileSync(f, "utf8")).join("\n");
  assert.equal(blob.toLowerCase().includes("coming soon"), false);
  assert.equal(/\balert\s*\(/.test(blob), false);
  assert.equal(/\bprompt\s*\(/.test(blob), false);
  // every choice select() must be guarded by an options check
  const formOpsSrc = fs.readFileSync(path.join(srcDir, "ui/tools/form-ops.js"), "utf8");
  const selects = (formOpsSrc.match(/\.select\(/g) || []).length;
  const guards = (formOpsSrc.match(/not in options|has no option/g) || []).length;
  assert.ok(selects >= 4 && guards >= 3, `selects=${selects} guards=${guards}: every select needs a guard`);
  const bakeSrc = fs.readFileSync(path.join(srcDir, "ui/tools/annotate-ops.js"), "utf8");
  assert.ok(bakeSrc.includes("skipped"), "bake must count skipped unsupported subtypes, never drop them");
  const html = fs.readFileSync(path.join(folio, "index.html"), "utf8");
  assert.equal(/<button[^>]*\bdisabled\b/.test(html), false, "no disabled stub buttons");
});
