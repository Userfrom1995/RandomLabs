/* Tabula grid.js (Phase 4): virtualized canvas renderer.
 *
 * Paints only the visible window plus overscan; scroll is O(visible) canvas
 * ops with zero recalc (the engine batch model is read, never computed).
 * Freeze panes split the viewport into up to four synchronized quadrants
 * sharing the same snapshot source. Column widths and row heights are
 * cached arrays; resize drags update them without touching the engine.
 */
"use strict";
window.Tabula = window.Tabula || {};

(function (T) {
  const DEF_W = 96, DEF_H = 28, HEAD_W = 48, HEAD_H = 28;
  const OVERSCAN = 2;

  function createGrid(canvas, opts) {
    const o = Object.assign({
      cols: 26, rows: 200,
      getCell: (c, r) => null, // -> {d, err, style} | null
      onSelect: (sel) => {},
    }, opts || {});
    const ctx = canvas.getContext("2d");
    const G = {
      scrollX: 0, scrollY: 0, // pixel offsets into the non-frozen region
      sel: { c: 0, r: 0 }, selEnd: null,
      freezeC: 0, freezeR: 0,
      colW: new Array(o.cols).fill(DEF_W),
      rowH: newClassRows(o.rows),
      hover: null,
    };
    function newClassRows(n) { return new Array(n).fill(DEF_H); }

    function ensureSize(c, r) {
      while (G.colW.length <= c) G.colW.push(DEF_W);
      while (G.rowH.length <= r) G.rowH.push(DEF_H);
      if (o.cols < G.colW.length) o.cols = G.colW.length;
      if (o.rows < G.rowH.length) o.rows = G.rowH.length;
    }

    function fitCanvas() {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      const w = Math.max(320, Math.floor(rect.width)), h = Math.max(200, Math.floor(rect.height));
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      G.cssW = w; G.cssH = h;
    }

    function frozenW() {
      let w = 0;
      for (let c = 0; c < G.freezeC; c++) w += G.colW[c] || DEF_W;
      return w;
    }

    function frozenH() {
      let h = 0;
      for (let r = 0; r < G.freezeR; r++) h += G.rowH[r] || DEF_H;
      return h;
    }

    /** First visible non-frozen cell + pixel remainder for a scroll offset. */
    function axisLayout(sizes, scroll, frozen) {
      let acc = 0, i = frozen;
      while (i < sizes.length && acc + sizes[i] <= scroll) { acc += sizes[i]; i++; }
      return { first: i, rem: scroll - acc };
    }

    function visibleCols() {
      const fw = frozenW();
      const lay = axisLayout(G.colW, G.scrollX, G.freezeC);
      const out = [];
      for (let c = 0; c < G.freezeC; c++) out.push({ c, frozen: true });
      let x = HEAD_W + fw - lay.rem;
      for (let c = lay.first; c < G.colW.length && x < G.cssW + DEF_W; c++) {
        out.push({ c, x, frozen: false });
        x += G.colW[c];
      }
      return { list: out, lay };
    }

    function visibleRows() {
      const fh = frozenH();
      const lay = axisLayout(G.rowH, G.scrollY, G.freezeR);
      const out = [];
      for (let r = 0; r < G.freezeR; r++) out.push({ r, frozen: true });
      let y = HEAD_H + fh - lay.rem;
      for (let r = lay.first; r < G.rowH.length && y < G.cssH + DEF_H; r++) {
        out.push({ r, y, frozen: false });
        y += G.rowH[r];
      }
      return { list: out, lay };
    }

    function colX(c) {
      if (c < G.freezeC) {
        let x = HEAD_W;
        for (let i = 0; i < c; i++) x += G.colW[i];
        return x;
      }
      const lay = axisLayout(G.colW, G.scrollX, G.freezeC);
      if (c < lay.first) return null;
      let x = HEAD_W + frozenW() - lay.rem;
      for (let i = lay.first; i < c; i++) x += G.colW[i];
      return x;
    }

    function rowY(r) {
      if (r < G.freezeR) {
        let y = HEAD_H;
        for (let i = 0; i < r; i++) y += G.rowH[i];
        return y;
      }
      const lay = axisLayout(G.rowH, G.scrollY, G.freezeR);
      if (r < lay.first) return null;
      let y = HEAD_H + frozenH() - lay.rem;
      for (let i = lay.first; i < r; i++) y += G.rowH[i];
      return y;
    }

    function inSel(c, r) {
      const e = G.selEnd || G.sel;
      const c0 = Math.min(G.sel.c, e.c), c1 = Math.max(G.sel.c, e.c);
      const r0 = Math.min(G.sel.r, e.r), r1 = Math.max(G.sel.r, e.r);
      return c >= c0 && c <= c1 && r >= r0 && r <= r1;
    }

    function paint() {
      if (!G.cssW) fitCanvas();
      const W = G.cssW, H = G.cssH;
      ctx.clearRect(0, 0, W, H);
      ctx.font = "13px ui-monospace, SFMono-Regular, Menlo, monospace";
      const cols = visibleCols().list, rows = visibleRows().list;
      const xOf = new Map(), yOf = new Map();
      for (const vc of cols) xOf.set(vc.c, vc.frozen ? colX(vc.c) : (vc.x !== undefined ? vc.x : colX(vc.c)));
      for (const vr of rows) yOf.set(vr.r, vr.frozen ? rowY(vr.r) : (vr.y !== undefined ? vr.y : rowY(vr.r)));
      for (const vr of rows) {
        for (const vc of cols) {
          const x = xOf.get(vc.c), y = yOf.get(vr.r);
          const w = G.colW[vc.c], h = G.rowH[vr.r];
          const sel = inSel(vc.c, vr.r);
          const cell = o.getCell(vc.c, vr.r);
          const base = cell && cell.style && cell.style.fillRGB ? cell.style.fillRGB : "#151d33";
          ctx.fillStyle = sel ? "#1d2b4d" : base;
          ctx.fillRect(x, y, w, h);
          ctx.strokeStyle = sel ? "#5ad1a5" : "#2b3654";
          ctx.lineWidth = 1;
          ctx.strokeRect(x + 0.5, y + 0.5, w, h);
          if (cell && cell.d) {
            ctx.fillStyle = cell.err ? "#f26d6d" : "#e6ebf5";
            const label = cell.d.length > 18 ? cell.d.slice(0, 17) + "…" : cell.d;
            let tx = x + 6, align = "left";
            if (cell.style && cell.style.alignment === "right") { tx = x + w - 6; align = "right"; }
            if (cell.style && cell.style.alignment === "center") { tx = x + w / 2; align = "center"; }
            ctx.textAlign = align;
            if (cell.style && cell.style.bold) ctx.font = "bold 13px ui-monospace, Menlo, monospace";
            ctx.fillText(label, tx, y + h / 2 + 5);
            ctx.font = "13px ui-monospace, SFMono-Regular, Menlo, monospace";
            ctx.textAlign = "left";
          }
        }
      }
      // Headers.
      ctx.fillStyle = "#0c1222";
      ctx.fillRect(0, 0, W, HEAD_H);
      ctx.fillRect(0, 0, HEAD_W, H);
      ctx.fillStyle = "#93a0bb";
      for (const vc of cols) {
        const x = xOf.get(vc.c);
        ctx.fillText(T.engine.colEncode(vc.c) || "?", x + 6, 19);
      }
      for (const vr of rows) {
        const y = yOf.get(vr.r);
        ctx.fillText(String(vr.r + 1), 6, y + (G.rowH[vr.r] / 2 + 5));
      }
      // Freeze lines.
      ctx.strokeStyle = "#5ad1a5";
      if (G.freezeC > 0) {
        const x = HEAD_W + frozenW();
        ctx.beginPath(); ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, H); ctx.stroke();
      }
      if (G.freezeR > 0) {
        const y = HEAD_H + frozenH();
        ctx.beginPath(); ctx.moveTo(0, y + 0.5); ctx.lineTo(W, y + 0.5); ctx.stroke();
      }
    }

    function eventCell(ev) {
      const rect = canvas.getBoundingClientRect();
      const px = ev.clientX - rect.left, py = ev.clientY - rect.top;
      if (px < HEAD_W || py < HEAD_H) return null;
      const cols = visibleCols().list, rows = visibleRows().list;
      let fc = -1, fr = -1;
      for (const vc of cols) {
        const x = vc.frozen ? colX(vc.c) : (vc.x !== undefined ? vc.x : colX(vc.c));
        if (px >= x && px < x + G.colW[vc.c]) { fc = vc.c; break; }
      }
      for (const vr of rows) {
        const y = vr.frozen ? rowY(vr.r) : (vr.y !== undefined ? vr.y : rowY(vr.r));
        if (py >= y && py < y + G.rowH[vr.r]) { fr = vr.r; break; }
      }
      return fc >= 0 && fr >= 0 ? { c: fc, r: fr } : null;
    }

    /** Header edge within 4px for resize, or null. */
    function edgeAt(ev) {
      const rect = canvas.getBoundingClientRect();
      const px = ev.clientX - rect.left, py = ev.clientY - rect.top;
      if (py < HEAD_H && px >= HEAD_W) {
        const cols = visibleCols().list;
        for (const vc of cols) {
          const x = vc.frozen ? colX(vc.c) : (vc.x !== undefined ? vc.x : colX(vc.c));
          const edge = x + G.colW[vc.c];
          if (Math.abs(px - edge) <= 4) return { axis: "col", i: vc.c };
        }
      }
      if (px < HEAD_W && py >= HEAD_H) {
        const rows = visibleRows().list;
        for (const vr of rows) {
          const y = vr.frozen ? rowY(vr.r) : (vr.y !== undefined ? vr.y : rowY(vr.r));
          const edge = y + G.rowH[vr.r];
          if (Math.abs(py - edge) <= 4) return { axis: "row", i: vr.r };
        }
      }
      return null;
    }

    let drag = null;
    canvas.addEventListener("mousedown", (ev) => {
      const edge = edgeAt(ev);
      if (edge) {
        drag = { mode: "resize", edge, start: edge.axis === "col" ? ev.clientX : ev.clientY };
        ev.preventDefault();
        return;
      }
      const cell = eventCell(ev);
      if (!cell) return;
      ensureSize(cell.c, cell.r);
      drag = { mode: "select", anchor: ev.shiftKey ? G.sel : cell };
      G.sel = ev.shiftKey ? G.sel : cell;
      G.selEnd = cell;
      paint();
      o.onSelect(selection());
    });
    window.addEventListener("mousemove", (ev) => {
      if (!drag) return;
      if (drag.mode === "resize") {
        const cur = drag.edge.axis === "col" ? ev.clientX : ev.clientY;
        const delta = (cur - drag.start) / (window.devicePixelRatio || 1);
        if (drag.edge.axis === "col") {
          G.colW[drag.edge.i] = Math.max(32, G.colW[drag.edge.i] + delta);
        } else {
          G.rowH[drag.edge.i] = Math.max(16, G.rowH[drag.edge.i] + delta);
        }
        drag.start = cur;
        paint();
        return;
      }
      const cell = eventCell(ev);
      if (cell) {
        ensureSize(cell.c, cell.r);
        G.sel = drag.anchor;
        G.selEnd = cell;
        paint();
        o.onSelect(selection());
      }
    });
    window.addEventListener("mouseup", () => { drag = null; });

    canvas.addEventListener("wheel", (ev) => {
      ev.preventDefault();
      G.scrollX = Math.max(0, G.scrollX + ev.deltaX + (ev.shiftKey ? ev.deltaY : 0));
      G.scrollY = Math.max(0, G.scrollY + (ev.shiftKey ? 0 : ev.deltaY));
      paint();
    }, { passive: false });

    function selection() {
      const e = G.selEnd || G.sel;
      return {
        anchor: { c: G.sel.c, r: G.sel.r },
        c0: Math.min(G.sel.c, e.c), r0: Math.min(G.sel.r, e.r),
        c1: Math.max(G.sel.c, e.c), r1: Math.max(G.sel.r, e.r),
      };
    }

    function select(c, r, extend) {
      ensureSize(c, r);
      if (extend) G.selEnd = { c, r };
      else { G.sel = { c, r }; G.selEnd = null; }
      scrollIntoView(c, r);
      paint();
      o.onSelect(selection());
    }

    function scrollIntoView(c, r) {
      const x = colX(c), y = rowY(r);
      if (x === null || y === null) return;
      if (x < HEAD_W + frozenW()) G.scrollX = Math.max(0, G.scrollX - (HEAD_W + frozenW() - x));
      if (x + G.colW[c] > G.cssW) G.scrollX += x + G.colW[c] - G.cssW;
      if (y < HEAD_H + frozenH()) G.scrollY = Math.max(0, G.scrollY - (HEAD_H + frozenH() - y));
      if (y + G.rowH[r] > G.cssH) G.scrollY += y + G.rowH[r] - G.cssH;
    }

    window.addEventListener("resize", () => { fitCanvas(); paint(); });

    return {
      paint, select, selection, ensureSize,
      get state() { return G; },
      setFreeze(c, r) { G.freezeC = c; G.freezeR = r; paint(); },
      setCols(n) { while (G.colW.length < n) G.colW.push(DEF_W); },
      setRows(n) { while (G.rowH.length < n) G.rowH.push(DEF_H); },
      refit: fitCanvas,
      /** CSS-px rect of a display-coordinate cell relative to the canvas. */
      cellRect(c, r) {
        const x = colX(c), y = rowY(r);
        if (x === null || y === null) return null;
        return { x, y, w: G.colW[c] || DEF_W, h: G.rowH[r] || DEF_H };
      },
    };
  }

  T.grid = { create: createGrid };
})(window.Tabula);
