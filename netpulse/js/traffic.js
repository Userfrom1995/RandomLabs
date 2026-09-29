"use strict";
/* Netpulse traffic observer: own-page traffic only, via Resource Timing.
 * A page can legally see its own subresource timings (URL, initiator,
 * sizes, durations, nextHopProtocol) and nothing else: no promiscuous
 * capture, no cross-site sniffing, no LAN scan. Anything beyond that is
 * documented as impossible, never simulated. Cross-origin entries without
 * Timing-Allow-Origin headers report zeroed sizes by spec; those render as
 * "hidden by the page's headers", never as zero-byte transfers. */
(function (global) {
  function isSupported(win) {
    var w = win || global;
    var perf = w.performance || null;
    var hasEntries = !!(perf && typeof perf.getEntriesByType === "function");
    var hasObserver = typeof w.PerformanceObserver === "function";
    return !!(hasEntries || hasObserver);
  }

  function numOrNull(v) {
    return (typeof v === "number" && isFinite(v)) ? v : null;
  }

  function strOrNull(v) {
    if (v === null || v === undefined) return null;
    var s = String(v);
    return s ? s : null;
  }

  /* Normalize one raw resource-timing entry into a plain auditable row.
   * Never throws on malformed input: unknown shapes fail closed to a row
   * of nulls with the raw name preserved for the table. */
  function normalizeEntry(e) {
    if (!e || typeof e !== "object") {
      return {
        name: "(unparseable entry)", initiator: null, durationMs: null,
        startMs: null, transferBytes: null, encodedBytes: null,
        decodedBytes: null, protocol: null, sizesHidden: false
      };
    }
    var transfer = numOrNull(e.transferSize);
    var encoded = numOrNull(e.encodedBodySize);
    var decoded = numOrNull(e.decodedBodySize);
    /* Spec rule: transferSize 0 with a positive decodedBodySize means the
     * sizes were hidden (cross-origin, no Timing-Allow-Origin), not that
     * the transfer was free. decode-only positives still count as hidden. */
    var hidden = transfer === 0 && (decoded || 0) > 0;
    return {
      name: strOrNull(e.name) || "(unparseable entry)",
      initiator: strOrNull(e.initiatorType),
      durationMs: numOrNull(e.duration),
      startMs: numOrNull(e.startTime),
      transferBytes: transfer,
      encodedBytes: encoded,
      decodedBytes: decoded,
      protocol: strOrNull(e.nextHopProtocol),
      sizesHidden: !!hidden
    };
  }

  /* Point-in-time snapshot of every resource entry the browser retained
   * for this page. Returns [] where the API is absent. */
  function snapshot(win) {
    var w = win || global;
    try {
      var perf = w.performance || null;
      if (!perf || typeof perf.getEntriesByType !== "function") return [];
      var list = perf.getEntriesByType("resource") || [];
      var rows = [];
      for (var i = 0; i < list.length; i++) {
        rows.push(normalizeEntry(list[i]));
      }
      return rows;
    } catch (e) {
      return [];
    }
  }

  /* Live stream of new resource entries. Calls cb(arrayOfRows) as entries
   * arrive. Returns a disconnect function, or null where unsupported. The
   * buffered flag replays entries since page load on the first tick. */
  function observe(win, cb) {
    var w = win || global;
    try {
      if (typeof w.PerformanceObserver !== "function") return null;
      var obs = new w.PerformanceObserver(function (list) {
        var entries = [];
        try {
          entries = list.getEntries ? list.getEntries() : [];
        } catch (e) {
          entries = [];
        }
        var rows = [];
        for (var i = 0; i < entries.length; i++) {
          rows.push(normalizeEntry(entries[i]));
        }
        try { cb(rows); } catch (e) { /* listener errors never break observing */ }
      });
      obs.observe({ type: "resource", buffered: true });
      return function () {
        try { obs.disconnect(); } catch (e) { /* already gone */ }
      };
    } catch (e) {
      return null;
    }
  }

  function originOf(url) {
    if (url === null || url === undefined) return "(unparseable)";
    var s = String(url);
    if (s.indexOf("data:") === 0 || s.indexOf("blob:") === 0) return "(inline)";
    try {
      var u = new URL(s);
      return u.origin || "(unparseable)";
    } catch (e) {
      /* URL constructor may be absent in very old engines; fail closed. */
      var m = /^([a-zA-Z][a-zA-Z0-9+.-]*:\/\/[^/]+)/.exec(s);
      return m ? m[1] : "(unparseable)";
    }
  }

  /* Per-origin rollup: entry count, summed transfer bytes (visible only;
   * hidden-size rows contribute 0 and are counted separately), and mean
   * duration over rows that expose one. Sorted by bytes descending. */
  function aggregateByOrigin(rows) {
    var byOrigin = {};
    (rows || []).forEach(function (r) {
      if (!r) return;
      var o = originOf(r.name);
      if (!byOrigin[o]) {
        byOrigin[o] = {
          origin: o, entries: 0, bytes: 0,
          hiddenSizes: 0, durations: []
        };
      }
      var slot = byOrigin[o];
      slot.entries += 1;
      if (r.sizesHidden) {
        slot.hiddenSizes += 1;
      } else if (typeof r.transferBytes === "number") {
        slot.bytes += r.transferBytes;
      }
      if (typeof r.durationMs === "number") slot.durations.push(r.durationMs);
    });
    var out = Object.keys(byOrigin).map(function (k) {
      var s = byOrigin[k];
      var mean = null;
      if (s.durations.length) {
        var sum = 0;
        for (var i = 0; i < s.durations.length; i++) sum += s.durations[i];
        mean = Math.round((sum / s.durations.length) * 100) / 100;
      }
      return {
        origin: s.origin, entries: s.entries, bytes: s.bytes,
        hiddenSizes: s.hiddenSizes, meanDurationMs: mean
      };
    });
    out.sort(function (a, b) { return b.bytes - a.bytes; });
    return out;
  }

  /* Counts per nextHopProtocol value; absent protocol lands on "(hidden)". */
  function protocolBreakdown(rows) {
    var counts = {};
    (rows || []).forEach(function (r) {
      if (!r) return;
      var p = r.protocol || "(hidden)";
      counts[p] = (counts[p] || 0) + 1;
    });
    var out = Object.keys(counts).map(function (k) {
      return { protocol: k, entries: counts[k] };
    });
    out.sort(function (a, b) { return b.entries - a.entries; });
    return out;
  }

  /* Case-insensitive substring filter over name, initiator, and protocol.
   * Empty query returns every row; it never throws on odd rows. */
  function filterRows(rows, query) {
    var q = (query === null || query === undefined) ? "" : String(query).trim().toLowerCase();
    if (!q) return (rows || []).slice();
    return (rows || []).filter(function (r) {
      if (!r) return false;
      var hay = ((r.name || "") + " " + (r.initiator || "") + " " + (r.protocol || "")).toLowerCase();
      return hay.indexOf(q) !== -1;
    });
  }

  function formatBytes(v) {
    if (typeof v !== "number" || !isFinite(v) || v < 0) return "no data";
    if (v >= 1048576) return (Math.round((v / 1048576) * 100) / 100) + " MB";
    if (v >= 1024) return (Math.round((v / 1024) * 100) / 100) + " KB";
    return v + " B";
  }

  function formatMs(v) {
    if (typeof v !== "number" || !isFinite(v)) return "no data";
    return (Math.round(v * 100) / 100) + " ms";
  }

  global.NetpulseTraffic = {
    isSupported: isSupported,
    normalizeEntry: normalizeEntry,
    snapshot: snapshot,
    observe: observe,
    originOf: originOf,
    aggregateByOrigin: aggregateByOrigin,
    protocolBreakdown: protocolBreakdown,
    filterRows: filterRows,
    formatBytes: formatBytes,
    formatMs: formatMs
  };
})(typeof window !== "undefined" ? window : this);
