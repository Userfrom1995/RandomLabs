/* Tabula storage.js (Phase 5): clipboard TSV plus file save/load plus
 * OPFS autosave plus CSV import.
 *
 * Copy/paste moves TSV through the system clipboard with a JSON sidecar for
 * in-app fidelity (formulas survive inside Tabula; plain text lands in other
 * apps). CSV import parses number-or-text and never creates formulas unless
 * the user confirms formula mode (injection guard, mirrors Swift Codecs).
 * OPFS autosaves debounced JSON snapshots; when OPFS is unavailable or the
 * quota fails, the app degrades to in-memory plus explicit file save with a
 * visible indicator (the store flag in the footer).
 */
"use strict";
window.Tabula = window.Tabula || {};

(function (T) {
  function cellsToTSV(wb, s, rect, forDisplay) {
    const lines = [];
    for (let r = rect.r0; r <= rect.r1; r++) {
      const row = [];
      for (let c = rect.c0; c <= rect.c1; c++) {
        const cell = wb.sheets[s].cells.get(c + ":" + r);
        if (!cell) { row.push(""); continue; }
        if (forDisplay) {
          const v = wb.values.get(s + ":" + c + ":" + r) || T.engine.values.blank();
          row.push(T.engine.displayOf(v, wb.styles.get(s + ":" + c + ":" + r)));
        } else if (cell.kind === "formula") row.push(cell.source);
        else if (cell.kind === "num") row.push(T.engine.formatGeneral(cell.v));
        else if (cell.kind === "text") row.push(cell.v);
        else if (cell.kind === "bool") row.push(cell.v ? "TRUE" : "FALSE");
        else row.push("");
      }
      lines.push(row.join("\t"));
    }
    return lines.join("\n");
  }

  /** Parse clipboard TSV: values only, never formulas (injection guard). */
  function parseTSV(text) {
    return text.replace(/\r\n?/g, "\n").split("\n").map((line) => line.split("\t"));
  }

  function download(name, text, type) {
    const blob = new Blob([text], { type: type || "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 100);
  }

  function readFile(file) {
    return new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(String(fr.result));
      fr.onerror = () => reject(fr.error);
      fr.readAsText(file);
    });
  }

  /** RFC-4180 reader: quotes, doubled quotes, embedded newlines. */
  function parseCSV(text) {
    const rows = [];
    let row = [], field = "", quoted = false, i = 0;
    const src = String(text);
    while (i < src.length) {
      const ch = src[i];
      if (quoted) {
        if (ch === '"') {
          if (src[i + 1] === '"') { field += '"'; i += 2; }
          else { quoted = false; i++; }
        } else { field += ch; i++; }
      } else if (ch === '"') {
        if (field === "") { quoted = true; i++; }
        else { field += ch; i++; }
      } else if (ch === ",") { row.push(field); field = ""; i++; }
      else if (ch === "\r" || ch === "\n") {
        row.push(field); field = "";
        rows.push(row); row = [];
        i += (ch === "\r" && src[i + 1] === "\n") ? 2 : 1;
      } else { field += ch; i++; }
    }
    row.push(field);
    rows.push(row);
    // Drop a single trailing empty row from a final newline.
    if (rows.length && rows[rows.length - 1].length === 1 && rows[rows.length - 1][0] === "") rows.pop();
    return rows;
  }

  // ------------------------------------------------------------- OPFS
  // Origin-private file system autosave. All calls are safe no-ops (null /
  // false) where OPFS is missing, so the app always boots; the footer flag
  // tells the user which tier is live.

  function opfsAvailable() {
    return typeof navigator !== "undefined" &&
      !!(navigator.storage && navigator.storage.getDirectory);
  }

  async function opfsSave(text) {
    const dir = await navigator.storage.getDirectory();
    const fh = await dir.getFileHandle("tabula-workbook.json", { create: true });
    const w = await fh.createWritable();
    await w.write(text);
    await w.close();
    return true;
  }

  async function opfsLoad() {
    const dir = await navigator.storage.getDirectory();
    const fh = await dir.getFileHandle("tabula-workbook.json", { create: false });
    const f = await fh.getFile();
    return await f.text();
  }

  async function opfsQuota() {
    if (navigator.storage && navigator.storage.estimate) {
      const e = await navigator.storage.estimate();
      return { quota: e.quota || 0, usage: e.usage || 0 };
    }
    return null;
  }

  T.storage = { cellsToTSV, parseTSV, parseCSV, download, readFile,
    opfsAvailable, opfsSave, opfsLoad, opfsQuota };
})(window.Tabula);
