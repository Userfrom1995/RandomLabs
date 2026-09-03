/* Tabula app.js (Phase 4): boot plus module wiring.
 *
 * Data path: every mutation goes to the engine as source text; the engine
 * runs the dependency graph and returns one DirtyBatch; the grid paints the
 * batch. The UI never evaluates and never parses formulas itself.
 * Display rows map through a view index (sort/filter); model addresses stay
 * stable so references never taint.
 */
"use strict";

(function () {
  const E = window.Tabula.engine;
  const wb = E.createWorkbook();
  let sheet = 0;
  let lastSeq = 0;
  const model = new Map(); // "c:r" (display-col:model-col, model row) -> {d, err, style}
  let rowMap = []; // display row -> model row
  let view = { sort: null, filter: null };
  let copySidecar = null; // {sheet, c0, r0, c1, r1} in model coords
  let lastInspectorSource = "";

  const canvas = document.getElementById("grid");
  const statusEl = document.getElementById("status");
  const batchEl = document.getElementById("batch");
  const viewFlagEl = document.getElementById("view-flag");
  const formulaEl = document.getElementById("formula");
  const addrEl = document.getElementById("addr");
  const badgeEl = document.getElementById("core-badge");

  const mkey = (c, r) => c + ":" + r;
  const skey = (c, r) => sheet + ":" + c + ":" + r;

  function dataExtent() {
    let mc = 0, mr = 0;
    const sh = wb.sheets[sheet];
    if (sh) {
      for (const k of sh.cells.keys()) {
        const [c, r] = k.split(":").map(Number);
        if (c > mc) mc = c;
        if (r > mr) mr = r;
      }
    }
    return { c: mc, r: mr };
  }

  function valueAt(s, c, r) {
    return wb.values.get(s + ":" + c + ":" + r) || E.values.blank();
  }

  function rebuildView() {
    const ext = dataExtent();
    const total = Math.max(ext.r + 80, 200);
    grid.setRows(total + 1);
    grid.setCols(Math.max(ext.c + 12, 26));
    if (!view.sort && !view.filter) {
      rowMap = [];
      for (let r = 0; r <= total; r++) rowMap.push(r);
      return;
    }
    const headN = ext.r + 1;
    const head = [];
    for (let r = 0; r < headN; r++) head.push(r);
    const v = {
      filter: view.filter ? { k: view.filter.k, q: view.filter.q, x: view.filter.x } : null,
      sort: view.sort ? {
        col: view.sort.col,
        ascending: view.sort.ascending,
        valueAt: (r) => valueAt(sheet, view.sort.col, r),
      } : null,
    };
    const mapped = window.Tabula.views.applyView(head, (r) => valueAt(sheet, (view.filter || view.sort).col, r), v);
    rowMap = mapped.slice();
    for (let r = headN; r <= total; r++) rowMap.push(r);
  }

  function getCell(c, rd) {
    const mr = rowMap[rd];
    if (mr === undefined) return null;
    return model.get(mkey(c, mr)) || null;
  }

  function renderSnapshot(batch) {
    if (batch.seq <= lastSeq) return false;
    lastSeq = batch.seq;
    for (const cell of batch.cells) {
      if (cell.s !== sheet) continue;
      model.set(mkey(cell.c, cell.r), {
        d: cell.d,
        err: cell.v.err !== undefined,
        style: wb.styles.get(skey(cell.c, cell.r)) || null,
      });
    }
    batchEl.textContent = "seq=" + batch.seq + " ranges=" + batch.ranges.length +
      " cells=" + batch.cells.length;
    statusEl.textContent = "snapshot seq " + batch.seq + " applied (" + batch.cells.length + " cells)";
    updateViewFlag();
    grid.paint();
    refreshInspector();
    return true;
  }

  function fullRefresh(reason) {
    model.clear();
    const batch = E.fullSnapshot(wb);
    lastSeq = 0;
    rebuildView();
    renderSnapshot(batch);
    renderSheets();
    if (reason) statusEl.textContent = reason + " - " + statusEl.textContent;
  }

  function updateViewFlag() {
    const parts = [];
    if (view.sort) parts.push("sorted col " + E.a1(view.sort.col, 0).replace(/[0-9]+$/, "") + (view.sort.ascending ? " asc" : " desc"));
    if (view.filter) parts.push("filtered");
    viewFlagEl.textContent = parts.length ? "view: " + parts.join(", ") + " (refs unaffected)" : "";
  }

  // ---------------------------------------------------------- selection

  function selModelRect() {
    const sel = grid.selection();
    return {
      c0: sel.c0, c1: sel.c1,
      r0: rowMap[sel.r0], r1: rowMap[sel.r1],
      dc0: sel.c0, dr0: sel.r0, dc1: sel.c1, dr1: sel.r1,
    };
  }

  function onSelect() {
    const sel = grid.selection();
    const mr = rowMap[sel.anchor.r];
    const a1 = E.a1(sel.anchor.c, mr);
    addrEl.textContent = a1;
    const info = E.inspect(wb, sheet, sel.anchor.c, mr);
    lastInspectorSource = info.source;
    if (!formulaEl || document.activeElement !== formulaEl) {
      if (formulaEl) formulaEl.value = info.source;
    }
    refreshInspector(info);
  }

  function refreshInspector(cached) {
    const sel = grid.selection();
    const mr = rowMap[sel.anchor.r];
    const info = cached || E.inspect(wb, sheet, sel.anchor.c, mr);
    if (!info.isFormula && info.source === "" && info.display === "") {
      inspector.blank(E.a1(sel.anchor.c, mr));
    } else {
      inspector.render(info);
    }
  }

  // -------------------------------------------------------------- commit

  function commitDisplay(c, rd, raw) {
    const mr = rowMap[rd];
    grid.ensureSize(c, rd);
    const batch = E.applyEdit(wb, { op: "set", s: sheet, c, r: mr, raw });
    rebuildView();
    renderSnapshot(batch);
  }

  // ---------------------------------------------------------------- grid

  const grid = window.Tabula.grid.create(canvas, { getCell, onSelect });
  const inspector = window.Tabula.inspector.create(document.getElementById("inspector"), {
    onJump: (c, r) => {
      // Jump to a model address: clear the view first so the row is visible.
      view = { sort: null, filter: null };
      rebuildView();
      const dr = rowMap.indexOf(r);
      grid.select(c, dr < 0 ? r : dr);
    },
  });
  const editor = window.Tabula.editor.create({
    formulaEl, addrEl, grid,
    getSource: (c, rd) => {
      const mr = rowMap[rd];
      return E.inspect(wb, sheet, c, mr).source;
    },
    commit: commitDisplay,
    onNavigate: () => onSelect(),
  });
  window.Tabula.format.create(document.getElementById("format-panel"), {
    apply: (style) => {
      const rect = selModelRect();
      for (let r = rect.r0; r <= rect.r1; r++) {
        for (let c = rect.c0; c <= rect.c1; c++) {
          E.applyEdit(wb, { op: "style", s: sheet, c, r, style });
          const cell = model.get(mkey(c, r));
          if (cell) cell.style = style;
        }
      }
      batchEl.textContent = "style applied (no recalc) @" + lastSeq;
      grid.paint();
      refreshInspector();
    },
  });
  window.Tabula.views.create(document.getElementById("views-panel"), {
    sort: (col, ascending) => {
      const sel = grid.selection();
      const mc = col === null || col === undefined ? sel.anchor.c : col;
      view.sort = { col: mc, ascending };
      rebuildView();
      grid.paint();
      onSelect();
      updateViewFlag();
      statusEl.textContent = "view sorted by " + E.a1(mc, 0).replace(/[0-9]+$/, "") + (ascending ? " ascending" : " descending") + " (model order kept)";
    },
    filter: (col, rule) => {
      const sel = grid.selection();
      const mc = col === null || col === undefined ? sel.anchor.c : col;
      if (!rule) {
        view.filter = null;
      } else {
        view.filter = Object.assign({ col: mc }, rule);
      }
      rebuildView();
      grid.paint();
      onSelect();
      updateViewFlag();
      statusEl.textContent = rule ? "view filtered (model order kept)" : "filter cleared";
    },
    clear: () => {
      view = { sort: null, filter: null };
      rebuildView();
      grid.paint();
      onSelect();
      updateViewFlag();
    },
    freeze: (mode) => {
      if (mode === "none") {
        grid.setFreeze(0, 0);
        statusEl.textContent = "panes unfrozen";
      } else {
        const sel = grid.selection();
        grid.setFreeze(sel.anchor.c, rowMap[sel.anchor.r]);
        statusEl.textContent = "frozen above/left of " + E.a1(sel.anchor.c, rowMap[sel.anchor.r]);
      }
    },
    insertDelete: (kind) => {
      const sel = grid.selection();
      const mr = rowMap[sel.anchor.r];
      const map = {
        insertRow: { op: "insertRows", s: sheet, at: mr, count: 1 },
        deleteRow: { op: "deleteRows", s: sheet, at: mr, count: 1 },
        insertCol: { op: "insertCols", s: sheet, at: sel.anchor.c, count: 1 },
        deleteCol: { op: "deleteCols", s: sheet, at: sel.anchor.c, count: 1 },
      };
      const batch = E.applyEdit(wb, map[kind]);
      rebuildView();
      renderSnapshot(batch);
    },
  });

  // ------------------------------------------------------------ clipboard

  function copySelection(cut) {
    const rect = selModelRect();
    copySidecar = { sheet, c0: rect.c0, r0: rect.r0, c1: rect.c1, r1: rect.r1 };
    const tsv = window.Tabula.storage.cellsToTSV(wb, sheet, rect, false);
    writeClipboard(tsv);
    if (cut) {
      for (let r = rect.r0; r <= rect.r1; r++) {
        for (let c = rect.c0; c <= rect.c1; c++) {
          E.applyEdit(wb, { op: "set", s: sheet, c, r, raw: "" });
        }
      }
      rebuildView();
      renderSnapshot(E.fullSnapshot(wb));
    } else {
      statusEl.textContent = "copied " + E.a1(rect.c0, rect.r0) + ":" + E.a1(rect.c1, rect.r1);
    }
  }

  function writeClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).catch(() => fallbackCopy(text));
    } else fallbackCopy(text);
  }

  function fallbackCopy(text) {
    const ta = document.createElement("textarea");
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand("copy"); } catch (e) { /* clipboard unavailable */ }
    ta.remove();
  }

  async function pasteAt() {
    let text = "";
    try {
      text = await navigator.clipboard.readText();
    } catch (e) {
      statusEl.textContent = "clipboard read blocked - grant permission and retry";
      return;
    }
    const sel = grid.selection();
    const dst = { c: sel.anchor.c, r: rowMap[sel.anchor.r] };
    const grid2 = window.Tabula.storage.parseTSV(text);
    const rows = grid2.length, cols = grid2[0].length;
    if (copySidecar && copySidecar.sheet === sheet &&
        copySidecar.c1 - copySidecar.c0 + 1 === cols &&
        copySidecar.r1 - copySidecar.r0 + 1 === rows) {
      // In-app paste: formulas translate by the paste law.
      const items = E.previewPaste(wb, copySidecar.sheet, {
        c0: copySidecar.c0, r0: copySidecar.r0, c1: copySidecar.c1, r1: copySidecar.r1,
      }, sheet, dst);
      for (const [a, raw] of items) E.applyEdit(wb, { op: "set", s: a.s, c: a.c, r: a.r, raw });
    } else {
      // Foreign text: values only, never formulas (injection guard).
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          let raw = grid2[r][c];
          if (raw[0] === "=" || raw[0] === "+") raw = "'" + raw;
          E.applyEdit(wb, { op: "set", s: sheet, c: dst.c + c, r: dst.r + r, raw });
        }
      }
    }
    rebuildView();
    renderSnapshot(E.fullSnapshot(wb));
  }

  function fillSelection() {
    const rect = selModelRect();
    const singleRow = rect.r0 === rect.r1, singleCol = rect.c0 === rect.c1;
    const axis = singleRow && !singleCol ? "col" : "row";
    const count = axis === "row" ? Math.max(1, rect.r1 - rect.r0 + 1) : Math.max(1, rect.c1 - rect.c0 + 1);
    const src = [];
    for (let r = rect.r0; r <= rect.r1; r++) {
      for (let c = rect.c0; c <= rect.c1; c++) src.push({ c, r });
    }
    const items = E.previewFill(wb, sheet, src, axis, singleRow && singleCol ? 10 : count);
    for (const [pos, raw] of items) E.applyEdit(wb, { op: "set", s: sheet, c: pos.c, r: pos.r, raw });
    rebuildView();
    renderSnapshot(E.fullSnapshot(wb));
    statusEl.textContent = "filled " + items.length + " cells " + (axis === "row" ? "down" : "right");
  }

  // --------------------------------------------------------------- sheets

  function renderSheets() {
    const bar = document.getElementById("sheets");
    bar.innerHTML = "";
    wb.sheets.forEach((sh, i) => {
      const b = document.createElement("button");
      b.textContent = sh.name;
      if (i === sheet) b.classList.add("tab");
      b.addEventListener("click", () => {
        sheet = i;
        view = { sort: null, filter: null };
        fullRefresh("switched to " + sh.name);
      });
      bar.appendChild(b);
    });
    const add = document.createElement("button");
    add.textContent = "+ sheet";
    add.addEventListener("click", () => {
      const name = "Sheet" + (wb.sheets.length + 1);
      E.applyEdit(wb, { op: "addSheet", name });
      sheet = wb.sheets.length - 1;
      fullRefresh("added " + name);
    });
    bar.appendChild(add);
  }

  // ---------------------------------------------------------------- events

  document.getElementById("btn-copy").addEventListener("click", () => copySelection(false));
  document.getElementById("btn-cut").addEventListener("click", () => copySelection(true));
  document.getElementById("btn-paste").addEventListener("click", pasteAt);
  document.getElementById("btn-fill").addEventListener("click", fillSelection);
  document.getElementById("btn-undo").addEventListener("click", () => {
    const batch = E.applyEdit(wb, { op: "undo" });
    rebuildView();
    renderSnapshot(batch);
  });
  document.getElementById("btn-clear").addEventListener("click", () => {
    const rect = selModelRect();
    for (let r = rect.r0; r <= rect.r1; r++) {
      for (let c = rect.c0; c <= rect.c1; c++) {
        E.applyEdit(wb, { op: "set", s: sheet, c, r, raw: "" });
      }
    }
    rebuildView();
    renderSnapshot(E.fullSnapshot(wb));
  });
  document.getElementById("btn-save").addEventListener("click", () => {
    window.Tabula.storage.download("tabula-workbook.json", E.toJSON(wb), "application/json");
    statusEl.textContent = "workbook saved as JSON (formulas as source text)";
  });
  document.getElementById("btn-load").addEventListener("click", () => {
    document.getElementById("file").click();
  });
  document.getElementById("file").addEventListener("change", async (ev) => {
    const f = ev.target.files[0];
    if (!f) return;
    try {
      const text = await window.Tabula.storage.readFile(f);
      E.fromJSON(wb, text);
      sheet = 0;
      view = { sort: null, filter: null };
      fullRefresh("loaded " + f.name);
    } catch (e) {
      statusEl.textContent = "load failed: " + e.message;
    }
    ev.target.value = "";
  });
  document.getElementById("btn-csv").addEventListener("click", () => {
    window.Tabula.storage.download("tabula-sheet.csv", E.exportCSV(wb, sheet), "text/csv");
    statusEl.textContent = "exported computed values as CSV (General rendering, ISO dates)";
  });

  document.addEventListener("keydown", (ev) => {
    if (editor.active) return;
    const tag = (document.activeElement && document.activeElement.tagName) || "";
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
    const sel = grid.selection();
    const anchor = sel.anchor;
    const withShift = (c, r) => grid.select(c, r, ev.shiftKey);
    if (ev.key === "ArrowLeft") { ev.preventDefault(); withShift(Math.max(0, anchor.c - 1), anchor.r); }
    else if (ev.key === "ArrowRight") { ev.preventDefault(); withShift(anchor.c + 1, anchor.r); }
    else if (ev.key === "ArrowUp") { ev.preventDefault(); withShift(anchor.c, Math.max(0, anchor.r - 1)); }
    else if (ev.key === "ArrowDown") { ev.preventDefault(); withShift(anchor.c, anchor.r + 1); }
    else if (ev.key === "Enter" || ev.key === "F2") { ev.preventDefault(); editor.begin(anchor.c, anchor.r); }
    else if (ev.key === "Delete" || ev.key === "Backspace") {
      ev.preventDefault();
      document.getElementById("btn-clear").click();
    }
    else if (ev.key === "Tab") { ev.preventDefault(); withShift(ev.shiftKey ? Math.max(0, anchor.c - 1) : anchor.c + 1, anchor.r); }
    else if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === "c") { ev.preventDefault(); copySelection(false); }
    else if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === "x") { ev.preventDefault(); copySelection(true); }
    else if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === "v") { ev.preventDefault(); pasteAt(); }
    else if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === "z") { ev.preventDefault(); document.getElementById("btn-undo").click(); }
    else if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === "s") { ev.preventDefault(); document.getElementById("btn-save").click(); }
    else if (ev.key.length === 1 && !ev.ctrlKey && !ev.metaKey && !ev.altKey) {
      editor.begin(anchor.c, anchor.r, ev.key);
    }
  });

  canvas.addEventListener("touchstart", (ev) => {
    const t = ev.touches[0];
    const rect = canvas.getBoundingClientRect();
    // Reuse mouse path via a synthetic event.
    canvas.dispatchEvent(new MouseEvent("mousedown", {
      clientX: t.clientX, clientY: t.clientY,
      bubbles: true, cancelable: true,
    }));
    void rect;
  }, { passive: true });

  canvas.addEventListener("dblclick", () => {
    const sel = grid.selection();
    editor.begin(sel.anchor.c, sel.anchor.r);
  });

  if ("serviceWorker" in navigator && location.hostname !== "") {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }

  // ------------------------------------------------------------------ boot

  grid.refit();
  window.Tabula.sample.load(E, wb);
  fullRefresh("sample workbook loaded");
  grid.select(0, 0);
  badgeEl.textContent = "JS fallback core seq " + lastSeq + " - WASM proof pending";
})();
