// Folio M3 OCR executors (browser): consent-gated on-demand pack loader
// (same-origin, Cache Storage, progress + cancel) plus Tesseract worker
// boot, pdf.js page rasterizer, and searchable-PDF assembly.
// Pure geometry/text-layer math lives in core/ocr/ocr.js.
import { OCR_CACHE_NAME, OCR_PACK_MANIFEST, formatBytes, searchablePdfFromImages, overlaySearchLayer } from "../../core/ocr/ocr.js";

export { formatBytes, OCR_CACHE_NAME };

async function readJson(url) {
  const r = await fetch(url, { cache: "no-cache" });
  if (!r.ok) throw new Error("pack manifest missing (" + r.status + ")");
  return r.json();
}

// Consent data for the UI card: real byte total from the manifest plus
// whether every pack file is already cached on this device.
export async function ocrPackStatus() {
  const manifest = await readJson(OCR_PACK_MANIFEST);
  const cache = await caches.open(OCR_CACHE_NAME);
  let cachedBytes = 0;
  for (const f of manifest.files) {
    const hit = await cache.match(OCR_PACK_MANIFEST.replace("pack.json", "") + f);
    if (hit) cachedBytes += +(hit.headers.get("x-folio-bytes") || 0);
  }
  return { manifest, cached: cachedBytes >= manifest.totalBytes && manifest.totalBytes > 0, cachedBytes };
}

// Download the pack with progress + cancel, storing every file in Cache
// Storage for offline reuse. onProgress({loaded, total, file}).
export async function ensureOcrPack(onProgress, signal) {
  const manifest = await readJson(OCR_PACK_MANIFEST);
  const base = OCR_PACK_MANIFEST.replace("pack.json", "");
  const cache = await caches.open(OCR_CACHE_NAME);
  let loaded = 0;
  const total = manifest.totalBytes;
  for (const f of manifest.files) {
    const url = base + f;
    if (await cache.match(url)) {
      const head = await cache.match(url);
      loaded += +(head.headers.get("x-folio-bytes") || 0);
      if (onProgress) onProgress({ loaded, total, file: f });
      continue;
    }
    if (signal && signal.aborted) throw new Error("pack download cancelled");
    const r = await fetch(url, { signal });
    if (!r.ok) throw new Error("pack file failed: " + f + " (" + r.status + ")");
    const len = +(r.headers.get("content-length") || 0);
    const reader = r.body.getReader();
    const chunks = [];
    let got = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      got += value.length;
      if (onProgress) onProgress({ loaded: loaded + got, total, file: f });
      if (signal && signal.aborted) {
        try {
          await reader.cancel();
        } catch { /* already torn down */ }
        throw new Error("pack download cancelled");
      }
    }
    const blob = new Blob(chunks);
    const headers = new Headers({ "x-folio-bytes": String(len || blob.size), "content-length": String(blob.size) });
    await cache.put(url, new Response(blob, { headers }));
    loaded += len || blob.size;
  }
  if (onProgress) onProgress({ loaded: total, total, file: "done" });
  return manifest;
}

export function ocrUrls() {
  // Absolute URLs anchored at this module: the worker internally resolves
  // corePath against the worker script URL, so page-relative paths would
  // double up (…/ocr/packs/ocr/…) and 404. import.meta keeps this correct
  // under any hosting base path.
  const abs = (p) => new URL(p, import.meta.url).href;
  return { workerPath: abs("../../../packs/ocr/worker.min.js"), corePath: abs("../../../packs/ocr/tesseract-core-lstm.wasm.js"), langPath: abs("../../../packs/ocr/lang"), esm: abs("../../../packs/ocr/tesseract.esm.min.js") };
}

// Boot a Tesseract worker against the vendored same-origin pack.
export async function bootOcrWorker(onLog) {
  const u = ocrUrls();
  const T = (await import(u.esm)).default;
  const worker = await T.createWorker("eng", T.OEM.LSTM, {
    workerPath: u.workerPath,
    corePath: u.corePath,
    langPath: u.langPath,
    logger: onLog || (() => {}),
  });
  return { worker, T };
}

// Render a pdf.js page to a grayscale canvas at the requested DPI.
export function renderPageGray(pdfJsPage, dpi, canvas) {
  const viewport = pdfJsPage.getViewport({ scale: dpi / 72 });
  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.filter = "grayscale(1)";
  return pdfJsPage.render({ canvasContext: ctx, viewport }).promise.then(() => canvas);
}

export function canvasJpeg(canvas, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("jpeg encode failed"))), "image/jpeg", quality || 0.92);
  });
}

export async function blobBytes(blob) {
  return new Uint8Array(await blob.arrayBuffer());
}

// Recognize one image (data URL, blob URL, or canvas) -> word list.
export async function recognizeImage(worker, image, opts) {
  const r = await worker.recognize(image, opts || {});
  return (r.data.words || []).map((w) => ({ text: w.text, confidence: w.confidence, bbox: { ...w.bbox } }));
}

// Full page: rasterize at dpi, OCR, return image + words for assembly.
export async function ocrPdfPage(pdfJsPage, worker, dpi, canvas, onStage) {
  if (onStage) onStage("render");
  await renderPageGray(pdfJsPage, dpi, canvas);
  const blob = await canvasJpeg(canvas);
  const dataUrl = await new Promise((resolve) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result);
    fr.readAsDataURL(blob);
  });
  if (onStage) onStage("recognize");
  const words = await recognizeImage(worker, dataUrl, {});
  const mean = words.length ? words.reduce((a, w) => a + (w.confidence || 0), 0) / words.length : 0;
  return { imgBytes: await blobBytes(blob), words, wPx: canvas.width, hPx: canvas.height, dpi, meanConf: mean };
}

export async function assembleSearchablePdf(pages, PDFLib) {
  const doc = await PDFLib.PDFDocument.create();
  const font = await doc.embedFont(PDFLib.StandardFonts.Helvetica);
  const sigs = pages.map((p) => ({ imgSignal: p.imgBytes, embed: "jpg", words: p.words, wPx: p.wPx, hPx: p.hPx, dpi: p.dpi }));
  const summary = await searchablePdfFromImages(doc, sigs, font);
  return { bytes: await doc.save(), summary };
}

export async function overlayPdfSearchLayer(pdfBytes, perPage, dpi, PDFLib) {
  const doc = await PDFLib.PDFDocument.load(pdfBytes);
  const font = await doc.embedFont(PDFLib.StandardFonts.Helvetica);
  const summary = overlaySearchLayer(doc, perPage, dpi, font);
  return { bytes: await doc.save(), summary };
}
