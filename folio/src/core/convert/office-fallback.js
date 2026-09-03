// Folio Office V4 fallback (CORE): Mammoth-class DOCX, SheetJS-class XLSX
// grid, and PPTX-shape text extraction over a name->bytes file map (from
// zip-read). Honest scope: text + tables + reading order only; pagination
// approximate, complex styles simplified, images/shapes dropped. The V3
// full-fidelity renderer lives in OFFICE-PACK; this module is the
// always-available basic path behind the same consent card.
export const FALLBACK_FIDELITY_NOTE =
  "Basic version: pagination is approximate, complex styles are simplified, images and tracked changes are dropped. " +
  "Download the full-fidelity pack to preserve layout, tables, and images.";

export function fallbackBanner(fileName, kind) {
  return {
    mode: "fallback",
    file: fileName || "(file)",
    kind: kind || "office",
    changes: [
      "pagination approximate (re-laid for print-CSS/PDF, not original layout)",
      "complex styles simplified (fonts, spacing, themes reduced to headings + body)",
      "images, charts, and embedded objects dropped (text kept)",
      "tracked changes and comments dropped",
      "headers/footers kept as plain paragraphs",
    ],
    note: FALLBACK_FIDELITY_NOTE,
  };
}

const td = () => new TextDecoder();
function textOf(bytes) {
  return td().decode(bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes));
}
function unesc(s) {
  return s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&");
}

// DOCX: split <w:p> blocks; heading when <w:pStyle w:val="HeadingN">.
export function extractDocxParagraphs(files) {
  const raw = files["word/document.xml"];
  if (!raw) throw new Error("not a DOCX: word/document.xml missing");
  const xml = textOf(raw);
  const paras = [];
  const pRe = /<w:p[\s>][\s\S]*?<\/w:p>/g;
  let m;
  while ((m = pRe.exec(xml))) {
    const block = m[0];
    const style = /w:val="Heading([12])"/.exec(block);
    const runs = [];
    const tRe = /<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g;
    let t;
    while ((t = tRe.exec(block))) runs.push(unesc(t[1]));
    const text = runs.join("").replace(/\s+$/g, "");
    if (!text.trim() && !style) continue;
    paras.push({ text, heading: style ? parseInt(style[1], 10) : 0 });
  }
  if (!paras.length) throw new Error("DOCX has no readable paragraphs");
  return paras;
}

// XLSX: shared strings + per-sheet rows. Cells with t="s" index shared
// strings; t="inlineStr" carry <t>; bare <v> kept as numbers.
export function extractXlsxTables(files) {
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
  const tables = [];
  const sheetNames = Object.keys(files).filter((n) => /^xl\/worksheets\/sheet\d+\.xml$/.test(n)).sort();
  if (!sheetNames.length) throw new Error("not an XLSX: no worksheets found");
  for (const name of sheetNames) {
    const xml = textOf(files[name]);
    const rows = [];
    const rowRe = /<row[^>]*>([\s\S]*?)<\/row>/g;
    let rm;
    while ((rm = rowRe.exec(xml))) {
      const cells = [];
      const cRe = /<c(\s[^>]*)?>([\s\S]*?)<\/c>/g;
      let cm;
      while ((cm = cRe.exec(rm[1]))) {
        const attrs = cm[1] || "";
        const tm = /t="([^"]*)"/.exec(attrs);
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
    tables.push(rows.length ? rows : [["(empty sheet)"]]);
  }
  return tables;
}

// PPTX: per-slide <a:t> text runs; first run is the title-ish line.
export function extractPptxSlides(files) {
  const slideNames = Object.keys(files).filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n)).sort(
    (a, b) => parseInt(a.match(/slide(\d+)/)[1], 10) - parseInt(b.match(/slide(\d+)/)[1], 10)
  );
  if (!slideNames.length) throw new Error("not a PPTX: no slides found");
  return slideNames.map((name) => {
    const xml = textOf(files[name]);
    const texts = [];
    const tRe = /<a:t>([\s\S]*?)<\/a:t>/g;
    let m;
    while ((m = tRe.exec(xml))) {
      const t = unesc(m[1]).trim();
      if (t) texts.push(t);
    }
    return { paragraphs: texts.map((t) => ({ text: t })) };
  });
}

// Dispatch by extension over the file map.
export function extractOfficeFiles(files, fileName) {
  const lower = String(fileName || "").toLowerCase();
  if (lower.endsWith(".docx")) return { kind: "docx", paragraphs: extractDocxParagraphs(files) };
  if (lower.endsWith(".xlsx")) return { kind: "xlsx", tables: extractXlsxTables(files) };
  if (lower.endsWith(".pptx")) return { kind: "pptx", slides: extractPptxSlides(files) };
  throw new Error("unsupported Office file (need .docx/.xlsx/.pptx): " + fileName);
}

// Paginated plan for rendering extracted content to PDF (V2 table spec reuse).
export function officeToPdfPlan(extracted, { rowsPerPage } = {}) {
  if (!extracted || !extracted.kind) throw new Error("officeToPdfPlan needs extracted {kind}");
  const rpp = rowsPerPage || 40;
  if (extracted.kind === "docx") {
    const pages = [];
    for (let i = 0; i < extracted.paragraphs.length; i += rpp) pages.push(extracted.paragraphs.slice(i, i + rpp));
    return { kind: "docx", pages, pageCount: pages.length };
  }
  if (extracted.kind === "xlsx") {
    const pages = [];
    for (const table of extracted.tables) for (let i = 0; i < table.length; i += rpp) pages.push({ table: table.slice(i, i + rpp) });
    return { kind: "xlsx", pages, pageCount: pages.length };
  }
  if (extracted.kind === "pptx") {
    return { kind: "pptx", pages: extracted.slides, pageCount: extracted.slides.length };
  }
  throw new Error("unknown extracted kind: " + extracted.kind);
}
