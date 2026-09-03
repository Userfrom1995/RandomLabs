// Folio redact core: pure text-map filter + binary-scan acceptance helper.
// A region R = {x, y, w, h} in PDF points (origin bottom-left).
export function bboxIntersects(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

// lineBoxes: [{text, x, y, w, h}] (y = baseline-ish bottom). Returns kept lines
// with redacted spans removed (word-granular when boxes available).
export function filterTextMap(lineBoxes, regions) {
  const kept = [];
  for (const lb of lineBoxes) {
    const hits = regions.filter((R) => bboxIntersects(lb, R));
    if (!hits.length) {
      kept.push(lb);
      continue;
    }
    if (lb.words && lb.words.length) {
      const words = lb.words.filter((w) => !hits.some((R) => bboxIntersects(w, R)));
      if (words.length) kept.push({ ...lb, words, text: words.map((w) => w.text).join(" ") });
    }
    // without word boxes the whole line intersecting R is dropped (safe side)
  }
  return kept;
}

// Acceptance: extraction over R must be empty AND the output bytes must not
// contain any redacted codepoint run. Returns {extractEmpty, bytesClean}.
export function redactAcceptance(keptLines, regions, outputBytes, redactedStrings) {
  const extractEmpty = keptLines.every(
    (lb) => !regions.some((R) => bboxIntersects({ x: lb.x, y: lb.y, w: lb.w || 400, h: lb.h || 12 }, R)),
  );
  let bytesClean = true;
  if (outputBytes && redactedStrings) {
    const dec = new TextDecoder("latin1");
    const txt = dec.decode(outputBytes);
    bytesClean = redactedStrings.every((s) => !txt.includes(s));
  }
  return { extractEmpty, bytesClean, pass: extractEmpty && bytesClean };
}
