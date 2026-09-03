// Folio convert executors (V2, V8-V11 core + V3 pack / V4 fallback Office-to-PDF):
// DOCX/XLSX/PPTX/CSV writers, CSV-to-PDF table renderer, URL import spec,
// plus the V3/V4 Office-to-PDF boundary. The pack engine module is injected
// (loaded consent-gated from packs/office-engine.js); null engine routes to
// the V4 core fallback with an honest fidelity banner.
import { toText, toMarkdown, toHtml } from "../../core/convert/writers.js";
import { toCsv } from "../../core/textmap/tables.js";
import { toDocx, toXlsx, toPptx, csvTableSpec, urlImportSpec } from "../../core/convert/office.js";
import { unzipAll } from "../../core/convert/zip-read.js";
import { extractOfficeFiles, officeToPdfPlan, fallbackBanner } from "../../core/convert/office-fallback.js";
import { routeOfficeConvert, packJobSpec } from "../../core/convert/office-pack.js";

export { toText, toMarkdown, toHtml, toCsv, csvTableSpec, urlImportSpec };
export { unzipAll, extractOfficeFiles, officeToPdfPlan, fallbackBanner, routeOfficeConvert, packJobSpec };

export function pdfToDocx(docTexts) {
  return toDocx(docTexts);
}

// Accepts pages->tables->rows->cells, or pages->rows->cells (single table
// per page), or bare tables. Normalizes defensively.
function normalizeTables(tablesPerPage) {
  const pages = Array.isArray(tablesPerPage) ? tablesPerPage : [];
  const tables = [];
  const isCellRow = (r) => Array.isArray(r) && r.every((c) => typeof c === "string");
  const isTable = (t) => Array.isArray(t) && t.length && isCellRow(t[0]);
  for (const p of pages) {
    if (isTable(p)) tables.push(p);
    else if (Array.isArray(p)) for (const t of p) if (isTable(t)) tables.push(t);
  }
  return tables;
}

export function pdfToXlsx(tablesPerPage) {
  const tables = normalizeTables(tablesPerPage);
  return toXlsx(tables.length ? tables : [[["(no tables detected)"]]]);
}

export function pdfToPptx(docTexts) {
  return toPptx(docTexts.length ? docTexts : [{ paragraphs: [{ text: "(empty)" }] }]);
}

export function pdfToCsv(tablesPerPage) {
  const parts = normalizeTables(tablesPerPage).map((t) => toCsv(t));
  return parts.join("\n\n") || "note\nno tables detected";
}

// V2: CSV text to a paginated table PDF via pdf-lib.
export async function csvToPdf(csvText, PDFLib) {
  const rows = csvText
    .split(/\r?\n/)
    .filter((l) => l.trim().length)
    .map((l) => parseCsvLine(l));
  if (!rows.length) throw new Error("CSV has no rows");
  const spec = csvTableSpec(rows, {});
  const doc = await PDFLib.PDFDocument.create();
  const font = await doc.embedFont(PDFLib.StandardFonts.Helvetica);
  const colW = 480 / spec.cols;
  for (const pageRows of spec.pages) {
    const pg = addA4Page(doc, PDFLib);
    let y = 800;
    for (const row of pageRows) {
      row.forEach((c, i) => pg.drawText(String(c).slice(0, 40), { x: 56 + i * colW, y, size: 9, font }));
      y -= 22;
    }
  }
  return { bytes: await doc.save(), spec };
}

function parseCsvLine(line) {
  const out = [];
  let cur = "";
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (q) {
      if (c === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else q = false;
      } else cur += c;
    } else if (c === '"') q = true;
    else if (c === ",") {
      out.push(cur);
      cur = "";
    } else cur += c;
  }
  out.push(cur);
  return out;
}

// ---- V3/V4 Office-to-PDF (Phase D) ----

// Normalize either model to render blocks:
// {style:'h1'|'h2'|'p'|'row'|'tableTitle'|'slideTitle', text}
function blocksFromExtracted(extracted) {
  const blocks = [];
  if (extracted.kind === "docx") {
    for (const p of extracted.paragraphs) {
      blocks.push({ style: p.heading === 1 ? "h1" : p.heading === 2 ? "h2" : "p", text: p.text });
    }
  } else if (extracted.kind === "xlsx") {
    extracted.tables.forEach((table, ti) => {
      blocks.push({ style: "tableTitle", text: "Table " + (ti + 1) });
      for (const row of table) blocks.push({ style: "row", text: row.map((c) => String(c).slice(0, 40)).join(" | ") });
    });
  } else if (extracted.kind === "pptx") {
    extracted.slides.forEach((s, i) => {
      blocks.push({ style: "slideTitle", text: (s.paragraphs[0] ? s.paragraphs[0].text : "Slide " + (i + 1)).slice(0, 120) });
      for (const p of s.paragraphs.slice(1)) blocks.push({ style: "p", text: p.text });
    });
  }
  return blocks;
}

function blocksFromPack(pack) {
  const blocks = [];
  if (pack.kind === "docx") {
    for (const s of pack.sections) {
      if (s.type === "table") {
        blocks.push({ style: "tableTitle", text: "Table (" + s.rows.length + " rows)" });
        for (const row of s.rows) blocks.push({ style: "row", text: row.map((c) => String(c).slice(0, 40)).join(" | "), bold: true });
      } else {
        blocks.push({ style: s.heading === 1 ? "h1" : s.heading === 2 ? "h2" : "p", text: s.text });
      }
    }
  } else if (pack.kind === "xlsx") {
    for (const sh of pack.sheets) {
      blocks.push({ style: "tableTitle", text: sh.name + (sh.header ? " (header row kept)" : "") });
      sh.rows.forEach((row, i) => blocks.push({ style: "row", text: row.map((c) => String(c).slice(0, 40)).join(" | "), bold: i === 0 && sh.header }));
    }
  } else if (pack.kind === "pptx") {
    pack.slides.forEach((s, i) => {
      blocks.push({ style: "slideTitle", text: (s.title || "Slide " + (i + 1)).slice(0, 120) });
      for (const b of s.body) blocks.push({ style: "p", text: b });
    });
  }
  return blocks;
}

const BLOCK_STYLE = {
  h1: { size: 18, gap: 26, bold: true },
  h2: { size: 14, gap: 22, bold: true },
  p: { size: 11, gap: 16, bold: false },
  row: { size: 9, gap: 14, bold: false },
  tableTitle: { size: 12, gap: 20, bold: true },
  slideTitle: { size: 20, gap: 30, bold: true },
};

// A4 page helper: addPage() with no args + setSize keeps the call working
// across JS realms (array literals fail pdf-lib's instanceof check under
// vm/node harnesses) and in every browser.
function addA4Page(doc, PDFLib) {
  const pg = doc.addPage();
  if (pg && typeof pg.setSize === "function") pg.setSize(595, 842);
  void PDFLib;
  return pg;
}

async function renderBlocksToPdf(blocks, PDFLib, { slidesAsPages } = {}) {
  const doc = await PDFLib.PDFDocument.create();
  const font = await doc.embedFont(PDFLib.StandardFonts.Helvetica);
  const bold = await doc.embedFont(PDFLib.StandardFonts.HelveticaBold);
  const groups = slidesAsPages ? blocks.reduce((acc, b) => {
    if (b.style === "slideTitle") acc.push([b]);
    else (acc[acc.length - 1] || acc.push([]) && acc[acc.length - 1]).push(b);
    return acc;
  }, []) : [blocks];
  let pages = 0;
  for (const group of groups) {
    let pg = addA4Page(doc, PDFLib);
    pages++;
    let y = 800;
    for (const b of group) {
      const st = BLOCK_STYLE[b.style] || BLOCK_STYLE.p;
      if (y < 70) {
        pg = addA4Page(doc, PDFLib);
        pages++;
        y = 800;
      }
      const lines = wrapLine(b.text || " ", 95);
      for (const line of lines) {
        if (y < 60) {
          pg = addA4Page(doc, PDFLib);
          pages++;
          y = 800;
        }
        pg.drawText(line, { x: 56, y, size: st.size, font: st.bold || b.bold ? bold : font });
        y -= st.gap * 0.72;
      }
      y -= 4;
    }
  }
  return { bytes: await doc.save(), pages };
}

function wrapLine(text, width) {
  const words = String(text).split(/\s+/).filter(Boolean);
  if (!words.length) return [""];
  const lines = [];
  let cur = "";
  for (const w of words) {
    if ((cur + " " + w).trim().length > width) {
      if (cur) lines.push(cur);
      cur = w;
    } else cur = (cur + " " + w).trim();
  }
  if (cur) lines.push(cur);
  return lines;
}

// Office file bytes -> PDF. engine: pack module (convertOfficeFiles) or null
// for the V4 fallback. inflater: async raw-deflate fn for real-world files;
// null works for store-only archives (our own writers, tests).
export async function officeToPdf(officeBytes, fileName, PDFLib, { engine, inflater } = {}) {
  if (!(officeBytes instanceof Uint8Array) || !officeBytes.length) throw new Error("officeToPdf needs office file bytes");
  const spec = packJobSpec({ fileName, byteLength: officeBytes.length });
  const files = await unzipAll(officeBytes, inflater);
  let mode, blocks, fidelityNote;
  if (engine && typeof engine.convertOfficeFiles === "function") {
    const pack = engine.convertOfficeFiles(files, fileName);
    mode = "pack";
    blocks = blocksFromPack(pack);
    fidelityNote = "Full-fidelity pack: headings, tables, and slide structure preserved.";
  } else {
    const extracted = extractOfficeFiles(files, fileName);
    officeToPdfPlan(extracted); // validates shape; throws on unknown kind
    mode = "fallback";
    blocks = blocksFromExtracted(extracted);
    fidelityNote = fallbackBanner(fileName, spec.kind).note;
  }
  if (!blocks.length) throw new Error("officeToPdf: no renderable content in " + fileName);
  const r = await renderBlocksToPdf(blocks, PDFLib, { slidesAsPages: spec.kind === "pptx" });
  return { bytes: r.bytes, pages: r.pages, mode, kind: spec.kind, banner: fidelityNote };
}
