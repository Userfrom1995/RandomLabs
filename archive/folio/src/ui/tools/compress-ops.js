// Folio compress executor (O1, O3-O4): profile-gated compress.
// Lossless resave always runs (object-stream packing). Pages routed
// "rasterize" are re-rendered ONLY when the caller supplies a rasterizePage
// callback (browser: pdf.js render at profile DPI + embedJpg); without it
// (node harness) they stay lossless and are reported as deferred, so the
// searchability gate can never silently break text pages.
import { planCorpus, corpusGate, resaveSpec } from "../../core/compress/optimize.js";

export { planCorpus, corpusGate };

export async function compressPdf(pdfBytes, { profile, coverages, textDominant, rasterizePage }, PDFLib) {
  const before = pdfBytes.length;
  const plan = planCorpus(coverages || [{ textItems: 500, imageArea: 0 }], profile || "medium");
  const doc = await PDFLib.PDFDocument.load(pdfBytes);
  const spec = resaveSpec();
  let rasterized = [];
  if (rasterizePage && plan.rasterize.length) {
    for (const p of plan.rasterize) {
      const png = await rasterizePage(p, plan.dpi, plan.q);
      if (!png) continue;
      const pg = doc.getPage(p);
      const { width, height } = pg.getSize();
      const img = await doc.embedPng(png);
      pg.drawImage(img, { x: 0, y: 0, width, height });
      rasterized.push(p);
    }
  }
  const deferred = plan.rasterize.filter((p) => !rasterized.includes(p));
  const bytes = await doc.save(spec);
  const gate = corpusGate(plan, textDominant || plan.routes.map(() => false), before, bytes.length);
  return {
    bytes,
    before,
    after: bytes.length,
    plan,
    rasterized,
    deferred,
    gate: { ...gate, pass: gate.searchableKept && deferred.length === 0 ? gate.ratio <= 1.0 : gate.searchableKept },
  };
}
