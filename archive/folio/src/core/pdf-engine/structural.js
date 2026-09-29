// Folio structural engine: every page op compiles to copyPages index lists
// plus O(1) per-page mutations, followed by the reference fix-up pass.
// Pure planners here (no DOM, unit-testable); the pdf-lib binding lives in
// src/ui/tools/pages.js which executes these plans.
export function validateIndices(indices, pageCount) {
  if (!Number.isInteger(pageCount) || pageCount < 0) throw new Error("bad pageCount");
  for (const i of indices) {
    if (!Number.isInteger(i) || i < 0 || i >= pageCount) throw new Error("page index out of range: " + i);
  }
}

// Merge: concatenate documents. docs = [{pages:n}, ...] -> per-doc index lists.
export function planMerge(docPages) {
  const plans = [];
  let total = 0;
  docPages.forEach((n) => {
    if (!Number.isInteger(n) || n < 0) throw new Error("bad doc page count");
    const idx = [];
    for (let i = 0; i < n; i++) idx.push(i);
    plans.push(idx);
    total += n;
  });
  return { plans, total };
}

// Split by explicit ranges: ranges = [[a,b],...] inclusive, 0-based.
export function planSplitRanges(pageCount, ranges) {
  const out = [];
  for (const [a, b] of ranges) {
    if (!Number.isInteger(a) || !Number.isInteger(b) || a < 0 || b >= pageCount || a > b) {
      throw new Error("bad range [" + a + "," + b + "]");
    }
    const part = [];
    for (let i = a; i <= b; i++) part.push(i);
    out.push(part);
  }
  return out;
}

// Split into fixed chunks of n pages each.
export function planChunks(pageCount, n) {
  if (!Number.isInteger(n) || n < 1) throw new Error("chunk size must be >= 1");
  const out = [];
  for (let s = 0; s < pageCount; s += n) {
    const part = [];
    for (let i = s; i < Math.min(s + n, pageCount); i++) part.push(i);
    out.push(part);
  }
  return out;
}

export function planDelete(pageCount, remove) {
  const drop = new Set(remove);
  validateIndices([...drop], pageCount);
  const keep = [];
  for (let i = 0; i < pageCount; i++) if (!drop.has(i)) keep.push(i);
  return keep;
}

export function planOddEven(pageCount, which) {
  const keep = [];
  for (let i = 0; i < pageCount; i++) {
    if (which === "odd" && i % 2 === 0) keep.push(i);
    if (which === "even" && i % 2 === 1) keep.push(i);
  }
  return keep;
}

export function planReorder(pageCount, order) {
  if (order.length !== pageCount) throw new Error("order must be a permutation of all pages");
  validateIndices(order, pageCount);
  if (new Set(order).size !== pageCount) throw new Error("order must not repeat pages");
  return [...order];
}

export function planReverse(pageCount) {
  const out = [];
  for (let i = pageCount - 1; i >= 0; i--) out.push(i);
  return out;
}

// Insert pages of src (srcIndices) into base at position `at` (0..baseCount).
export function planInsert(baseCount, at, srcIndices) {
  if (!Number.isInteger(at) || at < 0 || at > baseCount) throw new Error("bad insert position");
  return { keep: null, baseCount, at, srcIndices: [...srcIndices] };
}

// Rotation mutation: returns normalized /Rotate values per page.
export function planRotate(pageCount, selector, degrees) {
  const allowed = [0, 90, 180, 270, -90, -180, -270];
  if (!allowed.includes(degrees)) throw new Error("rotation must be a multiple of 90");
  const norm = ((degrees % 360) + 360) % 360;
  const targets = selector === "all" ? Array.from({ length: pageCount }, (_, i) => i) : [...selector];
  validateIndices(targets, pageCount);
  return { targets, rotateBy: norm };
}

// Crop mutation: rect in PDF points {x,y,w,h} intersected with mediabox.
export function planCrop(mediaBox, rect) {
  const ix = Math.max(mediaBox.x, rect.x);
  const iy = Math.max(mediaBox.y, rect.y);
  const x2 = Math.min(mediaBox.x + mediaBox.w, rect.x + rect.w);
  const y2 = Math.min(mediaBox.y + mediaBox.h, rect.y + rect.h);
  if (x2 <= ix || y2 <= iy) throw new Error("crop rect is empty after intersection");
  return { x: ix, y: iy, w: x2 - ix, h: y2 - iy };
}

// Reference fix-up pass (O(m)): remap outline dests, link annotation dests,
// and form field page refs after a keep/order mapping.
// oldToNew: Map(oldIndex -> newIndex); dropped pages map to -1.
export function fixupReferences(oldToNew, outlines, linkAnnots) {
  const remappedOutlines = (outlines || []).flatMap((o) => {
    const n = oldToNew.get(o.page);
    if (n === undefined || n < 0) return [];
    return [{ ...o, page: n }];
  });
  const remappedLinks = (linkAnnots || []).flatMap((a) => {
    if (a.destPage === undefined) return [{ ...a }];
    const n = oldToNew.get(a.destPage);
    if (n === undefined || n < 0) return [];
    return [{ ...a, destPage: n }];
  });
  return { outlines: remappedOutlines, links: remappedLinks };
}

export function oldToNewMap(keepOrdered) {
  const m = new Map();
  keepOrdered.forEach((oldIdx, newIdx) => m.set(oldIdx, newIdx));
  return m;
}
