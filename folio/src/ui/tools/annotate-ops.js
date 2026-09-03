// Folio annotate executors: text-markup (E1), sticky notes (E2), shapes
// (E3), ink (E4), stamps (E5-tier2 bonus), links (E8-tier2 bonus), Bates
// (E11), image watermark (E13), bookmarks/outline + TOC (E14), bulk
// annotation delete (E15-tier2 bonus). Write path is pdf-lib.
import { quadsForQuery, validateBookmarks } from "../../core/annotate/annotate.js";
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

// Shapes/stamps/ink draw into content (permanent, viewer-independent).
export async function drawShape(bytes, { page, kind, x, y, w, h, borderWidth }, PDFLib) {
  const doc = await PDFLib.PDFDocument.load(bytes);
  const p = doc.getPages()[page];
  if (!p) throw new Error("shape: page out of range");
  const ink = PDFLib.rgb(0.85, 0.2, 0.2);
  const bw = borderWidth || 2;
  if (kind === "rect") p.drawRectangle({ x, y, width: w, height: h, borderColor: ink, borderWidth: bw });
  else if (kind === "ellipse") p.drawEllipse({ x: x + w / 2, y: y + h / 2, xScale: w / 2, yScale: h / 2, borderColor: ink, borderWidth: bw });
  else if (kind === "line" || kind === "arrow") {
    p.drawLine({ start: { x, y }, end: { x: x + w, y: y + h }, thickness: bw, color: ink });
    if (kind === "arrow") {
      const ang = Math.atan2(h, w);
      const s = 12;
      for (const d of [0.35, -0.35]) {
        p.drawLine({
          start: { x: x + w, y: y + h },
          end: { x: x + w - s * Math.cos(ang + d), y: y + h - s * Math.sin(ang + d) },
          thickness: bw,
          color: ink,
        });
      }
    }
  } else throw new Error("shape: kind must be rect/ellipse/line/arrow");
  return doc.save();
}

export async function addInk(bytes, { page, strokes, thickness }, PDFLib) {
  const doc = await PDFLib.PDFDocument.load(bytes);
  const p = doc.getPages()[page];
  if (!p) throw new Error("ink: page out of range");
  const color = PDFLib.rgb(0.15, 0.2, 0.9);
  let segs = 0;
  for (const st of strokes || []) {
    for (let i = 1; i < st.length; i++) {
      p.drawLine({ start: st[i - 1], end: st[i], thickness: thickness || 2, color, lineCap: PDFLib.LineCapStyle.Round });
      segs++;
    }
  }
  if (!segs) throw new Error("ink: no segments drawn");
  return doc.save();
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
    const arr = annots instanceof Array ? annots : null;
    void arr;
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
  void PDFLib;
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
