// Folio convert executors (V2, V8-V11 core): DOCX/XLSX/PPTX/CSV writers,
// CSV-to-PDF table renderer, URL import spec. V3 full-fidelity Office pack
// arrives Phase D; these core writers are the honest fallback path.
import { toText, toMarkdown, toHtml } from "../../core/convert/writers.js";
import { toCsv } from "../../core/textmap/tables.js";
import { toDocx, toXlsx, toPptx, csvTableSpec, urlImportSpec } from "../../core/convert/office.js";

export { toText, toMarkdown, toHtml, toCsv, csvTableSpec, urlImportSpec };

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
    const pg = doc.addPage([595, 842]);
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
