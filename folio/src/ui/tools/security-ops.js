// Folio security executors (S1-S4, S6-S9): envelope encrypt/decrypt, perms,
// JS inspector report, signature stamp, cert-sign spec (honest: CMS/PKCS#12
// signing lands Phase E; the appearance + ByteRange spec ship now).
import { ENVELOPE_MAGIC, PBKDF2_ITERS, validatePassword, zeroBytes, envelopeDescriptor, unlockSession, inspectJs, byterangeSpec, integrityVerdict, signatureAppearanceSpec } from "../../core/crypto/crypto.js";
import { encodePerms } from "../../core/pipeline/naming.js";

export { inspectJs, integrityVerdict, byterangeSpec };

function subtleOf(s) {
  const st = s || (globalThis.crypto && globalThis.crypto.subtle);
  if (!st) throw new Error("WebCrypto subtle unavailable");
  return st;
}

async function deriveKey(subtle, pwBytes, salt) {
  const base = await subtle.importKey("raw", pwBytes, "PBKDF2", false, ["deriveKey"]);
  return subtle.deriveKey({ name: "PBKDF2", salt, iterations: PBKDF2_ITERS, hash: "SHA-256" }, base, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
}

// S1: add password. Returns {bytes, descriptor}. Password buffer zeroed.
export async function encryptEnvelope(pdfBytes, password, perms, subtle) {
  const st = subtleOf(subtle);
  const pw = validatePassword(password);
  try {
    const desc = envelopeDescriptor(perms, "envelope encryption; native PDF passwords need a V=5 writer (Phase E)");
    const descBytes = new TextEncoder().encode(JSON.stringify(desc));
    const salt = globalThis.crypto && globalThis.crypto.getRandomValues ? globalThis.crypto.getRandomValues(new Uint8Array(16)) : fallbackRandom(16);
    const iv = globalThis.crypto && globalThis.crypto.getRandomValues ? globalThis.crypto.getRandomValues(new Uint8Array(12)) : fallbackRandom(12);
    const key = await deriveKey(st, pw, salt);
    const cipher = new Uint8Array(await st.encrypt({ name: "AES-GCM", iv }, key, pdfBytes));
    const magic = new TextEncoder().encode(ENVELOPE_MAGIC);
    const out = new Uint8Array(magic.length + 4 + descBytes.length + 16 + 12 + 4 + cipher.length);
    let o = 0;
    out.set(magic, o);
    o += magic.length;
    const dv = new DataView(out.buffer);
    dv.setUint32(o, descBytes.length);
    o += 4;
    out.set(descBytes, o);
    o += descBytes.length;
    out.set(salt, o);
    o += 16;
    out.set(iv, o);
    o += 12;
    dv.setUint32(o, cipher.length);
    o += 4;
    out.set(cipher, o);
    zeroBytes(salt);
    zeroBytes(iv);
    return { bytes: out, descriptor: desc, permsValue: encodePerms(perms || {}) };
  } finally {
    zeroBytes(pw);
  }
}

function fallbackRandom(n) {
  const a = new Uint8Array(n);
  for (let i = 0; i < n; i++) a[i] = (Math.random() * 256) | 0;
  return a;
}

function parseEnvelope(envBytes) {
  const magic = new TextEncoder().encode(ENVELOPE_MAGIC);
  for (let i = 0; i < magic.length; i++) if (envBytes[i] !== magic[i]) throw new Error("not a Folio envelope (wrong magic)");
  let o = magic.length;
  const dv = new DataView(envBytes.buffer, envBytes.byteOffset);
  const descLen = dv.getUint32(o);
  o += 4;
  const desc = JSON.parse(new TextDecoder().decode(envBytes.slice(o, o + descLen)));
  o += descLen;
  const salt = envBytes.slice(o, o + 16);
  o += 16;
  const iv = envBytes.slice(o, o + 12);
  o += 12;
  const cipherLen = dv.getUint32(o);
  o += 4;
  const cipher = envBytes.slice(o, o + cipherLen);
  if (cipher.length !== cipherLen) throw new Error("envelope truncated");
  return { desc, salt, iv, cipher };
}

export function isEnvelope(bytes) {
  try {
    const magic = new TextEncoder().encode(ENVELOPE_MAGIC);
    if (bytes.length < magic.length) return false;
    for (let i = 0; i < magic.length; i++) if (bytes[i] !== magic[i]) return false;
    return true;
  } catch {
    return false;
  }
}

// S2/S4: remove password / session unlock. Password buffer zeroed.
export async function decryptEnvelope(envBytes, password, jobId, subtle) {
  const st = subtleOf(subtle);
  const pw = validatePassword(password);
  try {
    const { desc, salt, iv, cipher } = parseEnvelope(envBytes);
    const key = await deriveKey(st, pw, salt);
    let plain;
    try {
      plain = new Uint8Array(await st.decrypt({ name: "AES-GCM", iv }, key, cipher));
    } catch {
      throw new Error("wrong password or corrupted envelope");
    }
    const session = unlockSession(jobId || "job-" + Date.now().toString(36), "unlocked.pdf", desc.perms);
    return { bytes: plain, descriptor: desc, session };
  } finally {
    zeroBytes(pw);
  }
}

// S3: change password/permissions = re-encrypt under a new envelope.
export async function changePassword(envOrPdfBytes, oldPassword, newPassword, perms, subtle) {
  let plain = envOrPdfBytes;
  if (isEnvelope(envOrPdfBytes)) {
    const r = await decryptEnvelope(envOrPdfBytes, oldPassword, "rekey", subtle);
    plain = r.bytes;
  } else if (oldPassword) {
    throw new Error("file is not encrypted; pass no old password to add one");
  }
  return encryptEnvelope(plain, newPassword, perms, subtle);
}

// S6: handwritten/typed signature stamp drawn as page content.
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

// S7 (honest path): certificate signing needs in-browser ASN.1 + CMS/PKCS#7
// (Phase E). Today: place the visible appearance and return the ByteRange
// spec the future signer will fill, with an explicit unsigned banner.
export async function certSignPlaceholder(pdfBytes, { page, text, x, y }, PDFLib) {
  const stamped = await signatureStamp(pdfBytes, { page, text: (text || "Signed") + " (unsigned)", x, y }, PDFLib);
  const gapAt = Math.max(0, stamped.length - 8192);
  const spec = byterangeSpec(stamped.length + 8192, gapAt, 8192);
  return {
    bytes: stamped,
    spec,
    banner: "Appearance placed. CMS/PKCS#12 certificate signing ships in Phase E; this file is NOT cryptographically signed.",
  };
}
