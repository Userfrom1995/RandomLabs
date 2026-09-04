// Folio M3 spreadsheet model (pure): normalize SheetJS array-of-arrays
// grids and render them as ruled-table PDFs via pdf-lib.

export function normGrid(aoa) {
  const rows = (aoa || []).map((r) => (Array.isArray(r) ? r : [r]).map((c) => (c === null || c === undefined ? "" : String(c))));
  while (rows.length && rows[rows.length - 1].every((c) => !c.trim())) rows.pop();
  const width = Math.max(0, ...rows.map((r) => r.length));
  return rows.map((r) => {
    const out = r.slice(0, width);
    while (out.length < width) out.push("");
    return out;
  });
}

export function gridStats(grid) {
  return { rows: grid.length, cols: grid.length ? grid[0].length : 0, filled: grid.flat().filter((c) => c.trim()).length };
}

// Render one grid (first row = header) to a paginated ruled-table PDF.
export async function gridToPdf(grid, PDFLib, opts) {
  if (!grid || !grid.length || !grid[0].length) throw new Error("empty grid");
  const o = opts || {};
  const doc = await PDFLib.PDFDocument.create();
  const fr = await doc.embedFont(PDFLib.StandardFonts.Helvetica);
  const fb = await doc.embedFont(PDFLib.StandardFonts.HelveticaBold);
  const W = o.pageW || 595;
  const H = o.pageH || 842;
  const ML = o.margin || 40;
  const maxW = (o.landscape ? H : W) - ML * 2;
  const PW = o.landscape ? H : W;
  const PH = o.landscape ? W : H;
  // Column widths proportional to max content length (bounded 1..4 shares).
  const cols = grid[0].length;
  const size = 9;
  const shares = [];
  for (let c = 0; c < cols; c++) {
    let mx = 4;
    for (const r of grid) mx = Math.max(mx, Math.min(48, (r[c] || "").length));
    shares.push(Math.min(4, Math.max(1, mx / 12)));
  }
  const tot = shares.reduce((a, b) => a + b, 0);
  const widths = shares.map((s) => (maxW * s) / tot);
  const lh = size * 1.6;
  let page = doc.addPage([PW, PH]);
  let pages = 1;
  let y = PH - ML;
  if (o.title) {
    page.drawText(String(o.title).slice(0, 80), { x: ML, y, size: 13, font: fb });
    y -= 26;
  }
  function need(h) {
    if (y - h < ML) {
      page = doc.addPage([PW, PH]);
      pages++;
      y = PH - ML;
    }
  }
  for (let ri = 0; ri < grid.length; ri++) {
    const row = grid[ri];
    // wrap each cell, row height = max lines
    const wrapped = row.map((text, ci) => {
      const cw = widths[ci] - 8;
      const words = String(text).split(/\s+/).filter(Boolean);
      const lines = [];
      let cur = "";
      const f = ri === 0 ? fb : fr;
      for (const w of words) {
        const t = cur ? cur + " " + w : w;
        if (f.widthOfTextAtSize(t, size) > cw && cur) {
          lines.push(cur);
          cur = w;
        } else cur = t;
      }
      if (cur || !lines.length) lines.push(cur);
      return lines;
    });
    const rh = Math.max(...wrapped.map((l) => l.length)) * lh + 6;
    need(rh);
    let x = ML;
    for (let ci = 0; ci < cols; ci++) {
      const f = ri === 0 ? fb : fr;
      if (ri === 0) page.drawRectangle({ x, y: y - rh, width: widths[ci], height: rh, color: PDFLib.rgb(0.88, 0.88, 0.88) });
      page.drawRectangle({ x, y: y - rh, width: widths[ci], height: rh, borderWidth: 0.7, borderColor: PDFLib.rgb(0.35, 0.35, 0.35) });
      wrapped[ci].forEach((line, li) => {
        if (line) page.drawText(line.slice(0, 120), { x: x + 4, y: y - 4 - size - li * lh, size, font: f });
      });
      x += widths[ci];
    }
    y -= rh;
  }
  return { doc, bytes: await doc.save(), pages, stats: gridStats(grid) };
}
