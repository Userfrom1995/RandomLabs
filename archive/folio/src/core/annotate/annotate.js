// Folio annotate core: pure helpers for text-markup quads, ink, stamps,
// links, Bates plans, and bookmark trees. No DOM, no pdf-lib.
// M1 note: bboxIntersects moved here from the purged redact module (the
// stream-regex redaction UI was removed; box math stays for markup quads).
export function bboxIntersects(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

// QuadPoints for every word whose text contains the query (case-insensitive).
// Returns [{page, quads: [[x1,y2,x2,y2,x1,y1,x2,y1]...], snippet}].
export function quadsForQuery(lines, query, page = 0) {
  const q = String(query || "").toLowerCase();
  if (!q) return [];
  const out = [];
  for (const ln of lines || []) {
    const words = ln.words && ln.words.length ? ln.words : [{ text: ln.text, x: ln.x, y: ln.y, w: ln.w || 100, h: ln.h || ln.size || 12 }];
    const quads = [];
    for (const w of words) {
      if (w.text.toLowerCase().includes(q)) {
        const x1 = w.x;
        const x2 = w.x + (w.w || 40);
        const y1 = w.y;
        const y2 = w.y + (w.h || 12);
        quads.push([x1, y1, x2, y1, x2, y2, x1, y2]);
      }
    }
    if (quads.length) out.push({ page, quads, snippet: ln.text });
  }
  return out;
}

// Regions (plain rects) covering query hits, for redact/edit cover passes.
export function hitRegions(lines, query) {
  const q = String(query || "").toLowerCase();
  if (!q) return [];
  const out = [];
  for (const ln of lines || []) {
    const words = ln.words && ln.words.length ? ln.words : [{ text: ln.text, x: ln.x, y: ln.y, w: ln.w || 100, h: ln.h || 12 }];
    for (const w of words) {
      if (w.text.toLowerCase().includes(q)) out.push({ x: w.x - 1, y: w.y - 2, w: (w.w || 40) + 2, h: (w.h || 12) + 4, page: 0 });
    }
  }
  return out;
}

// Bates plan: per-page stamp strings "PREFIX000123" with counter + start.
export function batesPlan(pageCount, { prefix, digits, start } = {}) {
  const pre = prefix === undefined ? "FOLIO-" : String(prefix);
  const dig = Math.max(1, Math.min(10, digits === undefined ? 6 : digits));
  const s0 = start === undefined ? 1 : start;
  const out = [];
  for (let i = 0; i < pageCount; i++) out.push(pre + String(s0 + i).padStart(dig, "0"));
  return out;
}

// Bookmark tree validation: [{title, page}] with 1-based pages.
export function validateBookmarks(items, pageCount) {
  if (!Array.isArray(items) || !items.length) throw new Error("bookmarks: need at least one {title, page}");
  return items.map((b, i) => {
    if (!b.title || !String(b.title).trim()) throw new Error("bookmarks: item " + (i + 1) + " has no title");
    const p = Number(b.page);
    if (!Number.isInteger(p) || p < 1 || p > pageCount) throw new Error("bookmarks: item " + (i + 1) + " page out of range 1.." + pageCount);
    return { title: String(b.title).slice(0, 200), page: p };
  });
}

// Ink stroke simplification (RDP, tolerance in points).
export function simplifyInk(points, tol = 1.5) {
  if (!points || points.length < 3) return (points || []).slice();
  const keep = new Array(points.length).fill(false);
  keep[0] = keep[points.length - 1] = true;
  const stack = [[0, points.length - 1]];
  const dist = (p, a, b) => {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy) || 1;
    return Math.abs((p.x - a.x) * dy - (p.y - a.y) * dx) / len;
  };
  while (stack.length) {
    const [s, e] = stack.pop();
    let best = -1;
    let bd = tol;
    for (let i = s + 1; i < e; i++) {
      const d = dist(points[i], points[s], points[e]);
      if (d > bd) {
        bd = d;
        best = i;
      }
    }
    if (best > 0) {
      keep[best] = true;
      stack.push([s, best], [best, e]);
    }
  }
  return points.filter((_, i) => keep[i]);
}

// Link target validation: {uri} or {page} (1-based).
export function validateLink(target) {
  if (!target || typeof target !== "object") throw new Error("link: need {uri} or {page}");
  if (target.uri !== undefined) {
    const u = String(target.uri);
    if (!/^(https?|mailto):/i.test(u)) throw new Error("link: uri must start with http(s): or mailto:");
    return { uri: u.slice(0, 2000) };
  }
  if (target.page !== undefined) {
    const p = Number(target.page);
    if (!Number.isInteger(p) || p < 1) throw new Error("link: page must be >= 1");
    return { page: p };
  }
  throw new Error("link: need {uri} or {page}");
}
