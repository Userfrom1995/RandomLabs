import { test } from "node:test";
import assert from "node:assert/strict";
import {
  pdfToCss, cssToPdf, normalizeDragBox, resizeBox, moveBox,
  PLACEMENT_MODES, commitRect, treeToRows, rowsToTree,
} from "../src/ui/viewer/overlay.js";
import { canvasBox, pageBox } from "../src/ui/viewer/viewer.js";

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
