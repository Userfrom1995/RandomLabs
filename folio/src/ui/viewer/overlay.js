// Folio canvas overlay: pure coordinate math + placement-mode controller.
//
// The overlay is a transparent div stacked over #pagecanvas inside
// #canvaswrap. PDF points (origin bottom-left) map to CSS pixels (origin
// top-left) through the pdf.js viewport ratio. All math here is pure and
// unit-testable in node; DOM wiring stays in shell/app.js.
//
// pageBox:  { width, height } in PDF points (page.getSize()).
// canvasBox:{ width, height } in rendered CSS/device px (canvas.width/height).
export function pdfToCss(rect, pageBox, canvasBox) {
  const sx = canvasBox.width / pageBox.width;
  const sy = canvasBox.height / pageBox.height;
  return {
    // rect: {x, y, w, h} PDF points, y measured from the bottom.
    x: rect.x * sx,
    y: canvasBox.height - (rect.y + rect.h) * sy,
    w: rect.w * sx,
    h: rect.h * sy,
  };
}

export function cssToPdf(box, pageBox, canvasBox) {
  const sx = pageBox.width / canvasBox.width;
  const sy = pageBox.height / canvasBox.height;
  return {
    x: box.x * sx,
    y: pageBox.height - (box.y + box.h) * sy,
    w: box.w * sx,
    h: box.h * sy,
  };
}

// Clamp a drag box to the canvas box; normalizes inverted drags
// (dragging up-left produces negative w/h). Returns CSS-px box.
export function normalizeDragBox(x0, y0, x1, y1, canvasBox) {
  const x = Math.min(x0, x1);
  const y = Math.min(y0, y1);
  const w = Math.abs(x1 - x0);
  const h = Math.abs(y1 - y0);
  const cx = Math.min(Math.max(x, 0), canvasBox.width);
  const cy = Math.min(Math.max(y, 0), canvasBox.height);
  const cw = Math.min(w, canvasBox.width - cx);
  const ch = Math.min(h, canvasBox.height - cy);
  return { x: cx, y: cy, w: cw, h: ch };
}

// Resize a CSS-px bbox by dragging one of 8 handles. handle is one of
// n/s/e/w/ne/nw/se/sw; dx/dy are pointer deltas in CSS px. min is the
// minimum edge in px. Returns the clamped, normalized box.
export function resizeBox(box, handle, dx, dy, canvasBox, min) {
  const m = min === undefined ? 8 : min;
  let { x, y, w, h } = box;
  if (handle.includes("e")) w += dx;
  if (handle.includes("s")) h += dy;
  if (handle.includes("w")) {
    x += dx;
    w -= dx;
  }
  if (handle.includes("n")) {
    y += dy;
    h -= dy;
  }
  if (w < m) {
    if (handle.includes("w")) x -= m - w;
    w = m;
  }
  if (h < m) {
    if (handle.includes("n")) y -= m - h;
    h = m;
  }
  x = Math.min(Math.max(x, 0), canvasBox.width - w);
  y = Math.min(Math.max(y, 0), canvasBox.height - h);
  w = Math.min(w, canvasBox.width - x);
  h = Math.min(h, canvasBox.height - y);
  return { x, y, w, h };
}

// Move a CSS-px bbox by a delta, clamped to the canvas.
export function moveBox(box, dx, dy, canvasBox) {
  return {
    x: Math.min(Math.max(box.x + dx, 0), Math.max(0, canvasBox.width - box.w)),
    y: Math.min(Math.max(box.y + dy, 0), Math.max(0, canvasBox.height - box.h)),
    w: box.w,
    h: box.h,
  };
}

// Placement modes the toolbar can arm. "crop" renders the draggable bbox;
// "note" commits a point; the rest commit rects through the M1/M2 ops.
export const PLACEMENT_MODES = ["crop", "note", "shape", "link", "stamp", "sign", "image", "field"];

// Minimum rect (PDF points) below which a drag is treated as a click
// (point placement with a sensible default footprint per mode).
export const CLICK_DEFAULTS = {
  note: { w: 24, h: 24 },
  shape: { w: 120, h: 60 },
  link: { w: 200, h: 20 },
  stamp: { w: 150, h: 40 },
  sign: { w: 180, h: 50 },
  image: { w: 200, h: 200 },
  field: { w: 200, h: 24 },
  crop: { w: 100, h: 100 },
};

// Given a committed CSS-px box (or click point) and the mode, produce the
// PDF-point rect to hand to the engine op. Click (w/h below threshold)
// expands around the point with the mode default.
export function commitRect(mode, cssBox, pageBox, canvasBox, clickThresholdCss) {
  const t = clickThresholdCss === undefined ? 4 : clickThresholdCss;
  let box = cssBox;
  if (cssBox.w < t && cssBox.h < t) {
    const d = CLICK_DEFAULTS[mode] || CLICK_DEFAULTS.shape;
    const sx = canvasBox.width / pageBox.width;
    const sy = canvasBox.height / pageBox.height;
    const wCss = d.w * sx;
    const hCss = d.h * sy;
    box = { x: cssBox.x - wCss / 2, y: cssBox.y - hCss / 2, w: wCss, h: hCss };
    box = normalizeDragBox(box.x, box.y, box.x + box.w, box.y + box.h, canvasBox);
  }
  const r = cssToPdf(box, pageBox, canvasBox);
  // Round to 1 decimal: sub-point precision is meaningless in PDF.
  const q = (n) => Math.round(n * 10) / 10;
  return { x: q(r.x), y: q(r.y), w: q(r.w), h: q(r.h) };
}

// Parse a link target string from the UI: "page:N" (1-based, user-facing)
// becomes a zero-based gotoPage; anything else must be a valid URI
// (validated by the caller's validateLink). Pure, unit-testable.
export function parsePlaceTarget(raw, pageCount) {
  const t = String(raw || "").trim();
  if (!t) throw new Error("link: need a target (https://... or page:N)");
  if (t.toLowerCase().startsWith("page:")) {
    const n = parseInt(t.slice(5).trim(), 10);
    if (!Number.isInteger(n) || n < 1 || n > (pageCount || 0)) {
      throw new Error("link: page:N must be within 1.." + (pageCount || 0));
    }
    return { gotoPage: n - 1 };
  }
  return { uri: t };
}

// Serialize a bookmark outline tree to the flat [{title, page}] rows the
// bookmark core (setBookmarks/splitByBookmarks) consumes, and back.
// Tree nodes: {title, page, children[]}. Depth-first order.
export function treeToRows(nodes, out, depth) {
  const acc = out || [];
  const d = depth === undefined ? 0 : depth;
  for (const n of nodes || []) {
    acc.push({ title: n.title, page: n.page, depth: d });
    treeToRows(n.children, acc, d + 1);
  }
  return acc;
}

// Rebuild a tree from depth-tagged rows (indent/outdent edits adjust depth).
export function rowsToTree(rows) {
  const root = [];
  const stack = [{ children: root, depth: -1 }];
  for (const r of rows || []) {
    const node = { title: r.title, page: r.page, children: [] };
    while (stack.length > 1 && stack[stack.length - 1].depth >= (r.depth || 0)) stack.pop();
    stack[stack.length - 1].children.push(node);
    stack.push({ children: node.children, depth: r.depth || 0 });
  }
  return root;
}
