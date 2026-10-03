/* Tabula views.js (Phase 4): sort/filter view index, freeze panes.
 *
 * Views reorder a presentation index only; underlying addresses stay stable
 * so references never taint (documented Excel difference, surfaced in the
 * status line when a view is active). Clearing the view restores model
 * order exactly.
 */
"use strict";
window.Tabula = window.Tabula || {};

(function (T) {
  function createViews(el, opts) {
    const o = Object.assign({
      sort: (col, ascending) => {},
      filter: (col, rule) => {},
      clear: () => {},
      freeze: (c, r) => {},
      insertDelete: (kind, index, count) => {},
    }, opts || {});

    const title = document.createElement("h3");
    title.textContent = "Views";
    el.appendChild(title);

    const note = document.createElement("p");
    note.className = "dim";
    note.textContent = "Sort and filter reorder the view only. References keep pointing at model addresses.";
    el.appendChild(note);

    const brow = document.createElement("div");
    brow.className = "btnrow";
    const bAsc = document.createElement("button");
    bAsc.textContent = "Sort A→Z";
    bAsc.title = "Stable sort by the selected column, ascending";
    bAsc.addEventListener("click", () => o.sort(null, true));
    const bDesc = document.createElement("button");
    bDesc.textContent = "Sort Z→A";
    bDesc.title = "Stable sort by the selected column, descending";
    bDesc.addEventListener("click", () => o.sort(null, false));
    brow.appendChild(bAsc);
    brow.appendChild(bDesc);
    el.appendChild(brow);

    const frow = document.createElement("div");
    frow.className = "frow";
    const fsel = document.createElement("select");
    fsel.setAttribute("aria-label", "Filter rule");
    [["", "No filter"], ["hideBlank", "Hide blanks"], ["textContains", "Text contains…"], ["gt", "Number greater than…"], ["lt", "Number less than…"]].forEach(([v, label]) => {
      const opt = document.createElement("option");
      opt.value = v;
      opt.textContent = label;
      fsel.appendChild(opt);
    });
    const qin = document.createElement("input");
    qin.setAttribute("aria-label", "Filter value");
    qin.placeholder = "value…";
    qin.value = "";
    const fgo = document.createElement("button");
    fgo.textContent = "Apply";
    fgo.addEventListener("click", () => {
      const v = fsel.value;
      if (v === "") { o.filter(null, null); return; }
      if (v === "hideBlank") { o.filter(null, { k: "hideBlank" }); return; }
      const q = qin.value;
      o.filter(null, v === "textContains" ? { k: "textContains", q } : { k: v, x: Number(q) || 0 });
    });
    frow.appendChild(fsel);
    frow.appendChild(qin);
    frow.appendChild(fgo);
    el.appendChild(frow);

    const crow = document.createElement("div");
    crow.className = "btnrow";
    const bFreeze = document.createElement("button");
    bFreeze.textContent = "Freeze at selection";
    bFreeze.addEventListener("click", () => o.freeze("at-selection"));
    const bUnfreeze = document.createElement("button");
    bUnfreeze.textContent = "Unfreeze";
    bUnfreeze.addEventListener("click", () => o.freeze("none"));
    crow.appendChild(bFreeze);
    crow.appendChild(bUnfreeze);
    el.appendChild(crow);

    const srow = document.createElement("div");
    srow.className = "btnrow";
    [["+ Row", "insertRow"], ["− Row", "deleteRow"], ["+ Col", "insertCol"], ["− Col", "deleteCol"]].forEach(([label, kind]) => {
      const b = document.createElement("button");
      b.textContent = label;
      b.addEventListener("click", () => o.insertDelete(kind));
      srow.appendChild(b);
    });
    el.appendChild(srow);

    const clear = document.createElement("button");
    clear.textContent = "Clear sort/filter";
    clear.addEventListener("click", () => {
      fsel.value = "";
      qin.value = "";
      o.clear();
    });
    el.appendChild(clear);
  }

  /** Pure view index over model rows (mirrors the Swift SheetView rules). */
  function applyView(rows, values, view) {
    // rows: model row indices; values: row -> {t,v}; view: {sort, filter}.
    let out = rows.slice();
    if (view.filter) {
      out = out.filter((r) => {
        const v = values(r);
        switch (view.filter.k) {
          case "hideBlank": return v.t !== "blank";
          case "textContains": return v.t === "str" && v.v.includes(view.filter.q || "");
          case "gt": return v.t === "num" && v.v > view.filter.x;
          case "lt": return v.t === "num" && v.v < view.filter.x;
          default: return true;
        }
      });
    }
    if (view.sort) {
      const { col, ascending, valueAt } = view.sort;
      void col;
      const rank = (v) => v.t === "blank" ? (ascending ? 0 : 3) : v.t === "err" ? 4 : v.t === "num" ? 1 : v.t === "str" ? 2 : 3;
      out = out.map((r, i) => ({ r, i })).sort((a, b) => {
        const va = valueAt(a.r), vb = valueAt(b.r);
        const ea = va.t === "err" ? 1 : 0, eb = vb.t === "err" ? 1 : 0;
        if (ea !== eb) return ea - eb;
        const ra = rank(va), rb = rank(vb);
        if (ra !== rb) return ra - rb;
        const na = va.t === "num" || va.t === "bool" ? (va.t === "bool" ? (va.v ? 1 : 0) : va.v) : 0;
        const nb = vb.t === "num" || vb.t === "bool" ? (vb.t === "bool" ? (vb.v ? 1 : 0) : vb.v) : 0;
        if (na !== nb) return ascending ? na - nb : nb - na;
        if (va.t === "str" && vb.t === "str" && va.v !== vb.v) {
          return ascending ? (va.v < vb.v ? -1 : 1) : (va.v > vb.v ? -1 : 1);
        }
        return a.i - b.i;
      }).map((x) => x.r);
    }
    return out;
  }

  T.views = { create: createViews, applyView };
})(window.Tabula);
