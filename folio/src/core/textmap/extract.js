// Folio text-map builder: pdf.js getTextContent items -> lines/paragraphs/columns.
// Binding tolerances from research spec: eps_y = 0.4 * median font size,
// eps_x = 0.3 * median glyph width; CJK writing-mode flag honored.
export function median(xs) {
  if (!xs.length) return 10;
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

function fontSizeOf(item) {
  const t = item.transform || [1, 0, 0, 1, 0, 0];
  return Math.hypot(t[0], t[1]) || 10;
}

// items: [{str, transform:[a,b,c,d,x,y], fontName?, dir?}]
export function itemsToLines(items) {
  const usable = (items || []).filter((it) => it.str !== undefined && it.str !== "");
  if (!usable.length) return [];
  const sizes = usable.map(fontSizeOf);
  const medSize = median(sizes);
  const widths = usable.map((it) => (it.width !== undefined ? it.width : fontSizeOf(it) * 0.5));
  const medW = median(widths.filter((w) => w > 0));
  const epsY = 0.4 * medSize;
  const epsX = 0.3 * (medW || medSize * 0.5);
  const rows = usable.map((it) => ({
    it,
    x: it.transform[4],
    y: it.transform[5],
    size: fontSizeOf(it),
    vertical: it.dir === "ttb" || it.dir === "vertical",
  }));
  rows.sort((a, b) => b.y - a.y || a.x - b.x);
  const lines = [];
  for (const r of rows) {
    const line = lines.find((L) => Math.abs(L.y - r.y) <= epsY && L.vertical === r.vertical);
    if (line) {
      line.items.push(r);
      line.y = (line.y * (line.items.length - 1) + r.y) / line.items.length;
    } else {
      lines.push({ y: r.y, vertical: r.vertical, items: [r] });
    }
  }
  return lines.map((L) => {
    L.items.sort((a, b) => (L.vertical ? b.y - a.y : a.x - b.x));
    let text = "";
    let prevEnd = null;
    for (const r of L.items) {
      const w = r.it.width !== undefined ? r.it.width : r.size * 0.5 * Math.max(1, r.it.str.length);
      if (prevEnd !== null && r.x - prevEnd > epsX) text += " ";
      text += r.it.str;
      prevEnd = r.x + w;
    }
    const xs = L.items.map((r) => r.x);
    const x0 = Math.min(...xs);
    const medSize = median(L.items.map((r) => r.size));
    // Word boxes: distribute each item's width across its space-separated
    // tokens. Gives QuadPoints-capable bboxes in PDF user space (baseline y).
    const words = [];
    for (const r of L.items) {
      const wTotal = r.it.width !== undefined ? r.it.width : r.size * 0.5 * Math.max(1, r.it.str.length);
      const toks = r.it.str.split(/(\s+)/).filter((t) => t.length);
      let cx = r.x;
      const perChar = wTotal / Math.max(1, r.it.str.length);
      for (const t of toks) {
        const tw = t.length * perChar;
        if (!/^\s+$/.test(t)) words.push({ text: t, x: cx, y: r.y, w: tw, h: r.size });
        cx += tw;
      }
    }
    const ends = L.items.map((r) => {
      const w = r.it.width !== undefined ? r.it.width : r.size * 0.5 * Math.max(1, r.it.str.length);
      return r.x + w;
    });
    return {
      text,
      x: x0,
      y: L.y,
      w: Math.max(...ends) - x0,
      h: medSize,
      size: medSize,
      vertical: L.vertical,
      words,
    };
  });
}

// x-histogram column clustering: split lines into columns by gaps in x starts.
export function clusterColumns(lines, gapFactor) {
  if (lines.length < 2) return [lines];
  const starts = [...new Set(lines.map((l) => Math.round(l.x)))].sort((a, b) => a - b);
  const gaps = [];
  for (let i = 1; i < starts.length; i++) gaps.push(starts[i] - starts[i - 1]);
  const medGap = median(gaps);
  // Relative threshold needs jitter statistics; with <3 gaps there is no
  // baseline, so fall back to an absolute 80pt column gap (real column
  // gutters are 100pt+; single-column x jitter stays well under 40pt).
  const thresh = gaps.length > 2 ? medGap * (gapFactor || 3) : 80;
  const bounds = [starts[0]];
  for (let i = 1; i < starts.length; i++) {
    if (starts[i] - starts[i - 1] > thresh) bounds.push(starts[i]);
  }
  if (bounds.length < 2) return [lines];
  const cols = bounds.map(() => []);
  for (const l of lines) {
    let c = 0;
    for (let i = 0; i < bounds.length; i++) if (l.x >= bounds[i] - 1) c = i;
    cols[c].push(l);
  }
  return cols.filter((c) => c.length);
}

export function linesToParagraphs(lines, lineGapFactor) {
  if (!lines.length) return [];
  const sorted = [...lines].sort((a, b) => b.y - a.y);
  const medSize = median(sorted.map((l) => l.size));
  const gap = medSize * (lineGapFactor || 1.4);
  const paras = [];
  let cur = [sorted[0]];
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i - 1].y - sorted[i].y > gap) {
      paras.push(cur);
      cur = [sorted[i]];
    } else {
      cur.push(sorted[i]);
    }
  }
  paras.push(cur);
  return paras.map((ls) => ({ text: ls.map((l) => l.text).join("\n"), lines: ls }));
}

export function readingOrder(lines) {
  const cols = clusterColumns(lines);
  if (cols.length <= 1) return [...lines].sort((a, b) => b.y - a.y || a.x - b.x);
  const ordered = cols.map((c) => [...c].sort((a, b) => b.y - a.y));
  return ordered.flat();
}
