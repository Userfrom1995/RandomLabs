/* Tabula editor.js (Phase 4): cell editing overlay plus formula bar.
 *
 * Commits go to the engine as source-text edits; the engine parses and the
 * batch model repaints. Parse failures never lose the source: the cell shows
 * #VALUE! while the inspector and formula bar surface the exact position.
 */
"use strict";
window.Tabula = window.Tabula || {};

(function (T) {
  function createEditor(opts) {
    const o = Object.assign({
      formulaEl: null, addrEl: null, grid: null,
      getSource: (c, r) => "",
      commit: (c, r, raw) => {},
      onNavigate: (c, r) => {},
    }, opts || {});

    const overlay = document.createElement("textarea");
    overlay.className = "cell-editor";
    overlay.setAttribute("aria-label", "Cell editor");
    overlay.style.display = "none";
    document.body.appendChild(overlay);
    let editing = null;

    function barAddr(c, r) {
      if (o.addrEl) o.addrEl.textContent = T.engine.a1(c, r);
      if (o.formulaEl && !editing) o.formulaEl.value = o.getSource(c, r);
    }

    function begin(c, r, initial) {
      const sel = o.grid.selection();
      editing = { c: sel.anchor.c, r: sel.anchor.r };
      const src = initial !== undefined ? initial : o.getSource(editing.c, editing.r);
      overlay.value = src;
      overlay.style.display = "block";
      positionOverlay();
      overlay.focus();
      if (initial !== undefined) {
        overlay.setSelectionRange(overlay.value.length, overlay.value.length);
      } else {
        overlay.select();
      }
    }

    function positionOverlay() {
      const canvas = document.getElementById("grid");
      const rect = canvas.getBoundingClientRect();
      const cr = o.grid.cellRect(editing.c, editing.r);
      if (cr) {
        overlay.style.left = (rect.left + window.scrollX + cr.x) + "px";
        overlay.style.top = (rect.top + window.scrollY + cr.y) + "px";
        overlay.style.width = Math.max(200, cr.w) + "px";
        overlay.style.height = Math.max(28, cr.h) + "px";
      } else {
        overlay.style.left = (rect.left + window.scrollX + 60) + "px";
        overlay.style.top = (rect.top + window.scrollY + 40) + "px";
      }
    }

    function commit(move) {
      if (!editing) return;
      const raw = overlay.value;
      const { c, r } = editing;
      editing = null;
      overlay.style.display = "none";
      o.commit(c, r, raw);
      if (move) {
        const sel = o.grid.selection();
        let nc = sel.anchor.c, nr = sel.anchor.r;
        if (move === "down") nr += 1;
        if (move === "up") nr = Math.max(0, nr - 1);
        if (move === "right") nc += 1;
        if (move === "left") nc = Math.max(0, nc - 1);
        o.grid.select(nc, nr);
        o.onNavigate(nc, nr);
      } else {
        o.onNavigate(c, r);
      }
    }

    function cancel() {
      editing = null;
      overlay.style.display = "none";
      const sel = o.grid.selection();
      o.onNavigate(sel.anchor.c, sel.anchor.r);
    }

    overlay.addEventListener("keydown", (ev) => {
      ev.stopPropagation();
      if (ev.key === "Enter" && !ev.altKey) { ev.preventDefault(); commit(ev.shiftKey ? "up" : "down"); }
      else if (ev.key === "Tab") { ev.preventDefault(); commit(ev.shiftKey ? "left" : "right"); }
      else if (ev.key === "Escape") { ev.preventDefault(); cancel(); }
    });
    overlay.addEventListener("blur", () => { if (editing) commit(null); });

    if (o.formulaEl) {
      o.formulaEl.addEventListener("keydown", (ev) => {
        ev.stopPropagation();
        if (ev.key === "Enter") {
          ev.preventDefault();
          const sel = o.grid.selection();
          o.commit(sel.anchor.c, sel.anchor.r, o.formulaEl.value);
          o.grid.select(sel.anchor.c, sel.anchor.r + 1);
          o.onNavigate(sel.anchor.c, sel.anchor.r + 1);
        } else if (ev.key === "Escape") {
          const sel = o.grid.selection();
          o.formulaEl.value = o.getSource(sel.anchor.c, sel.anchor.r);
          o.formulaEl.blur();
        }
      });
    }

    return {
      begin, barAddr,
      get active() { return editing !== null; },
    };
  }

  T.editor = { create: createEditor };
})(window.Tabula);
