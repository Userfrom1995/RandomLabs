// Folio compress profiles + coverage gate (research spec section 3).
// (dpi, q) grid; rasterize applies ONLY where image area dominates.
export const PROFILES = {
  low: { dpi: 150, q: 0.7, label: "Low" },
  medium: { dpi: 110, q: 0.55, label: "Medium" },
  high: { dpi: 80, q: 0.4, label: "High" },
  extreme: { dpi: 55, q: 0.25, label: "Extreme" },
};

export function profileSpec(name) {
  const p = PROFILES[name];
  if (!p) throw new Error("unknown compress profile: " + name);
  return { ...p, scale: p.dpi / 72 };
}

// coverage: {textItems:number, imageArea:number (0..1 of page), pageArea:number}
// Returns "rasterize" only when image area dominates, else "lossless".
export function decidePagePath(coverage) {
  const { textItems, imageArea } = coverage;
  if (imageArea >= 0.5 && textItems < 40) return "rasterize";
  if (imageArea >= 0.75 && textItems < 120) return "rasterize";
  return "lossless";
}

export function estimateRasterBytes(wPt, hPt, dpi, q) {
  const w = Math.round((wPt * dpi) / 72);
  const h = Math.round((hPt * dpi) / 72);
  return Math.round(w * h * 3 * (0.12 + 0.5 * q));
}
