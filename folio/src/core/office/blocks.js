// Folio M3 Office document model (pure, no DOM, no deps):
// mammoth-HTML -> blocks -> pdf-lib renderer, plus paragraphs -> .docx
// package writer and .docx text extractor (both over core/office/zip.js).
import { buildZip, parseZip } from "./zip.js";

const ENT = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };
export function decodeEntities(s) {
  return String(s).replace(/&(#\d+|#x[0-9a-fA-F]+|\w+);/g, (m, e) => {
    if (e[0] === "#") {
      const cp = e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(cp) ? String.fromCodePoint(cp) : m;
    }
    return ENT[e] !== undefined ? ENT[e] : m;
  });
}

// Tokenize a small HTML subset (what mammoth emits: h1-h6/p/ul/ol/li/
// table/tr/th/td/strong/em/b/i/a/br/div) into blocks:
// {t:'h',level,spans} {t:'p',spans} {t:'li',ordered,spans} {t:'table',rows:[[spans]]}
// spans: [{text,bold,italic}]. Unknown tags are unwrapped (text kept).
export function htmlToBlocks(html) {
  const tokens = String(html).split(/(<\/?[a-zA-Z][^>]*>)/g);
  const blocks = [];
  let cur = null; // {block, cellSpans?}
  let fmt = { bold: false, italic: false };
  const stack = [];
  let listMode = null; // 'ul' | 'ol'
  let inCell = false;

  function pushSpan(text) {
    text = decodeEntities(text);
    if (!text) return;
    const span = { text, bold: fmt.bold, italic: fmt.italic };
    if (inCell && cur && cur.cell) cur.cell.push(span);
    else if (cur) cur.spans.push(span);
    else {
      // stray text becomes its own paragraph
      if (text.trim()) blocks.push({ t: "p", spans: [span] });
    }
  }
  function openBlock(b) {
    closeBlock();
    cur = b;
  }
  function closeBlock() {
    if (cur) {
      const hasText = (cur.spans || []).some((s) => s.text.trim()) || (cur.rows || []).length;
      if (hasText || cur.t === "table") blocks.push(cur);
      cur = null;
    }
  }
  for (const tok of tokens) {
    if (!tok) continue;
    if (tok[0] !== "<") {
      pushSpan(tok);
      continue;
    }
    const m = /^<\/?([a-zA-Z][a-zA-Z0-9]*)[^>]*>$/.exec(tok);
    if (!m) {
      pushSpan(tok);
      continue;
    }
    const tag = m[1].toLowerCase();
    const closing = tok[1] === "/";
    if (tag === "br") {
      pushSpan("\n");
      continue;
    }
    if (tag === "strong" || tag === "b" || tag === "em" || tag === "i") {
      const key = tag === "strong" || tag === "b" ? "bold" : "italic";
      if (!closing) {
        stack.push({ ...fmt });
        fmt = { ...fmt, [key]: true };
      } else if (stack.length) {
        fmt = stack.pop();
      } else {
        fmt = { ...fmt, [key]: false };
      }
      continue;
    }
    if (/^h[1-6]$/.test(tag)) {
      if (!closing) openBlock({ t: "h", level: +tag[1], spans: [] });
      else closeBlock();
      continue;
    }
    if (tag === "p" || tag === "div") {
      if (!closing) openBlock({ t: "p", spans: [] });
      else closeBlock();
      continue;
    }
    if (tag === "ul" || tag === "ol") {
      if (!closing) listMode = tag;
      else {
        closeBlock();
        listMode = null;
      }
      continue;
    }
    if (tag === "li") {
      if (!closing) openBlock({ t: "li", ordered: listMode === "ol", spans: [] });
      else closeBlock();
      continue;
    }
    if (tag === "table") {
      if (!closing) openBlock({ t: "table", rows: [] });
      else closeBlock();
      continue;
    }
    if (tag === "tr") {
      if (!closing && cur && cur.t === "table") cur.rows.push([]);
      continue;
    }
    if (tag === "th" || tag === "td") {
      if (!closing && cur && cur.t === "table" && cur.rows.length) {
        cur.cell = [];
        cur.rows[cur.rows.length - 1].push(cur.cell);
        inCell = true;
        if (tag === "th") stack.push({ ...fmt }), (fmt = { ...fmt, bold: true });
      } else if (closing) {
        inCell = false;
        if (tag === "th" && stack.length) fmt = stack.pop();
      }
      continue;
    }
    // a, span, thead, tbody, etc: unwrap, keep text
  }
  closeBlock();
  return blocks;
}

function spanFont(span, fonts) {
  if (span.bold && span.italic) return fonts.bi;
  if (span.bold) return fonts.b;
  if (span.italic) return fonts.i;
  return fonts.r;
}

// Render blocks to a paginated pdf-lib document. Returns {pages, paras}.
// Word-wrap is measured with the real embedded fonts (no guessing).
export async function blocksToPdf(blocks, PDFLib, opts) {
  if (!Array.isArray(blocks) || !blocks.length) throw new Error("no blocks");
  const o = opts || {};
  const doc = await PDFLib.PDFDocument.create();
  const fr = await doc.embedFont(PDFLib.StandardFonts.Helvetica);
  const fb = await doc.embedFont(PDFLib.StandardFonts.HelveticaBold);
  const fi = await doc.embedFont(PDFLib.StandardFonts.HelveticaOblique);
  const fbi = await doc.embedFont(PDFLib.StandardFonts.HelveticaBoldOblique);
  const fonts = { r: fr, b: fb, i: fi, bi: fbi };
  const W = o.pageW || 595;
  const H = o.pageH || 842;
  const ML = o.margin || 56;
  const maxW = W - ML * 2;
  let page = doc.addPage([W, H]);
  let y = H - ML;
  let pages = 1;
  let paras = 0;

  function need(h) {
    if (y - h < ML) {
      page = doc.addPage([W, H]);
      y = H - ML;
      pages++;
    }
  }
  function drawWrapped(spans, size, indent) {
    // Greedy wrap across styled spans, measured per word.
    const words = [];
    for (const s of spans) {
      const f = spanFont(s, fonts);
      for (const part of String(s.text).split(/(\s+)/)) {
        if (!part) continue;
        words.push({ t: part, f, w: f.widthOfTextAtSize(part, size) });
      }
    }
    const space = fr.widthOfTextAtSize(" ", size);
    let x = ML + (indent || 0);
    const lim = ML + maxW;
    for (const wd of words) {
      if (/^\s+$/.test(wd.t) && x === ML + (indent || 0)) continue;
      const isSpace = /^\s+$/.test(wd.t);
      if (!isSpace && x + wd.w > lim) {
        y -= size * 1.35;
        need(size * 1.35);
        x = ML + (indent || 0);
        if (isSpace) continue;
      }
      if (!/^\n$/.test(wd.t)) {
        if (wd.t.includes("\n")) {
          for (const line of wd.t.split("\n")) {
            if (line) {
              page.drawText(line, { x, y, size, font: wd.f });
              x += wd.f.widthOfTextAtSize(line, size);
            }
            y -= size * 1.35;
            need(size * 1.35);
            x = ML + (indent || 0);
          }
          continue;
        }
        page.drawText(wd.t, { x, y, size, font: wd.f });
        x += isSpace ? space : wd.w;
      } else {
        y -= size * 1.35;
        need(size * 1.35);
        x = ML + (indent || 0);
      }
    }
    y -= size * 1.35;
  }
  let liNum = 0;
  for (const b of blocks) {
    if (b.t === "h") {
      const size = b.level <= 1 ? 20 : b.level === 2 ? 16 : 13;
      need(size * 2.2);
      y -= size * 0.4;
      drawWrapped(b.spans.length ? b.spans : [{ text: "", bold: true, italic: false }], size, 0);
      y -= 4;
      paras++;
    } else if (b.t === "li") {
      liNum = b.ordered ? liNum + 1 : 0;
      need(20);
      const bullet = b.ordered ? liNum + ". " : "- ";
      page.drawText(bullet, { x: ML, y, size: 11, font: fb });
      const bx = ML + fb.widthOfTextAtSize(bullet, 11);
      const saveY = y;
      void saveY;
      drawWrapped(b.spans, 11, bx - ML);
      paras++;
    } else if (b.t === "table") {
      drawTable(b.rows);
      paras++;
    } else {
      if (!b.spans.some((s) => s.text.trim())) continue;
      need(20);
      drawWrapped(b.spans, 11, 0);
      paras++;
    }
  }
  function drawTable(rows) {
    if (!rows.length) return;
    const cols = Math.max(...rows.map((r) => r.length));
    if (!cols) return;
    const colW = maxW / cols;
    const size = 10;
    const lh = size * 1.5;
    for (let ri = 0; ri < rows.length; ri++) {
      const row = rows[ri];
      // row height = max wrapped lines across cells
      let lines = 1;
      const cellLines = row.map((cell) => {
        const text = cell.map((s) => s.text).join("");
        const words = text.split(/\s+/).filter(Boolean);
        let n = 1;
        let cx = 0;
        for (const w of words) {
          const ww = fr.widthOfTextAtSize(w + " ", size);
          if (cx + ww > colW - 8) {
            n++;
            cx = 0;
          }
          cx += ww;
        }
        lines = Math.max(lines, n);
        return { text, words };
      });
      const rh = lines * lh + 6;
      need(rh);
      for (let ci = 0; ci < cols; ci++) {
        const cx = ML + ci * colW;
        if (ri === 0) page.drawRectangle({ x: cx, y: y - rh, width: colW, height: rh, color: PDFLib.rgb(0.9, 0.9, 0.9) });
        page.drawRectangle({ x: cx, y: y - rh, width: colW, height: rh, borderWidth: 0.7, borderColor: PDFLib.rgb(0.4, 0.4, 0.4) });
        const cell = cellLines[ci];
        if (cell) {
          let tx = cx + 4;
          let ty = y - 4 - size;
          let tmpX = 0;
          const f = ri === 0 ? fb : fr;
          for (const w of cell.words) {
            const ww = f.widthOfTextAtSize(w + " ", size);
            if (tmpX + ww > colW - 8) {
              ty -= lh;
              tmpX = 0;
              tx = cx + 4;
            }
            page.drawText(w, { x: tx, y: ty, size, font: f });
            tx += ww;
            tmpX += ww;
          }
        }
      }
      y -= rh;
    }
    y -= 8;
  }
  return { doc, bytes: await doc.save(), pages, paras };
}

const XML_ESC = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" };
function xesc(s) {
  return String(s).replace(/[&<>"]/g, (c) => XML_ESC[c]);
}

// paragraphs: [{text, heading (0-3), bold, italic} | string]. Valid OOXML.
export function parasToDocxXml(paragraphs) {
  const ps = (paragraphs || []).map((p) => {
    const q = typeof p === "string" ? { text: p } : p;
    const style = q.heading ? `<w:pStyle w:val="Heading${q.heading}"/>` : "";
    const runs = String(q.text == null ? "" : q.text)
      .split("\n")
      .map((line, i, arr) => {
        const b = q.bold ? "<w:b/>" : "";
        const it = q.italic ? "<w:i/>" : "";
        const rpr = b || it ? `<w:rPr>${b}${it}</w:rPr>` : "";
        const br = i < arr.length - 1 ? "<w:br/>" : "";
        return `<w:r>${rpr}<w:t xml:space="preserve">${xesc(line)}</w:t>${br}</w:r>`;
      })
      .join("");
    return `<w:p><w:pPr>${style}</w:pPr>${runs}</w:p>`;
  });
  return `<?xml version="1.0" encoding="UTF-8"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${ps.join("")}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/></w:sectPr></w:body></w:document>`;
}

export function tablesToDocxXml(tables) {
  // tables: [{rows: [[cellText]]}]; rendered as w:tbl grids.
  return (tables || []).map((t) => {
    const cols = Math.max(1, ...t.rows.map((r) => r.length));
    const grid = `<w:tblGrid>${"<w:gridCol/>".repeat(cols)}</w:tblGrid>`;
    const rows = t.rows
      .map(
        (r) =>
          `<w:tr>${Array.from({ length: cols }, (_, i) => `<w:tc><w:p><w:r><w:t xml:space="preserve">${xesc(r[i] == null ? "" : String(r[i]))}</w:t></w:r></w:p></w:tc>`).join("")}</w:tr>`
      )
      .join("");
    return `<w:tbl><w:tblPr><w:tblW w:w="0" w:type="auto"/></w:tblPr>${grid}${rows}</w:tbl>`;
  });
}

export function docxPackageXml(bodyXml) {
  return { contentTypes, relsRoot, relsDoc };
}

// Assemble a complete valid .docx from paragraphs + optional tables.
// paragraphs: [{text, heading, bold, italic} | string]; tables: [{rows}].
export function assembleDocx(paragraphs, tables) {
  const px = parasToDocxXml(paragraphs);
  const m = /<w:body>([\s\S]*)<w:sectPr>/.exec(px);
  const bodyInner = (m ? m[1] : "") + tablesToDocxXml(tables || []).join("");
  const documentXml = `<?xml version="1.0" encoding="UTF-8"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${bodyInner}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/></w:sectPr></w:body></w:document>`;
  return buildZip([
    { name: "[Content_Types].xml", data: contentTypes },
    { name: "_rels/.rels", data: relsRoot },
    { name: "word/_rels/document.xml.rels", data: relsDoc },
    { name: "word/document.xml", data: documentXml },
  ]);
}

// Extract paragraph texts from a .docx (inflate injected per platform).
export async function extractDocxText(docxBytes, inflate) {
  const files = await parseZip(docxBytes, inflate);
  const doc = files.find((f) => f.name === "word/document.xml");
  if (!doc) throw new Error("word/document.xml missing");
  const xml = new TextDecoder().decode(doc.data);
  const paras = [];
  for (const pm of xml.matchAll(/<w:p[\s>][\s\S]*?<\/w:p>/g)) {
    const texts = [...pm[0].matchAll(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g)].map((m) => decodeEntities(m[1]));
    if (texts.length) paras.push(texts.join(""));
  }
  return paras;
}

const contentTypes = `<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`;
const relsRoot = `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`;
const relsDoc = `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>`;
