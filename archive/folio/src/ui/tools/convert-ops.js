// Folio convert executors (M1 scope): PDF to text/markdown/HTML (real,
// via the text map) and CSV text to a paginated table PDF (real pdf-lib
// renderer). Purged as facades: PDF-to-Office writers (minimal template
// dumps, not faithful conversion), Office-to-PDF fallback/pack rendering
// (plain-text block reflow that drops tables, styles, and layout), and the
// URL-import spec button (displayed text, ran nothing). Office returns in
// M3 with verified parsing; until then no Office buttons exist.
import { toText, toMarkdown, toHtml } from "../../core/convert/writers.js";
import { toCsv, csvTableSpec } from "../../core/textmap/tables.js";

export { toText, toMarkdown, toHtml, toCsv, csvTableSpec };

// A4 page helper: addPage() with no args + setSize keeps the call working
// across JS realms (array literals fail pdf-lib's instanceof check under
// vm/node harnesses) and in every browser.
function addA4Page(doc, PDFLib) {
  const pg = doc.addPage();
  if (pg && typeof pg.setSize === "function") pg.setSize(595, 842);
  void PDFLib;
  return pg;
}

// CSV text to a paginated table PDF via pdf-lib.
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
