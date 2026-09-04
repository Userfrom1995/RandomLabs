// Folio annotate executors: text-markup (E1), sticky notes (E2), geometric
// annotations (E3: Square/Circle/Line as real annot objects), ink
// annotations (E4: real /Ink objects with RDP-simplified InkList), stamps
// (E5-tier2 bonus), links (E8-tier2 bonus), Bates (E11), image watermark
// (E13), bookmarks/outline + TOC (E14), bulk annotation delete (E15-tier2
// bonus), annotation bake (burn supported annots into content). Write path
// is pdf-lib.
import { quadsForQuery, validateBookmarks, simplifyInk } from "../../core/annotate/annotate.js";
import { batesPlan } from "../../core/annotate/annotate.js";

const MARKUP_STYLE = {
  Highlight: { color: [1, 1, 0], quadCount: 0 },
  Underline: { color: [0.2, 0.6, 0.2], quadCount: 0 },
  StrikeOut: { color: [0.9, 0.25, 0.25], quadCount: 0 },
};

function annotDict(doc, PDFLib, fields) {
  return doc.context.register(doc.context.obj(fields));
}

// textMaps: {pageIdx: lines[]} from the viewer text map.
export async function addTextMarkup(bytes, { query, subtype }, textMaps, PDFLib) {
  if (!MARKUP_STYLE[subtype]) throw new Error("markup: subtype must be Highlight/Underline/StrikeOut");
  const doc = await PDFLib.PDFDocument.load(bytes);
  let hits = 0;
  const pages = doc.getPages();
  for (let pi = 0; pi < pages.length; pi++) {
    const lines = (textMaps && textMaps[pi]) || [];
    const found = quadsForQuery(lines, query, pi);
    for (const f of found) {
      for (const q of f.quads) {
        const xs = [q[0], q[2], q[4], q[6]];
        const ys = [q[1], q[3], q[5], q[7]];
        const rect = [Math.min(...xs) - 1, Math.min(...ys) - 2, Math.max(...xs) + 1, Math.max(...ys) + 2];
        const ref = annotDict(doc, PDFLib, {
          Type: PDFLib.PDFName.of("Annot"),
          Subtype: PDFLib.PDFName.of(subtype),
          Rect: doc.context.obj(rect),
          QuadPoints: doc.context.obj(q),
          Contents: PDFLib.PDFString.of(f.snippet.slice(0, 300)),
          C: doc.context.obj(MARKUP_STYLE[subtype].color),
          F: PDFLib.PDFNumber.of(4), // Print
        });
        pages[pi].node.addAnnot(ref);
        hits++;
      }
    }
  }
  return { bytes: await doc.save(), hits };
}

export async function addStickyNote(bytes, { page, x, y, contents, icon }, PDFLib) {
  const doc = await PDFLib.PDFDocument.load(bytes);
  const pages = doc.getPages();
  if (page < 0 || page >= pages.length) throw new Error("note: page out of range");
  const ref = annotDict(doc, PDFLib, {
    Type: PDFLib.PDFName.of("Annot"),
    Subtype: PDFLib.PDFName.of("Text"),
    Rect: doc.context.obj([x, y, x + 24, y + 24]),
    Contents: PDFLib.PDFString.of(String(contents || "Note").slice(0, 1000)),
    Name: PDFLib.PDFName.of(icon || "Note"),
    C: doc.context.obj([1, 0.95, 0.6]),
    Open: PDFLib.PDFBool.False,
    F: PDFLib.PDFNumber.of(4),
  });
  pages[page].node.addAnnot(ref);
  return doc.save();
}

// Geometric annotations are placed as real annot objects (Square, Circle,
// Line) so they stay selectable/deletable until baked. rect: {x,y,w,h} in
// PDF points; for "line" the rect diagonal is the segment. color: [r,g,b].
export async function addGeomAnnot(bytes, { page, kind, rect, color, borderWidth }, PDFLib) {
  const subtype = { rect: "Square", ellipse: "Circle", line: "Line", arrow: "Line" }[kind];
  if (!subtype) throw new Error("shape: kind must be rect/ellipse/line/arrow");
  const r = rect || {};
  for (const k of ["x", "y", "w", "h"]) {
    if (!Number.isFinite(Number(r[k]))) throw new Error("shape: rect." + k + " must be a number");
  }
  if (Number(r.w) <= 0 || Number(r.h) <= 0) throw new Error("shape: rect must have positive size");
  const doc = await PDFLib.PDFDocument.load(bytes);
  const p = doc.getPages()[page];
  if (!p) throw new Error("shape: page out of range");
  const c = Array.isArray(color) && color.length === 3 ? color : [0.85, 0.2, 0.2];
  const bw = borderWidth || 2;
  const fields = {
    Type: PDFLib.PDFName.of("Annot"),
    Subtype: PDFLib.PDFName.of(subtype),
    Rect: doc.context.obj([r.x, r.y, r.x + r.w, r.y + r.h]),
    C: doc.context.obj(c),
    Border: doc.context.obj([0, 0, bw]),
    F: PDFLib.PDFNumber.of(4), // Print
  };
  if (subtype === "Line") fields.L = doc.context.obj([r.x, r.y, r.x + r.w, r.y + r.h]);
  if (kind === "arrow") fields.LE = doc.context.obj([PDFLib.PDFName.of("None"), PDFLib.PDFName.of("OpenArrow")]);
  p.node.addAnnot(annotDict(doc, PDFLib, fields));
  return { bytes: await doc.save(), subtype };
}

// Freehand ink as a real /Ink annotation: strokes are RDP-simplified here
// (engine owns the tolerance), degenerate strokes dropped, InkList + bbox
// stored so any viewer renders the stroke. color: [r,g,b] default blue.
export async function addInkAnnot(bytes, { page, strokes, color, thickness, tol }, PDFLib) {
  const doc = await PDFLib.PDFDocument.load(bytes);
  const p = doc.getPages()[page];
  if (!p) throw new Error("ink: page out of range");
  const c = Array.isArray(color) && color.length === 3 ? color : [0.15, 0.2, 0.9];
  const simplified = (strokes || [])
    .map((st) => simplifyInk((st || []).map((pt) => ({ x: Number(pt.x), y: Number(pt.y) })), tol === undefined ? 1.5 : tol))
    .filter((st) => st.length >= 2);
  if (!simplified.length) throw new Error("ink: no usable strokes (draw at least a short stroke)");
  let x1 = Infinity;
  let y1 = Infinity;
  let x2 = -Infinity;
  let y2 = -Infinity;
  const inkList = simplified.map((st) => {
    const flat = [];
    for (const pt of st) {
      if (!Number.isFinite(pt.x) || !Number.isFinite(pt.y)) throw new Error("ink: stroke points must be numbers");
      flat.push(pt.x, pt.y);
      if (pt.x < x1) x1 = pt.x;
      if (pt.y < y1) y1 = pt.y;
      if (pt.x > x2) x2 = pt.x;
      if (pt.y > y2) y2 = pt.y;
    }
    return flat;
  });
  const pad = (thickness || 2) / 2 + 1;
  const ref = annotDict(doc, PDFLib, {
    Type: PDFLib.PDFName.of("Annot"),
    Subtype: PDFLib.PDFName.of("Ink"),
    Rect: doc.context.obj([x1 - pad, y1 - pad, x2 + pad, y2 + pad]),
    InkList: doc.context.obj(inkList),
    C: doc.context.obj(c),
    Border: doc.context.obj([0, 0, thickness || 2]),
    F: PDFLib.PDFNumber.of(4), // Print
  });
  p.node.addAnnot(ref);
  const points = simplified.reduce((n, st) => n + st.length, 0);
  return { bytes: await doc.save(), strokes: simplified.length, points };
}

export async function addStamp(bytes, { page, text, x, y }, PDFLib) {
  const doc = await PDFLib.PDFDocument.load(bytes);
  const p = doc.getPages()[page];
  if (!p) throw new Error("stamp: page out of range");
  const label = String(text || "APPROVED").slice(0, 40);
  const font = await doc.embedFont(PDFLib.StandardFonts.HelveticaBold);
  const size = 18;
  const tw = font.widthOfTextAtSize(label, size);
  const bx = x === undefined ? 56 : x;
  const by = y === undefined ? 700 : y;
  p.drawRectangle({ x: bx - 8, y: by - 8, width: tw + 16, height: size + 20, borderColor: PDFLib.rgb(0.7, 0.1, 0.1), borderWidth: 2 });
  p.drawText(label, { x: bx, y: by, size, font, color: PDFLib.rgb(0.7, 0.1, 0.1) });
  return doc.save();
}

export async function addLink(bytes, { page, rect, uri, gotoPage }, PDFLib) {
  const doc = await PDFLib.PDFDocument.load(bytes);
  const p = doc.getPages()[page];
  if (!p) throw new Error("link: page out of range");
  const fields = {
    Type: PDFLib.PDFName.of("Annot"),
    Subtype: PDFLib.PDFName.of("Link"),
    Rect: doc.context.obj([rect.x, rect.y, rect.x + rect.w, rect.y + rect.h]),
    Border: doc.context.obj([0, 0, 0]),
  };
  if (uri) fields.A = doc.context.obj({ S: PDFLib.PDFName.of("URI"), URI: PDFLib.PDFString.of(String(uri)) });
  else if (gotoPage !== undefined) {
    const dest = doc.getPages()[gotoPage];
    if (!dest) throw new Error("link: goto page out of range");
    fields.Dest = doc.context.obj([dest.ref, PDFLib.PDFName.of("Fit")]);
  } else throw new Error("link: need uri or gotoPage");
  p.node.addAnnot(annotDict(doc, PDFLib, fields));
  return doc.save();
}

export async function addBates(bytes, opts, PDFLib) {
  const doc = await PDFLib.PDFDocument.load(bytes);
  const plan = batesPlan(doc.getPageCount(), opts);
  const font = await doc.embedFont(PDFLib.StandardFonts.Helvetica);
  doc.getPages().forEach((p, i) => {
    const { width } = p.getSize();
    const t = plan[i];
    const w = font.widthOfTextAtSize(t, 9);
    p.drawText(t, { x: (width - w) / 2, y: 18, size: 9, font });
  });
  return { bytes: await doc.save(), plan };
}

// Flat bookmark list + generated TOC page (E14).
export async function setBookmarks(bytes, items, PDFLib) {
  const doc = await PDFLib.PDFDocument.load(bytes);
  const valid = validateBookmarks(items, doc.getPageCount());
  const pages = doc.getPages();
  const outRef = doc.context.nextRef();
  const itemRefs = valid.map(() => doc.context.nextRef());
  valid.forEach((b, i) => {
    const fields = {
      Type: PDFLib.PDFName.of("Outlines"),
      Title: PDFLib.PDFString.of(b.title),
      Parent: outRef,
      Dest: doc.context.obj([pages[b.page - 1].ref, PDFLib.PDFName.of("Fit")]),
    };
    if (i > 0) fields.Prev = itemRefs[i - 1];
    if (i < valid.length - 1) fields.Next = itemRefs[i + 1];
    doc.context.assign(itemRefs[i], doc.context.obj(fields));
  });
  doc.context.assign(
    outRef,
    doc.context.obj({
      Type: PDFLib.PDFName.of("Outlines"),
      First: itemRefs[0],
      Last: itemRefs[itemRefs.length - 1],
      Count: PDFLib.PDFNumber.of(valid.length),
    }),
  );
  doc.catalog.set(PDFLib.PDFName.of("Outlines"), outRef);
  return { bytes: await doc.save(), count: valid.length };
}

export async function addTocPage(bytes, items, PDFLib) {
  const withMarks = await setBookmarks(bytes, items, PDFLib);
  const doc = await PDFLib.PDFDocument.load(withMarks.bytes);
  const valid = validateBookmarks(items, doc.getPageCount());
  const font = await doc.embedFont(PDFLib.StandardFonts.Helvetica);
  const bold = await doc.embedFont(PDFLib.StandardFonts.HelveticaBold);
  const toc = doc.insertPage(0, [595, 842]);
  toc.drawText("Contents", { x: 56, y: 780, size: 22, font: bold });
  let y = 745;
  valid.forEach((b) => {
    toc.drawText(b.title.slice(0, 60), { x: 56, y, size: 11, font });
    const pg = String(b.page + 1);
    toc.drawText(pg, { x: 540 - font.widthOfTextAtSize(pg, 11), y, size: 11, font });
    y -= 18;
  });
  return { bytes: await doc.save(), count: valid.length };
}

export async function imageWatermark(bytes, { imageBytes, kind, opacity }, PDFLib) {
  const doc = await PDFLib.PDFDocument.load(bytes);
  const img = kind === "png" ? await doc.embedPng(imageBytes) : await doc.embedJpg(imageBytes);
  for (const p of doc.getPages()) {
    const { width, height } = p.getSize();
    const k = Math.min(width / img.width, height / img.height) * 0.5;
    p.drawImage(img, {
      x: (width - img.width * k) / 2,
      y: (height - img.height * k) / 2,
      width: img.width * k,
      height: img.height * k,
      opacity: opacity === undefined ? 0.15 : opacity,
    });
  }
  return doc.save();
}

// Read an annot /C color array; fall back to `dflt` ([r,g,b] 0..1).
function annotColor(doc, d, dflt, PDFLib) {
  try {
    const c = doc.context.lookup(d.get(PDFLib.PDFName.of("C")));
    const v = [c.get(0).asNumber(), c.get(1).asNumber(), c.get(2).asNumber()];
    if (v.every((n) => Number.isFinite(n))) return v;
  } catch { /* fall through */ }
  void PDFLib;
  return dflt;
}

function annotBorderWidth(doc, d, dflt) {
  try {
    const b = doc.context.lookup(d.get(PDFLib.PDFName.of("Border")));
    const w = b.get(2).asNumber();
    if (Number.isFinite(w) && w > 0) return w;
  } catch { /* fall through */ }
  return dflt;
}

function annotRect(d, PDFLib) {
  const r = d.get(PDFLib.PDFName.of("Rect"));
  return [r.get(0).asNumber(), r.get(1).asNumber(), r.get(2).asNumber(), r.get(3).asNumber()];
}

// QuadPoints as [[x1,y1,...x4,y4], ...]; empty when absent/unreadable.
function annotQuads(doc, d, PDFLib) {
  try {
    const q = doc.context.lookup(d.get(PDFLib.PDFName.of("QuadPoints")));
    const nums = [];
    for (let i = 0; i < q.size(); i++) nums.push(q.get(i).asNumber());
    const out = [];
    for (let i = 0; i + 7 < nums.length; i += 8) out.push(nums.slice(i, i + 8));
    return out;
  } catch {
    return [];
  }
}

// Bake supported vector annotations into content, then drop the baked
// annots. Highlight/Underline/StrikeOut render from QuadPoints (one shape
// per quad, Rect only as fallback); Ink replays InkList polylines;
// Square/Circle/Line replay their geometry. Returns per-subtype counts;
// unsupported subtypes are left untouched and counted as skipped.
export async function bakeAnnotations(bytes, PDFLib) {
  const BAKABLE = ["Highlight", "Underline", "StrikeOut", "Ink", "Square", "Circle", "Line"];
  const doc = await PDFLib.PDFDocument.load(bytes);
  const bySubtype = {};
  let skipped = 0;
  for (const p of doc.getPages()) {
    let annots = null;
    try {
      annots = p.node.Annots();
    } catch {
      continue;
    }
    if (!annots) continue;
    try {
      for (let i = annots.size() - 1; i >= 0; i--) {
        const d = doc.context.lookup(annots.get(i));
        let st = "";
        try {
          st = d.get(PDFLib.PDFName.of("Subtype")).toString().slice(1);
        } catch { /* skip */ }
        if (!BAKABLE.includes(st)) {
          skipped++;
          continue;
        }
        try {
          bakeOne(p, doc, d, st, PDFLib);
          annots.remove(i);
          bySubtype[st] = (bySubtype[st] || 0) + 1;
        } catch { /* keep annot on draw failure */ }
      }
    } catch { /* keep going */ }
  }
  const baked = Object.values(bySubtype).reduce((n, c) => n + c, 0);
  return { bytes: await doc.save(), baked, bySubtype, skipped };
}

function bakeOne(p, doc, d, st, PDFLib) {
  const rgb = (c) => PDFLib.rgb(c[0], c[1], c[2]);
  if (st === "Highlight" || st === "Underline" || st === "StrikeOut") {
    const color = annotColor(doc, d, st === "Highlight" ? [1, 1, 0] : st === "Underline" ? [0.2, 0.6, 0.2] : [0.9, 0.25, 0.25], PDFLib);
    let quads = annotQuads(doc, d, PDFLib);
    if (!quads.length) {
      const [x1, y1, x2, y2] = annotRect(d, PDFLib);
      quads = [[x1, y2, x2, y2, x2, y1, x1, y1]];
    }
    for (const q of quads) {
      const xs = [q[0], q[2], q[4], q[6]];
      const ys = [q[1], q[3], q[5], q[7]];
      const x1 = Math.min(...xs);
      const x2 = Math.max(...xs);
      const y1 = Math.min(...ys);
      const y2 = Math.max(...ys);
      if (st === "Highlight") {
        p.drawRectangle({ x: x1, y: y1, width: x2 - x1, height: y2 - y1, color: rgb(color), opacity: 0.4 });
      } else {
        const y = st === "Underline" ? y1 + 1 : (y1 + y2) / 2;
        p.drawLine({ start: { x: x1, y }, end: { x: x2, y }, thickness: 1, color: rgb(color) });
      }
    }
    return;
  }
  if (st === "Ink") {
    const color = annotColor(doc, d, [0.15, 0.2, 0.9], PDFLib);
    const w = annotBorderWidth(doc, d, 2);
    const ink = doc.context.lookup(d.get(PDFLib.PDFName.of("InkList")));
    let drew = false;
    for (let s = 0; s < ink.size(); s++) {
      const path = doc.context.lookup(ink.get(s));
      const pts = [];
      for (let k = 0; k + 1 < path.size(); k += 2) pts.push({ x: path.get(k).asNumber(), y: path.get(k + 1).asNumber() });
      for (let k = 1; k < pts.length; k++) {
        p.drawLine({ start: pts[k - 1], end: pts[k], thickness: w, color: rgb(color), lineCap: PDFLib.LineCapStyle.Round });
        drew = true;
      }
    }
    if (!drew) throw new Error("bake: empty InkList");
    return;
  }
  if (st === "Square" || st === "Circle" || st === "Line") {
    const color = annotColor(doc, d, [0.85, 0.2, 0.2], PDFLib);
    const w = annotBorderWidth(doc, d, 2);
    if (st === "Square") {
      const [x1, y1, x2, y2] = annotRect(d, PDFLib);
      p.drawRectangle({ x: x1, y: y1, width: x2 - x1, height: y2 - y1, borderColor: rgb(color), borderWidth: w });
    } else if (st === "Circle") {
      const [x1, y1, x2, y2] = annotRect(d, PDFLib);
      p.drawEllipse({ x: (x1 + x2) / 2, y: (y1 + y2) / 2, xScale: (x2 - x1) / 2, yScale: (y2 - y1) / 2, borderColor: rgb(color), borderWidth: w });
    } else {
      const l = doc.context.lookup(d.get(PDFLib.PDFName.of("L")));
      const ends = [l.get(0).asNumber(), l.get(1).asNumber(), l.get(2).asNumber(), l.get(3).asNumber()];
      p.drawLine({ start: { x: ends[0], y: ends[1] }, end: { x: ends[2], y: ends[3] }, thickness: w, color: rgb(color) });
    }
    return;
  }
  throw new Error("bake: unsupported " + st);
}

export function listAnnotations(doc, PDFLib) {
  const out = [];
  doc.getPages().forEach((p, pi) => {
    let annots = null;
    try {
      annots = p.node.Annots();
    } catch {
      return;
    }
    if (!annots) return;
    try {
      const n = annots.size();
      for (let i = 0; i < n; i++) {
        const ref = annots.get(i);
        const d = doc.context.lookup(ref);
        let subtype = "?";
        try {
          subtype = d.get(PDFLib.PDFName.of("Subtype")).toString().slice(1);
        } catch { /* keep ? */ }
        out.push({ page: pi, index: i, subtype });
      }
    } catch { /* unreadable annots array */ }
  });
  return out;
}

export async function deleteAnnotations(bytes, { pages, subtypes }, PDFLib) {
  const doc = await PDFLib.PDFDocument.load(bytes);
  let removed = 0;
  doc.getPages().forEach((p, pi) => {
    if (pages && !pages.includes(pi)) return;
    let annots = null;
    try {
      annots = p.node.Annots();
    } catch {
      return;
    }
    if (!annots) return;
    try {
      for (let i = annots.size() - 1; i >= 0; i--) {
        if (subtypes) {
          const d = doc.context.lookup(annots.get(i));
          let st = "";
          try {
            st = d.get(PDFLib.PDFName.of("Subtype")).toString().slice(1);
          } catch { /* keep */ }
          if (!subtypes.includes(st)) continue;
        }
        annots.remove(i);
        removed++;
      }
    } catch { /* keep going */ }
  });
  return { bytes: await doc.save(), removed };
}
