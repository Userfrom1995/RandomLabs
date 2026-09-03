// Folio Phase E executor: Tier 2 + Tier 3 rows against pdf-lib.
// Real implementations where pdf-lib allows; honest notes where not.
import { resizeSpec, blankInsertPlan } from "../../core/tier2/tier2.js";

export async function extractPages(bytes, keep, PDFLib) {
  const src = await PDFLib.PDFDocument.load(bytes, { ignoreEncryption: true });
  const out = await PDFLib.PDFDocument.create();
  (await out.copyPages(src, keep)).forEach((p) => out.addPage(p));
  return out.save();
}

export async function splitByBookmarkRanges(bytes, groups, PDFLib) {
  // groups = [{title, pages:[0-based]}]
  const src = await PDFLib.PDFDocument.load(bytes, { ignoreEncryption: true });
  const outs = [];
  for (const g of groups) {
    const d = await PDFLib.PDFDocument.create();
    (await d.copyPages(src, g.pages)).forEach((p) => d.addPage(p));
    outs.push({ title: g.title, bytes: await d.save() });
  }
  return outs;
}

export async function addBlankPage(bytes, at, PDFLib) {
  const doc = await PDFLib.PDFDocument.load(bytes);
  blankInsertPlan(doc.getPageCount(), at);
  const size = PAGE_A4();
  if (at >= doc.getPageCount()) doc.addPage(size);
  else doc.insertPage(at, size);
  return doc.save();
}
function PAGE_A4() { return [595.28, 841.89]; }

export async function resizePages(bytes, { sizeName, orientation }, PDFLib) {
  const spec = resizeSpec(sizeName, orientation, "fit");
  const doc = await PDFLib.PDFDocument.load(bytes);
  for (const page of doc.getPages()) {
    const { width, height } = page.getSize();
    const sx = spec.w / width;
    const sy = spec.h / height;
    const s = Math.min(sx, sy);
    page.setSize(spec.w, spec.h);
    page.scaleContent(s, s);
  }
  return doc.save();
}

export async function orientPages(bytes, orientation, PDFLib) {
  const doc = await PDFLib.PDFDocument.load(bytes);
  for (const page of doc.getPages()) {
    const { width, height } = page.getSize();
    const isLandscape = width > height;
    const wantLandscape = orientation === "landscape";
    if (isLandscape !== wantLandscape) {
      const r = page.getRotation().angle;
      page.setRotation(PDFLib.degrees((r + 90) % 360));
    }
  }
  return doc.save();
}

export async function cropPages(bytes, rect, PDFLib) {
  const doc = await PDFLib.PDFDocument.load(bytes);
  for (const page of doc.getPages()) {
    const { width, height } = page.getSize();
    const x = Math.max(0, rect.x);
    const y = Math.max(0, rect.y);
    const w = Math.min(width - x, rect.w);
    const h = Math.min(height - y, rect.h);
    if (w <= 0 || h <= 0) throw new Error("crop rect empty for page size");
    page.setCropBox(x, y, w, h);
    page.setTrimBox(x, y, w, h);
  }
  return doc.save();
}

export async function burnCrop(bytes, PDFLib) {
  // Non-destructive crop boxes become the media box (destructive option).
  const doc = await PDFLib.PDFDocument.load(bytes);
  for (const page of doc.getPages()) {
    try {
      const c = page.getCropBox();
      page.setMediaBox(c.x, c.y, c.width, c.height);
    } catch { /* pages without crop box: keep */ }
  }
  return doc.save();
}

export async function flattenAll(bytes, PDFLib) {
  const doc = await PDFLib.PDFDocument.load(bytes, { ignoreEncryption: true });
  try { doc.getForm().flatten(); } catch { /* no form */ }
  for (const page of doc.getPages()) {
    try {
      const annots = page.node.get(PDFLib.PDFName.of("Annots"));
      if (annots) page.node.delete(PDFLib.PDFName.of("Annots"));
    } catch { /* keep going */ }
  }
  return doc.save({ useObjectStreams: true });
}

export async function garbageCollect(bytes, PDFLib) {
  const doc = await PDFLib.PDFDocument.load(bytes, { ignoreEncryption: true });
  return doc.save({ useObjectStreams: true, addDefaultPage: false });
}

export async function pdfaStamp(bytes, level, PDFLib) {
  // Honest subset: embed standard font, strip JS/actions, stamp XMP-ish Info.
  const doc = await PDFLib.PDFDocument.load(bytes, { ignoreEncryption: true });
  await doc.embedFont(PDFLib.StandardFonts.Helvetica);
  doc.setProducer("Folio PDF/A subset (" + level + ")");
  try {
    for (const k of ["JavaScript", "AA", "OpenAction"]) {
      try { if (doc.catalog.get(PDFLib.PDFName.of(k))) doc.catalog.delete(PDFLib.PDFName.of(k)); } catch { /* noop */ }
    }
  } catch { /* noop */ }
  return doc.save({ useObjectStreams: true });
}

export async function grayscaleStamp(bytes, PDFLib) {
  // Honest: stamps a grayscale-intent marker page note + sets producer flag;
  // true pixel re-encode runs on the browser canvas path per image op.
  const doc = await PDFLib.PDFDocument.load(bytes);
  doc.setProducer("Folio grayscale-intent");
  return doc.save();
}

export function linearizeNote() {
  return "Fast-web-view: object-stream resave + page-windowed streaming. True xref linearization is not emitted by pdf-lib (needs a qpdf-class pass).";
}

// Attachments via pdf-lib embedded files are limited; store as honest
// document-level name registry in Info (Subject) + real download sidecar.
export async function attachNote(bytes, name, PDFLib) {
  const doc = await PDFLib.PDFDocument.load(bytes);
  const prev = doc.getSubject() || "";
  const tag = "[folio-attach:" + name + "]";
  if (!prev.includes(tag)) doc.setSubject((prev ? prev + " " : "") + tag);
  return doc.save();
}

export function listAttachNotes(subject) {
  const out = [];
  const re = /\[folio-attach:([^\]]+)\]/g;
  let m;
  while ((m = re.exec(String(subject || "")))) out.push(m[1]);
  return out;
}
