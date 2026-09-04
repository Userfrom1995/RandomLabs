import { test } from "node:test";
import assert from "node:assert/strict";
import { planMerge, planSplitRanges, planChunks, planDelete, planOddEven, planReorder, planReverse, planRotate, planCrop, fixupReferences, oldToNewMap } from "../src/core/pdf-engine/structural.js";
import { itemsToLines, clusterColumns, linesToParagraphs, readingOrder } from "../src/core/textmap/extract.js";
import { PROFILES, profileSpec, decidePagePath } from "../src/core/compress/profiles.js";
import { nupLayout, bookletOrder } from "../src/core/content/nup.js";
import { toCsv, findColumns, csvTableSpec } from "../src/core/textmap/tables.js";
import { inferMarkdown } from "../src/core/textmap/markdown.js";
import { toText, toMarkdown, toHtml } from "../src/core/convert/writers.js";
import { applyPattern, sanitizeFileName, encodePerms, decodePerms } from "../src/core/pipeline/naming.js";
import { createStore, applyOp, makeOp, undo, redo } from "../src/core/pipeline/ops.js";
import { quadsForQuery, hitRegions, bboxIntersects, batesPlan, validateBookmarks, simplifyInk, validateLink } from "../src/core/annotate/annotate.js";
import { wordDiff, diffStats } from "../src/core/content/edit.js";
import { fitImage, scannerSpec } from "../src/core/images/images.js";
import { validateFieldDef, coerceFillValue, xfaDetect } from "../src/core/forms/forms.js";
import { inspectJs, integrityVerdict, signatureAppearanceSpec } from "../src/core/crypto/crypto.js";
import { planCorpus, corpusGate, resaveSpec } from "../src/core/compress/optimize.js";
import { gridDropOrder } from "../src/ui/tools/pages-ops.js";
import { PAGE_SIZES, resizeSpec, orientationPlan, splitByBookmarks, parseOrderString, blankInsertPlan, flattenPlan, gcSpec, batchRename, replaceImagePlan, printSpec, batchPlan, batchReducer } from "../src/core/tier2/tier2.js";

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

test("nup + booklet math", () => {
  const lay = nupLayout(4, 595, 842, 18);
  assert.equal(lay.cells.length, 4);
  assert.equal(lay.cols, 2);
  const bo = bookletOrder(5);
  assert.ok(bo.length >= 2);
  assert.ok(bo.flat().includes(-1));
  assert.deepEqual(bookletOrder(4), [[3, 0], [1, 2]]);
});

test("tables + markdown + writers + csv spec", () => {
  const cols = findColumns([{ x: 0, w: 100 }, { x: 10, w: 5 }, { x: 300, w: 100 }], 20);
  assert.equal(cols.length, 2);
  assert.equal(toCsv([["a", "b,c"], ["d", 'e"f']]), 'a,"b,c"\nd,"e""f"');
  const spec = csvTableSpec([["a"], ["b"], ["c"]], { rowsPerPage: 2 });
  assert.deepEqual([spec.cols, spec.pageCount], [1, 2]);
  assert.throws(() => csvTableSpec([]));
  const paras = [{ text: "Big Title", lines: [{ size: 30 }] }, { text: "body text here", lines: [{ size: 12 }, { size: 12 }] }];
  const md = inferMarkdown(paras);
  assert.ok(md.startsWith("# Big Title"));
  const docs = [{ paragraphs: [{ text: "hello", lines: [{ size: 12 }] }], lines: [], count: 1 }];
  assert.ok(toText(docs).includes("hello"));
  assert.ok(toMarkdown(docs).length > 0);
  assert.ok(toHtml("T", docs).includes("<html"));
});

test("naming + perms + pipeline", () => {
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

test("textmap lines carry boxes + words", async () => {
  const items = [
    { str: "hello world", transform: [12, 0, 0, 12, 50, 700], width: 60 },
    { str: "second", transform: [12, 0, 0, 12, 50, 670], width: 36 },
  ];
  const { itemsToLines: toLines } = await import("../src/core/textmap/extract.js");
  const lines = toLines(items);
  assert.equal(lines.length, 2);
  assert.ok(lines[0].w > 0 && lines[0].h > 0);
  assert.deepEqual(lines[0].words.map((w) => w.text), ["hello", "world"]);
  assert.ok(lines[0].words[1].x > lines[0].words[0].x);
});

test("annotate quads + boxes + bates + bookmarks + ink + link", () => {
  const lines = [{ text: "hello world", x: 50, y: 700, w: 120, h: 12, size: 12, words: [{ text: "hello", x: 50, y: 700, w: 40, h: 12 }, { text: "world", x: 95, y: 700, w: 40, h: 12 }] }];
  const q = quadsForQuery(lines, "world");
  assert.equal(q.length, 1);
  assert.deepEqual(q[0].quads[0].slice(0, 4), [95, 700, 135, 700]);
  const hrs = hitRegions(lines, "world");
  assert.equal(hrs.length, 1);
  assert.ok(bboxIntersects(hrs[0], { x: 0, y: 0, w: 1000, h: 1000 }));
  assert.ok(!bboxIntersects({ x: 0, y: 0, w: 10, h: 10 }, { x: 50, y: 50, w: 10, h: 10 }));
  assert.deepEqual(batesPlan(3, { prefix: "B-", digits: 4, start: 7 }), ["B-0007", "B-0008", "B-0009"]);
  assert.throws(() => validateBookmarks([{ title: "", page: 1 }], 3));
  assert.throws(() => validateBookmarks([{ title: "a", page: 9 }], 3));
  assert.equal(validateBookmarks([{ title: "a", page: 2 }], 3).length, 1);
  const pts = [{ x: 0, y: 0 }, { x: 5, y: 0.1 }, { x: 10, y: 0 }];
  assert.ok(simplifyInk(pts, 1.5).length <= 3 && simplifyInk(pts, 1.5).length >= 2);
  assert.deepEqual(validateLink({ uri: "https://example.com" }), { uri: "https://example.com" });
  assert.throws(() => validateLink({ uri: "ftp://x" }));
  assert.deepEqual(validateLink({ page: 2 }), { page: 2 });
});

test("word diff for compare report", () => {
  const ops = wordDiff("a b c", "a x c");
  const st = diffStats(ops);
  assert.deepEqual([st.same, st.del, st.ins], [2, 1, 1]);
});

test("images fit + scanner spec + forms validation", () => {
  assert.deepEqual(fitImage(800, 600, 400, 400), { w: 400, h: 300, rot: 0 });
  assert.deepEqual(fitImage(800, 600, 400, 400, 90), { w: 300, h: 400, rot: 90 });
  assert.equal(scannerSpec({ contrast: 9 }).contrast, 2);
  const def = validateFieldDef({ name: "n", type: "dropdown", page: 1, rect: { x: 1, y: 1, w: 10, h: 10 }, options: ["a"] }, 2);
  assert.equal(def.options.length, 1);
  assert.throws(() => validateFieldDef({ name: "n", type: "dropdown", page: 1, rect: { x: 1, y: 1, w: 10, h: 10 } }, 2));
  assert.equal(coerceFillValue("checkbox", "yes"), true);
  assert.throws(() => coerceFillValue("checkbox", "maybe"));
  assert.equal(xfaDetect("<< /AcroForm << /XFA [...] >> >>"), true);
  assert.equal(xfaDetect("plain pdf"), false);
});

test("crypto: inspect, verdict, appearance (no envelopes, no PKI)", () => {
  const hits = inspectJs(new TextEncoder().encode("1 0 obj << /JS (x) /OpenAction 2 0 R /JS (y) >>"));
  assert.deepEqual(hits[0], { key: "/JS", count: 2 });
  assert.deepEqual(inspectJs(new TextEncoder().encode("plain")), []);
  assert.equal(integrityVerdict({ digestOk: true, chainOk: false }).summary, "INTACT / UNTRUSTED");
  assert.equal(integrityVerdict({ digestOk: false, chainOk: false }).integrity, "TAMPERED");
  assert.throws(() => signatureAppearanceSpec({ text: "", page: 0, rect: { x: 1, y: 1, w: 2, h: 2 } }));
  assert.equal(signatureAppearanceSpec({ text: "Ada", page: 0, rect: { x: 1, y: 1, w: 2, h: 2 } }).kind, "signature-stamp");
});

test("optimize: corpus plan + gate + resave", () => {
  const plan = planCorpus([{ textItems: 300, imageArea: 0.05 }, { textItems: 3, imageArea: 0.9 }], "high");
  assert.deepEqual(plan.routes.map((r) => r.route), ["lossless", "rasterize"]);
  assert.deepEqual(plan.lossless, [0]);
  assert.equal(plan.dpi, 80);
  const g = corpusGate(plan, [true, false], 1000, 900);
  assert.equal(g.pass, true);
  assert.equal(g.searchableKept, true);
  const bad = corpusGate(planCorpus([{ textItems: 5, imageArea: 0.8 }], "low"), [true], 1000, 500);
  assert.equal(bad.searchableKept, false);
  assert.equal(bad.pass, false);
  assert.throws(() => corpusGate(plan, [true, false], 0, 1));
  assert.equal(resaveSpec().useObjectStreams, true);
});

test("grid drop order is a pure permutation move", () => {
  assert.deepEqual(gridDropOrder(4, 0, 2), [1, 2, 0, 3]);
  assert.deepEqual(gridDropOrder(4, 3, 0), [3, 0, 1, 2]);
  assert.deepEqual(gridDropOrder(1, 0, 0), [0]);
  assert.deepEqual(gridDropOrder(3, 1, 1), [0, 1, 2]);
  assert.deepEqual(gridDropOrder(3, 0, 99), [1, 2, 0]);
  assert.throws(() => gridDropOrder(3, 5, 0));
  assert.throws(() => gridDropOrder(0, 0, 0));
});

test("tier2: resize/orient/bookmarks/order/blank/flatten/gc/rename/replace/print/batch", () => {
  assert.ok(PAGE_SIZES.A4.w > 590);
  assert.deepEqual([resizeSpec("A4", "landscape", "fit").w > resizeSpec("A4", "landscape", "fit").h, true], [true, true]);
  assert.throws(() => resizeSpec("A9", "portrait", "fit"));
  assert.throws(() => resizeSpec("A4", "diagonal", "fit"));
  assert.equal(orientationPlan(3, "landscape").pages, 3);
  assert.throws(() => orientationPlan(3, "diagonal"));
  const groups = splitByBookmarks(5, [{ title: "A", page: 1 }, { title: "B", page: 3 }]);
  assert.deepEqual(groups[0].pages, [0, 1]);
  assert.deepEqual(groups[1].pages, [2, 3, 4]);
  assert.throws(() => splitByBookmarks(5, []));
  assert.throws(() => splitByBookmarks(5, [{ title: "x", page: 9 }]));
  assert.deepEqual(parseOrderString("3,1,2", 3), [2, 0, 1]);
  assert.throws(() => parseOrderString("1,1,2", 3));
  assert.throws(() => parseOrderString("1,2", 3));
  assert.deepEqual(blankInsertPlan(3, 3), { at: 3, sizeName: "A4" });
  assert.throws(() => blankInsertPlan(3, 9));
  assert.equal(flattenPlan({ Highlight: 2, Text: 1 }).total, 3);
  assert.ok(gcSpec(1000, 800).reclaimed === 200);
  assert.throws(() => gcSpec(0, 1));
  const rn = batchRename([{ name: "doc.pdf", pages: 3 }], "{name}-{index}p");
  assert.equal(rn[0].to, "doc-1p.pdf");
  assert.throws(() => batchRename([], "{name}"));
  assert.equal(replaceImagePlan({ index: 0, page: 0 }, 99).index, 0);
  assert.throws(() => replaceImagePlan({}, 99));
  assert.equal(printSpec(4, true).booklet, true);
  assert.throws(() => printSpec(0, false));
  const q = batchPlan(["a.pdf", "b.pdf"], "compress");
  assert.equal(q.queue.length, 2);
  const q2 = batchReducer(batchReducer(q.queue, "batch-1", "start"), "batch-1", "fail");
  assert.equal(q2[0].status, "failed");
  assert.equal(batchReducer(q2, "batch-1", "retry")[0].status, "queued");
  assert.throws(() => batchReducer(q2, "batch-1", "bogus"));
});
