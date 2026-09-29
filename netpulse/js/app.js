"use strict";
/* Netpulse app boot: capability gate, overview panels, banner, event log,
 * keyboard-safe tabs, and a dependency-free ?selftest=1 harness. */
(function () {
  function $(id) { return document.getElementById(id); }

  function formatTime(iso) {
    try {
      return new Date(iso).toLocaleTimeString();
    } catch (e) {
      return iso;
    }
  }

  function renderLog(listEl, store) {
    listEl.innerHTML = "";
    var events = store.getEvents().slice().reverse();
    if (!events.length) {
      var li = document.createElement("li");
      li.textContent = "No session events yet. Connectivity changes and refreshes will appear here.";
      listEl.appendChild(li);
      return;
    }
    events.slice(0, 60).forEach(function (evt) {
      var li = document.createElement("li");
      var time = document.createElement("time");
      time.textContent = formatTime(evt.t);
      li.appendChild(time);
      var b = document.createElement("b");
      b.textContent = evt.type + " ";
      li.appendChild(b);
      var span = document.createElement("span");
      span.textContent = evt.detail === null || evt.detail === undefined ? "" : String(evt.detail);
      li.appendChild(span);
      listEl.appendChild(li);
    });
  }

  function runSelftest(box, caps, store) {
    var results = [];
    function check(name, ok, detail) {
      results.push((ok ? "PASS" : "FAIL") + " " + name + (detail ? " - " + detail : ""));
    }
    try {
      var again = window.NetpulseCapabilities.detectCapabilities(window.navigator, window);
      check("capability-map-builds", !!again && typeof again.onlineState === "boolean", "onlineState=" + again.onlineState);
      var n0 = store.getEvents().length;
      store.logEvent("selftest-probe", "fixture");
      check("store-appends", store.getEvents().length === n0 + 1, "events=" + store.getEvents().length);
      var chartOk = !!document.querySelectorAll(".np-panel").length;
      check("panels-render", chartOk, "panels=" + document.querySelectorAll(".np-panel").length);
      var tabs = document.querySelectorAll('[role="tab"]');
      check("tabs-focusable", tabs.length > 0 && tabs[0].tabIndex === 0, "tabs=" + tabs.length);
      var emptyOk = !!document.querySelector(".np-empty, .np-kv");
      check("empty-or-live-present", emptyOk, "honest render reachable");
      check("no-external-scripts", document.querySelectorAll('script[src^="http"]').length === 0, "no CDN scripts");
      var P = window.NetpulseProbes;
      var Charts = window.NetpulseCharts;
      check("probes-module-present", !!P && !!Charts, "probes+charts wired");
      if (P) {
        check("stats-median-odd", P.median([30, 10, 20]) === 20, "median=20");
        check("stats-median-even", P.median([10, 20, 30, 40]) === 25, "median=25");
        check("stats-median-empty", P.median([]) === null, "empty=null");
        check("stats-p95", P.percentile([10, 20, 30, 40, 50, 60, 70, 80, 90, 100], 95) === 100, "p95=100");
        check("stats-jitter", P.jitter([10, 20, 30]) === 10, "jitter=10");
        check("stats-jitter-single", P.jitter([5]) === null, "single=null");
        var sum = P.summarize([
          { ok: true, ms: 10, bytes: 100 },
          { ok: true, ms: 30, bytes: 100 },
          { ok: false, ms: null, bytes: 0 }
        ]);
        check("summarize-counts",
          sum.attempts === 3 && sum.succeeded === 2 && sum.failed === 1 && sum.median === 20,
          "n=3 ok=2 median=20");
        var loss = P.lossApproximation([{ summary: { attempts: 10, failed: 2 } }]);
        check("loss-math",
          loss.attempts === 10 && loss.failed === 2 && loss.successRate === 80,
          "rate=80");
        check("loss-empty", P.lossApproximation([]).successRate === null, "empty=null");
        check("format-rate",
          P.formatRate(2048) === "2 MB/s" && P.formatRate(512) === "512 KB/s",
          "units scale");
        check("format-rate-guards",
          P.formatRate(NaN) === "no data" && P.formatRate(Infinity) === "no data" &&
          P.formatMs(NaN) === "no data" && P.formatMs(Infinity) === "no data",
          "NaN/Infinity fail closed");
        check("quality-tab-present", !!document.getElementById("tabpanel-quality"), "quality tab wired");
      }
      if (Charts) {
        var probe = document.createElement("div");
        var plotted = Charts.lineChart(probe, {
          label: "selftest fixture",
          series: [{ label: "fixture", values: [1, 2, 3, 4] }]
        });
        check("chart-plots-points", plotted === 4 && !!probe.querySelector("svg"), "points=" + plotted);
        var blank = document.createElement("div");
        var none = Charts.lineChart(blank, { series: [] });
        check("chart-empty-honest", none === 0 && !!blank.querySelector(".np-empty"), "empty state");
      }
    } catch (e) {
      results.push("FAIL harness-exception - " + (e && e.message));
    }
    var failed = results.filter(function (r) { return r.indexOf("FAIL") === 0; }).length;
    box.hidden = false;
    box.textContent = "Netpulse selftest: " + (failed ? failed + " FAILING" : "ALL PASS") + "\n" + results.join("\n");
    box.setAttribute("data-selftest-failed", String(failed));
  }

  function numInput(id, fallback, min, max) {
    var node = document.getElementById(id);
    var v = node ? parseInt(node.value, 10) : NaN;
    if (!isFinite(v)) return fallback;
    return Math.max(min, Math.min(max, v));
  }

  function setStatus(id, text, kind) {
    var st = document.getElementById(id);
    if (!st) return;
    st.textContent = text || "";
    st.className = "np-status" + (kind ? " " + kind : "");
  }

  function resultTable(root, rows, sourceLabel, sourceLevel) {
    var UI = window.NetpulseUI;
    root.innerHTML = "";
    var dl = document.createElement("dl");
    dl.className = "np-kv";
    rows.forEach(function (row) {
      UI.kvRow(dl, row[0], row[1], sourceLabel, sourceLevel);
    });
    root.appendChild(dl);
  }

  function resultError(root, title, body, missingLabel) {
    var UI = window.NetpulseUI;
    root.innerHTML = "";
    root.appendChild(UI.emptyState(title, body, missingLabel));
  }

  function probeGuard(caps, resultId, statusId, kindLabel) {
    if (!caps.probes) {
      resultError(document.getElementById(resultId),
        kindLabel + " probes are not supported by this browser",
        "Timed probes need fetch plus a high-resolution clock. This browser " +
        "exposes neither or only partially, so Netpulse refuses to estimate " +
        "quality instead of measuring it.",
        "missing: fetch / performance.now");
      setStatus(statusId, "Unsupported in this browser.", "error");
      return false;
    }
    if (window.navigator && window.navigator.onLine === false) {
      resultError(document.getElementById(resultId),
        "Probe not started: the browser reports offline",
        "Reconnect and run again. Offline attempts would only measure the " +
        "disconnected stack, so Netpulse does not record them.",
        "source: Browser online state");
      setStatus(statusId, "Offline. Probe not started.", "error");
      return false;
    }
    return true;
  }

  function renderHistory(store) {
    var P = window.NetpulseProbes;
    var Charts = window.NetpulseCharts;
    var hist = P.loadHistory(store);
    var loss = P.lossApproximation(hist);
    var lossRoot = document.getElementById("result-loss");
    if (!hist.length) {
      resultError(lossRoot,
        "No probe runs in this session",
        "Run a latency, download, or upload probe. Every attempt, success " +
        "or failure, lands here with its samples and endpoint.",
        "source: session probe history");
    } else {
      resultTable(lossRoot, [
        ["Probe attempts this session", String(loss.attempts)],
        ["Failed attempts", String(loss.failed)],
        ["Application-layer success rate", loss.successRate === null ? "no data" : loss.successRate + " %"]
      ], "Session probe history", "live");
      var note = document.createElement("p");
      note.className = "np-sub";
      note.textContent = "This rate counts failed HTTP probe attempts (timeouts, refusals, offline aborts). " +
        "It is the closest a browser page can get to loss, and it must not be read as ICMP packet loss.";
      lossRoot.appendChild(note);
    }

    function runRate(r) {
      if (!r) return null;
      if (typeof r.throughputKBps === "number") return r.throughputKBps;
      return typeof r.throughputKbps === "number" ? r.throughputKbps : null;
    }
    var latSeries = hist.filter(function (r) { return r.kind === "latency"; })
      .map(function (r) { return r.summary ? r.summary.median : null; })
      .filter(function (v) { return typeof v === "number" && isFinite(v); });
    var dlSeries = hist.filter(function (r) { return r.kind === "download"; })
      .map(runRate)
      .filter(function (v) { return typeof v === "number" && isFinite(v); });
    Charts.lineChart(document.getElementById("chart-latency"), {
      label: "Latency medians per run in milliseconds",
      yLabel: "ms / run",
      xLabel: "run",
      series: [{ label: "median ms", values: latSeries }]
    });
    Charts.lineChart(document.getElementById("chart-download"), {
      label: "Download throughput per run in kilobytes per second",
      yLabel: "KB/s / run",
      xLabel: "run",
      series: [{ label: "KB/s", values: dlSeries, color: "#7aa2f7" }]
    });

    var body = document.getElementById("history-body");
    body.innerHTML = "";
    if (!hist.length) {
      var tr = document.createElement("tr");
      var td = document.createElement("td");
      td.setAttribute("colspan", "5");
      td.textContent = "No runs yet.";
      tr.appendChild(td);
      body.appendChild(tr);
      return;
    }
    hist.slice(-20).reverse().forEach(function (run) {
      var row = document.createElement("tr");
      var cells = [
        formatTime(run.t),
        run.kind,
        String(run.summary ? run.summary.attempts : run.samples.length),
        run.kind === "download" || run.kind === "upload"
          ? P.formatRate(run.throughputKBps !== undefined ? run.throughputKBps : run.throughputKbps)
          : P.formatMs(run.summary ? run.summary.median : null),
        String(run.summary ? run.summary.failed : 0)
      ];
      cells.forEach(function (c) {
        var cell = document.createElement("td");
        cell.textContent = c;
        row.appendChild(cell);
      });
      body.appendChild(row);
    });
  }

  function finishProbeRun(store, run, resultId, statusId, rows) {
    window.NetpulseProbes.saveRun(store, run);
    resultTable(document.getElementById(resultId), rows, "HTTP timing (fetch)", "live");
    setStatus(statusId,
      run.summary.failed
        ? "Done with " + run.summary.failed + " failed attempt(s). Recorded with endpoint and timestamp."
        : "Done. Recorded with endpoint and timestamp.",
      run.summary.failed ? "warn" : "ok");
    store.logEvent("probe-complete",
      run.kind + " n=" + run.summary.attempts + " failed=" + run.summary.failed +
      " endpoint=" + run.endpoint);
    renderHistory(store);
  }

  function bootQuality(store) {
    var P = window.NetpulseProbes;
    var UI = window.NetpulseUI;
    if (!P || !UI) return;
    if (!document.getElementById("tabpanel-quality")) return;
    var caps = window.NetpulseCapabilities.detectCapabilities(window.navigator, window);

    var latEp = document.getElementById("lat-endpoint");
    var dlEp = document.getElementById("dl-endpoint");
    var ulEp = document.getElementById("ul-endpoint");
    try {
      if (latEp && !latEp.value) latEp.value = store.get("latEndpoint") || P.defaultEndpoint();
      if (dlEp && !dlEp.value) dlEp.value = store.get("dlEndpoint") || P.defaultEndpoint();
      if (ulEp && !ulEp.value) ulEp.value = store.get("ulEndpoint") || "";
    } catch (e) {
      if (latEp && !latEp.value) latEp.value = P.defaultEndpoint();
      if (dlEp && !dlEp.value) dlEp.value = P.defaultEndpoint();
    }

    function withBusy(btnId, fn) {
      var btn = document.getElementById(btnId);
      btn.disabled = true;
      function done() { btn.disabled = false; }
      try {
        fn(done);
      } catch (e) {
        done();
        throw e;
      }
    }

    document.getElementById("btn-latency").addEventListener("click", function () {
      if (!probeGuard(caps, "result-latency", "status-latency", "Latency")) return;
      var endpoint = latEp.value.trim() || P.defaultEndpoint();
      var count = numInput("lat-samples", 10, 1, 50);
      try { store.set("latEndpoint", endpoint); } catch (e) { /* ignore */ }
      withBusy("btn-latency", function (done) {
        setStatus("status-latency", "Probing 1/" + count + " ...", "running");
        P.runLatency(endpoint, count, function (i, n) {
          setStatus("status-latency", "Probing " + i + "/" + n + " ...", "running");
        }).then(function (run) {
          done();
          finishProbeRun(store, run, "result-latency", "status-latency", [
            ["Endpoint", run.endpoint],
            ["Samples (ok/attempts)", run.summary.succeeded + "/" + run.summary.attempts],
            ["Median", P.formatMs(run.summary.median)],
            ["p95", P.formatMs(run.summary.p95)],
            ["Min", P.formatMs(run.summary.min)],
            ["Max", P.formatMs(run.summary.max)],
            ["Jitter (mean abs successive diff)", P.formatMs(run.summary.jitter)]
          ]);
        }).catch(function () {
          done();
          setStatus("status-latency", "Probe failed unexpectedly.", "error");
        });
      });
    });

    document.getElementById("btn-download").addEventListener("click", function () {
      if (!probeGuard(caps, "result-download", "status-download", "Download")) return;
      var endpoint = dlEp.value.trim() || P.defaultEndpoint();
      var count = numInput("dl-requests", 5, 1, 20);
      try { store.set("dlEndpoint", endpoint); } catch (e) { /* ignore */ }
      withBusy("btn-download", function (done) {
        setStatus("status-download", "Downloading 1/" + count + " ...", "running");
        P.runDownload(endpoint, count, function (i, n) {
          setStatus("status-download", "Downloading " + i + "/" + n + " ...", "running");
        }).then(function (run) {
          done();
          finishProbeRun(store, run, "result-download", "status-download", [
            ["Endpoint", run.endpoint],
            ["Requests (ok/attempts)", run.summary.succeeded + "/" + run.summary.attempts],
            ["Total bytes received", String(run.totalBytes)],
            ["Throughput (bytes over elapsed time)", P.formatRate(run.throughputKBps !== undefined ? run.throughputKBps : run.throughputKbps)],
            ["Median request time", P.formatMs(run.summary.median)],
            ["p95 request time", P.formatMs(run.summary.p95)]
          ]);
        }).catch(function () {
          done();
          setStatus("status-download", "Probe failed unexpectedly.", "error");
        });
      });
    });

    document.getElementById("btn-upload").addEventListener("click", function () {
      if (!probeGuard(caps, "result-upload", "status-upload", "Upload")) return;
      var endpoint = (ulEp.value || "").trim();
      if (!endpoint) {
        resultError(document.getElementById("result-upload"),
          "No echo endpoint configured",
          "Upload probing POSTs a generated payload, and static file hosts " +
          "(including this site) reject POST. Enter an https echo endpoint " +
          "you trust, then run again. Netpulse sends nothing until you do.",
          "missing: user-configured echo endpoint");
        setStatus("status-upload", "Enter an echo endpoint first.", "error");
        return;
      }
      var size = numInput("ul-size", 65536, 1024, 1048576);
      try { store.set("ulEndpoint", endpoint); } catch (e) { /* ignore */ }
      withBusy("btn-upload", function (done) {
        setStatus("status-upload", "Uploading ...", "running");
        P.runUpload(endpoint, size, 3, function (i, n) {
          setStatus("status-upload", "Uploading " + i + "/" + n + " ...", "running");
        }).then(function (run) {
          done();
          if (!run.summary.succeeded) {
            var firstErr = null;
            for (var i = 0; i < run.samples.length; i++) {
              if (!run.samples[i].ok) { firstErr = run.samples[i].error; break; }
            }
            window.NetpulseProbes.saveRun(store, run);
            resultError(document.getElementById("result-upload"),
              "Upload probe failed honestly",
              "The endpoint answered: " + (firstErr || "unknown error") + ". " +
              "The failed attempts are recorded in history with their endpoints. " +
              "This usually means the URL is not an upload echo endpoint.",
              "source: HTTP POST response");
            setStatus("status-upload", "Failed. Attempts recorded in history.", "error");
            store.logEvent("probe-error", "upload endpoint=" + run.endpoint + " " + (firstErr || ""));
            renderHistory(store);
            return;
          }
          finishProbeRun(store, run, "result-upload", "status-upload", [
            ["Endpoint", run.endpoint],
            ["Payload per request (bytes)", String(run.payloadBytes)],
            ["Uploads (ok/attempts)", run.summary.succeeded + "/" + run.summary.attempts],
            ["Throughput (bytes over elapsed time)", P.formatRate(run.throughputKBps !== undefined ? run.throughputKBps : run.throughputKbps)],
            ["Median request time", P.formatMs(run.summary.median)]
          ]);
        }).catch(function () {
          done();
          setStatus("status-upload", "Probe failed unexpectedly.", "error");
        });
      });
    });

    document.getElementById("btn-history-clear").addEventListener("click", function () {
      try {
        var P2 = window.NetpulseProbes;
        store.set(P2.HISTORY_KEY, []);
      } catch (e) { /* ignore */ }
      store.logEvent("history-clear", "probe history cleared by user");
      renderHistory(store);
    });

    renderHistory(store);
  }

  function boot() {
    var caps = window.NetpulseCapabilities.detectCapabilities(window.navigator, window);
    var store = window.NetpulseStore.createStore(window);
    var UI = window.NetpulseUI;
    var Net = window.NetpulseNetinfo;

    var banner = $("np-banner");
    UI.setBanner(banner, caps.onLine);
    UI.initTabs($("np-tabs"), null);

    Net.renderConnectionPanel($("panel-connection"), window.navigator, caps);
    Net.renderOnlinePanel($("panel-online"), window.navigator);
    Net.renderDevicePanel($("panel-device"), window.navigator);
    Net.renderCapabilityPanel($("panel-capabilities"), caps);

    var logList = $("event-log");
    renderLog(logList, store);
    store.onEvent(function () { renderLog(logList, store); });

    function refreshAll(reason) {
      caps = window.NetpulseCapabilities.detectCapabilities(window.navigator, window);
      Net.renderConnectionPanel($("panel-connection"), window.navigator, caps);
      Net.renderOnlinePanel($("panel-online"), window.navigator);
      Net.renderCapabilityPanel($("panel-capabilities"), caps);
      if (reason) store.logEvent(reason, caps.onLine ? "online" : "offline");
    }

    window.addEventListener("online", function () {
      UI.flashReconnected(banner);
      refreshAll("connectivity-online");
    });
    window.addEventListener("offline", function () {
      UI.setBanner(banner, false);
      refreshAll("connectivity-offline");
    });
    Net.watchConnection(window.navigator, function () { refreshAll("connection-change"); });

    $("btn-refresh").addEventListener("click", function () {
      refreshAll("manual-refresh");
    });
    $("btn-clear").addEventListener("click", function () {
      store.clear();
      renderLog(logList, store);
    });

    bootQuality(store);

    store.logEvent("session-start", window.navigator.userAgent || "unknown agent");

    var params = new URLSearchParams(window.location.search || "");
    if (params.get("selftest") === "1") {
      runSelftest($("selftest-box"), caps, store);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
