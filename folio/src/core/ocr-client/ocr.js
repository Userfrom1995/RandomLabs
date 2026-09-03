// Folio OCR client domain (C1-C3): pure job specs + layer math + pool + UI reducer.
// The LSTM engine itself ships as OCR-PACK (consent-gated); this module owns
// everything around it so the pack boundary is one function call.
export const OCR_DPI = 300;
export const HANDWRITING_NOTE = "Handwriting is not reliably recognized; results need human review.";

export function ocrJobSpec({ page, deskew, orient, lang }) {
  if (!Number.isInteger(page) || page < 0) throw new Error("ocrJobSpec needs a 0-based page");
  return {
    page,
    dpi: OCR_DPI,
    grayscale: true,
    deskew: deskew !== false,
    orient: orient !== false,
    lang: lang || "eng",
  };
}

// Affine map (research spec section 9): pdfPoint = bbox_px * 72/dpi.
export function pdfPoint(px, py, dpi) {
  const d = dpi || OCR_DPI;
  return { x: (px * 72) / d, y: (py * 72) / d };
}

// Mode-3 emission spec: validated word boxes for the invisible text layer.
export function mode3Spec(words, dpi) {
  if (!Array.isArray(words)) throw new Error("mode3Spec needs words[]");
  return words.map((w, i) => {
    if (!w.text || typeof w.text !== "string") throw new Error("word " + i + " needs text");
    if (!(w.wPx > 0) || !(w.hPx > 0)) throw new Error("word " + i + " needs wPx/hPx > 0");
    const topLeft = pdfPoint(w.xPx, w.yPx, dpi);
    const sizePt = (w.hPx * 72) / (dpi || OCR_DPI);
    return { text: w.text, x: topLeft.x, size: Math.max(4, sizePt), yTop: topLeft.y };
  });
}

// Worker pool sizing: N = hardwareConcurrency - 1, min 1, max 4 on mobile.
export function poolSize(hw, mobile) {
  const n = (Number.isFinite(hw) ? hw : 2) - 1;
  const cap = mobile ? 4 : 8;
  return Math.min(cap, Math.max(1, n));
}

// Per-page progress state machine (C3): idle -> queued -> rendering ->
// recognizing -> layer -> done; cancel returns to idle, fail -> failed
// with per-page retry.
export function ocrProgressReducer(state, event) {
  const next = {
    "idle:queue": "queued",
    "queued:render": "rendering",
    "rendering:recognize": "recognizing",
    "recognizing:emit": "layer",
    "layer:done": "done",
    "queued:cancel": "idle",
    "rendering:cancel": "idle",
    "recognizing:cancel": "idle",
    "layer:cancel": "idle",
    "queued:fail": "failed",
    "rendering:fail": "failed",
    "recognizing:fail": "failed",
    "layer:fail": "failed",
    "failed:retry": "queued",
    "failed:cancel": "idle",
  }[state + ":" + event];
  return next || state;
}
