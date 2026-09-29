"use strict";
/* Netpulse SVG chart primitives: dependency-free line charts for probe
 * history and live series. Input is real measured values only; an empty
 * series renders an honest empty state, never invented points. */
(function (global) {
  var SVG_NS = "http://www.w3.org/2000/svg";

  function make(tag, attrs) {
    var node = document.createElementNS(SVG_NS, tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        node.setAttribute(k, attrs[k]);
      });
    }
    return node;
  }

  function finiteNumbers(values) {
    return (values || []).filter(function (v) {
      return typeof v === "number" && isFinite(v);
    });
  }

  /* Render a multi-series line chart into container. Returns the number of
   * plotted points so the self-test can verify rendering against fixtures. */
  function lineChart(container, opts) {
    opts = opts || {};
    container.innerHTML = "";
    var series = opts.series || [];
    var width = opts.width || 560;
    var height = opts.height || 180;
    var padL = 52;
    var padR = 10;
    var padT = 12;
    var padB = 26;
    var innerW = Math.max(10, width - padL - padR);
    var innerH = Math.max(10, height - padT - padB);

    var all = [];
    series.forEach(function (s) {
      finiteNumbers(s.values).forEach(function (v) { all.push(v); });
    });
    if (!all.length) {
      var UI = global.NetpulseUI;
      container.appendChild(UI.emptyState(
        "No samples yet",
        "Run a probe to record real measurements. This chart plots only " +
        "measured values from this session; it never invents a series.",
        "source: session probe history"
      ));
      return 0;
    }

    var min = Math.min.apply(null, all);
    var max = Math.max.apply(null, all);
    if (min === max) {
      min -= 1;
      max += 1;
    }
    var span = max - min;

    function x(i, n) {
      if (n < 2) return padL + innerW / 2;
      return padL + (i / (n - 1)) * innerW;
    }
    function y(v) {
      return padT + innerH - ((v - min) / span) * innerH;
    }

    var svg = make("svg", {
      viewBox: "0 0 " + width + " " + height,
      role: "img",
      "aria-label": opts.label || "Netpulse measurement chart",
      class: "np-chart-svg"
    });
    var title = make("title");
    title.textContent = opts.label || "Netpulse measurement chart";
    svg.appendChild(title);

    var palette = ["#4fc1a0", "#7aa2f7", "#e0a44f", "#e06c6c"];
    var plotted = 0;
    series.forEach(function (s, si) {
      var vals = finiteNumbers(s.values);
      if (!vals.length) return;
      var color = s.color || palette[si % palette.length];
      var pts = vals.map(function (v, i) {
        return x(i, vals.length).toFixed(1) + "," + y(v).toFixed(1);
      });
      plotted += vals.length;
      var line = make("polyline", {
        points: pts.join(" "),
        fill: "none",
        stroke: color,
        "stroke-width": "2",
        "stroke-linejoin": "round",
        "stroke-linecap": "round"
      });
      line.appendChild((function () {
        var t = make("title");
        t.textContent = (s.label || ("series " + (si + 1))) + ": " + vals.length + " samples";
        return t;
      })());
      svg.appendChild(line);
      vals.forEach(function (v, i) {
        svg.appendChild(make("circle", {
          cx: x(i, vals.length).toFixed(1),
          cy: y(v).toFixed(1),
          r: "2.4",
          fill: color
        }));
      });
    });

    function axisLabel(px, py, text, anchor) {
      var t = make("text", {
        x: px, y: py,
        "text-anchor": anchor || "middle",
        class: "np-chart-axis"
      });
      t.textContent = text;
      svg.appendChild(t);
    }
    axisLabel(padL - 6, padT + 8, String(Math.round(max * 100) / 100), "end");
    axisLabel(padL - 6, padT + innerH, String(Math.round(min * 100) / 100), "end");
    axisLabel(padL, height - 8, opts.xLabel || "sample");
    axisLabel(padL, height - 8, "", "middle");
    var unit = make("text", {
      x: padL, y: padT - 2,
      class: "np-chart-axis"
    });
    unit.textContent = opts.yLabel || "";
    svg.appendChild(unit);

    if (opts.legend !== false) {
      series.forEach(function (s, si) {
        if (!finiteNumbers(s.values).length) return;
        var lx = padL + si * 150;
        var swatch = make("rect", {
          x: lx, y: height - 12, width: 10, height: 10,
          fill: s.color || palette[si % palette.length]
        });
        svg.appendChild(swatch);
        var lab = make("text", { x: lx + 14, y: height - 3, class: "np-chart-axis" });
        lab.textContent = s.label || ("series " + (si + 1));
        svg.appendChild(lab);
      });
    }

    container.appendChild(svg);
    return plotted;
  }

  global.NetpulseCharts = {
    lineChart: lineChart,
    finiteNumbers: finiteNumbers
  };
})(typeof window !== "undefined" ? window : this);
