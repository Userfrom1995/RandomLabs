/* Tabula format.js (Phase 4): style panels. Formats are opaque records;
 * applying them never triggers recalculation (the engine routes style
 * writes around the recalc path, pinned by a Swift suite and mirrored
 * here). Entry-time text-vs-number coercion stays an edit, not a format.
 */
"use strict";
window.Tabula = window.Tabula || {};

(function (T) {
  const FORMATS = [
    { k: "general", label: "General" },
    { k: "fixed", label: "Number", decimals: 2 },
    { k: "currency", label: "Currency", symbol: "$", decimals: 2 },
    { k: "percent", label: "Percent", decimals: 0 },
    { k: "isoDate", label: "Date (ISO)" },
    { k: "text", label: "Text" },
  ];

  function createFormat(el, opts) {
    const o = Object.assign({ apply: (style) => {}, rule: null }, opts || {});
    const style = { numberFormat: { k: "general" }, bold: false, italic: false, fillRGB: null, alignment: null };

    const title = document.createElement("h3");
    title.textContent = "Format";
    el.appendChild(title);

    const sel = document.createElement("select");
    sel.setAttribute("aria-label", "Number format");
    FORMATS.forEach((f, i) => {
      const opt = document.createElement("option");
      opt.value = String(i);
      opt.textContent = f.label;
      sel.appendChild(opt);
    });
    sel.addEventListener("change", () => {
      const f = FORMATS[Number(sel.value)];
      style.numberFormat = Object.assign({ k: f.k }, f.decimals !== undefined ? { decimals: f.decimals } : {}, f.symbol ? { symbol: f.symbol } : {});
      o.apply(snapshot());
    });
    el.appendChild(labeled("Number", sel));

    const dec = document.createElement("input");
    dec.type = "number";
    dec.min = "0";
    dec.max = "10";
    dec.value = "2";
    dec.setAttribute("aria-label", "Decimals");
    dec.addEventListener("change", () => {
      style.numberFormat.decimals = Math.max(0, Math.min(10, Number(dec.value) || 0));
      o.apply(snapshot());
    });
    el.appendChild(labeled("Decimals", dec));

    const brow = document.createElement("div");
    brow.className = "btnrow";
    const bB = toggle("B", () => style.bold, (v) => { style.bold = v; });
    const bI = toggle("I", () => style.italic, (v) => { style.italic = v; });
    bB.style.fontWeight = "bold";
    bI.style.fontStyle = "italic";
    brow.appendChild(bB);
    brow.appendChild(bI);
    el.appendChild(brow);

    const align = document.createElement("div");
    align.className = "btnrow";
    ["left", "center", "right"].forEach((aName) => {
      const b = document.createElement("button");
      b.textContent = aName;
      b.addEventListener("click", () => {
        style.alignment = style.alignment === aName ? null : aName;
        o.apply(snapshot());
      });
      align.appendChild(b);
    });
    el.appendChild(align);

    const fill = document.createElement("input");
    fill.type = "color";
    fill.value = "#151d33";
    fill.setAttribute("aria-label", "Fill color");
    fill.addEventListener("change", () => {
      style.fillRGB = fill.value === "#151d33" ? null : fill.value;
      o.apply(snapshot());
    });
    el.appendChild(labeled("Fill", fill));

    function toggle(label, get, set) {
      const b = document.createElement("button");
      b.textContent = label;
      b.setAttribute("aria-pressed", "false");
      b.addEventListener("click", () => {
        set(!get());
        b.setAttribute("aria-pressed", String(get()));
        b.classList.toggle("on", get());
        o.apply(snapshot());
      });
      return b;
    }

    function labeled(text, input) {
      const w = document.createElement("label");
      w.className = "frow";
      const s = document.createElement("span");
      s.textContent = text;
      w.appendChild(s);
      w.appendChild(input);
      return w;
    }

    function snapshot() {
      return JSON.parse(JSON.stringify(style));
    }

    // Conditional highlight (Phase 5 v1): one threshold rule over the
    // selected column, evaluated lazily for visible cells only inside the
    // app's getCell (a style override, never a recalc). Formula-based
    // rules are a documented v2 item (see architecture.md).
    let syncRule = () => {};
    if (o.rule) {
      const hTitle = document.createElement("h4");
      hTitle.textContent = "Highlight";
      el.appendChild(hTitle);
      const hnote = document.createElement("p");
      hnote.className = "dim";
      hnote.textContent = "One threshold rule on the selected column. View-only: values never change.";
      el.appendChild(hnote);
      const hsel = document.createElement("select");
      hsel.setAttribute("aria-label", "Highlight rule");
      [["off", "Off"], ["gt", "Greater than…"], ["lt", "Less than…"]].forEach(([v, label]) => {
        const opt = document.createElement("option");
        opt.value = v;
        opt.textContent = label;
        hsel.appendChild(opt);
      });
      const hnum = document.createElement("input");
      hnum.type = "number";
      hnum.value = "50";
      hnum.setAttribute("aria-label", "Highlight threshold");
      const cur = o.rule.get();
      if (cur) {
        hsel.value = cur.op;
        hnum.value = String(cur.x);
      }
      const applyRule = () => {
        if (hsel.value === "off") o.rule.set(null);
        else o.rule.set({ op: hsel.value, x: Number(hnum.value) || 0 });
      };
      hsel.addEventListener("change", applyRule);
      hnum.addEventListener("change", applyRule);
      el.appendChild(labeled("Rule", hsel));
      el.appendChild(labeled("Value", hnum));
      syncRule = () => {
        const c = o.rule.get();
        hsel.value = c ? c.op : "off";
        hnum.value = c ? String(c.x) : hnum.value;
      };
    }

    return { snapshot, syncRule };
  }

  T.format = { create: createFormat, FORMATS };
})(window.Tabula);
