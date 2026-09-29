// Folio table finder: ruling-line segments + whitespace column gaps.
// Greedy O(r*c) assignment; headless and fixture-testable.
export function findColumns(gaps, minGap) {
  const cols = [];
  let cur = null;
  for (const g of gaps) {
    if (g.w >= minGap) {
      if (!cur) cur = { ...g };
      else cur = { x: Math.min(cur.x, g.x), w: Math.max(cur.x + cur.w, g.x + g.w) - Math.min(cur.x, g.x) };
    } else if (cur) {
      cols.push(cur);
      cur = null;
    }
  }
  if (cur) cols.push(cur);
  return cols;
}

export function assignCells(rows, cols) {
  return rows.map((r) => {
    const cells = cols.map(() => []);
    for (const word of r.words || []) {
      let best = 0;
      let bestD = Infinity;
      cols.forEach((c, i) => {
        const cx = c.x + c.w / 2;
        const d = Math.abs(word.x + (word.w || 0) / 2 - cx);
        if (d < bestD) {
          bestD = d;
          best = i;
        }
      });
      cells[best].push(word.text);
    }
    return cells.map((c) => c.join(" "));
  });
}

export function toCsv(table) {
  return table.map((row) => row.map((c) => (/[",\n]/.test(c) ? '"' + c.replace(/"/g, '""') + '"' : c)).join(",")).join("\n");
}

// CSV-to-PDF pagination spec (pure): rows[] split into printable pages.
// Moved here from the purged Office writers module; the CSV-to-PDF table
// renderer (convert-ops) is real and still uses it.
export function csvTableSpec(rows, { rowsPerPage } = {}) {
  if (!Array.isArray(rows) || !rows.length) throw new Error("csvTableSpec needs rows[]");
  const rpp = rowsPerPage || 28;
  const cols = Math.max(...rows.map((r) => r.length));
  const pages = [];
  for (let i = 0; i < rows.length; i += rpp) pages.push(rows.slice(i, i + rpp));
  return { cols, rowsPerPage: rpp, pages, pageCount: pages.length };
}
