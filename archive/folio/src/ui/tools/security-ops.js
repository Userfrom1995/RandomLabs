// Folio security executors (M1 scope): JS/action inspection report and the
// visible signature stamp. Purged as facades: the AES-GCM file envelope
// (custom .folio-enc blobs that are not PDF passwords and open only in
// Folio) and the certificate-sign placeholder (no PKI vendor, so any
// "signature" would be theater). Both return in a milestone with a real
// native-PDF writer / PKI vendor behind them.
import { inspectJs, integrityVerdict, signatureAppearanceSpec } from "../../core/crypto/crypto.js";

export { inspectJs, integrityVerdict };

// S6: handwritten/typed signature stamp drawn as real page content.
export async function signatureStamp(pdfBytes, { page, text, x, y, size }, PDFLib) {
  const spec = signatureAppearanceSpec({ text, page, rect: { x: x || 56, y: y || 120, w: 220, h: 40 } });
  const doc = await PDFLib.PDFDocument.load(pdfBytes);
  const font = await doc.embedFont(PDFLib.StandardFonts.HelveticaOblique);
  const pg = doc.getPage(spec.page);
  const s = size || 20;
  pg.drawLine({ start: { x: spec.rect.x, y: spec.rect.y - 6 }, end: { x: spec.rect.x + 200, y: spec.rect.y - 6 }, thickness: 1 });
  pg.drawText(spec.text, { x: spec.rect.x, y: spec.rect.y, size: s, font });
  return doc.save();
}
