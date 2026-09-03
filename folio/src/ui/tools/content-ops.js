// Folio content tools executor: annotate / stamp / headers / watermarks /
// metadata / sanitize / images-to-PDF / text-to-PDF / PDF-to-text family.
// All write-path ops use pdf-lib; read-path uses the viewer text map.
import { buildSamplePdf } from "../shell/sample.js";

export async function addHeaderFooter(bytes, { header, footer, size }, PDFLib) {
  const doc = await PDFLib.PDFDocument.load(bytes);
  const font = await doc.embedFont(PDFLib.StandardFonts.Helvetica);
  const s = size || 9;
  for (const page of doc.getPages()) {
    const { width, height } = page.getSize();
    if (header) page.drawText(header, { x: 56, y: height - 36, size: s, font });
    if (footer) page.drawText(footer, { x: 56, y: 30, size: s, font });
  }
  return doc.save();
}

export async function addPageNumbers(bytes, { template, startAt }, PDFLib) {
  const tpl = template || "Page {n} of {total}";
  const doc = await PDFLib.PDFDocument.load(bytes);
  const font = await doc.embedFont(PDFLib.StandardFonts.Helvetica);
  const total = doc.getPageCount();
  doc.getPages().forEach((page, i) => {
    const { width } = page.getSize();
    const txt = tpl.replace("{n}", String((startAt || 1) + i)).replace("{total}", String(total));
    const w = font.widthOfTextAtSize(txt, 9);
    page.drawText(txt, { x: (width - w) / 2, y: 30, size: 9, font });
  });
  return doc.save();
}

export async function addWatermark(bytes, { text, opacity }, PDFLib) {
  const doc = await PDFLib.PDFDocument.load(bytes);
  const font = await doc.embedFont(PDFLib.StandardFonts.HelveticaBold);
  for (const page of doc.getPages()) {
    const { width, height } = page.getSize();
    page.drawText(text || "DRAFT", {
      x: width / 2 - 120,
      y: height / 2,
      size: 64,
      font,
      color: PDFLib.rgb(0.6, 0.6, 0.65),
      opacity: opacity === undefined ? 0.25 : opacity,
      rotate: PDFLib.degrees(35),
    });
  }
  return doc.save();
}

export async function setMetadata(bytes, { title, author, subject, keywords }, PDFLib) {
  const doc = await PDFLib.PDFDocument.load(bytes);
  if (title !== undefined) doc.setTitle(title);
  if (author !== undefined) doc.setAuthor(author);
  if (subject !== undefined) doc.setSubject(subject);
  if (keywords !== undefined) doc.setKeywords(keywords.split(",").map((s) => s.trim()));
  return doc.save();
}

export async function scrubMetadata(bytes, PDFLib) {
  const doc = await PDFLib.PDFDocument.load(bytes);
  doc.setTitle("");
  doc.setAuthor("");
  doc.setSubject("");
  doc.setKeywords([]);
  doc.setProducer("Folio");
  doc.setCreator("Folio client-side studio");
  try {
    const catalog = doc.catalog;
    for (const k of ["Names", "JavaScript", "AA", "OpenAction"]) {
      try {
        if (catalog.get(PDFLib.PDFName.of(k))) catalog.delete(PDFLib.PDFName.of(k));
      } catch { /* keep scrubbing */ }
    }
  } catch { /* non-fatal */ }
  return doc.save({ useObjectStreams: true });
}

export async function losslessResave(bytes, PDFLib) {
  const doc = await PDFLib.PDFDocument.load(bytes, { ignoreEncryption: true });
  return doc.save({ useObjectStreams: true });
}

export async function imagesToPdf(imageBytesList, kinds, PDFLib) {
  const doc = await PDFLib.PDFDocument.create();
  for (let i = 0; i < imageBytesList.length; i++) {
    const raw = imageBytesList[i];
    const kind = (kinds && kinds[i]) || "jpg";
    const img = kind === "png" ? await doc.embedPng(raw) : await doc.embedJpg(raw);
    const page = doc.addPage([img.width, img.height]);
    page.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height });
  }
  return doc.save();
}

export async function textToPdf(title, bodyText, PDFLib) {
  const doc = await PDFLib.PDFDocument.create();
  const font = await doc.embedFont(PDFLib.StandardFonts.Helvetica);
  const bold = await doc.embedFont(PDFLib.StandardFonts.HelveticaBold);
  let page = doc.addPage([595, 842]);
  let y = 780;
  if (title) {
    page.drawText(title, { x: 56, y, size: 20, font: bold });
    y -= 32;
  }
  const paras = String(bodyText || "").split("\n");
  for (const para of paras) {
    for (const w of para.split(" ")) {
      void w;
    }
    let line = "";
    for (const word of para.split(/\s+/)) {
      const trial = line ? line + " " + word : word;
      if (font.widthOfTextAtSize(trial, 11) > 480 && line) {
        if (y < 60) {
          page = doc.addPage([595, 842]);
          y = 780;
        }
        page.drawText(line, { x: 56, y, size: 11, font });
        y -= 16;
        line = word;
      } else line = trial;
    }
    if (line) {
      if (y < 60) {
        page = doc.addPage([595, 842]);
        y = 780;
      }
      page.drawText(line, { x: 56, y, size: 11, font });
      y -= 16;
    }
    y -= 6;
    if (y < 60) {
      page = doc.addPage([595, 842]);
      y = 780;
    }
  }
  return doc.save();
}

export async function highlightSearchHits(bytes, hits, PDFLib) {
  // Best-effort stamp: appends a summary page listing hits (true text-markup
  // annotations need quad points from the text map; Phase B wires quads).
  const doc = await PDFLib.PDFDocument.load(bytes);
  const font = await doc.embedFont(PDFLib.StandardFonts.Helvetica);
  const page = doc.addPage([595, 842]);
  page.drawText("Folio search report (" + hits.length + " hits)", { x: 56, y: 780, size: 16, font });
  let y = 750;
  for (const h of hits.slice(0, 60)) {
    page.drawText("p." + h.page + ": " + h.text.slice(0, 90), { x: 56, y, size: 9, font });
    y -= 14;
    if (y < 60) break;
  }
  return doc.save();
}

export { buildSamplePdf };
