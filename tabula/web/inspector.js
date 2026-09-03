/* Tabula inspector.js (Phase 4): precedent/dependent trace, topo rank,
 * cycle-path display. Read-only: renders engine inspector snapshots and
 * offers click-to-jump navigation. Never computes values itself.
 */
"use strict";
window.Tabula = window.Tabula || {};

(function (T) {
  function createInspector(el, opts) {
    const o = Object.assign({ onJump: (c, r) => {} }, opts || {});

    function link(addr) {
      const b = document.createElement("button");
      b.className = "jump";
      b.textContent = addr.label;
      b.title = "Jump to " + addr.label;
      b.addEventListener("click", () => o.onJump(addr.c, addr.r));
      return b;
    }

    function render(info) {
      el.innerHTML = "";
      const h = document.createElement("h3");
      h.textContent = info.a1;
      el.appendChild(h);

      const dl = document.createElement("div");
      dl.className = "kv";
      dl.appendChild(row("value", info.display));
      dl.appendChild(row("formula", info.isFormula ? "yes" : "no"));
      if (info.topoRank >= 0) dl.appendChild(row("topo rank", String(info.topoRank)));
      else if (info.isFormula) dl.appendChild(row("topo rank", "cyclic (no rank)"));
      el.appendChild(dl);

      if (info.parseErrorPos !== null && info.parseErrorPos !== undefined) {
        const perr = document.createElement("p");
        perr.className = "perr";
        perr.textContent = "parse error at position " + info.parseErrorPos + " (cell shows #VALUE!, source kept)";
        el.appendChild(perr);
      }

      el.appendChild(list("precedents", info.precedents));
      el.appendChild(list("dependents", info.dependents));

      if (info.cyclePath && info.cyclePath.length) {
        const sec = document.createElement("div");
        sec.className = "isec";
        const t = document.createElement("h4");
        t.textContent = "cycle path";
        t.className = "cycle";
        sec.appendChild(t);
        const p = document.createElement("p");
        p.className = "cycle-path";
        info.cyclePath.forEach((a, i) => {
          if (i > 0) p.appendChild(document.createTextNode(" → "));
          p.appendChild(link(a));
        });
        sec.appendChild(p);
        el.appendChild(sec);
      }
    }

    function row(k, v) {
      const d = document.createElement("div");
      d.className = "krow";
      const kk = document.createElement("span");
      kk.className = "k";
      kk.textContent = k;
      const vv = document.createElement("span");
      vv.className = "v mono";
      vv.textContent = v;
      d.appendChild(kk);
      d.appendChild(vv);
      return d;
    }

    function list(title, addrs) {
      const sec = document.createElement("div");
      sec.className = "isec";
      const t = document.createElement("h4");
      t.textContent = title + " (" + addrs.length + ")";
      sec.appendChild(t);
      if (!addrs.length) {
        const p = document.createElement("p");
        p.className = "dim";
        p.textContent = "none";
        sec.appendChild(p);
      } else {
        const wrap = document.createElement("div");
        wrap.className = "jumps";
        addrs.slice(0, 64).forEach((a) => wrap.appendChild(link(a)));
        if (addrs.length > 64) {
          const more = document.createElement("span");
          more.className = "dim";
          more.textContent = "…+" + (addrs.length - 64);
          wrap.appendChild(more);
        }
        sec.appendChild(wrap);
      }
      return sec;
    }

    function blank(a1) {
      el.innerHTML = "";
      const h = document.createElement("h3");
      h.textContent = a1;
      el.appendChild(h);
      const p = document.createElement("p");
      p.className = "dim";
      p.textContent = "blank cell: no precedents, no dependents.";
      el.appendChild(p);
    }

    return { render, blank };
  }

  T.inspector = { create: createInspector };
})(window.Tabula);
