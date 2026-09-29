// Folio N-up / booklet / overlay imposition math (object-model, never rasterized).
export function nupLayout(n, sheetW, sheetH, margin) {
  if (![1, 2, 4, 6, 8, 9, 16].includes(n)) throw new Error("unsupported n-up: " + n);
  const cols = n === 1 ? 1 : n === 2 ? 2 : n <= 4 ? 2 : n <= 6 ? 3 : n <= 9 ? 3 : 4;
  const rows = Math.ceil(n / cols);
  const m = margin || 0;
  const cw = (sheetW - 2 * m) / cols;
  const ch = (sheetH - 2 * m) / rows;
  const cells = [];
  for (let i = 0; i < n; i++) {
    const c = i % cols;
    const r = Math.floor(i / cols);
    cells.push({ x: m + c * cw, y: sheetH - m - (r + 1) * ch, w: cw, h: ch });
  }
  return { cols, rows, cells };
}

// Booklet signature ordering: page count padded to multiple of 4.
// Returns array of [left, right] spreads in print order; -1 = blank.
export function bookletOrder(pageCount) {
  const n = Math.ceil(pageCount / 4) * 4;
  const spreads = [];
  let lo = 0;
  let hi = n - 1;
  while (lo < hi) {
    spreads.push([hi, lo]);
    lo++;
    hi--;
    if (lo <= hi) spreads.push([lo, hi]);
    lo++;
    hi--;
  }
  return spreads.map(([a, b]) => [a < pageCount ? a : -1, b < pageCount ? b : -1]);
}

export function overlaySpec(under, over, alpha) {
  return { under, over, alpha: alpha === undefined ? 1 : alpha };
}
