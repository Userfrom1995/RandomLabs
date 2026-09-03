// Folio crypto domain (S1-S4, S7-S9): pure, headless, no DOM.
// Honest scope: pdf-lib cannot write native PDF V=5 encryption, so S1/S2/S4
// use an AES-256-GCM file envelope (magic + salt + iv + ciphertext). The UI
// must label this as envelope encryption, NOT native PDF passwords, and note
// that encrypted files open only in Folio (or any tool reading the envelope).
// Password buffers are zeroed after use; history never stores passwords.
export const ENVELOPE_MAGIC = "FOLIO-AES-GCM-v1";
export const PBKDF2_ITERS = 210000;

export function validatePassword(pw) {
  if (typeof pw !== "string" || pw.length === 0) throw new Error("password must be a non-empty string");
  if (pw.length > 512) throw new Error("password too long (max 512 chars)");
  return new TextEncoder().encode(pw);
}

export function zeroBytes(u8) {
  if (u8 && u8.fill) u8.fill(0);
  return u8;
}

// Descriptor stored (plaintext header) alongside the envelope: cipher suite
// plus the Perms intent flags (S3). Perms are enforced by Folio's UI only;
// like native PDF perms they are advisory, never DRM.
export function envelopeDescriptor(perms, note) {
  return {
    format: ENVELOPE_MAGIC,
    cipher: "AES-256-GCM",
    kdf: "PBKDF2-SHA256-" + PBKDF2_ITERS,
    perms: perms || {},
    note: note || "",
    createdAt: new Date().toISOString(),
  };
}

// Session unlock record (S4): decrypted bytes live in memory only. The
// password reference must be zeroed by the caller right after key derivation.
export function unlockSession(jobId, fileName, perms) {
  if (!jobId || !fileName) throw new Error("unlockSession needs jobId + fileName");
  return { jobId, fileName, perms: perms || {}, unlockedAt: Date.now(), persisted: false };
}

// JS / action inspector (S9, O6 input): scans raw bytes (latin1) for risky
// COS keys. Returns [{key, count}] sorted by count desc.
const RISKY_KEYS = ["/JavaScript", "/JS", "/AA", "/OpenAction", "/EmbeddedFiles", "/Launch", "/XFA", "/SubmitForm"];
export function inspectJs(rawBytes) {
  const s = Buffer.from(rawBytes).toString("latin1");
  const out = [];
  for (const k of RISKY_KEYS) {
    const re = new RegExp(k.replace("/", "\\/") + "(?![A-Za-z])", "g");
    const n = (s.match(re) || []).length;
    if (n) out.push({ key: k, count: n });
  }
  return out.sort((a, b) => b.count - a.count);
}

// ByteRange layout for PAdES-style signing (S7 spec): placeholder gap of
// gapLen bytes at gapAt; digest covers everything outside the gap.
export function byterangeSpec(fileLen, gapAt, gapLen) {
  if (!Number.isInteger(fileLen) || !Number.isInteger(gapAt) || !Number.isInteger(gapLen)) throw new Error("byterange needs integers");
  if (gapAt < 0 || gapLen <= 0 || gapAt + gapLen > fileLen) throw new Error("byterange gap out of file");
  return { ByteRange: [0, gapAt, gapAt + gapLen, fileLen - (gapAt + gapLen)] };
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
