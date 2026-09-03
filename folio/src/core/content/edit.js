// Folio edit core: pure find/replace spans, paragraph-edit box math,
// word diff (LCS), and overlay cover plans. No DOM, no pdf-lib.
import { hitRegions } from "../annotate/annotate.js";

// Find spans: [{line, word, text, x, y, w, h}] for each word hit.
export function findSpans(lines, query) {
  return hitRegions(lines, query).map((r, i) => ({ ...r, i }));
}

// Paragraph edit plan: cover the old line bbox, re-typeset newText inside
// the paragraph box (max width = line width, may wrap). Returns
// {cover, rows: [{text, y}], overflow: bool}. Caller draws with
// widthOfTextAtSize using the real embedded font.
export function paragraphEditPlan(line, newText, measure) {
  const boxW = line.w || 400;
  const size = line.size || 12;
  const words = String(newText || "").split(/\s+/).filter(Boolean);
  const rows = [];
  let cur = "";
  for (const w of words) {
    const trial = cur ? cur + " " + w : w;
    if (measure(trial, size) > boxW && cur) {
      rows.push(cur);
      cur = w;
    } else cur = trial;
  }
  if (cur) rows.push(cur);
  if (!rows.length) rows.push("");
  const leading = size * 1.35;
  const maxRows = Math.max(1, Math.floor(((line.paraH || leading) + leading / 2) / leading));
  return {
    cover: { x: line.x - 2, y: line.y - 2, w: boxW + 4, h: (line.paraH || size + 4) + 4 },
    rows: rows.map((text, i) => ({ text, y: line.y + ((rows.length - 1 - i) * leading) })),
    overflow: rows.length > maxRows,
    extraRows: rows.slice(maxRows),
  };
}

// Word-level diff via LCS on token arrays. Returns ops:
// [{op: "same"|"del"|"ins", text}].
export function wordDiff(a, b) {
  const A = String(a || "").split(/\s+/).filter(Boolean);
  const B = String(b || "").split(/\s+/).filter(Boolean);
  const n = A.length;
  const m = B.length;
  const dp = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = A[i] === B[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const ops = [];
  let i = 0;
  let j = 0;
  const push = (op, text) => {
    const last = ops[ops.length - 1];
    if (last && last.op === op) last.text += " " + text;
    else ops.push({ op, text });
  };
  while (i < n && j < m) {
    if (A[i] === B[j]) {
      push("same", A[i]);
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) push("del", A[i++]);
    else push("ins", B[j++]);
  }
  while (i < n) push("del", A[i++]);
  while (j < m) push("ins", B[j++]);
  return ops;
}

// Diff summary counts for scoreboard/report pages.
export function diffStats(ops) {
  let same = 0;
  let del = 0;
  let ins = 0;
  for (const o of ops) {
    const k = o.text.split(" ").length;
    if (o.op === "same") same += k;
    else if (o.op === "del") del += k;
    else ins += k;
  }
  return { same, del, ins };
}
