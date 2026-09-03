/* Tabula storage.js (Phase 4): clipboard TSV plus file save/load.
 *
 * Copy/paste moves TSV through the system clipboard with a JSON sidecar for
 * in-app fidelity (formulas survive inside Tabula; plain text lands in other
 * apps). CSV import never creates formulas unless the user confirms formula
 * mode (injection guard, mirrors Swift Codecs). OPFS autosave lands in
 * Phase 5; until then work persists via explicit file save plus an
 * in-memory session.
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

  T.storage = { cellsToTSV, parseTSV, download, readFile };
})(window.Tabula);
