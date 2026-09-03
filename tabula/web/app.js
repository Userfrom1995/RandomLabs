/* Tabula Phase 0 web shell (zero-build static JS, no bundler).
 *
 * Data path: a DirtyBatch shaped exactly like the Swift wire contract
 * (Sources/TabulaBridge/Bridge.swift: {seq, ranges, cells}, cells carry
 * s/c/r/v/d) flows into renderSnapshot(). Phase 0 boots a clearly labeled
 * STUB producer so the renderer, dirty-range repaint, and inspector plumbing
 * are exercised end to end. Phase 4 replaces stubBatch() with the WASM
 * Bridge pull; the consumer side does not change.
 */
"use strict";

const COL_W = 96, ROW_H = 28, HEAD_W = 48, HEAD_H = 28;
const canvas = document.getElementById("grid");
const ctx = canvas.getContext("2d");
const statusEl = document.getElementById("status");
const batchEl = document.getElementById("batch");
const inspectorEl = document.getElementById("inspector");
const formulaEl = document.getElementById("formula");
const addrEl = document.getElementById("addr");
const badgeEl = document.getElementById("core-badge");

let lastSeq = 0;
/* cell key "s:c:r" -> {v, d} */
let model = new Map();
let selected = { s: 0, c: 0, r: 0 };

function colLetters(col) {
  let n = col + 1, out = "";
  while (n > 0) { n -= 1; out = String.fromCharCode(65 + (n % 26)) + out; n = Math.floor(n / 26); }
  return out;
}

/* Phase 0 STUB producer: hardcoded hello snapshot in the pinned wire shape.
 * Values here are placeholders, not Core semantics. The Swift-side contract
 * test (BridgeWireTests.batchRoundTrip) pins the same shape in JSON. */
function stubBatch() {
  return {
    seq: 1,
    ranges: [{ sheet: 0, c0: 0, r0: 0, c1: 1, r1: 1 }],
    cells: [
      { s: 0, c: 0, r: 0, v: { num: 41 }, d: "41" },
      { s: 0, c: 1, r: 0, v: { num: 1 }, d: "1" },
      { s: 0, c: 0, r: 1, v: { num: 42 }, d: "42" },
      { s: 0, c: 1, r: 1, v: { err: "#CYCLE!" }, d: "#CYCLE!" },
    ],
  };
}

function displayOf(cell) {
  if (!cell) return "";
  if (cell.v.err !== undefined) return cell.v.err;
  if (cell.v.num !== undefined) return cell.d;
  if (cell.v.str !== undefined) return cell.v.str;
  if (cell.v.bool !== undefined) return cell.v.bool ? "TRUE" : "FALSE";
  return "";
}

function isError(cell) { return !!cell && cell.v.err !== undefined; }

/* Consumer: apply one DirtyBatch (drops stale sequences, last-writer-wins). */
function renderSnapshot(batch) {
  if (batch.seq <= lastSeq) return false;
  lastSeq = batch.seq;
  for (const cell of batch.cells) model.set(cell.s + ":" + cell.c + ":" + cell.r, cell);
  paint(batch.ranges);
  batchEl.textContent = "seq=" + batch.seq + " ranges=" + batch.ranges.length +
    " cells=" + batch.cells.length;
  statusEl.textContent = "snapshot seq " + batch.seq + " applied (" +
    batch.cells.length + " cells, stub core)";
  return true;
}

function paint(ranges) {
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);
  ctx.font = "13px monospace";
  const cols = Math.ceil((W - HEAD_W) / COL_W), rows = Math.ceil((H - HEAD_H) / ROW_H);
  for (let c = 0; c <= cols; c++) {
    for (let r = 0; r <= rows; r++) {
      const x = HEAD_W + c * COL_W, y = HEAD_H + r * ROW_H;
      if (c === cols || r === rows) continue;
      const key = "0:" + c + ":" + r;
      const cell = model.get(key);
      const sel = selected.c === c && selected.r === r;
      ctx.fillStyle = sel ? "#1d2b4d" : "#151d33";
      ctx.fillRect(x, y, COL_W, ROW_H);
      ctx.strokeStyle = sel ? "#5ad1a5" : "#2b3654";
      ctx.strokeRect(x + 0.5, y + 0.5, COL_W, ROW_H);
      if (cell) {
        ctx.fillStyle = isError(cell) ? "#f26d6d" : "#e6ebf5";
        ctx.fillText(displayOf(cell).slice(0, 12), x + 6, y + 19);
      }
    }
  }
  ctx.fillStyle = "#0c1222";
  ctx.fillRect(0, 0, W, HEAD_H); ctx.fillRect(0, 0, HEAD_W, H);
  ctx.fillStyle = "#93a0bb";
  for (let c = 0; c < cols; c++) ctx.fillText(colLetters(c), HEAD_W + c * COL_W + 6, 19);
  for (let r = 0; r < rows; r++) ctx.fillText(String(r + 1), 6, HEAD_H + r * ROW_H + 19);
  void ranges;
}

function inspect() {
  const key = selected.s + ":" + selected.c + ":" + selected.r;
  const cell = model.get(key);
  const a1 = colLetters(selected.c) + (selected.r + 1);
  addrEl.textContent = a1;
  if (!cell) {
    formulaEl.value = "";
    inspectorEl.textContent = a1 + ": blank\nprecedents: []\ndependents: []\nPhase 4 traces these through the Core graph.";
    return;
  }
  formulaEl.value = isError(cell) ? displayOf(cell) : "=" + displayOf(cell);
  inspectorEl.textContent = a1 + ": " + displayOf(cell) +
    "\nprecedents: [Phase 4: Core graph]\ntopo rank: [Phase 4]\ncycle path: " +
    (cell.v.err === "#CYCLE!" ? "self-demo (stub)" : "none") + ".";
}

canvas.addEventListener("click", (ev) => {
  const rect = canvas.getBoundingClientRect();
  const px = (ev.clientX - rect.left) * (canvas.width / rect.width);
  const py = (ev.clientY - rect.top) * (canvas.height / rect.height);
  const c = Math.floor((px - HEAD_W) / COL_W), r = Math.floor((py - HEAD_H) / ROW_H);
  if (c < 0 || r < 0) return;
  selected = { s: 0, c, r };
  paint([]);
  inspect();
});

if ("serviceWorker" in navigator && location.hostname !== "") {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}

renderSnapshot(stubBatch());
inspect();
badgeEl.textContent = "stub snapshot seq " + lastSeq + " - WASM proof pending";
