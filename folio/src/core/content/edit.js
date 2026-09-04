// Folio edit core: word diff (LCS) for the compare report. No DOM, no pdf-lib.
// M1 note: white-box find/replace + paragraph cover-and-retype were purged:
// painting opaque rectangles over live text leaves the old bytes extractable,
// so they could never be honest edits. Compare appends a real report page.

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
