// Folio crypto domain: pure, headless, no DOM.
// M1 scope: JS/action inspection (real byte scan), signature-stamp spec,
// integrity-vs-trust verdict. Password envelopes, cert placeholders, and
// ByteRange specs were purged as facades (no native PDF V=5 writer, no PKI).

// JS / action inspector (S9, O6 input): scans raw bytes (latin1) for risky
// COS keys. Returns [{key, count}] sorted by count desc.
const RISKY_KEYS = ["/JavaScript", "/JS", "/AA", "/OpenAction", "/EmbeddedFiles", "/Launch", "/XFA", "/SubmitForm"];
export function inspectJs(rawBytes) {
  const bytes = rawBytes instanceof Uint8Array ? rawBytes : new Uint8Array(rawBytes || []);
  const s = new TextDecoder("latin1").decode(bytes);
  const out = [];
  for (const k of RISKY_KEYS) {
    const re = new RegExp(k.replace("/", "\\/") + "(?![A-Za-z])", "g");
    const n = (s.match(re) || []).length;
    if (n) out.push({ key: k, count: n });
  }
  return out.sort((a, b) => b.count - a.count);
}

// Validation verdict (S8): INTEGRITY (bytes unchanged) vs TRUST (chain to a
// trust anchor) are reported separately per research spec section 8.
export function integrityVerdict({ digestOk, chainOk }) {
  return {
    integrity: digestOk ? "INTACT" : "TAMPERED",
    trust: chainOk ? "TRUSTED" : "UNTRUSTED",
    summary: (digestOk ? "INTACT" : "TAMPERED") + " / " + (chainOk ? "TRUSTED" : "UNTRUSTED"),
  };
}

export function signatureAppearanceSpec({ text, page, rect }) {
  if (!text || typeof text !== "string") throw new Error("signature text required");
  if (!Number.isInteger(page) || page < 0) throw new Error("signature page must be a 0-based index");
  if (!rect || !(rect.w > 0) || !(rect.h > 0)) throw new Error("signature rect needs w/h > 0");
  return { kind: "signature-stamp", text, page, rect };
}
