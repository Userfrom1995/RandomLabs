import { test } from "node:test";
import assert from "node:assert/strict";
import { planMerge, planSplitRanges, planChunks, planDelete, planOddEven, planReorder, planReverse, planRotate, planCrop, fixupReferences, oldToNewMap } from "../src/core/pdf-engine/structural.js";
import { itemsToLines, clusterColumns, linesToParagraphs, readingOrder } from "../src/core/textmap/extract.js";
import { PROFILES, profileSpec, decidePagePath } from "../src/core/compress/profiles.js";
import { filterTextMap, redactAcceptance } from "../src/core/content/redact.js";
import { nupLayout, bookletOrder } from "../src/core/content/nup.js";
import { toCsv, findColumns } from "../src/core/textmap/tables.js";
import { inferMarkdown } from "../src/core/textmap/markdown.js";
import { parseManifest, consentReducer, formatBytes } from "../src/platform/packs/manifest.js";
import { applyPattern, sanitizeFileName, encodePerms, decodePerms } from "../src/core/pipeline/naming.js";
import { createStore, applyOp, makeOp, undo, redo } from "../src/core/pipeline/ops.js";

test("structural planners", () => {
  assert.deepEqual(planMerge([3, 2]).total, 5);
  assert.deepEqual(planSplitRanges(5, [[0, 1], [2, 4]]), [[0, 1], [2, 3, 4]]);
  assert.deepEqual(planChunks(5, 2), [[0, 1], [2, 3], [4]]);
  assert.deepEqual(planDelete(4, [1, 3]), [0, 2]);
  assert.deepEqual(planOddEven(4, "odd"), [0, 2]);
  assert.deepEqual(planReorder(3, [2, 0, 1]), [2, 0, 1]);
  assert.deepEqual(planReverse(3), [2, 1, 0]);
  assert.throws(() => planReorder(3, [0, 0, 1]));
  const r = planRotate(4, "all", 90);
  assert.deepEqual(r.targets, [0, 1, 2, 3]);
  const crop = planCrop({ x: 0, y: 0, w: 595, h: 842 }, { x: 10, y: 10, w: 600, h: 900 });
  assert.deepEqual(crop, { x: 10, y: 10, w: 585, h: 832 });
  const m = oldToNewMap([2, 0]);
  const fx = fixupReferences(m, [{ title: "a", page: 0 }, { title: "gone", page: 1 }], [{ id: 1, destPage: 2 }]);
  assert.deepEqual(fx.outlines, [{ title: "a", page: 1 }]);
  assert.deepEqual(fx.links, [{ id: 1, destPage: 0 }]);
});

function item(str, x, y, size) {
  const s = size || 12;
  return { str, transform: [s, 0, 0, s, x, y], width: str.length * s * 0.5 };
}

test("textmap line sort + columns + paragraphs", () => {
  const items = [item("world", 100, 700), item("hello", 50, 700), item("second", 50, 670)];
  const lines = itemsToLines(items);
  assert.equal(lines.length, 2);
  assert.equal(lines[0].text, "hello world");
  const cols = clusterColumns([{ text: "a", x: 50, y: 1, size: 12 }, { text: "b", x: 350, y: 1, size: 12 }]);
  assert.equal(cols.length, 2);
  const paras = linesToParagraphs(lines);
  assert.equal(paras.length, 2);
  const ro = readingOrder(lines);
  assert.equal(ro.length, 2);
});

test("compress profiles + coverage gate", () => {
  assert.deepEqual(profileSpec("low"), { dpi: 150, q: 0.7, label: "Low", scale: 150 / 72 });
  assert.ok(PROFILES.extreme.q < PROFILES.low.q);
  assert.equal(decidePagePath({ textItems: 500, imageArea: 0.1 }), "lossless");
  assert.equal(decidePagePath({ textItems: 5, imageArea: 0.8 }), "rasterize");
  assert.equal(decidePagePath({ textItems: 500, imageArea: 0.6 }), "lossless");
});

test("redact filter + acceptance", () => {
  const lines = [
    { text: "keep me", x: 10, y: 10, w: 100, h: 12 },
    { text: "secret", x: 300, y: 300, w: 100, h: 12 },
  ];
  const R = [{ x: 250, y: 250, w: 200, h: 100 }];
  const kept = filterTextMap(lines, R);
  assert.deepEqual(kept.map((l) => l.text), ["keep me"]);
  const acc = redactAcceptance(kept, R, new TextEncoder().encode("keep me only"), ["secret"]);
  assert.equal(acc.pass, true);
  const bad = redactAcceptance(lines, R, new TextEncoder().encode("secret here"), ["secret"]);
  assert.equal(bad.pass, false);
});

test("nup + booklet math", () => {
  const lay = nupLayout(4, 595, 842, 18);
  assert.equal(lay.cells.length, 4);
  assert.equal(lay.cols, 2);
  const bo = bookletOrder(5);
  assert.ok(bo.length >= 2);
  assert.ok(bo.flat().includes(-1));
  assert.deepEqual(bookletOrder(4), [[3, 0], [1, 2]]);
});

test("tables + markdown", () => {
  const cols = findColumns([{ x: 0, w: 100 }, { x: 10, w: 5 }, { x: 300, w: 100 }], 20);
  assert.equal(cols.length, 2);
  assert.equal(toCsv([["a", "b,c"], ["d", 'e"f']]), 'a,"b,c"\nd,"e""f"');
  const paras = [{ text: "Big Title", lines: [{ size: 30 }] }, { text: "body text here", lines: [{ size: 12 }, { size: 12 }] }];
  const md = inferMarkdown(paras);
  assert.ok(md.startsWith("# Big Title"));
});

test("packs + naming + perms + pipeline", () => {
  const m = parseManifest({ id: "x", version: "1", bytes: 10, files: ["a"], sha256: "s" });
  assert.equal(m.id, "x");
  assert.throws(() => parseManifest({ id: "x" }));
  assert.equal(consentReducer("idle", "accept"), "downloading");
  assert.equal(consentReducer("downloading", "done"), "verifying");
  assert.equal(formatBytes(1536), "1.5 KB");
  assert.equal(applyPattern("{name}-{pages}p", { name: "doc", pages: 3 }), "doc-3p");
  assert.equal(sanitizeFileName('a/b:c*'), "a_b_c_");
  const v = encodePerms({ print: true });
  assert.equal(decodePerms(v).print, true);
  const st = createStore(10);
  const op = makeOp("merge", { a: 1 }, { tool: "merge" });
  applyOp(st, op);
  assert.equal(undo(st).tool, "merge");
  assert.equal(redo(st).tool, "merge");
});
