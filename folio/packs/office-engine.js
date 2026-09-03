// Folio OFFICE-PACK engine shim (V3 full fidelity, same-origin, consent-gated).
// This is the pack side of the office-pack boundary: it preserves document
// structure the V4 core fallback drops - DOCX tables + bold/italic runs,
// XLSX sheet names + header rows, PPTX title/body separation - and emits a
// print-CSS HTML intermediate plus a structured section model for PDF
// rendering. Dependency-free, DOM-free (Node-importable for verification).
export const OFFICE_ENGINE_VERSION = "0.2.0";
export const OFFICE_ENGINE_FIDELITY = "full";

function unesc(s) {
  return String(s).replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&");
}
function escHtml(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function textOf(bytes) {
  return new TextDecoder().decode(bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes));
}

// ---- DOCX full parse: paragraphs with bold/italic, plus tables ----
function parseDocxRuns(block) {
  const runs = [];
  const rRe = /<w:r[\s>]([\s\S]*?)<\/w:r>/g;
  let m;
  while ((m = rRe.exec(block))) {
    const r = m[1];
    const ts = [];
    const tRe = /<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g;
    let t;
    while ((t = tRe.exec(r))) ts.push(unesc(t[1]));
    if (!ts.length) continue;
    runs.push({ text: ts.join(""), bold: /<w:b[\s/>]/.test(r), italic: /<w:i[\s/>]/.test(r) });
  }
  return runs;
}

function parseDocxDocument(xml) {
  const sections = [];
  const body = /<w:body>([\s\S]*)<\/w:body>/.exec(xml);
  const src = body ? body[1] : xml;
  const tokRe = /<w:tbl[\s>][\s\S]*?<\/w:tbl>|<w:p[\s>][\s\S]*?<\/w:p>/g;
  let m;
  while ((m = tokRe.exec(src))) {
    const tok = m[0];
    if (tok.startsWith("<w:tbl")) {
      const rows = [];
      const trRe = /<w:tr[\s>][\s\S]*?<\/w:tr>/g;
      let tr;
      while ((tr = trRe.exec(tok))) {
        const cells = [];
        const tcRe = /<w:tc[\s>][\s\S]*?<\/w:tc>/g;
        let tc;
        while ((tc = tcRe.exec(tr[0]))) {
          cells.push(parseDocxRuns(tc[0]).map((r) => r.text).join("").trim());
        }
        if (cells.length) rows.push(cells);
      }
      if (rows.length) sections.push({ type: "table", rows });
    } else {
      const style = /w:val="Heading([12])"/.exec(tok);
      const runs = parseDocxRuns(tok);
      const text = runs.map((r) => r.text).join("").replace(/\s+$/g, "");
      if (!text.trim() && !style) continue;
      sections.push({ type: "para", text, heading: style ? parseInt(style[1], 10) : 0, runs });
    }
  }
  if (!sections.length) throw new Error("office-engine: DOCX has no readable content");
  return sections;
}

// ---- XLSX full parse: sheet names + shared strings + header-row flag ----
function parseXlsxWorkbook(files) {
  const names = [];
  const wbRaw = files["xl/workbook.xml"];
  if (wbRaw) {
    const xml = textOf(wbRaw);
    const sRe = /<sheet[^>]*name="([^"]*)"/g;
    let m;
    while ((m = sRe.exec(xml))) names.push(unesc(m[1]));
  }
  return names;
}

function parseXlsxSheet(xml, shared) {
  const rows = [];
  const rowRe = /<row[^>]*>([\s\S]*?)<\/row>/g;
  let rm;
  while ((rm = rowRe.exec(xml))) {
    const cells = [];
    const cRe = /<c(\s[^>]*)?>([\s\S]*?)<\/c>/g;
    let cm;
    while ((cm = cRe.exec(rm[1]))) {
      const tm = /t="([^"]*)"/.exec(cm[1] || "");
      const kind = tm ? tm[1] : "";
      const inner = cm[2];
      if (kind === "s") {
        const v = /<v>(-?\d+)<\/v>/.exec(inner);
        cells.push(v && shared[parseInt(v[1], 10)] !== undefined ? shared[parseInt(v[1], 10)] : "");
      } else if (kind === "inlineStr") {
        const t = /<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/.exec(inner);
        cells.push(t ? unesc(t[1]) : "");
      } else {
        const v = /<v>([\s\S]*?)<\/v>/.exec(inner);
        cells.push(v ? unesc(v[1]) : "");
      }
    }
    if (cells.length && cells.some((c) => String(c).trim() !== "")) rows.push(cells);
  }
  return rows;
}

// ---- PPTX full parse: title (first text) vs body per slide ----
function parsePptxSlide(xml) {
  const texts = [];
  const tRe = /<a:t>([\s\S]*?)<\/a:t>/g;
  let m;
  while ((m = tRe.exec(xml))) {
    const t = unesc(m[1]).trim();
    if (t) texts.push(t);
  }
  return { title: texts[0] || "", body: texts.slice(1) };
}

// Main entry: files is name->bytes map (from zip-read unzipAll).
export function convertOfficeFiles(files, fileName) {
  const lower = String(fileName || "").toLowerCase();
  if (lower.endsWith(".docx")) {
    const raw = files["word/document.xml"];
    if (!raw) throw new Error("office-engine: not a DOCX (word/document.xml missing)");
    const sections = parseDocxDocument(textOf(raw));
    return { kind: "docx", fidelity: OFFICE_ENGINE_FIDELITY, sections, html: docxSectionsHtml(sections, fileName) };
  }
  if (lower.endsWith(".xlsx")) {
    const sheetNames = parseXlsxWorkbook(files);
    const sstRaw = files["xl/sharedStrings.xml"];
    const shared = [];
    if (sstRaw) {
      const xml = textOf(sstRaw);
      const siRe = /<si>([\s\S]*?)<\/si>/g;
      let m;
      while ((m = siRe.exec(xml))) {
        const ts = [];
        const tRe = /<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g;
        let t;
        while ((t = tRe.exec(m[1]))) ts.push(unesc(t[1]));
        shared.push(ts.join(""));
      }
    }
    const sheetFiles = Object.keys(files).filter((n) => /^xl\/worksheets\/sheet\d+\.xml$/.test(n)).sort();
    if (!sheetFiles.length) throw new Error("office-engine: no worksheets found");
    const sheets = sheetFiles.map((name, i) => {
      const rows = parseXlsxSheet(textOf(files[name]), shared);
      return { name: sheetNames[i] || ("Sheet" + (i + 1)), rows: rows.length ? rows : [["(empty sheet)"]], header: rows.length > 1 };
    });
    return { kind: "xlsx", fidelity: OFFICE_ENGINE_FIDELITY, sheets, html: xlsxSheetsHtml(sheets, fileName) };
  }
  if (lower.endsWith(".pptx")) {
    const slideFiles = Object.keys(files).filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n)).sort(
      (a, b) => parseInt(a.match(/slide(\d+)/)[1], 10) - parseInt(b.match(/slide(\d+)/)[1], 10)
    );
    if (!slideFiles.length) throw new Error("office-engine: no slides found");
    const slides = slideFiles.map((name) => parsePptxSlide(textOf(files[name])));
    return { kind: "pptx", fidelity: OFFICE_ENGINE_FIDELITY, slides, html: pptxSlidesHtml(slides, fileName) };
  }
  throw new Error("office-engine: unsupported file (need .docx/.xlsx/.pptx): " + fileName);
}

function docxSectionsHtml(sections, title) {
  const parts = sections.map((s) => {
    if (s.type === "table") {
      const rows = s.rows.map((r) => "<tr>" + r.map((c) => "<td>" + escHtml(c) + "</td>").join("") + "</tr>").join("");
      return '<table border="1" cellspacing="0" cellpadding="4">' + rows + "</table>";
    }
    const inner = (s.runs || [{ text: s.text }]).map((r) => {
      let t = escHtml(r.text);
      if (r.bold) t = "<strong>" + t + "</strong>";
      if (r.italic) t = "<em>" + t + "</em>";
      return t;
    }).join("");
    if (s.heading === 1) return "<h1>" + inner + "</h1>";
    if (s.heading === 2) return "<h2>" + inner + "</h2>";
    return "<p>" + inner + "</p>";
  });
  return officePage("Converted: " + title, parts.join("\n"));
}

function xlsxSheetsHtml(sheets, title) {
  const parts = sheets.map((sh) => {
    const rows = sh.rows.map((r, i) => "<tr>" + r.map((c) => (i === 0 && sh.header ? "<th>" + escHtml(c) + "</th>" : "<td>" + escHtml(c) + "</td>")).join("") + "</tr>").join("");
    return "<h2>" + escHtml(sh.name) + "</h2>" + '<table border="1" cellspacing="0" cellpadding="4">' + rows + "</table>";
  });
  return officePage("Converted: " + title, parts.join("\n"));
}

function pptxSlidesHtml(slides, title) {
  const parts = slides.map((s, i) => "<section><h1>" + escHtml(s.title || "Slide " + (i + 1)) + "</h1>" + s.body.map((b) => "<p>" + escHtml(b) + "</p>").join("") + "</section>");
  return officePage("Converted: " + title, parts.join("\n"));
}

function officePage(title, body) {
  return "<!DOCTYPE html><html><head><meta charset=\"utf-8\"><title>" + escHtml(title) + "</title>" +
    "<style>body{font-family:serif;max-width:45em;margin:2em auto;line-height:1.5}table{border-collapse:collapse;margin:1em 0}h1{font-size:1.5em}h2{font-size:1.2em}section{page-break-after:always}</style>" +
    "</head><body>" + body + "</body></html>";
}
