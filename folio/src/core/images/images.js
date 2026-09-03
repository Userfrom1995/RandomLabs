// Folio images core: pure placement math + XObject census helpers.
// No DOM, no pdf-lib (executor lives in ui/tools/image-ops.js).

// Placement rect for insert: fit image (iw x ih px) into max box, optional
// rotation 0/90/180/270. Returns {w, h, rot}.
export function fitImage(iw, ih, maxW, maxH, rot = 0) {
  const swap = Math.abs(rot % 180) === 90;
  const w0 = swap ? ih : iw;
  const h0 = swap ? iw : ih;
  const k = Math.min(maxW / w0, maxH / h0, 1);
  return { w: w0 * k, h: h0 * k, rot: ((rot % 360) + 360) % 360 };
}

// Scanner-effect spec: pure params for the canvas filter pass.
export function scannerSpec({ contrast = 1.15, noise = 6, warmth = 0 } = {}) {
  return {
    contrast: Math.min(2, Math.max(0.5, contrast)),
    noise: Math.min(32, Math.max(0, noise)),
    warmth: Math.min(30, Math.max(-30, warmth)),
  };
}

// Merge an image census (from the executor's XObject walk) into a report.
export function censusReport(entries) {
  return (entries || []).map((e, i) => ({
    index: i,
    page: e.page,
    width: e.width,
    height: e.height,
    filter: e.filter || "raw",
    bytes: e.bytes,
  }));
}
