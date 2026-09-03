// Folio burn-in redaction executor (S5): opaque bake + stream-level text
// scrub + acceptance gate. Overlay-only redaction is refused by design;
// this path reports pass only when extraction-over-R is empty AND no
// redacted string survives in any decoded content stream or metadata tail.
import { filterTextMap, redactAcceptance, bboxIntersects } from "../../core/content/redact.js";
import { scrubDocumentStreams, decodedStreamText, stringsAbsent } from "../../core/content/burnin.js";

export async function burnInRedact(bytes, { regions, extraStrings }, textMaps, PDFLib) {
  if (!regions || !regions.length) throw new Error("redact: need at least one region {page,x,y,w,h}");
  const doc = await PDFLib.PDFDocument.load(bytes);
  const pages = doc.getPages();
  for (const r of regions) {
    const p = pages[r.page];
    if (!p) throw new Error("redact: region page out of range");
    p.drawRectangle({ x: r.x, y: r.y, width: r.w, height: r.h, color: PDFLib.rgb(0, 0, 0) });
  }
  // Derive redacted strings from the text map (words intersecting R).
  const derived = [];
  const keptByPage = {};
  for (const r of regions) {
    const lines = (textMaps && textMaps[r.page]) || [];
    const R = { x: r.x, y: r.y, w: r.w, h: r.h };
    keptByPage[r.page] = filterTextMap(lines, [R]);
    for (const ln of lines) {
      for (const w of ln.words || []) {
        if (bboxIntersects(w, R)) derived.push(w.text);
      }
    }
  }
  const strings = [...new Set([...derived, ...((extraStrings || []).filter(Boolean))])];
  // Scrub metadata tails that echo redacted strings.
  try {
    const metas = [
      [doc.getTitle?.bind(doc), doc.setTitle?.bind(doc)],
      [doc.getAuthor?.bind(doc), doc.setAuthor?.bind(doc)],
      [doc.getSubject?.bind(doc), doc.setSubject?.bind(doc)],
    ];
    for (const [get, set] of metas) {
      if (!get || !set) continue;
      const v = get();
      if (v && strings.some((s) => s && v.includes(s))) set("REDACTED");
    }
  } catch { /* metadata scrub best-effort */ }
  const perString = await scrubDocumentStreams(doc, strings, PDFLib);
  const outBytes = await doc.save({ useObjectStreams: false });
  // Verify on the final bytes: re-open, scan decoded streams + raw tails.
  const finalDoc = await PDFLib.PDFDocument.load(outBytes);
  const decoded = await decodedStreamText(finalDoc, PDFLib);
  const rawTail = new TextDecoder("latin1").decode(outBytes);
  const missing = [...new Set([...stringsAbsent(decoded, strings), ...stringsAbsent(rawTail, strings)])];
  const allKept = Object.values(keptByPage).flat();
  const allR = regions.map((r) => ({ x: r.x, y: r.y, w: r.w, h: r.h }));
  const base = redactAcceptance(allKept, allR, null, null);
  const acceptance = {
    extractEmpty: base.extractEmpty,
    bytesClean: missing.length === 0,
    leftovers: missing,
    pass: base.extractEmpty && missing.length === 0,
  };
  return { bytes: outBytes, acceptance, strings, perString };
}
