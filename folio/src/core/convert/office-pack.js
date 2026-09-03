// Folio Office V3 pack boundary (OFFICE-PACK): routing, job specs, and the
// fidelity contract between the full-fidelity pack renderer and the V4
// core fallback. The pack engine itself is a same-origin vendored bundle
// (packs/office-engine.js) loaded only after explicit consent; this module
// owns everything around it so the boundary is one function call.
export const OFFICE_PACK_ID = "office-pack";

export function packCacheKey(manifest) {
  if (!manifest || !manifest.version) throw new Error("packCacheKey needs manifest.version");
  return "folio-pack-office-" + manifest.version;
}

// Consent + readiness routing: "pack" (full fidelity), "fallback" (basic),
// or "prompt" (no decision yet).
export function routeOfficeConvert({ consent, packReady }) {
  if (packReady) return "pack";
  if (consent === "declined") return "fallback";
  if (consent === "ready") return "pack";
  return "prompt";
}

export function packJobSpec({ fileName, byteLength }) {
  if (!fileName || typeof fileName !== "string") throw new Error("packJobSpec needs fileName");
  const lower = fileName.toLowerCase();
  const kind = lower.endsWith(".docx") ? "docx" : lower.endsWith(".xlsx") ? "xlsx" : lower.endsWith(".pptx") ? "pptx" : null;
  if (!kind) throw new Error("packJobSpec: unsupported file " + fileName);
  if (!Number.isInteger(byteLength) || byteLength <= 0) throw new Error("packJobSpec needs byteLength > 0");
  return { kind, fileName, byteLength, fidelity: "full" };
}

// What the pack preserves over the fallback (shown in the consent card).
export function packFidelitySpec() {
  return {
    preserves: [
      "headings, bold/italic, lists, and paragraph spacing",
      "tables with cell borders and header rows",
      "slide titles plus per-slide text boxes in order",
      "original reading order across pages and sheets",
    ],
    stillApproximate: ["exact pagination and fonts (re-laid for PDF output)"],
  };
}

// Pure diff list for the UI banner: pack line vs fallback line per aspect.
export function fallbackVsPackDiff() {
  return [
    { aspect: "layout", pack: "headings, tables, slide order preserved", fallback: "plain paragraphs, pagination approximate" },
    { aspect: "tables", pack: "cell grid with borders kept", fallback: "rows joined as text lines" },
    { aspect: "images", pack: "count reported (rendered Phase E)", fallback: "images dropped, text kept" },
  ];
}

// Verify downloaded pack files against the manifest (names + total bytes).
// Hash verification is async (SubtleCrypto) and lives in the loader.
export function verifyPackFiles(manifest, files) {
  if (!manifest || !Array.isArray(manifest.files)) throw new Error("verifyPackFiles needs manifest.files");
  if (!Array.isArray(files)) throw new Error("verifyPackFiles needs files[]");
  const want = [...manifest.files].sort();
  const got = files.map((f) => f.name).sort();
  if (JSON.stringify(want) !== JSON.stringify(got)) {
    throw new Error("pack files mismatch: want " + want.join(",") + " got " + got.join(","));
  }
  const total = files.reduce((n, f) => n + (f.bytes ? f.bytes.length : 0), 0);
  if (manifest.bytes > 0 && total !== manifest.bytes) {
    throw new Error("pack byte size mismatch: manifest " + manifest.bytes + " got " + total);
  }
  return { ok: true, totalBytes: total };
}
