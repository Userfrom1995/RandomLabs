// Folio structural tool executor: runs structural.js plans against pdf-lib.
// All ops are lossless object-graph copies (copyPages) + O(1) mutations.
import { planChunks, planDelete, planOddEven, planReorder, planReverse, planSplitRanges } from "../../core/pdf-engine/structural.js";

// Pure drag-drop helper for the visual page grid: move the element at
// fromIdx to toIdx (both 0-based) and return the new full order array.
// The grid commits the result through reorderPages, so every move is a
// real engine op with undo, never a DOM-only shuffle.
export function gridDropOrder(pageCount, fromIdx, toIdx) {
  if (!Number.isInteger(pageCount) || pageCount < 1) throw new Error("bad pageCount");
  if (!Number.isInteger(fromIdx) || fromIdx < 0 || fromIdx >= pageCount) throw new Error("drag source out of range");
  const to = Math.min(pageCount - 1, Math.max(0, toIdx));
  const order = Array.from({ length: pageCount }, (_, i) => i);
  const [moved] = order.splice(fromIdx, 1);
  order.splice(to, 0, moved);
  return order;
}

async function load(bytes, PDFLib) {
  return PDFLib.PDFDocument.load(bytes, { ignoreEncryption: true });
}

export async function mergeFiles(listOfBytes, PDFLib) {
  const out = await PDFLib.PDFDocument.create();
  for (const bytes of listOfBytes) {
    const src = await load(bytes, PDFLib);
    const idx = src.getPageIndices();
    const pages = await out.copyPages(src, idx);
    pages.forEach((p) => out.addPage(p));
  }
  fixOutlinesBestEffort(out, PDFLib);
  return out.save();
}

export async function splitRanges(bytes, ranges, PDFLib) {
  const src = await load(bytes, PDFLib);
  const plans = planSplitRanges(src.getPageCount(), ranges);
  const outs = [];
  for (const idx of plans) {
    const d = await PDFLib.PDFDocument.create();
    (await d.copyPages(src, idx)).forEach((p) => d.addPage(p));
    outs.push(await d.save());
  }
  return outs;
}

export async function splitChunks(bytes, n, PDFLib) {
  const src = await load(bytes, PDFLib);
  const plans = planChunks(src.getPageCount(), n);
  const outs = [];
  for (const idx of plans) {
    const d = await PDFLib.PDFDocument.create();
    (await d.copyPages(src, idx)).forEach((p) => d.addPage(p));
    outs.push(await d.save());
  }
  return outs;
}

export async function keepPages(bytes, keep, PDFLib) {
  const src = await load(bytes, PDFLib);
  const d = await PDFLib.PDFDocument.create();
  (await d.copyPages(src, keep)).forEach((p) => d.addPage(p));
  return d.save();
}

export async function deletePages(bytes, remove, PDFLib) {
  const src = await load(bytes, PDFLib);
  const keep = planDelete(src.getPageCount(), remove);
  return keepPages(bytes, keep, PDFLib);
}

export async function oddEven(bytes, which, PDFLib) {
  const src = await load(bytes, PDFLib);
  return keepPages(bytes, planOddEven(src.getPageCount(), which), PDFLib);
}

export async function reorderPages(bytes, order, PDFLib) {
  const src = await load(bytes, PDFLib);
  return keepPages(bytes, planReorder(src.getPageCount(), order), PDFLib);
}

export async function reversePages(bytes, PDFLib) {
  const src = await load(bytes, PDFLib);
  return keepPages(bytes, planReverse(src.getPageCount()), PDFLib);
}

export async function insertPdf(baseBytes, insertBytes, at, PDFLib) {
  const base = await load(baseBytes, PDFLib);
  const ins = await load(insertBytes, PDFLib);
  const out = await PDFLib.PDFDocument.create();
  const before = [];
  for (let i = 0; i < Math.min(at, base.getPageCount()); i++) before.push(i);
  const after = [];
  for (let i = before.length; i < base.getPageCount(); i++) after.push(i);
  (await out.copyPages(base, before)).forEach((p) => out.addPage(p));
  (await out.copyPages(ins, ins.getPageIndices())).forEach((p) => out.addPage(p));
  (await out.copyPages(base, after)).forEach((p) => out.addPage(p));
  return out.save();
}

export async function rotatePages(bytes, targets, degrees, PDFLib) {
  const doc = await load(bytes, PDFLib);
  const idx = targets === "all" ? doc.getPageIndices() : targets;
  const norm = ((degrees % 360) + 360) % 360;
  for (const i of idx) {
    const p = doc.getPage(i);
    p.setRotation(PDFLib.degrees((p.getRotation().angle + norm) % 360));
  }
  return doc.save();
}

export async function duplicatePage(bytes, pageIdx, PDFLib) {
  const src = await load(bytes, PDFLib);
  const out = await PDFLib.PDFDocument.create();
  const all = src.getPageIndices();
  (await out.copyPages(src, all.slice(0, pageIdx + 1))).forEach((p) => out.addPage(p));
  (await out.copyPages(src, [pageIdx])).forEach((p) => out.addPage(p));
  (await out.copyPages(src, all.slice(pageIdx + 1))).forEach((p) => out.addPage(p));
  return out.save();
}

function fixOutlinesBestEffort(doc, PDFLib) {
  try {
    const catalog = doc.catalog;
    if (catalog && catalog.get && catalog.get(PDFLib.PDFName.of("Outlines"))) catalog.delete(PDFLib.PDFName.of("Outlines"));
  } catch {
    /* outline remap best-effort: drop stale outline tree on merge */
  }
}
