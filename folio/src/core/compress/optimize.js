// Folio optimize domain (O1-O7): pure planners + corpus gates, no DOM.
// Binding caution (research spec section 3): rasterize applies ONLY where
// image area dominates; text-dominant pages take the lossless tier so they
// stay searchable and do not inflate.
import { decidePagePath, profileSpec } from "./profiles.js";

export { decidePagePath, profileSpec };

// Per-page routing plan for a corpus: pages: [{textItems, imageArea}].
export function planCorpus(pages, profileName) {
  const spec = profileSpec(profileName);
  const routes = pages.map((cov, i) => ({ page: i, route: decidePagePath(cov) }));
  return {
    profile: profileName,
    dpi: spec.dpi,
    q: spec.q,
    routes,
    rasterize: routes.filter((r) => r.route === "rasterize").map((r) => r.page),
    lossless: routes.filter((r) => r.route === "lossless").map((r) => r.page),
  };
}

// Corpus acceptance gate: ratio gate + searchability gate (no text-dominant
// page may be rasterized). textDominant[i] = true when the page is text-heavy.
export function corpusGate(plan, textDominant, beforeBytes, afterBytes) {
  if (!beforeBytes || beforeBytes <= 0) throw new Error("corpusGate needs beforeBytes > 0");
  const ratio = afterBytes / beforeBytes;
  const damaged = plan.rasterize.filter((p) => textDominant[p]);
  return {
    ratio,
    savedPct: 100 * (1 - ratio),
    searchableKept: damaged.length === 0,
    damaged,
    pass: damaged.length === 0 && ratio <= 1.0,
  };
}

// Lossless resave spec: object-stream packing + unreferenced sweep (O3 is
// free inside the same pdf-lib rewrite).
export function resaveSpec() {
  return { useObjectStreams: true, addDefaultPage: false, note: "full rewrite drops unreferenced objects" };
}

export function grayscaleSpec(strength) {
  const s = Math.min(2, Math.max(0, strength === undefined ? 1 : strength));
  return { filter: "luminance-fold", strength: s };
}

// PDF/A subset checklist (O7): what the executor does per item.
export function pdfaChecklist() {
  return [
    { item: "embed font subsets", status: "handled" },
    { item: "strip JS/actions/embedded files", status: "handled" },
    { item: "strip transparency groups (flatten)", status: "manual-review" },
    { item: "write XMP + OutputIntent", status: "phase-E" },
  ];
}

// Linearize (O2, Tier 3): honest stub spec, not implemented in Phase C.
export function linearizeSpec() {
  return { status: "stub-phase-E", note: "first-page-first xref ordering not yet implemented" };
}
