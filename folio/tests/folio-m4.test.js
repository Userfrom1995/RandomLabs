import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import {
  pdfToCss, cssToPdf, normalizeDragBox, resizeBox, moveBox,
  PLACEMENT_MODES, commitRect, parsePlaceTarget, treeToRows, rowsToTree,
  addBookmarkNode, removeNode, moveNode, indentNode, outdentNode,
} from "../src/ui/viewer/overlay.js";
import { canvasBox, pageBox } from "../src/ui/viewer/viewer.js";

const require = createRequire(import.meta.url);
const PDFLib = require("../vendor/pdf-lib.min.js");
const Annotate = await import("../src/ui/tools/annotate-ops.js");
const FormOps = await import("../src/ui/tools/form-ops.js");
const PhaseE = await import("../src/ui/tools/phaseE-ops.js");

const LETTER = { width: 612, height: 792 }; // PDF points, portrait
const CANVAS = { width: 600, height: 777 }; // rendered px (non-uniform scale)

test("pdfToCss/cssToPdf roundtrip, portrait + landscape", () => {
  for (const page of [LETTER, { width: 792, height: 612 }]) {
    const box = { width: Math.round(page.width * 0.98), height: Math.round(page.height * 0.98) };
    for (const r of [{ x: 56, y: 600, w: 200, h: 24 }, { x: 0, y: 0, w: page.width, h: page.height }, { x: 100.5, y: 200.25, w: 50, h: 50 }]) {
      const back = cssToPdf(pdfToCss(r, page, box), page, box);
      for (const k of ["x", "y", "w", "h"]) assert.ok(Math.abs(back[k] - r[k]) < 0.01, k + " roundtrip " + JSON.stringify(page));
    }
  }
});

test("pdfToCss flips the y axis (PDF bottom-left to CSS top-left)", () => {
  const css = pdfToCss({ x: 0, y: 0, w: 612, h: 100 }, LETTER, CANVAS);
  assert.equal(Math.round(css.y + css.h), CANVAS.height); // bottom strip sits at canvas bottom
  const top = pdfToCss({ x: 0, y: 692, w: 612, h: 100 }, LETTER, CANVAS);
  assert.ok(top.y < 1); // top strip sits at canvas top
});

test("normalizeDragBox fixes inverted drags and clamps", () => {
  const b = normalizeDragBox(300, 400, 100, 200, CANVAS);
  assert.deepEqual([b.x, b.y, b.w, b.h], [100, 200, 200, 200]);
  const c = normalizeDragBox(-50, -50, 9999, 9999, CANVAS);
  assert.deepEqual([c.x, c.y], [0, 0]);
  assert.deepEqual([c.w, c.h], [CANVAS.width, CANVAS.height]);
});

test("resizeBox handles + minimum size + clamp", () => {
  const box = { x: 100, y: 100, w: 200, h: 100 };
  const se = resizeBox(box, "se", 10, 20, CANVAS);
  assert.deepEqual([se.w, se.h], [210, 120]);
  const nw = resizeBox(box, "nw", 10, 20, CANVAS);
  assert.deepEqual([nw.x, nw.y, nw.w, nw.h], [110, 120, 190, 80]);
  const tiny = resizeBox({ x: 100, y: 100, w: 10, h: 10 }, "nw", 50, 50, CANVAS, 8);
  assert.ok(tiny.w >= 8 && tiny.h >= 8);
  const edge = resizeBox({ x: 590, y: 100, w: 20, h: 20 }, "se", 500, 0, CANVAS);
  assert.ok(edge.x + edge.w <= CANVAS.width);
});

test("moveBox clamps to the canvas", () => {
  const m = moveBox({ x: 590, y: 770, w: 50, h: 50 }, 100, 100, CANVAS);
  assert.deepEqual([m.x, m.y], [CANVAS.width - 50, CANVAS.height - 50]);
});

test("commitRect expands clicks with mode defaults, keeps drags", () => {
  assert.ok(PLACEMENT_MODES.includes("crop") && PLACEMENT_MODES.includes("field"));
  const click = commitRect("note", { x: 300, y: 300, w: 0, h: 0 }, LETTER, CANVAS);
  assert.ok(click.w > 10 && click.h > 10); // expanded, not a zero rect
  const drag = commitRect("shape", { x: 100, y: 100, w: 200, h: 80 }, LETTER, CANVAS);
  const back = pdfToCss(drag, LETTER, CANVAS);
  assert.ok(Math.abs(back.x - 100) < 1 && Math.abs(back.w - 200) < 1);
  for (const k of ["x", "y", "w", "h"]) {
    const frac = String(drag[k]).split(".")[1] || "";
    assert.ok(frac.length <= 1, k + " rounded to 1 decimal");
  }
});

test("bookmark tree serialize/indent roundtrip", () => {
  const tree = [
    { title: "Intro", page: 1, children: [{ title: "Detail", page: 2, children: [] }] },
    { title: "Notes", page: 3, children: [] },
  ];
  const rows = treeToRows(tree);
  assert.deepEqual(rows.map((r) => [r.title, r.page, r.depth]), [["Intro", 1, 0], ["Detail", 2, 1], ["Notes", 3, 0]]);
  assert.deepEqual(rowsToTree(rows), tree);
  // Indent "Notes" under "Intro" by bumping depth: still parses back cleanly.
  const indented = rows.map((r) => (r.title === "Notes" ? { ...r, depth: 1 } : r));
  const t2 = rowsToTree(indented);
  assert.equal(t2.length, 1);
  assert.equal(t2[0].children.length, 2);
});

test("parsePlaceTarget: page:N vs URI vs garbage", () => {
  assert.deepEqual(parsePlaceTarget("page:2", 5), { gotoPage: 1 });
  assert.deepEqual(parsePlaceTarget("  page:1  ", 5), { gotoPage: 0 });
  assert.deepEqual(parsePlaceTarget("https://example.com/x", 5), { uri: "https://example.com/x" });
  assert.throws(() => parsePlaceTarget("page:9", 5), /within 1\.\.5/);
  assert.throws(() => parsePlaceTarget("page:x", 5));
  assert.throws(() => parsePlaceTarget("", 5), /need a target/);
});

async function blankLetter() {
  const doc = await PDFLib.PDFDocument.create();
  doc.addPage([612, 792]);
  return doc.save();
}

async function subtypesOf(bytes) {
  const doc = await PDFLib.PDFDocument.load(bytes);
  return Annotate.listAnnotations(doc, PDFLib).map((a) => a.subtype);
}

test("overlay commits land through the real M1/M2 ops", async () => {
  const base = await blankLetter();
  // Click-to-place note: css click expands via mode defaults, lands as /Text.
  const noteRect = commitRect("note", { x: 300, y: 300, w: 0, h: 0 }, LETTER, CANVAS);
  const noted = await Annotate.addStickyNote(base, { page: 0, x: noteRect.x, y: noteRect.y, contents: "canvas note" }, PDFLib);
  assert.ok(noted.length > base.length);
  assert.ok((await subtypesOf(noted)).includes("Text"));
  // Drag-to-place shape: rect commits as a real Square annot object.
  const shapeRect = commitRect("shape", { x: 100, y: 100, w: 200, h: 80 }, LETTER, CANVAS);
  const shaped = await Annotate.addGeomAnnot(base, { page: 0, kind: "rect", rect: shapeRect }, PDFLib);
  assert.ok((await subtypesOf(shaped.bytes)).includes("Square"));
  // Drag-to-place link: rect + parsed target commits as a Link annot.
  const linkRect = commitRect("link", { x: 50, y: 60, w: 220, h: 24 }, LETTER, CANVAS);
  const tgt = parsePlaceTarget("page:1", 1);
  const linked = await Annotate.addLink(base, { page: 0, rect: linkRect, ...tgt }, PDFLib);
  assert.ok((await subtypesOf(linked)).includes("Link"));
  // Drag-to-place field: rect commits through createField, describable back.
  const fieldRect = commitRect("field", { x: 56, y: 600, w: 200, h: 24 }, LETTER, CANVAS);
  const formed = await FormOps.createField(base, { name: "canvasField", type: "text", page: 1, rect: fieldRect }, PDFLib);
  const fields = await FormOps.describeForm(formed, PDFLib);
  assert.ok(fields.some((f) => f.name === "canvasField" && f.kind === "text"));
  // Drag-to-place crop: exact cssToPdf rect sets a smaller crop box.
  const cssCrop = normalizeDragBox(50, 50, 550, 727, CANVAS);
  const raw = cssToPdf(cssCrop, LETTER, CANVAS);
  const cropped = await PhaseE.cropPages(base, { x: raw.x, y: raw.y, w: raw.w, h: raw.h }, PDFLib);
  const doc = await PDFLib.PDFDocument.load(cropped);
  const cb = doc.getPages()[0].getCropBox();
  assert.ok(cb.width < 612 && cb.height < 792, "crop box shrinks, got " + cb.width + "x" + cb.height);
});

test("viewer exposes pageBox/canvasBox helpers for the overlay", () => {
  assert.equal(typeof pageBox, "function");
  assert.deepEqual(canvasBox({ width: 600, height: 800 }), { width: 600, height: 800 });
});

test("opfs writeFile falls back to memory on SecurityError", async () => {
  const failingDir = async () => {
    const err = new Error("denied");
    err.name = "SecurityError";
    throw err;
  };
  globalThis.__folioNavigator = { storage: { getDirectory: async () => ({ getDirectoryHandle: failingDir }) } };
  Object.defineProperty(globalThis, "navigator", { value: globalThis.__folioNavigator, configurable: true });
  try {
    const opfs = await import("../src/platform/storage/opfs.js?m4fallback=1");
    const st = await opfs.initStorage();
    assert.equal(st.backend, "opfs"); // OPFS looked available...
    const w = await opfs.writeFile("folio/work/t/session.pdf", new Uint8Array([1, 2, 3]));
    assert.equal(w.backend, "memory"); // ...then degraded on first denied write
    assert.match(w.fellBack || "", /SecurityError/);
    const back = await opfs.readFile("folio/work/t/session.pdf");
    assert.deepEqual([...back], [1, 2, 3]);
  } finally {
    delete globalThis.navigator;
    delete globalThis.__folioNavigator;
  }
});

test("describeFields reports page + rect + options + value", async () => {
  const doc = await PDFLib.PDFDocument.create();
  doc.addPage([612, 792]);
  doc.addPage([612, 792]);
  let bytes = await doc.save();
  bytes = await FormOps.createField(bytes, { name: "full", type: "text", page: 1, rect: { x: 56, y: 600, w: 200, h: 24 } }, PDFLib);
  bytes = await FormOps.createField(bytes, { name: "agree", type: "checkbox", page: 2, rect: { x: 56, y: 500, w: 20, h: 20 } }, PDFLib);
  bytes = await FormOps.createField(bytes, { name: "choice", type: "dropdown", page: 2, rect: { x: 56, y: 450, w: 200, h: 24 }, options: ["a", "b"], value: "b" }, PDFLib);
  const descs = await FormOps.describeFields(bytes, PDFLib);
  assert.equal(descs.length, 3);
  const byName = Object.fromEntries(descs.map((d) => [d.name, d]));
  assert.equal(byName.full.page, 1);
  assert.ok(byName.full.rect && Math.abs(byName.full.rect.x - 56) < 2, "text rect near creation rect: " + JSON.stringify(byName.full.rect));
  assert.ok(Math.abs(byName.full.rect.w - 200) < 2);
  assert.equal(byName.agree.page, 2);
  assert.equal(byName.agree.kind, "checkbox");
  assert.deepEqual(byName.choice.options, ["a", "b"]);
  assert.ok([["b"], "b"].some((v) => JSON.stringify(v) === JSON.stringify(byName.choice.value)), "dropdown value reads back");
  // Overlay roundtrip: the reported rect positions an input that maps back.
  const css = pdfToCss(byName.full.rect, LETTER, CANVAS);
  const back = cssToPdf({ x: css.x, y: css.y, w: css.w, h: css.h }, LETTER, CANVAS);
  assert.ok(Math.abs(back.x - byName.full.rect.x) < 0.5, "overlay-positioned field maps back");
});

test("bookmark tree edits: add/indent/outdent/move/remove", () => {
  const tree = [];
  assert.equal(addBookmarkNode(tree, { title: "A", page: 1 }), 0);
  assert.equal(addBookmarkNode(tree, { title: "B", page: 2 }), 1);
  assert.equal(addBookmarkNode(tree, { title: "C", page: 3 }), 2);
  assert.equal(indentNode(tree, [0]), false); // first child cannot indent
  assert.equal(indentNode(tree, [2]), true); // C under B
  assert.deepEqual(treeToRows(tree).map((r) => [r.title, r.depth]), [["A", 0], ["B", 0], ["C", 1]]);
  assert.equal(outdentNode(tree, [0]), false); // top level cannot outdent
  assert.equal(outdentNode(tree, [1, 0]), true); // C back to top
  assert.equal(tree.length, 3);
  assert.equal(moveNode(tree, [0], -1), false); // off-list move refused
  assert.equal(moveNode(tree, [0], 1), true);
  assert.deepEqual(tree.map((n) => n.title), ["B", "A", "C"]);
  assert.equal(removeNode(tree, [5]), false);
  assert.equal(removeNode(tree, [1]), true);
  assert.deepEqual(tree.map((n) => n.title), ["B", "C"]);
  // Edited tree still serializes for the real bookmark engine.
  const rows = treeToRows(tree);
  assert.deepEqual(rows.map((r) => r.title), ["B", "C"]);
});

test("m4c shell: form overlay + outline trees + studio ids wired", async () => {
  const fs = await import("node:fs");
  const path = await import("node:path");
  const { fileURLToPath } = await import("node:url");
  const here = path.dirname(fileURLToPath(import.meta.url));
  const html = fs.readFileSync(path.join(here, "..", "index.html"), "utf8");
  const app = fs.readFileSync(path.join(here, "..", "src", "ui", "shell", "app.js"), "utf8");
  for (const id of ["formlayer", "formlist", "t-formfill-list", "bmtree", "bmtree-pages", "bmadd", "bmadd-pages", "sidebartoggle", "shortcuts"]) {
    assert.ok(html.includes('id="' + id + '"'), "shell has #" + id);
  }
  // Pipe-delimited primaries are gone; JSON bulk fill survives as fallback.
  assert.ok(!html.includes('id="bmtext"'), "bmtext textarea removed");
  assert.ok(!html.includes('id="ext-bmtext"'), "ext-bmtext textarea removed");
  assert.ok(html.includes('id="filljson"'), "filljson fallback kept");
  assert.ok(!app.includes('$("bmtext")') && !app.includes('$("ext-bmtext")'), "app.js no longer reads removed textareas");
  for (const op of ["describeFields", "renderFormOverlay", "renderFormList", "renderBmTrees", "bmAddCurrent", "wireStudio", "fillForm", "setBookmarks"]) {
    assert.ok(app.includes(op), "app.js wires " + op);
  }
  for (const op of ["addBookmarkNode", "removeNode", "moveNode", "indentNode", "outdentNode", "treeToRows"]) {
    assert.ok(app.includes(op), "app.js commits tree edits through " + op);
  }
});

test("m4b shell keeps overlay + fallback ids wired", async () => {
  // Anti-rot gate: the pointer-first toolbar must exist, every placement
  // mode must have a commit path in app.js, and the moved coordinate
  // inputs must survive as a11y fallbacks (same ids, inside details.a11y).
  const fs = await import("node:fs");
  const path = await import("node:path");
  const { fileURLToPath } = await import("node:url");
  const here = path.dirname(fileURLToPath(import.meta.url));
  const html = fs.readFileSync(path.join(here, "..", "index.html"), "utf8");
  const app = fs.readFileSync(path.join(here, "..", "src", "ui", "shell", "app.js"), "utf8");
  for (const mode of ["crop", "note", "shape", "link", "stamp", "sign", "image", "field"]) {
    assert.ok(html.includes('data-mode="' + mode + '"'), "toolbar has " + mode);
  }
  for (const id of ["placetoolbar", "croprow", "cropcommit", "cropburn", "cropclear", "overlayhint", "overlay", "canvaswrap"]) {
    assert.ok(html.includes('id="' + id + '"'), "shell has #" + id);
  }
  for (const id of ["notexy", "shapexy", "linkrect", "imgxy", "fldrect", "ext-crop"]) {
    assert.ok(html.includes('id="' + id + '"'), "fallback keeps #" + id);
  }
  assert.ok(html.includes("details class=\"a11y\""), "fallbacks live in a11y details");
  for (const op of ["addStickyNote", "addGeomAnnot", "addLink", "addStamp", "signatureStamp", "insertImage", "createField", "cropPages"]) {
    assert.ok(app.includes(op), "app.js commits through " + op);
  }
  assert.ok(app.includes("wireOverlay"), "app.js wires the overlay");
});
