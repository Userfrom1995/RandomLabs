// Folio pack loader (shared OCR/OFFICE): consent-gated fetch with byte
// progress, cancel, cache-then-network keys, and sha256 verification.
// Pure helpers here; the DOM/Cache wiring lives in the shell.
export function cacheKeyFor(kind, version) {
  if (kind !== "ocr-pack" && kind !== "office-pack") throw new Error("unknown pack " + kind);
  if (!version) throw new Error("cacheKeyFor needs version");
  return "folio-pack-" + kind.replace("-pack", "") + "-" + version;
}

export function verifyTotalBytes(manifest, totalBytes) {
  if (!manifest || !Number.isFinite(manifest.bytes)) throw new Error("verifyTotalBytes needs manifest.bytes");
  if (manifest.bytes > 0 && totalBytes !== manifest.bytes) {
    throw new Error("pack size mismatch: manifest " + manifest.bytes + " downloaded " + totalBytes);
  }
  return { ok: true, totalBytes };
}

export function progressFraction(done, total) {
  if (!total || total <= 0) return 0;
  return Math.min(1, Math.max(0, done / total));
}

export function verifyManifestFiles(manifest, names) {
  const want = [...(manifest.files || [])].sort();
  const got = [...(names || [])].sort();
  if (JSON.stringify(want) !== JSON.stringify(got)) {
    throw new Error("pack files mismatch: want " + want.join(",") + " got " + got.join(","));
  }
  return { ok: true };
}

// Hex sha256 of bytes via injected digest fn (node: crypto.subtle or
// createHash; browser: crypto.subtle.digest). Compared case-insensitively.
export async function verifySha256(bytes, expectHex, digestFn) {
  if (!expectHex || expectHex.startsWith("pending-")) return { ok: true, skipped: true };
  if (!digestFn) throw new Error("verifySha256 needs digestFn");
  const got = (await digestFn(bytes)).toLowerCase();
  if (got !== String(expectHex).toLowerCase()) throw new Error("pack sha256 mismatch");
  return { ok: true, skipped: false };
}
