"use strict";
/* Netpulse monitor dashboard series: pure builders over the real session
 * measurement stream (probe history, observed transfers, event log). The
 * dashboard charts only measurements this session actually recorded; with
 * no runs and no observed transfers every chart renders its honest empty
 * state. No background LAN traffic is ever invented. */
(function (global) {
  function finite(v) {
    return (typeof v === "number" && isFinite(v)) ? v : null;
  }

  /* Per-run latency medians and download/upload rates from probe history,
   * in stored order. Nulls are skipped by the caller, never plotted. */
  function probeSeries(history) {
    var lat = [];
    var rate = [];
    (history || []).forEach(function (run) {
      if (!run || !run.summary) return;
      if (run.kind === "latency") {
        var m = finite(run.summary.median);
        if (m !== null) lat.push(m);
      } else if (run.kind === "download" || run.kind === "upload") {
        var r = finite(run.throughputKBps !== undefined ? run.throughputKBps : run.throughputKbps);
        if (r !== null) rate.push(r);
      }
    });
    return { latencyMedians: lat, throughputRates: rate };
  }

  /* Observed-transfer activity: cumulative visible bytes across the rows
   * in snapshot order, plus totals. Hidden-size rows contribute 0 bytes
   * and are counted so the chart caption can say so honestly. */
  function transferActivity(rows) {
    var cumulative = [];
    var total = 0;
    var hidden = 0;
    var counted = 0;
    (rows || []).forEach(function (r) {
      if (!r) return;
      counted += 1;
      if (r.sizesHidden) {
        hidden += 1;
      } else if (typeof r.transferBytes === "number" && isFinite(r.transferBytes)) {
        total += r.transferBytes;
      }
      cumulative.push(total);
    });
    return { cumulativeBytes: cumulative, totalBytes: total, hiddenSizes: hidden, entries: counted };
  }

  /* The monitor event log is a labeled slice of the session store: only
   * measurement and connectivity events, newest first, capped for the
   * page. Everything else (selftest fixtures, cache notes) stays out. */
  var MONITOR_TYPES = [
    "session-start", "manual-refresh", "connectivity-online",
    "connectivity-offline", "connection-change", "probe-complete",
    "probe-error", "history-clear", "dns-complete", "dns-error",
    "dns-compare", "identity-complete", "identity-error",
    "webrtc-complete", "webrtc-error", "traffic-refresh",
    "traffic-observe-start", "traffic-observe-stop",
    "report-export", "report-print", "session-clear"
  ];

  function monitorEvents(events, limit) {
    var cap = typeof limit === "number" && limit > 0 ? limit : 40;
    var kept = (events || []).filter(function (e) {
      return e && MONITOR_TYPES.indexOf(e.type) !== -1;
    });
    return kept.slice(-cap).reverse();
  }

  /* One-line session rollup for the dashboard header. All nulls where
   * there is nothing to summarize; the page renders those as empty
   * states, never as zeroes dressed up as measurements. */
  function sessionSummary(history, activity) {
    var attempts = 0;
    var failed = 0;
    (history || []).forEach(function (run) {
      if (run && run.summary) {
        attempts += run.summary.attempts || 0;
        failed += run.summary.failed || 0;
      }
    });
    return {
      probeRuns: (history || []).length,
      probeAttempts: attempts,
      probeFailed: failed,
      observedEntries: activity ? activity.entries : 0,
      observedBytes: activity ? activity.totalBytes : 0,
      hiddenSizes: activity ? activity.hiddenSizes : 0
    };
  }

  global.NetpulseMonitor = {
    MONITOR_TYPES: MONITOR_TYPES,
    probeSeries: probeSeries,
    transferActivity: transferActivity,
    monitorEvents: monitorEvents,
    sessionSummary: sessionSummary
  };
})(typeof window !== "undefined" ? window : this);
