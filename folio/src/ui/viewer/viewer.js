// Folio viewer: pdf.js read path (render + text map + search + thumbnails).
// Runs parse/render off-main via the vendored pdf.js worker.
import { itemsToLines, linesToParagraphs, readingOrder } from "../../core/textmap/extract.js";

let pdfjs = null;
let doc = null;
let scale = 1.5;
let pageNum = 1;
let textCache = new Map();

export async function initViewer(workerSrc) {
  pdfjs = await import("../../../vendor/pdf.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc = workerSrc || "vendor/pdf.worker.mjs";
  return !!pdfjs;
}

export async function openDocument(bytes) {
  textCache = new Map();
  const task = pdfjs.getDocument({ data: bytes.slice(0) });
  doc = await task.promise;
  pageNum = 1;
  return { pages: doc.numPages, fingerprint: doc.fingerprints ? doc.fingerprints[0] : "" };
}

export function pageCount() {
  return doc ? doc.numPages : 0;
}
export function currentPage() {
  return pageNum;
}
export function setZoom(s) {
  scale = Math.min(3, Math.max(0.5, s));
  return scale;
}
export function zoom() {
  return scale;
}

export async function renderPage(canvas, n) {
  if (!doc) throw new Error("no document open");
  pageNum = Math.min(doc.numPages, Math.max(1, n));
  const page = await doc.getPage(pageNum);
  const vp = page.getViewport({ scale });
  canvas.width = Math.floor(vp.width);
  canvas.height = Math.floor(vp.height);
  const ctx = canvas.getContext("2d");
  await page.render({ canvasContext: ctx, viewport: vp }).promise;
  return { page: pageNum, width: canvas.width, height: canvas.height };
}

export async function pageText(n) {
  if (!doc) throw new Error("no document open");
  if (textCache.has(n)) return textCache.get(n);
  const page = await doc.getPage(n);
  const tc = await page.getTextContent();
  const items = tc.items.map((it) => ({
    str: it.str,
    transform: it.transform,
    width: it.width,
    height: it.height,
    dir: it.dir,
    fontName: it.fontName,
  }));
  const lines = itemsToLines(items);
  const rec = { lines, paragraphs: linesToParagraphs(readingOrder(lines)), count: items.length };
  textCache.set(n, rec);
  return rec;
}

export async function searchAll(needle) {
  if (!doc || !needle) return [];
  const hits = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const t = await pageText(p);
    t.lines.forEach((l, i) => {
      if (l.text.toLowerCase().includes(needle.toLowerCase())) hits.push({ page: p, line: i, text: l.text });
    });
  }
  return hits;
}

export async function renderThumbnail(n) {
  if (!doc) throw new Error("no document open");
  const page = await doc.getPage(n);
  const vp = page.getViewport({ scale: 0.25 });
  const c = document.createElement("canvas");
  c.width = Math.floor(vp.width);
  c.height = Math.floor(vp.height);
  await page.render({ canvasContext: c.getContext("2d"), viewport: vp }).promise;
  return c.toDataURL();
}

export async function renderToDataUrl(n, dpi) {
  const page = await doc.getPage(n);
  const vp = page.getViewport({ scale: (dpi || 150) / 72 });
  const c = document.createElement("canvas");
  c.width = Math.floor(vp.width);
  c.height = Math.floor(vp.height);
  await page.render({ canvasContext: c.getContext("2d"), viewport: vp }).promise;
  return c.toDataURL("image/png");
}

// M3: grayscale raster for OCR (300 DPI print pixels, luminance only).
export async function renderPageGray(n, dpi, canvas) {
  if (!doc) throw new Error("no document open");
  const page = await doc.getPage(n);
  const vp = page.getViewport({ scale: (dpi || 300) / 72 });
  canvas.width = Math.floor(vp.width);
  canvas.height = Math.floor(vp.height);
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.filter = "grayscale(1)";
  await page.render({ canvasContext: ctx, viewport: vp }).promise;
  return canvas;
}
