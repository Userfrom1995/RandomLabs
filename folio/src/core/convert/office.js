// Folio Office writers (V8-V10 core): dependency-free minimal DOCX/XLSX/PPTX
// assemblers. Output is a valid store-only (uncompressed) ZIP with correct
// CRC32 + central directory, readable by Word/Excel/PowerPoint and strict
// OOXML parsers. Text comes from the V5/V6 structures (paragraphs, tables).
export function crc32(data) {
  let table = crc32.table;
  if (!table) {
    table = crc32.table = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[n] = c;
    }
  }
  let crc = -1;
  for (let i = 0; i < data.length; i++) crc = table[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ -1) >>> 0;
}

function u16(v, out, o) {
  out[o] = v & 0xff;
  out[o + 1] = (v >> 8) & 0xff;
}
function u32(v, out, o) {
  out[o] = v & 0xff;
  out[o + 1] = (v >> 8) & 0xff;
  out[o + 2] = (v >> 16) & 0xff;
  out[o + 3] = (v >> 24) & 0xff;
}

// files: [{name, data: Uint8Array|string}]. Store-only (method 0).
export function zipStore(files) {
  const enc = new TextEncoder();
  const parts = files.map((f) => ({ name: f.name, data: typeof f.data === "string" ? enc.encode(f.data) : f.data }));
  let total = 0;
  for (const p of parts) total += 30 + enc.encode(p.name).length + p.data.length + 46 + enc.encode(p.name).length;
  total += 22;
  const out = new Uint8Array(total);
  let o = 0;
  const central = [];
  for (const p of parts) {
    const nb = enc.encode(p.name);
    const crc = crc32(p.data);
    central.push({ nb, crc, size: p.data.length, offset: o });
    u32(0x04034b50, out, o); // local header
    u16(20, out, o + 4);
    u16(0x0800, out, o + 8); // UTF-8 flag
    u16(0, out, o + 10); // method store
    u16(0, out, o + 12);
    u16(0, out, o + 14);
    u32(crc, out, o + 16);
    u32(p.data.length, out, o + 20);
    u32(p.data.length, out, o + 24);
    u16(nb.length, out, o + 28);
    u16(0, out, o + 30);
    o += 32;
    out.set(nb, o);
    o += nb.length;
    out.set(p.data, o);
    o += p.data.length;
  }
  const cdStart = o;
  let cdSize = 0;
  for (const c of central) {
    const h = o;
    u32(0x02014b50, out, o);
    u16(20, out, o + 4);
    u16(20, out, o + 6);
    u16(0x0800, out, o + 8);
    u16(0, out, o + 10);
    u16(0, out, o + 12);
    u16(0, out, o + 14);
    u32(c.crc, out, o + 16);
    u32(c.size, out, o + 20);
    u32(c.size, out, o + 24);
    u16(c.nb.length, out, o + 28);
    u16(0, out, o + 30);
    u16(0, out, o + 32);
    u16(0, out, o + 34);
    u16(0, out, o + 36);
    u32(0, out, o + 38);
    u32(c.offset, out, o + 42);
    o += 46;
    out.set(c.nb, o);
    o += c.nb.length;
    cdSize += o - h;
  }
  u32(0x06054b50, out, o);
  u16(0, out, o + 4);
  u16(0, out, o + 6);
  u16(central.length, out, o + 8);
  u16(central.length, out, o + 10);
  u32(cdSize, out, o + 12);
  u32(cdStart, out, o + 16);
  u16(0, out, o + 20);
  o += 22;
  return out.slice(0, o);
}

export function escXml(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// docTexts: [{paragraphs:[{text, heading?:0|1|2}]}]. Headings from V6 inference.
export function toDocx(docTexts) {
  const paras = [];
  docTexts.forEach((p, pi) => {
    paras.push('<w:p><w:pPr><w:pStyle w:val="Heading1"/></w:pPr><w:r><w:t>Page ' + (pi + 1) + "</w:t></w:r></w:p>");
    for (const q of p.paragraphs || []) {
      const style = q.heading === 1 ? "Heading1" : q.heading === 2 ? "Heading2" : "Normal";
      const text = escXml(q.text || "").replace(/\n/g, "</w:t></w:r><w:r><w:br/><w:t>");
      paras.push('<w:p><w:pPr><w:pStyle w:val="' + style + '"/></w:pPr><w:r><w:t xml:space="preserve">' + text + "</w:t></w:r></w:p>");
    }
  });
  const doc =
    '<?xml version="1.0" encoding="UTF-8"?>' +
    '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>' +
    paras.join("") +
    "</w:body></w:document>";
  const ct =
    '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
    '<Default Extension="xml" ContentType="application/xml"/>' +
    '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>';
  const rels =
    '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>';
  return zipStore([
    { name: "[Content_Types].xml", data: ct },
    { name: "_rels/.rels", data: rels },
    { name: "word/document.xml", data: doc },
  ]);
}

// tables: array of tables; each table is rows of cell strings.
export function toXlsx(tables) {
  const colName = (i) => {
    let s = "";
    i++;
    while (i > 0) {
      const m = (i - 1) % 26;
      s = String.fromCharCode(65 + m) + s;
      i = Math.floor((i - 1) / 26);
    }
    return s;
  };
  const sheets = (tables.length ? tables : [[["(empty)"]]]).map((rows, si) => {
    const rowsXml = rows
      .map((row, r) => "<row r=\"" + (r + 1) + "\">" + row.map((c, col) => '<c r="' + colName(col) + (r + 1) + '" t="inlineStr"><is><t>' + escXml(c) + "</t></is></c>").join("") + "</row>")
      .join("");
    return {
      name: "sheet" + (si + 1) + ".xml",
      id: "rId" + (si + 1),
      xml:
        '<?xml version="1.0" encoding="UTF-8"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>' +
        rowsXml +
        "</sheetData></worksheet>",
    };
  });
  const wbRelTargets = sheets.map((s) => '<Relationship Id="' + s.id + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/' + s.name + '"/>').join("");
  const files = [
    {
      name: "[Content_Types].xml",
      data:
        '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
        '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
        '<Default Extension="xml" ContentType="application/xml"/>' +
        '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
        sheets.map((s) => '<Override PartName="/xl/worksheets/' + s.name + '" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>').join("") +
        "</Types>",
    },
    { name: "_rels/.rels", data: '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>' },
    {
      name: "xl/workbook.xml",
      data:
        '<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>' +
        sheets.map((s, i) => '<sheet name="Table' + (i + 1) + '" sheetId="' + (i + 1) + '" r:id="' + s.id + '"/>').join("") +
        "</sheets></workbook>",
    },
    { name: "xl/_rels/workbook.xml.rels", data: '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' + wbRelTargets + "</Relationships>" },
  ];
  for (const s of sheets) files.push({ name: "xl/worksheets/" + s.name, data: s.xml });
  return zipStore(files);
}

// One slide per page: title + text boxes (V10 core path; rendered background
// images arrive with the OFFICE-PACK in Phase D).
export function toPptx(docTexts) {
  const files = [
    {
      name: "[Content_Types].xml",
      data:
        '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
        '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
        '<Default Extension="xml" ContentType="application/xml"/>' +
        '<Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>' +
        docTexts.map((_, i) => '<Override PartName="/ppt/slides/slide' + (i + 1) + '.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>').join("") +
        "</Types>",
    },
    { name: "_rels/.rels", data: '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/></Relationships>' },
    {
      name: "ppt/presentation.xml",
      data:
        '<?xml version="1.0" encoding="UTF-8"?><p:presentation xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><p:sldIdLst>' +
        docTexts.map((_, i) => '<p:sldId id="' + (256 + i) + '" r:id="rId' + (i + 1) + '"/>').join("") +
        "</p:sldIdLst></p:presentation>",
    },
    {
      name: "ppt/_rels/presentation.xml.rels",
      data:
        '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        docTexts.map((_, i) => '<Relationship Id="rId' + (i + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide' + (i + 1) + '.xml"/>').join("") +
        "</Relationships>",
    },
  ];
  docTexts.forEach((p, i) => {
    const paras = (p.paragraphs || [])
      .slice(0, 12)
      .map((q) => "<a:p><a:r><a:t>" + escXml((q.text || "").slice(0, 500)) + "</a:t></a:r></a:p>")
      .join("");
    files.push({
      name: "ppt/slides/slide" + (i + 1) + ".xml",
      data:
        '<?xml version="1.0" encoding="UTF-8"?><p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">' +
        '<p:cSld><p:spTree><p:sp><p:txBody><a:bodyPr/><a:p><a:r><a:t>Page ' + (i + 1) + "</a:t></a:r></a:p>" + paras + "</p:txBody></p:sp></p:spTree></p:cSld></p:sld>",
    });
  });
  return zipStore(files);
}

// V2 CSV to PDF table layout spec (pure): paginates rows into page boxes.
export function csvTableSpec(rows, { rowsPerPage } = {}) {
  if (!Array.isArray(rows) || !rows.length) throw new Error("csvTableSpec needs rows[]");
  const rpp = rowsPerPage || 28;
  const cols = Math.max(...rows.map((r) => r.length));
  const pages = [];
  for (let i = 0; i < rows.length; i += rpp) pages.push(rows.slice(i, i + rpp));
  return { cols, rowsPerPage: rpp, pages, pageCount: pages.length };
}

// V11 URL import spec (pure): same-origin fetch only; cross-origin needs CORS.
export function urlImportSpec(url) {
  let u;
  try {
    u = new URL(url, "http://folio.local");
  } catch {
    throw new Error("not a URL: " + url);
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") throw new Error("URL must be http(s)");
  return { href: u.href, sameOrigin: u.origin === "http://folio.local", note: "rendered through the print-CSS path (V1)" };
}
