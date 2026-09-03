/* Tabula charts.js (Phase 5): live bar/line/pie views over the grid.
 *
 * Charts are a pure view layer (research 9, blueprint views): they read
 * computed values from the latest snapshot and re-render SVG on every
 * recalc batch. They never parse formulas and never evaluate; a range
 * holding errors or text contributes zero to numeric series (errors are
 * listed, not plotted). Data sources are plain A1 ranges typed by the
 * user; unparseable ranges show an inline error, never a crash.
 */
"use strict";
window.Tabula = window.Tabula || {};

(function (T) {
  const TYPES = ["bar", "line", "pie"];
  const COLORS = ["#5ad1a5", "#7aa2f7", "#e5b567", "#f26d6d", "#b49ff2", "#6fc3d8",
    "#9ad15a", "#d18fc1", "#5ad1c0", "#d1a05a", "#8fa5d1", "#a5d15a"];

  function parseA1(cell) {
    const m = /^([A-Za-z]+)([0-9]+)$/.exec(cell.trim());
    if (!m) return null;
    let col = 0;
    const up = m[1].toUpperCase();
    for (let i = 0; i < up.length; i++) {
      const d = up.charCodeAt(i) - 64;
      if (d < 1 || d > 26) return null;
      col = col * 26 + d;
    }
    const row = Number(m[2]);
    if (row < 1) return null;
    return { c: col - 1, r: row - 1 };
  }

  function parseRange(text) {
    const parts = String(text || "").split(":");
    if (parts.length === 1) {
      const p = parseA1(parts[0]);
      return p ? { c0: p.c, r0: p.r, c1: p.c, r1: p.r } : null;
    }
    if (parts.length !== 2) return null;
    const a = parseA1(parts[0]), b = parseA1(parts[1]);
    if (!a || !b) return null;
    return {
      c0: Math.min(a.c, b.c), r0: Math.min(a.r, b.r),
      c1: Math.max(a.c, b.c), r1: Math.max(a.r, b.r),
    };
  }

  function rangeCells(rect, cap) {
    const out = [];
    for (let r = rect.r0; r <= rect.r1 && out.length < cap; r++) {
      for (let c = rect.c0; c <= rect.c1 && out.length < cap; c++) out.push({ c, r });
    }
    return out;
  }

  function esc(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function collect(read, labelRange, valueRange) {
    const lr = parseRange(labelRange), vr = parseRange(valueRange);
    if (!lr) return { error: "bad label range (try A16:A21)" };
    if (!vr) return { error: "bad value range (try B16:B21)" };
    const labels = rangeCells(lr, 24).map((p) => read(p.c, p.r));
    const vals = rangeCells(vr, 24).map((p) => read(p.c, p.r));
    const n = Math.min(labels.length, vals.length);
    if (n === 0) return { error: "ranges are empty" };
    const skipped = [];
    const rows = [];
    for (let i = 0; i < n; i++) {
      const lv = labels[i], vv = vals[i];
      const label = lv.t === "err" ? lv.v : lv.t === "blank" ? ("#" + (i + 1)) :
        lv.t === "bool" ? (lv.v ? "TRUE" : "FALSE") : String(lv.v);
      if (vv.t !== "num" || !isFinite(vv.v)) {
        skipped.push(label + " (" + (vv.t === "err" ? vv.v : vv.t) + ")");
        rows.push({ label, value: 0, plotted: false });
      } else {
        rows.push({ label, value: vv.v, plotted: true });
      }
    }
    return { rows, skipped };
  }

  function svgBar(rows, W, H) {
    const pad = { l: 8, r: 8, t: 10, b: 44 };
    const max = Math.max(1e-9, ...rows.map((d) => Math.abs(d.value)));
    const bw = (W - pad.l - pad.r) / Math.max(1, rows.length);
    let s = "";
    rows.forEach((d, i) => {
      const h = Math.max(d.plotted ? 2 : 0, (Math.abs(d.value) / max) * (H - pad.t - pad.b));
      const x = pad.l + i * bw + 2, w = Math.max(1, bw - 4), y = H - pad.b - h;
      s += '<rect x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + w.toFixed(1) +
        '" height="' + h.toFixed(1) + '" fill="' + (d.plotted ? COLORS[i % COLORS.length] : "none") +
        '" stroke="' + COLORS[i % COLORS.length] + '"/>';
      s += '<text x="' + (x + w / 2).toFixed(1) + '" y="' + (H - pad.b + 14) + '" font-size="10" fill="#93a0bb" text-anchor="middle">' +
        esc(d.label.slice(0, 8)) + "</text>";
      s += '<text x="' + (x + w / 2).toFixed(1) + '" y="' + (y - 4).toFixed(1) + '" font-size="10" fill="#e6ebf5" text-anchor="middle">' +
        esc(String(Math.round(d.value * 100) / 100)) + "</text>";
    });
    return s;
  }

  function svgLine(rows, W, H) {
    const pad = { l: 30, r: 10, t: 12, b: 44 };
    const max = Math.max(...rows.map((d) => d.value), 0);
    const min = Math.min(...rows.map((d) => d.value), 0);
    const span = Math.max(1e-9, max - min);
    const X = (i) => pad.l + (i * (W - pad.l - pad.r)) / Math.max(1, rows.length - 1);
    const Y = (v) => pad.t + ((max - v) / span) * (H - pad.t - pad.b);
    let pts = "";
    rows.forEach((d, i) => {
      if (!d.plotted) return;
      pts += X(i).toFixed(1) + "," + Y(d.value).toFixed(1) + " ";
    });
    let s = '<polyline points="' + pts.trim() + '" fill="none" stroke="#5ad1a5" stroke-width="2"/>';
    rows.forEach((d, i) => {
      if (!d.plotted) return;
      s += '<circle cx="' + X(i).toFixed(1) + '" cy="' + Y(d.value).toFixed(1) + '" r="3" fill="' + COLORS[i % COLORS.length] + '"/>';
      s += '<text x="' + X(i).toFixed(1) + '" y="' + (H - pad.b + 14) + '" font-size="10" fill="#93a0bb" text-anchor="middle">' +
        esc(d.label.slice(0, 8)) + "</text>";
    });
    return s;
  }

  function svgPie(rows, W, H) {
    const cx = W / 2, cy = H / 2 - 8, R = Math.min(W, H) / 2 - 34;
    const total = rows.reduce((a, d) => a + (d.plotted && d.value > 0 ? d.value : 0), 0);
    if (total <= 0) return '<text x="' + cx + '" y="' + cy + '" font-size="11" fill="#93a0bb" text-anchor="middle">pie needs positive values</text>';
    let a0 = -Math.PI / 2, s = "";
    rows.forEach((d, i) => {
      if (!d.plotted || d.value <= 0) return;
      const a1 = a0 + (d.value / total) * Math.PI * 2;
      const large = a1 - a0 > Math.PI ? 1 : 0;
      const x0 = cx + R * Math.cos(a0), y0 = cy + R * Math.sin(a0);
      const x1 = cx + R * Math.cos(a1), y1 = cy + R * Math.sin(a1);
      s += '<path d="M' + cx.toFixed(1) + " " + cy.toFixed(1) + " L" + x0.toFixed(1) + " " + y0.toFixed(1) +
        " A" + R.toFixed(1) + " " + R.toFixed(1) + " 0 " + large + " 1 " + x1.toFixed(1) + " " + y1.toFixed(1) +
        ' Z" fill="' + COLORS[i % COLORS.length] + '" stroke="#0c1222" stroke-width="1"/>';
      const mid = (a0 + a1) / 2;
      const lx = cx + (R + 14) * Math.cos(mid), ly = cy + (R + 14) * Math.sin(mid);
      s += '<text x="' + lx.toFixed(1) + '" y="' + ly.toFixed(1) + '" font-size="10" fill="#e6ebf5" text-anchor="middle">' +
        esc(d.label.slice(0, 8)) + "</text>";
      a0 = a1;
    });
    return s;
  }

  function createCharts(el, opts) {
    const o = Object.assign({ read: (c, r) => ({ t: "blank" }) }, opts || {});
    const state = { type: "bar", labels: "A16:A21", values: "B16:B21" };

    const title = document.createElement("h3");
    title.textContent = "Charts";
    el.appendChild(title);

    const note = document.createElement("p");
    note.className = "dim";
    note.textContent = "Live view of two ranges (labels + numbers). Re-renders on every recalc; never edits the grid.";
    el.appendChild(note);

    const trow = document.createElement("div");
    trow.className = "btnrow";
    trow.setAttribute("role", "group");
    trow.setAttribute("aria-label", "Chart type");
    const typeBtns = {};
    TYPES.forEach((t) => {
      const b = document.createElement("button");
      b.textContent = t;
      b.setAttribute("aria-pressed", String(t === state.type));
      if (t === state.type) b.classList.add("on");
      b.addEventListener("click", () => {
        state.type = t;
        TYPES.forEach((u) => {
          typeBtns[u].classList.toggle("on", u === t);
          typeBtns[u].setAttribute("aria-pressed", String(u === t));
        });
        render();
      });
      typeBtns[t] = b;
      trow.appendChild(b);
    });
    el.appendChild(trow);

    function rangeRow(label, key) {
      const w = document.createElement("label");
      w.className = "frow";
      const s = document.createElement("span");
      s.textContent = label;
      const inp = document.createElement("input");
      inp.value = state[key];
      inp.setAttribute("aria-label", label + " range");
      inp.spellcheck = false;
      inp.addEventListener("change", () => { state[key] = inp.value; render(); });
      w.appendChild(s);
      w.appendChild(inp);
      el.appendChild(w);
    }
    rangeRow("Labels", "labels");
    rangeRow("Values", "values");

    const box = document.createElement("div");
    box.className = "chart-box";
    box.setAttribute("aria-label", "Chart");
    box.setAttribute("role", "img");
    el.appendChild(box);

    const msg = document.createElement("p");
    msg.className = "dim";
    el.appendChild(msg);

    function render() {
      const data = collect(o.read, state.labels, state.values);
      if (data.error) {
        box.innerHTML = "";
        msg.textContent = data.error;
        return;
      }
      const W = 300, H = 220;
      const inner = state.type === "bar" ? svgBar(data.rows, W, H) :
        state.type === "line" ? svgLine(data.rows, W, H) : svgPie(data.rows, W, H);
      box.innerHTML = '<svg viewBox="0 0 ' + W + " " + H + '" width="100%" role="presentation">' + inner + "</svg>";
      msg.textContent = data.skipped.length ?
        "skipped (plotted as gaps): " + data.skipped.slice(0, 4).join(", ") +
        (data.skipped.length > 4 ? " (+" + (data.skipped.length - 4) + " more)" : "") :
        data.rows.length + " points from " + state.labels + " x " + state.values;
    }

    render();
    return { render, state };
  }

  T.charts = { create: createCharts, parseRange, collect };
})(window.Tabula);
