// Folio M3 OCR core (pure, no browser APIs): pack consent math, invisible
// text-layer geometry, and recall scoring. Browser orchestration
// (worker boot, page render, pack download) lives in ui/tools/ocr-ops.js
// so this module stays unit-testable under node --test.

export const OCR_PACK_MANIFEST = "packs/ocr/pack.json";
export const OCR_CACHE_NAME = "folio-pack-ocr-v1";
export const OCR_LANG = "eng";
export const OCR_DEFAULT_DPI = 300;

export function formatBytes(n) {
  if (!Number.isFinite(n) || n < 0) throw new Error("bad byte count");
  if (n < 1024) return n + " B";
  const units = ["KB", "MB", "GB"];
  let v = n;
  let u = -1;
  while (v >= 1024 && u < units.length - 1) {
    v /= 1024;
    u++;
  }
  return (Math.round(v * 10) / 10) + " " + units[u];
}

// Tesseract word: {text, confidence, bbox:{x0,y0,x1,y1}} in source pixels.
// Returns draw ops in PDF points for an invisible (opacity-0) text layer:
// scale = 72/dpi, baseline anchored to the word-box top so ascenders fit.
export function textLayerOps(words, dpi, pageHpt, opts) {
  if (!Number.isFinite(dpi) || dpi <= 0) throw new Error("bad dpi");
  if (!Number.isFinite(pageHpt) || pageHpt <= 0) throw new Error("bad page height");
  const minConf = (opts && opts.minConf) || 0;
  const s = 72 / dpi;
  const ops = [];
  for (const w of words || []) {
    const text = (w && w.text) || "";
    if (!text.trim()) continue;
    if (Number.isFinite(w.confidence) && w.confidence < minConf) continue;
    const b = (w && w.bbox) || {};
    const x0 = +b.x0;
    const y1 = +b.y1;
    const h = +b.y1 - +b.y0;
    if (![x0, y1, h].every(Number.isFinite) || h <= 0) continue;
    const size = Math.max(4, h * s * 0.92);
    ops.push({ text, x: x0 * s, y: pageHpt - y1 * s, size });
  }
  return ops;
}

// Draw an invisible-but-selectable text layer onto a pdf-lib page.
// Opacity 0 keeps glyphs out of every renderer while the text operators
// stay in the content stream (pdf.js getTextContent still extracts them).
export function bakeTextLayer(page, ops, font) {
  if (!page || typeof page.drawText !== "function") throw new Error("bad page");
  if (!font) throw new Error("missing font");
  let baked = 0;
  for (const op of ops) {
    page.drawText(op.text, { x: op.x, y: op.y, size: op.size, font, opacity: 0 });
    baked++;
  }
  return baked;
}

// Build a searchable PDF from raster pages: each page gets the source
// image drawn full-bleed plus the invisible OCR text layer on top.
// pages: [{imgSignal, embed:'jpg'|'png', words, wPx, hPx, dpi}]
// imgSignal is passed straight to doc.embedJpg/embedPng by the caller so
// this module never touches bytes or browser APIs.
export async function searchablePdfFromImages(doc, pages, font) {
  if (!doc || typeof doc.addPage !== "function") throw new Error("bad doc");
  if (!font) throw new Error("missing font");
  const out = [];
  for (const p of pages) {
    const s = 72 / p.dpi;
    const w = p.wPx * s;
    const h = p.hPx * s;
    const page = doc.addPage([w, h]);
    const img = p.embed === "png" ? await doc.embedPng(p.imgSignal) : await doc.embedJpg(p.imgSignal);
    page.drawImage(img, { x: 0, y: 0, width: w, height: h });
    const ops = textLayerOps(p.words, p.dpi, h, {});
    const baked = bakeTextLayer(page, ops, font);
    out.push({ width: w, height: h, words: (p.words || []).length, baked });
  }
  return out;
}

// Overlay an invisible text layer onto matching pages of an existing doc.
export function overlaySearchLayer(doc, perPageWords, dpi, font) {
  if (!doc || typeof doc.getPageCount !== "function") throw new Error("bad doc");
  if (!font) throw new Error("missing font");
  const out = [];
  const n = Math.min(doc.getPageCount(), perPageWords.length);
  for (let i = 0; i < n; i++) {
    const page = doc.getPage(i);
    const h = page.getSize().height;
    const ops = textLayerOps(perPageWords[i], dpi, h, {});
    out.push({ page: i, baked: bakeTextLayer(page, ops, font) });
  }
  return out;
}

// Recall of expected words inside recognized text (gate metric T3).
export function wordRecall(expectedWords, actualText) {
  const norm = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, "");
  const hay = norm(actualText);
  let hit = 0;
  for (const w of expectedWords || []) {
    if (w && hay.includes(norm(w))) hit++;
  }
  const total = (expectedWords || []).length;
  return { hit, total, recall: total ? hit / total : 1 };
}
