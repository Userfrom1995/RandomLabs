// Folio M3 Office executors (browser): consent-gated on-demand office
// pack (vendored mammoth + SheetJS, same-origin, cached) plus converters:
// docx/xlsx -> PDF (real parse -> measured pdf-lib layout) and
// PDF -> docx/xlsx (text-map paragraphs/tables -> valid OOXML).
// Pure model/layout code lives in core/office/{blocks,sheets,zip}.js.
import { htmlToBlocks, blocksToPdf, assembleDocx } from "../../core/office/blocks.js";
import { normGrid, gridToPdf } from "../../core/office/sheets.js";

export const OFFICE_CACHE_NAME = "folio-pack-office-v1";
export const OFFICE_PACK_MANIFEST = "packs/office/pack.json";

async function readJson(url) {
  const r = await fetch(url, { cache: "no-cache" });
  if (!r.ok) throw new Error("pack manifest missing (" + r.status + ")");
  return r.json();
}

export async function officePackStatus() {
  const manifest = await readJson(OFFICE_PACK_MANIFEST);
  const cache = await caches.open(OFFICE_CACHE_NAME);
  let cachedBytes = 0;
  for (const f of manifest.files) {
    const hit = await cache.match(OFFICE_PACK_MANIFEST.replace("pack.json", "") + f);
    if (hit) cachedBytes += +(hit.headers.get("x-folio-bytes") || 0);
  }
  return { manifest, cached: cachedBytes >= manifest.totalBytes && manifest.totalBytes > 0, cachedBytes };
}

export async function ensureOfficePack(onProgress, signal) {
  const manifest = await readJson(OFFICE_PACK_MANIFEST);
  const base = OFFICE_PACK_MANIFEST.replace("pack.json", "");
  const cache = await caches.open(OFFICE_CACHE_NAME);
  let loaded = 0;
  const total = manifest.totalBytes;
  for (const f of manifest.files) {
    const url = base + f;
    if (await cache.match(url)) {
      loaded += +( (await cache.match(url)).headers.get("x-folio-bytes") || 0);
      if (onProgress) onProgress({ loaded, total, file: f });
      continue;
    }
    if (signal && signal.aborted) throw new Error("pack download cancelled");
    const r = await fetch(url, { signal });
    if (!r.ok) throw new Error("pack file failed: " + f + " (" + r.status + ")");
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
        } catch { /* torn down */ }
        throw new Error("pack download cancelled");
      }
    }
    const blob = new Blob(chunks, { type: "application/javascript" });
    await cache.put(url, new Response(blob, { headers: { "x-folio-bytes": String(blob.size), "content-length": String(blob.size) } }));
    loaded += blob.size;
  }
  if (onProgress) onProgress({ loaded: total, total, file: "done" });
  // Execute the cached scripts in order (mammoth, then SheetJS) so the
  // globals exist exactly once per session.
  if (!window.mammoth) await injectPackScript(base + manifest.files[0]);
  if (!window.XLSX) await injectPackScript(base + manifest.files[1]);
  return manifest;
}

async function injectPackScript(url) {
  const hit = await caches.open(OFFICE_CACHE_NAME).then((c) => c.match(url));
  const blob = hit ? await hit.blob() : await (await fetch(url)).blob();
  const objUrl = URL.createObjectURL(blob);
  try {
    await new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = objUrl;
      s.onload = resolve;
      s.onerror = () => reject(new Error("pack script failed: " + url));
      document.head.appendChild(s);
    });
  } finally {
    URL.revokeObjectURL(objUrl);
  }
}

// Real .docx parse (vendored mammoth) -> block model -> measured PDF.
export async function docxToPdf(arrayBuffer, PDFLib) {
  if (!window.mammoth) throw new Error("office pack not loaded");
  const { value: html } = await window.mammoth.convertToHtml({ arrayBuffer });
  if (!html || !html.trim()) throw new Error("no readable content in document");
  const blocks = htmlToBlocks(html);
  if (!blocks.length) throw new Error("no convertible blocks in document");
  const r = await blocksToPdf(blocks, PDFLib, {});
  return { bytes: r.bytes, pages: r.pages, paras: r.paras, blocks: blocks.length };
}

// Real .xlsx parse (vendored SheetJS): every non-empty sheet becomes a
// titled table section in one PDF.
export async function xlsxToPdf(arrayBuffer, PDFLib) {
  if (!window.XLSX) throw new Error("office pack not loaded");
  const wb = window.XLSX.read(arrayBuffer, { type: "array" });
  if (!wb.SheetNames.length) throw new Error("workbook has no sheets");
  const sections = [];
  for (const name of wb.SheetNames) {
    const aoa = window.XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, raw: true });
    const grid = normGrid(aoa);
    if (grid.length && grid[0].length) sections.push({ title: name, grid });
  }
  if (!sections.length) throw new Error("no readable sheets in workbook");
  // Render each sheet as its own ruled table, concatenated into one doc.
  const docs = [];
  let pages = 0;
  for (const s of sections) {
    const r = await gridToPdf(s.grid, PDFLib, { title: s.title });
    docs.push(r.bytes);
    pages += r.pages;
  }
  const merged = await PDFLib.PDFDocument.create();
  for (const bytes of docs) {
    const d = await PDFLib.PDFDocument.load(bytes);
    const idx = await merged.copyPages(d, d.getPageIndices());
    idx.forEach((p) => merged.addPage(p));
  }
  return { bytes: await merged.save(), pages, sheets: sections.length };
}

// PDF text-map paragraphs -> valid .docx download.
export function pdfParasToDocx(paragraphs) {
  const paras = (paragraphs || []).map((p) => (typeof p === "string" ? { text: p } : { text: p.text, heading: 0 }));
  if (!paras.length || !paras.some((p) => p.text.trim())) throw new Error("no text to export");
  return { bytes: assembleDocx(paras, []), paras: paras.length };
}

// Rows (arrays of cell strings) -> valid .xlsx download via SheetJS.
export function rowsToXlsx(rows) {
  if (!window.XLSX) throw new Error("office pack not loaded");
  if (!rows || !rows.length) throw new Error("no rows to export");
  const ws = window.XLSX.utils.aoa_to_sheet(rows);
  const wb = window.XLSX.utils.book_new();
  window.XLSX.utils.book_append_sheet(wb, ws, "Folio");
  const raw = window.XLSX.write(wb, { type: "array", bookType: "xlsx" });
  const bytes = raw instanceof Uint8Array ? raw : new Uint8Array(raw);
  return { bytes, rows: rows.length };
}
