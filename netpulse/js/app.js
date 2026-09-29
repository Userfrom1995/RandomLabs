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
      var DNS = window.NetpulseDNS;
      var IDN = window.NetpulseIdentity;
      var WRTC = window.NetpulseWebRTC;
      check("dns-module-present", !!DNS && !!IDN && !!WRTC, "dns+identity+webrtc wired");
      if (DNS) {
        check("dns-clean-valid", DNS.cleanName("  Example.COM. ") === "example.com", "normalized");
        check("dns-clean-rejects",
          DNS.cleanName("") === null && DNS.cleanName("http://x.com/a") === null &&
          DNS.cleanName("bad host") === null && DNS.cleanName("a".repeat(300)) === null,
          "fail closed");
        var parsed = DNS.parseAnswers({ Answer: [
          { name: "example.com.", type: 1, TTL: 300, data: "93.184.215.14" },
          { name: "example.com.", type: 16, TTL: 300, data: "\"v=spf1 -all\"" }
        ]});
        check("dns-parse",
          parsed.length === 2 && parsed[0].type === "A" && parsed[0].data === "93.184.215.14" &&
          parsed[1].type === "TXT",
          "rows=2 A+TXT");
        check("dns-parse-guards",
          DNS.parseAnswers(null).length === 0 && DNS.parseAnswers({}).length === 0 &&
          DNS.typeName(1) === "A" && DNS.typeName(28) === "AAAA" && DNS.typeName(999) === "TYPE999",
          "unknown shapes");
        check("dns-tab-present", !!document.getElementById("tabpanel-dns"), "dns tab wired");
        check("dns-capability",
          window.NetpulseCapabilities.supportLevel(caps, "dns") === (caps.doh ? "live" : "unsupported"),
          "level=" + window.NetpulseCapabilities.supportLevel(caps, "dns"));
      }
      if (IDN) {
        check("identity-clean",
          IDN.cleanUrl("https://api.ipify.org?format=json") !== null &&
          IDN.cleanUrl("ftp://x") === null && IDN.cleanUrl("") === null,
          "https only");
        var rows = IDN.normalizeEcho({ ip: "203.0.113.7", nested: { a: 1 }, list: [1, 2] });
        check("identity-normalize",
          rows.length === 3 && rows[0][1] === "203.0.113.7" && rows[1][1] === "{object, see raw}",
          "scalars plus markers");
        check("identity-normalize-guards",
          IDN.normalizeEcho(null).length === 0 && IDN.normalizeEcho(7)[0][1] === "7",
          "null plus scalar");
      }
      if (WRTC) {
        check("webrtc-support-flag",
          WRTC.isSupported(window) === (typeof window.RTCPeerConnection === "function"),
          "matches browser");
        check("webrtc-address-kind",
          WRTC.addressKind("abc123.local") === "mdns-masked" &&
          WRTC.addressKind("192.0.2.1") === "ipv4" &&
          WRTC.addressKind("2001:db8::1") === "ipv6" &&
          WRTC.addressKind("") === "unknown",
          "mdns plus ip");
        var sum = WRTC.summarizeStats({
          a: { type: "candidate-pair", nominated: true, currentRoundTripTime: 0.042 },
          b: { type: "outbound-rtp", packetsSent: 100, bytesSent: 8000 },
          c: { type: "inbound-rtp", jitter: 0.003, packetsLost: 2 }
        });
        check("webrtc-stats-fixture",
          sum.pair !== null && Math.round(sum.rttMs) === 42 &&
          sum.packetsSent === 100 && sum.packetsLost === 2 && sum.bytesSent === 8000,
          "rtt=42 counters summed");
        check("webrtc-stats-guards",
          WRTC.summarizeStats(null).pair === null && WRTC.summarizeStats({}).rttMs === null,
          "null plus empty");
        check("webrtc-capability",
          window.NetpulseCapabilities.supportLevel(caps, "webrtc") ===
          (typeof window.RTCPeerConnection === "function" ? "live" : "unsupported"),
          "level honest");
      }
      var TRAF = window.NetpulseTraffic;
      var MON = window.NetpulseMonitor;
      check("traffic-module-present", !!TRAF && !!MON, "traffic+monitor wired");
      if (TRAF) {
        var tnorm = TRAF.normalizeEntry({
          name: "https://cdn.example/img.png", initiatorType: "img",
          duration: 40, startTime: 20, transferSize: 0,
          encodedBodySize: 0, decodedBodySize: 5000, nextHopProtocol: ""
        });
        check("traffic-normalize",
          tnorm.sizesHidden === true && tnorm.protocol === null && tnorm.durationMs === 40,
          "hidden sizes flagged, not zeroed");
        check("traffic-normalize-guards",
          TRAF.normalizeEntry(null).durationMs === null &&
          TRAF.normalizeEntry(null).name === "(unparseable entry)",
          "null fails closed");
        check("traffic-origin",
          TRAF.originOf("https://a.example:8443/x.js") === "https://a.example:8443" &&
          TRAF.originOf("data:image/png;base64,xx") === "(inline)" &&
          TRAF.originOf("bogus") === "(unparseable)",
          "origin, inline, unparseable");
        var tagg = TRAF.aggregateByOrigin([
          { name: "https://a.example/1.js", durationMs: 10, transferBytes: 1000, sizesHidden: false },
          { name: "https://a.example/2.js", durationMs: 30, transferBytes: 3000, sizesHidden: false },
          { name: "https://b.example/i.png", durationMs: 5, transferBytes: 0, sizesHidden: true }
        ]);
        check("traffic-aggregate",
          tagg.length === 2 && tagg[0].origin === "https://a.example" &&
          tagg[0].bytes === 4000 && tagg[0].meanDurationMs === 20 &&
          tagg[1].hiddenSizes === 1,
          "origins=2 bytes=4000 hidden=1");
        var tflt = TRAF.filterRows([
          { name: "https://a.example/app.js", initiator: "script", protocol: "h2" },
          { name: "https://b.example/i.png", initiator: "img", protocol: null }
        ], "APP");
        check("traffic-filter",
          tflt.length === 1 && TRAF.filterRows([
            { name: "x", initiator: null, protocol: null }
          ], "").length === 1,
          "case-insensitive, empty passes through");
        var tproto = TRAF.protocolBreakdown([
          { protocol: "h2" }, { protocol: "h2" }, { protocol: null }
        ]);
        check("traffic-protocol",
          tproto.length === 2 && tproto[0].protocol === "h2" && tproto[0].entries === 2 &&
          tproto[1].protocol === "(hidden)",
          "h2=2 hidden=1");
        check("traffic-format",
          TRAF.formatBytes(1536) === "1.5 KB" && TRAF.formatBytes(NaN) === "no data" &&
          TRAF.formatMs(12.345) === "12.35 ms" && TRAF.formatMs(Infinity) === "no data",
          "KB scale plus guards");
        check("traffic-support-flag",
          TRAF.isSupported(window) === !!(
            (window.performance && typeof window.performance.getEntriesByType === "function") ||
            typeof window.PerformanceObserver === "function"),
          "matches browser");
        check("traffic-tab-present", !!document.getElementById("tabpanel-traffic"), "traffic tab wired");
        check("traffic-capability",
          window.NetpulseCapabilities.supportLevel(caps, "traffic") ===
          (TRAF.isSupported(window) ? "live" : "unsupported"),
          "level honest");
      }
      if (MON) {
        var mhist = [
          { kind: "latency", summary: { median: 20, attempts: 5, failed: 0 } },
          { kind: "download", summary: { median: 9, attempts: 3, failed: 1 }, throughputKBps: 512 }
        ];
        var mseries = MON.probeSeries(mhist);
        check("monitor-series",
          mseries.latencyMedians.length === 1 && mseries.latencyMedians[0] === 20 &&
          mseries.throughputRates.length === 1 && mseries.throughputRates[0] === 512,
          "lat=1 rate=1 from history");
        var mact = MON.transferActivity([
          { transferBytes: 1000, sizesHidden: false },
          { transferBytes: 0, sizesHidden: true }
        ]);
        check("monitor-activity",
          mact.totalBytes === 1000 && mact.hiddenSizes === 1 &&
          mact.cumulativeBytes.length === 2 && mact.cumulativeBytes[1] === 1000,
          "cumulative=1000 hidden=1");
        var mevs = MON.monitorEvents([
          { t: "2026-01-01T00:00:00Z", type: "selftest-probe", detail: "fixture" },
          { t: "2026-01-01T00:00:01Z", type: "probe-complete", detail: "latency" },
          { t: "2026-01-01T00:00:02Z", type: "dns-complete", detail: "example.com" }
        ]);
        check("monitor-events",
          mevs.length === 2 && mevs[0].type === "dns-complete" && mevs[1].type === "probe-complete",
          "fixtures excluded, newest first");
        var msum = MON.sessionSummary(mhist, mact);
        check("monitor-summary",
          msum.probeRuns === 2 && msum.probeAttempts === 8 && msum.probeFailed === 1 &&
          msum.observedBytes === 1000,
          "runs=2 attempts=8 bytes=1000");
        check("monitor-tab-present", !!document.getElementById("tabpanel-monitor"), "monitor tab wired");
        check("monitor-capability",
          ["live", "unsupported"].indexOf(
            window.NetpulseCapabilities.supportLevel(caps, "monitor")) !== -1,
          "level=" + window.NetpulseCapabilities.supportLevel(caps, "monitor"));
      }
      var EXP = window.NetpulseExport;
      check("export-module-present", !!EXP, "export wired");
      if (EXP) {
        var xrep = EXP.buildReport({
          capabilities: caps,
          events: [{ t: "2026-01-01T00:00:00Z", type: "probe-complete", detail: "latency" }],
          history: [{ t: "2026-01-01T00:00:00Z", kind: "latency", endpoint: "probe.bin",
            summary: { attempts: 3, succeeded: 3, failed: 0, median: 20, p95: 30,
              min: 10, max: 30, jitter: 5 } }],
          trafficRows: [{ name: "https://a.example/1.js", initiator: "script",
            durationMs: 10, startMs: 1, transferBytes: 1000,
            encodedBytes: 900, decodedBytes: 900, protocol: "h2", sizesHidden: false }],
          sessionSummary: { probeRuns: 1, probeAttempts: 3, probeFailed: 0,
            observedEntries: 1, observedBytes: 1000, hiddenSizes: 0 },
          generatedAt: "2026-01-01T00:00:00Z",
          userAgent: "selftest"
        });
        check("export-report",
          xrep.probeRuns.length === 1 && xrep.probeRuns[0].source === "HTTP timing (fetch)" &&
          xrep.transfers.length === 1 && xrep.transfers[0].source === "Resource Timing" &&
          xrep.events.length === 1 && xrep.sources.traffic === "Resource Timing",
          "runs=1 transfers=1 events=1 sourced");
        check("export-report-guards",
          EXP.buildReport({}).probeRuns.length === 0 &&
          EXP.buildReport({}).transfers.length === 0 &&
          EXP.buildReport(null).events.length === 0,
          "empty inputs fail closed");
        check("export-csv-quote",
          EXP.csvCell('a"b,c') === '"a""b,c"' && EXP.csvCell(null) === "" &&
          EXP.csvCell("plain") === "plain",
          "RFC 4180 quoting");
        var xcsv = EXP.probesToCsv([{
          t: "2026-01-01T00:00:00Z", kind: 'down,load', endpoint: "probe.bin",
          summary: { attempts: 2, succeeded: 1, failed: 1 },
          totalBytes: 100
        }]);
        check("export-probes-csv",
          xcsv.indexOf("timestamp,kind") === 0 && xcsv.indexOf('"down,load"') !== -1,
          "header plus quoted kind");
        check("export-events-csv",
          EXP.eventsToCsv([{ t: "t", type: "y", detail: null }]).split("\n").length === 3,
          "header plus 1 row");
        check("export-traffic-csv",
          EXP.trafficToCsv([{ name: "u", initiator: null, sizesHidden: true }])
            .indexOf("true,Resource Timing") !== -1,
          "hidden flag plus source");
        var fixedDate = new Date(Date.UTC(2026, 0, 2, 3, 4, 5));
        check("export-stamp",
          EXP.stampFilename("report", fixedDate) === "netpulse-report-20260102-030405" &&
          EXP.stampFilename("", fixedDate) === "netpulse-session-20260102-030405",
          "stamped plus fallback");
        check("export-stamp-guards",
          /^netpulse-s-\d{8}-\d{6}$/.test(EXP.stampFilename("s", "not-a-date")),
          "invalid date falls back to now");
        check("export-formula-guard",
          EXP.csvCell("=1+1") === "'=1+1" && EXP.csvCell("@x") === "'@x" &&
          EXP.csvCell("plain") === "plain",
          "formula cells neutralized");
        check("export-junk-rows",
          EXP.buildReport({ history: [{}] }).probeRuns.length === 0 &&
          EXP.buildReport({ history: [{ kind: "latency",
            summary: { attempts: 1 } }] }).probeRuns.length === 1,
          "fully-null rows dropped, signal rows kept");
        check("export-support-flag",
          typeof EXP.isDownloadSupported(window) === "boolean",
          "boolean, never throws");
        check("export-tab-present", !!document.getElementById("tabpanel-reports"), "reports tab wired");
        check("export-capability",
          ["live", "unsupported"].indexOf(
            window.NetpulseCapabilities.supportLevel(caps, "export")) !== -1 &&
          window.NetpulseCapabilities.supportLevel(caps, "report") === "live",
          "levels honest");
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
    if (!root) return;
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
    if (!root) return;
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

  function rawDetails(root, payload, label) {
    root.innerHTML = "";
    if (payload === null || payload === undefined) return;
    var details = document.createElement("details");
    details.className = "np-raw";
    var summary = document.createElement("summary");
    summary.textContent = label || "Raw answer";
    details.appendChild(summary);
    var pre = document.createElement("pre");
    try {
      pre.textContent = JSON.stringify(payload, null, 2).slice(0, 8000);
    } catch (e) {
      pre.textContent = String(payload).slice(0, 8000);
    }
    details.appendChild(pre);
    root.appendChild(details);
  }

  function dnsGuard(caps, resultId, statusId) {
    if (!caps.doh) {
      resultError(document.getElementById(resultId),
        "DNS lookups are not supported by this browser",
        "DoH needs fetch with JSON responses. This browser exposes no " +
        "fetch, so Netpulse refuses to invent answers instead of asking.",
        "missing: fetch / JSON DoH");
      setStatus(statusId, "Unsupported in this browser.", "error");
      return false;
    }
    if (window.navigator && window.navigator.onLine === false) {
      resultError(document.getElementById(resultId),
        "Lookup not started: the browser reports offline",
        "Reconnect and try again. DoH is an HTTPS request like any other.",
        "source: Browser online state");
      setStatus(statusId, "Offline. Lookup not started.", "error");
      return false;
    }
    return true;
  }

  function renderDnsResult(root, rawRoot, res) {
    if (!res.ok) {
      resultError(root, "Lookup failed honestly",
        (res.error || "unknown error") + ". No answer is shown because none arrived.",
        "source: " + res.endpoint);
      rawDetails(rawRoot, res.raw, "Raw resolver reply (partial)");
      return;
    }
    if (!res.answers.length) {
      root.innerHTML = "";
      var UI0 = window.NetpulseUI;
      root.appendChild(UI0.emptyState(
        "No " + res.type + " records for " + res.name,
        "The resolver answered successfully in " + Math.round(res.ms) +
        " ms but holds no records of this type. Try another type, or check the spelling.",
        "source: " + res.resolver + " DoH"));
      rawDetails(rawRoot, res.raw, "Raw resolver reply");
      return;
    }
    resultTable(root, res.answers.map(function (a) {
      return [a.type + " " + (a.ttl === null ? "" : "(TTL " + a.ttl + ")"), a.data];
    }), res.resolver + " DoH in " + Math.round(res.ms) + " ms", "live");
    rawDetails(rawRoot, res.raw, "Raw resolver reply");
  }

  function bootDnsIdentity(store) {
    var DNS = window.NetpulseDNS;
    var ID = window.NetpulseIdentity;
    var RTC = window.NetpulseWebRTC;
    var UI = window.NetpulseUI;
    if (!DNS || !ID || !RTC || !UI) return;
    if (!document.getElementById("tabpanel-dns")) return;
    var caps = window.NetpulseCapabilities.detectCapabilities(window.navigator, window);

    var typeSel = document.getElementById("dns-type");
    DNS.RECORD_TYPES.forEach(function (t) {
      var opt = document.createElement("option");
      opt.value = t;
      opt.textContent = t;
      typeSel.appendChild(opt);
    });
    var resSel = document.getElementById("dns-resolver");
    DNS.RESOLVERS.forEach(function (r) {
      var opt = document.createElement("option");
      opt.value = r.id;
      opt.textContent = r.label;
      resSel.appendChild(opt);
    });
    var provSel = document.getElementById("id-provider");
    ID.PROVIDERS.forEach(function (p) {
      var opt = document.createElement("option");
      opt.value = p.id;
      opt.textContent = p.label + " - " + p.note;
      provSel.appendChild(opt);
    });
    function syncIdentityEndpoint() {
      var p = ID.providerById(provSel.value) || ID.PROVIDERS[0];
      var ep = document.getElementById("id-endpoint");
      if (ep && p && !ep.dataset.touched) ep.value = p ? p.url : "";
      try { store.set("idProvider", provSel.value); } catch (e) { /* ignore */ }
    }
    try {
      var savedProv = store.get("idProvider");
      if (savedProv && ID.providerById(savedProv)) provSel.value = savedProv;
      var savedEp = store.get("idEndpoint");
      if (savedEp) {
        document.getElementById("id-endpoint").value = savedEp;
        document.getElementById("id-endpoint").dataset.touched = "1";
      }
    } catch (e) { /* ignore */ }
    if (!document.getElementById("id-endpoint").value) syncIdentityEndpoint();
    provSel.addEventListener("change", function () {
      delete document.getElementById("id-endpoint").dataset.touched;
      syncIdentityEndpoint();
    });
    document.getElementById("id-endpoint").addEventListener("input", function (ev) {
      ev.target.dataset.touched = "1";
    });
    try {
      var savedDnsEp = store.get("dnsEndpoint");
      if (savedDnsEp) document.getElementById("dns-endpoint").value = savedEp;
    } catch (e) { /* ignore */ }

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

    function currentDnsInput() {
      var name = document.getElementById("dns-name").value;
      var type = typeSel.value || "A";
      var resolver = DNS.resolverById(resSel.value) || DNS.RESOLVERS[0];
      var custom = document.getElementById("dns-endpoint").value.trim();
      try {
        store.set("dnsEndpoint", custom);
        store.set("dnsResolver", resolver.id);
      } catch (e) { /* ignore */ }
      return { name: name, type: type, resolver: resolver, custom: custom };
    }

    document.getElementById("btn-dns").addEventListener("click", function () {
      if (!dnsGuard(caps, "result-dns", "status-dns")) return;
      var input = currentDnsInput();
      if (!DNS.cleanName(input.name)) {
        resultError(document.getElementById("result-dns"),
          "Not a valid hostname",
          "Enter a bare hostname such as example.com: no scheme, no path, no spaces.",
          "source: input validation");
        setStatus("status-dns", "Fix the hostname and try again.", "error");
        return;
      }
      withBusy("btn-dns", function (done) {
        setStatus("status-dns", "Asking " + input.resolver.label + " ...", "running");
        var opts = input.custom ? { endpoint: input.custom } : {};
        DNS.query(input.resolver, input.name, input.type, opts).then(function (res) {
          done();
          renderDnsResult(document.getElementById("result-dns"),
            document.getElementById("result-dns-raw"), res);
          setStatus("status-dns",
            res.ok ? "Answered in " + Math.round(res.ms) + " ms. Logged with resolver and timestamp."
              : "Failed honestly. Nothing fabricated.",
            res.ok ? "ok" : "error");
          store.logEvent(res.ok ? "dns-complete" : "dns-error",
            (res.name || input.name) + " " + (res.type || input.type) +
            " via " + res.resolver + (res.ok ? " " + Math.round(res.ms) + "ms" : " " + (res.error || "")));
        }).catch(function () {
          done();
          setStatus("status-dns", "Lookup failed unexpectedly.", "error");
        });
      });
    });

    document.getElementById("btn-dns-compare").addEventListener("click", function () {
      if (!dnsGuard(caps, "result-dns", "status-dns")) return;
      var input = currentDnsInput();
      if (!DNS.cleanName(input.name)) {
        resultError(document.getElementById("result-dns"),
          "Not a valid hostname",
          "Enter a bare hostname such as example.com: no scheme, no path, no spaces.",
          "source: input validation");
        setStatus("status-dns", "Fix the hostname and try again.", "error");
        return;
      }
      withBusy("btn-dns-compare", function (done) {
        setStatus("status-dns", "Asking both resolvers ...", "running");
        DNS.compare(input.name, input.type).then(function (cmp) {
          done();
          var root = document.getElementById("result-dns");
          root.innerHTML = "";
          var dl = document.createElement("dl");
          dl.className = "np-kv";
          cmp.results.forEach(function (res) {
            var summary = res.ok
              ? res.answers.length + " answer(s) in " + Math.round(res.ms) + " ms"
              : "failed: " + (res.error || "unknown");
            UI.kvRow(dl, res.resolver + (cmp.fastest === res.resolver ? " (fastest)" : ""), summary,
              res.resolver + " DoH", res.ok ? "live" : "missing");
          });
          root.appendChild(dl);
          var note = document.createElement("p");
          note.className = "np-sub";
          note.textContent = "Same question, two resolvers, side by side. Differences usually mean caching or resolver policy, not an error in this page.";
          root.appendChild(note);
          rawDetails(document.getElementById("result-dns-raw"),
            cmp.results.map(function (r) { return { resolver: r.resolver, answers: r.answers, raw: r.raw }; }),
            "Raw replies from both resolvers");
          setStatus("status-dns", "Compared. Logged with timestamp.", "ok");
          store.logEvent("dns-compare",
            (input.name || "") + " " + input.type + " fastest=" + (cmp.fastest || "none"));
        }).catch(function () {
          done();
          setStatus("status-dns", "Comparison failed unexpectedly.", "error");
        });
      });
    });

    function renderIdentity(res) {
      var root = document.getElementById("result-identity");
      if (!res.ok) {
        resultError(root, "Egress check failed honestly",
          (res.error || "unknown error") + ". Your address is not shown because no echo arrived. " +
          "If the endpoint blocks cross-origin reads, pick one that serves CORS-enabled JSON.",
          "source: " + (res.url || "no endpoint"));
        rawDetails(document.getElementById("result-identity-raw"), res.raw, "Raw endpoint reply (partial)");
        return;
      }
      resultTable(root, res.rows.length ? res.rows : [["reply", "empty JSON object"]],
        res.provider + (res.cached ? " (session cache)" : " live echo"),
        res.cached ? "" : "live");
      var note = document.createElement("p");
      note.className = "np-sub";
      note.textContent = "This is the address the endpoint saw, fetched " +
        (res.cached ? "earlier this session" : "just now in " + Math.round(res.ms) + " ms") +
        ". It reflects the egress path (VPN, proxy, CGNAT), not the device interface.";
      root.appendChild(note);
      rawDetails(document.getElementById("result-identity-raw"), res.raw, "Raw endpoint reply");
    }

    function runIdentity(force) {
      if (!caps.fetch) {
        resultError(document.getElementById("result-identity"),
          "Egress checks are not supported by this browser",
          "Echo endpoints need fetch. This browser exposes no fetch.",
          "missing: fetch");
        setStatus("status-identity", "Unsupported in this browser.", "error");
        return;
      }
      if (window.navigator && window.navigator.onLine === false) {
        resultError(document.getElementById("result-identity"),
          "Check not started: the browser reports offline",
          "Reconnect and try again.",
          "source: Browser online state");
        setStatus("status-identity", "Offline. Check not started.", "error");
        return;
      }
      var provider = ID.providerById(provSel.value);
      var url = document.getElementById("id-endpoint").value;
      if (!ID.cleanUrl(url)) {
        resultError(document.getElementById("result-identity"),
          "No echo endpoint configured",
          "Pick a provider above or paste an https JSON echo URL you trust. " +
          "Netpulse sends nothing until you click Reveal.",
          "missing: user-configured echo endpoint");
        setStatus("status-identity", "Choose an endpoint first.", "error");
        return;
      }
      try { store.set("idEndpoint", url.trim()); } catch (e) { /* ignore */ }
      withBusy("btn-identity", function (done) {
        setStatus("status-identity", "Asking " + (provider ? provider.label : "endpoint") + " ...", "running");
        ID.reveal(provider ? provider.label : "custom endpoint", url, { force: !!force }).then(function (res) {
          done();
          renderIdentity(res);
          setStatus("status-identity",
            res.ok ? (res.cached ? "Served from the session cache." : "Answered in " + Math.round(res.ms) + " ms. Logged.")
              : "Failed honestly. Nothing fabricated.",
            res.ok ? "ok" : "error");
          store.logEvent(res.ok ? "identity-complete" : "identity-error",
            res.provider + " " + (res.url || "") + (res.cached ? " cached" : ""));
        }).catch(function () {
          done();
          setStatus("status-identity", "Check failed unexpectedly.", "error");
        });
      });
    }

    document.getElementById("btn-identity").addEventListener("click", function () { runIdentity(false); });
    document.getElementById("btn-identity-recheck").addEventListener("click", function () { runIdentity(true); });

    document.getElementById("btn-webrtc").addEventListener("click", function () {
      var root = document.getElementById("result-webrtc");
      var body = document.getElementById("webrtc-body");
      body.innerHTML = "";
      if (!RTC.isSupported(window)) {
        resultError(root,
          "WebRTC inspection is not supported by this browser",
          "ICE gathering needs RTCPeerConnection. This browser exposes none, " +
          "so there is nothing to inspect and nothing is simulated.",
          "missing: RTCPeerConnection");
        setStatus("status-webrtc", "Unsupported in this browser.", "error");
        return;
      }
      if (window.navigator && window.navigator.onLine === false) {
        resultError(root,
          "Inspection not started: the browser reports offline",
          "ICE gathering against a public STUN server needs connectivity.",
          "source: Browser online state");
        setStatus("status-webrtc", "Offline. Inspection not started.", "error");
        return;
      }
      withBusy("btn-webrtc", function (done) {
        setStatus("status-webrtc", "Gathering ICE candidates (up to 12 s) ...", "running");
        RTC.inspect(window, {}).then(function (res) {
          done();
          if (!res.ok) {
            resultError(root, "Inspection failed honestly",
              (res.error || "unknown error") + ". The peer connection was torn down.",
              "source: local RTCPeerConnection");
            setStatus("status-webrtc", "Failed honestly. Nothing fabricated.", "error");
            store.logEvent("webrtc-error", res.error || "unknown");
            return;
          }
          var rows = [
            ["Candidates gathered", String(res.candidates.length)],
            ["STUN server", res.stunUrl],
            ["ICE state", res.states && res.states.ice ? res.states.ice : "not exposed"],
            ["Connection state", res.states && res.states.connection ? res.states.connection : "not exposed"],
            ["Selected pair RTT", res.summary.rttMs === null ? "no data (no pair selected)" : Math.round(res.summary.rttMs * 10) / 10 + " ms"],
            ["Jitter", res.summary.jitterMs === null ? "no data" : Math.round(res.summary.jitterMs * 100) / 100 + " ms"],
            ["Packets sent / lost", (res.summary.packetsSent === null ? "no data" : res.summary.packetsSent) + " / " +
              (res.summary.packetsLost === null ? "no data" : res.summary.packetsLost)]
          ];
          resultTable(root, rows, "local RTCPeerConnection + getStats", "live");
          var note = document.createElement("p");
          note.className = "np-sub";
          note.textContent = "Loopback inspection: this exercises the local ICE/DTLS stack, not a call to a remote peer. " +
            "Host addresses ending in .local are the browser masking real IPs (mDNS), reported as-is.";
          root.appendChild(note);
          if (!res.candidates.length) {
            var tr = document.createElement("tr");
            var td = document.createElement("td");
            td.setAttribute("colspan", "5");
            td.textContent = "No candidates gathered before the timeout. A strict firewall may be blocking UDP.";
            tr.appendChild(td);
            body.appendChild(tr);
          } else {
            res.candidates.forEach(function (c) {
              var row = document.createElement("tr");
              [c.type || "?", c.protocol || "?", c.address || "?",
                c.port === null ? "?" : String(c.port),
                RTC.addressKind(c.address) === "mdns-masked" ? "host IP masked by browser" : ""
              ].forEach(function (v) {
                var cell = document.createElement("td");
                cell.textContent = v;
                row.appendChild(cell);
              });
              body.appendChild(row);
            });
          }
          setStatus("status-webrtc", "Done. Peer connection torn down. Logged.", "ok");
          store.logEvent("webrtc-complete",
            "candidates=" + res.candidates.length +
            " rtt=" + (res.summary.rttMs === null ? "nodata" : Math.round(res.summary.rttMs) + "ms"));
        }).catch(function () {
          done();
          setStatus("status-webrtc", "Inspection failed unexpectedly.", "error");
        });
      });
    });
  }

  function shortName(url, maxLen) {
    var s = String(url === null || url === undefined ? "" : url);
    if (s.length <= (maxLen || 60)) return s;
    return "..." + s.slice(s.length - (maxLen || 60) + 3);
  }

  /* Stable key for one normalized traffic row: the buffered replay from
   * PerformanceObserver re-delivers the snapshot entries on subscribe, so
   * the live-stream merge dedupes against this key instead of concat. */
  function trafficRowKey(r) {
    if (!r || typeof r !== "object") return "null-row";
    return [r.name, r.startMs, r.durationMs, r.transferBytes,
      r.initiator, r.protocol].join("|");
  }

  function trafficGuard(caps, summaryId, statusId) {
    if (window.NetpulseTraffic.isSupported(window)) return true;
    resultError(document.getElementById(summaryId),
      "Traffic observation is not supported by this browser",
      "Own-traffic timing needs Resource Timing or PerformanceObserver. " +
      "This browser exposes neither, so there is no transfer table to show " +
      "and nothing is estimated in its place.",
      "missing: performance.getEntriesByType / PerformanceObserver");
    setStatus(statusId, "Unsupported in this browser.", "error");
    return false;
  }

  function renderTrafficWaterfall(root, rows) {
    if (!root) return;
    root.innerHTML = "";
    var timed = (rows || []).filter(function (r) {
      return r && typeof r.startMs === "number" && typeof r.durationMs === "number";
    }).slice(-40);
    if (!timed.length) {
      var UI = window.NetpulseUI;
      root.appendChild(UI.emptyState(
        "No timed entries to draw",
        "The waterfall needs entries with start times and durations. " +
        "Refresh the snapshot after the page loads more resources.",
        "source: Resource Timing"));
      return;
    }
    timed.sort(function (a, b) { return a.startMs - b.startMs; });
    var maxEnd = 0;
    timed.forEach(function (r) {
      maxEnd = Math.max(maxEnd, r.startMs + r.durationMs);
    });
    if (!(maxEnd > 0)) maxEnd = 1;
    timed.forEach(function (r) {
      var row = document.createElement("div");
      row.className = "np-fall-row";
      row.tabIndex = 0;
      row.setAttribute("aria-label",
        shortName(r.name, 80) + ", " +
        window.NetpulseTraffic.formatMs(r.durationMs));
      row.title = r.name || "";
      var name = document.createElement("span");
      name.className = "np-fall-name";
      name.textContent = shortName(r.name, 48);
      row.appendChild(name);
      var track = document.createElement("span");
      track.className = "np-fall-track";
      track.setAttribute("aria-hidden", "true");
      var bar = document.createElement("span");
      bar.className = "np-fall-bar";
      bar.style.left = (Math.max(0, r.startMs) / maxEnd * 100).toFixed(2) + "%";
      bar.style.width = Math.max(0.6, (Math.max(0, r.durationMs) / maxEnd * 100)).toFixed(2) + "%";
      track.appendChild(bar);
      row.appendChild(track);
      var ms = document.createElement("span");
      ms.className = "np-fall-ms";
      ms.textContent = window.NetpulseTraffic.formatMs(r.durationMs);
      row.appendChild(ms);
      root.appendChild(row);
    });
  }

  function renderImpossiblePanel() {
    var root = document.getElementById("result-traffic-impossible");
    if (!root || root.dataset.rendered) return;
    root.dataset.rendered = "1";
    var UI = window.NetpulseUI;
    root.innerHTML = "";
    var list = document.createElement("ul");
    list.className = "np-log";
    [
      "Promiscuous packet capture: no browser API exposes raw packets. Netpulse never shows a packet table.",
      "Other tabs, other apps, other devices: Resource Timing is scoped to this page only.",
      "LAN discovery and port scans: impossible from the sandbox; there is no scan button because a real one cannot exist here.",
      "ICMP ping and traceroute: browsers cannot emit ICMP; latency probes measure HTTP timing and say so.",
      "Real host IPs behind mDNS: the WebRTC inspector labels masked addresses instead of de-obfuscating them."
    ].forEach(function (text) {
      var li = document.createElement("li");
      li.textContent = text;
      list.appendChild(li);
    });
    root.appendChild(list);
    var badge = UI.badge("source: browser sandbox boundary (documented, not measured)", "missing");
    root.appendChild(badge);
  }

  function bootTraffic(store) {
    var T = window.NetpulseTraffic;
    var UI = window.NetpulseUI;
    if (!T || !UI) return;
    if (!document.getElementById("tabpanel-traffic")) return;
    var caps = window.NetpulseCapabilities.detectCapabilities(window.navigator, window);
    renderImpossiblePanel();

    var rows = [];
    var observing = false;
    var disconnect = null;

    function tableRow(cells) {
      var tr = document.createElement("tr");
      cells.forEach(function (c) {
        var td = document.createElement("td");
        td.textContent = c;
        tr.appendChild(td);
      });
      return tr;
    }

    function render() {
      var query = "";
      var filterEl = document.getElementById("traffic-filter");
      if (filterEl) query = filterEl.value;
      var visible = T.filterRows(rows, query);

      var summaryRoot = document.getElementById("result-traffic-summary");
      var totalBytes = 0;
      var hidden = 0;
      rows.forEach(function (r) {
        if (r.sizesHidden) { hidden += 1; }
        else if (typeof r.transferBytes === "number") { totalBytes += r.transferBytes; }
      });
      resultTable(summaryRoot, [
        ["Observed entries (this page)", String(rows.length)],
        ["Visible transfer bytes", T.formatBytes(totalBytes)],
        ["Entries with sizes hidden by headers or served from cache", String(hidden)],
        ["Live stream", observing ? "streaming" : "paused"]
      ], "Resource Timing", "live");
      if (hidden) {
        var note = document.createElement("p");
        note.className = "np-sub";
        note.textContent = "Hidden sizes are cross-origin entries without Timing-Allow-Origin " +
          "headers, or same-origin entries served from cache: the reported transfer size " +
          "is zero while decoded bytes stay positive. They are counted, never counted as zero-byte transfers.";
        if (summaryRoot) summaryRoot.appendChild(note);
      }

      var originBody = document.getElementById("traffic-origin-body");
      if (originBody) {
      originBody.innerHTML = "";
      var origins = T.aggregateByOrigin(rows);
      if (!origins.length) {
        originBody.appendChild(tableRow(["No entries yet.", "", "", "", ""]));
      } else {
        origins.slice(0, 20).forEach(function (o) {
          originBody.appendChild(tableRow([
            o.origin, String(o.entries), T.formatBytes(o.bytes),
            String(o.hiddenSizes),
            o.meanDurationMs === null ? "no data" : T.formatMs(o.meanDurationMs)
          ]));
        });
      }
      }

      var protoRoot = document.getElementById("result-traffic-protocol");
      var breakdown = T.protocolBreakdown(rows);
      if (!breakdown.length) {
        resultError(protoRoot,
          "No protocol data yet",
          "Refresh the snapshot. Protocols come from nextHopProtocol " +
          "(h1, h2, h3 insight) where the browser exposes them.",
          "source: Resource Timing");
      } else {
        resultTable(protoRoot, breakdown.map(function (b) {
          return ["Protocol " + b.protocol, String(b.entries) + " entr" +
            (b.entries === 1 ? "y" : "ies")];
        }), "Resource Timing nextHopProtocol", "live");
      }

      var body = document.getElementById("traffic-body");
      if (body) {
      body.innerHTML = "";
      if (!visible.length) {
        var tr = document.createElement("tr");
        var td = document.createElement("td");
        td.setAttribute("colspan", "5");
        td.textContent = rows.length
          ? "No transfers match this filter."
          : "No transfers recorded yet. Refresh the snapshot after the page loads resources.";
        tr.appendChild(td);
        body.appendChild(tr);
      } else {
        visible.slice(-100).reverse().forEach(function (r) {
          body.appendChild(tableRow([
            shortName(r.name, 64),
            r.initiator || "not exposed",
            T.formatMs(r.durationMs),
            r.sizesHidden ? "hidden by headers or served from cache" : T.formatBytes(r.transferBytes),
            r.protocol || "(hidden)"
          ]));
        });
      }
      }

      renderTrafficWaterfall(document.getElementById("traffic-waterfall"), visible);
    }

    function refresh(reason) {
      if (!trafficGuard(caps, "result-traffic-summary", "status-traffic")) return;
      rows = T.snapshot(window);
      setStatus("status-traffic",
        "Snapshot: " + rows.length + " entr" + (rows.length === 1 ? "y" : "ies") +
        " recorded for this page.",
        "ok");
      if (reason) store.logEvent(reason, "entries=" + rows.length);
      render();
    }

    var btnRefresh = document.getElementById("btn-traffic-refresh");
    if (btnRefresh) btnRefresh.addEventListener("click", function () {
      refresh("traffic-refresh");
    });
    var filterInput = document.getElementById("traffic-filter");
    if (filterInput) filterInput.addEventListener("input", function () {
      render();
    });
    var btnObserve = document.getElementById("btn-traffic-observe");
    if (btnObserve) btnObserve.addEventListener("click", function () {
      var btn = document.getElementById("btn-traffic-observe");
      if (!btn) return;
      if (observing) {
        if (disconnect) disconnect();
        disconnect = null;
        observing = false;
        btn.textContent = "Start live stream";
        btn.setAttribute("aria-pressed", "false");
        setStatus("status-traffic", "Live stream stopped. Snapshot retained.", "ok");
        store.logEvent("traffic-observe-stop", "entries=" + rows.length);
        render();
        return;
      }
      if (!trafficGuard(caps, "result-traffic-summary", "status-traffic")) return;
      var stop = T.observe(window, function (incoming) {
        var seen = {};
        rows.forEach(function (r) {
          seen[trafficRowKey(r)] = true;
        });
        (incoming || []).forEach(function (r) {
          if (!r) return;
          var k = trafficRowKey(r);
          if (!seen[k]) { seen[k] = true; rows.push(r); }
        });
        if (rows.length > 1000) rows = rows.slice(-1000);
        render();
      });
      if (!stop) {
        resultError(document.getElementById("result-traffic-summary"),
          "Live streaming needs PerformanceObserver",
          "Snapshots still work above; only the push stream is unavailable.",
          "missing: PerformanceObserver");
        setStatus("status-traffic", "Stream unavailable; snapshots work.", "error");
        return;
      }
      disconnect = stop;
      observing = true;
      btn.textContent = "Stop live stream";
      btn.setAttribute("aria-pressed", "true");
      setStatus("status-traffic", "Streaming new entries as they load ...", "running");
      store.logEvent("traffic-observe-start", "buffered replay plus live entries");
      render();
    });

    rows = T.snapshot(window);
    if (!T.isSupported(window)) {
      trafficGuard(caps, "result-traffic-summary", "status-traffic");
    } else {
      setStatus("status-traffic",
        rows.length
          ? "Snapshot: " + rows.length + " entries at boot. Refresh or stream for more."
          : "No entries at boot yet. Load resources, then refresh.",
        "ok");
    }
    render();
  }

  function renderMonitorLog() {
    var MON = window.NetpulseMonitor;
    var log = document.getElementById("monitor-log");
    if (!log || !MON) return;
    var store = window.__netpulseStore || null;
    var events = store ? store.getEvents() : [];
    var kept = MON.monitorEvents(events, 40);
    log.innerHTML = "";
    if (!kept.length) {
      var li = document.createElement("li");
      li.textContent = "No measurement events yet. Run a probe, a DNS lookup, or an ICE inspection.";
      log.appendChild(li);
      return;
    }
    kept.forEach(function (evt) {
      var item = document.createElement("li");
      var time = document.createElement("time");
      try {
        time.textContent = new Date(evt.t).toLocaleTimeString();
      } catch (e) {
        time.textContent = evt.t;
      }
      item.appendChild(time);
      var b = document.createElement("b");
      b.textContent = evt.type + " ";
      item.appendChild(b);
      var span = document.createElement("span");
      span.textContent = evt.detail === null || evt.detail === undefined ? "" : String(evt.detail);
      item.appendChild(span);
      log.appendChild(item);
    });
  }

  function bootMonitor(store) {
    var MON = window.NetpulseMonitor;
    var T = window.NetpulseTraffic;
    var P = window.NetpulseProbes;
    var Charts = window.NetpulseCharts;
    if (!MON || !Charts) return;
    if (!document.getElementById("tabpanel-monitor")) return;
    window.__netpulseStore = store;

    function render() {
      var hist = P ? P.loadHistory(store) : [];
      var trafficRows = T ? T.snapshot(window) : [];
      var series = MON.probeSeries(hist);
      var activity = MON.transferActivity(trafficRows);
      var sum = MON.sessionSummary(hist, activity);

      resultTable(document.getElementById("result-monitor-summary"), [
        ["Probe runs this session", String(sum.probeRuns)],
        ["Probe attempts (failed)", String(sum.probeAttempts) + " (" + String(sum.probeFailed) + ")"],
        ["Observed transfers (this page)", String(sum.observedEntries)],
        ["Observed bytes (visible)", T ? T.formatBytes(sum.observedBytes) : String(sum.observedBytes)],
        ["Sizes hidden by headers or served from cache", String(sum.hiddenSizes)]
      ], "session probe history + Resource Timing", "live");

      Charts.lineChart(document.getElementById("chart-monitor-latency"), {
        label: "Probe medians per run in milliseconds",
        yLabel: "ms / run",
        xLabel: "run",
        series: [{ label: "median ms", values: series.latencyMedians }]
      });
      Charts.lineChart(document.getElementById("chart-monitor-rate"), {
        label: "Probe throughput per run in kilobytes per second",
        yLabel: "KB/s / run",
        xLabel: "run",
        series: [{ label: "KB/s", values: series.throughputRates, color: "#7aa2f7" }]
      });
      Charts.lineChart(document.getElementById("chart-monitor-traffic"), {
        label: "Cumulative observed transfer bytes",
        yLabel: "bytes",
        xLabel: "entry",
        series: [{ label: "cumulative bytes", values: activity.cumulativeBytes, color: "#e0a44f" }]
      });
      renderMonitorLog();
    }

    document.getElementById("btn-monitor-refresh").addEventListener("click", function () {
      render();
    });
    store.onEvent(function () {
      try { render(); } catch (e) { /* monitor refresh never breaks logging */ }
    });
    render();
  }

  function bootReports(store) {
    var EXP = window.NetpulseExport;
    var MON = window.NetpulseMonitor;
    var T = window.NetpulseTraffic;
    var P = window.NetpulseProbes;
    var UI = window.NetpulseUI;
    if (!EXP || !UI) return;
    if (!document.getElementById("tabpanel-reports")) return;
    var caps = window.NetpulseCapabilities.detectCapabilities(window.navigator, window);

    function currentReport() {
      var hist = P ? P.loadHistory(store) : [];
      var trafficRows = T ? T.snapshot(window) : [];
      var activity = MON ? MON.transferActivity(trafficRows) : null;
      var sum = MON ? MON.sessionSummary(hist, activity) : null;
      return EXP.buildReport({
        capabilities: caps,
        events: store.getEvents(),
        history: hist,
        trafficRows: trafficRows,
        sessionSummary: sum,
        userAgent: window.navigator ? window.navigator.userAgent : null
      });
    }

    function renderAll() {
      var report = currentReport();
      var summaryRoot = document.getElementById("result-export-summary");
      resultTable(summaryRoot, [
        ["Probe runs in this session", String(report.probeRuns.length)],
        ["Observed transfers (this page)", String(report.transfers.length)],
        ["Session events logged", String(report.events.length)],
        ["File download path", EXP.isDownloadSupported(window)
          ? "available (Blob download)"
          : "not available in this browser"]
      ], "session probe history + Resource Timing + session store",
        EXP.isDownloadSupported(window) ? "live" : "missing");

      var preview = document.getElementById("result-report-preview");
      if (preview) {
        preview.innerHTML = "";
        var meta = document.createElement("p");
        meta.className = "np-report-meta";
        meta.textContent = "Generated " + report.generatedAt +
          " in your browser from live session data. Nothing below was uploaded or invented.";
        preview.appendChild(meta);
        function section(title, sourceLabel, rows, headers, emptyTitle, emptyBody) {
          var h = document.createElement("h3");
          h.textContent = title;
          preview.appendChild(h);
          if (!rows.length) {
            preview.appendChild(UI.emptyState(emptyTitle, emptyBody, "source: " + sourceLabel));
            return;
          }
          var wrap = document.createElement("div");
          wrap.className = "np-table-wrap";
          var table = document.createElement("table");
          table.className = "np-table";
          var thead = document.createElement("thead");
          var hr = document.createElement("tr");
          headers.forEach(function (c) {
            var th = document.createElement("th");
            th.textContent = c;
            hr.appendChild(th);
          });
          thead.appendChild(hr);
          table.appendChild(thead);
          var tbody = document.createElement("tbody");
          rows.forEach(function (cells) {
            var tr = document.createElement("tr");
            cells.forEach(function (c) {
              var td = document.createElement("td");
              td.textContent = c;
              tr.appendChild(td);
            });
            tbody.appendChild(tr);
          });
          table.appendChild(tbody);
          wrap.appendChild(table);
          preview.appendChild(wrap);
          var badge = UI.badge("source: " + sourceLabel, "live");
          preview.appendChild(badge);
        }
        var sum = report.sessionSummary;
        if (sum) {
          section("Session rollup", "session probe history + Resource Timing",
            [[String(sum.probeRuns), String(sum.probeAttempts) + " (" + String(sum.probeFailed) + " failed)",
              String(sum.observedEntries), String(sum.observedBytes), String(sum.hiddenSizes)]],
            ["Probe runs", "Attempts", "Observed entries", "Visible bytes", "Hidden sizes"],
            "No measurements yet",
            "Run a probe or load resources, then return here. The rollup counts only what was actually recorded.");
        }
        section("Probe runs (latest 20)", "HTTP timing (fetch)",
          report.probeRuns.slice(-20).reverse().map(function (r) {
            var result = r.kind === "latency" || r.medianMs === null
              ? (r.medianMs === null ? "no data" : r.medianMs + " ms median")
              : (r.throughputKBps === null ? "no data" : r.throughputKBps + " KB/s");
            return [r.t || "?", r.kind || "?", r.endpoint || "?",
              (r.succeeded === null ? "?" : r.succeeded + "/" + r.attempts) + " ok", result];
          }),
          ["Time", "Kind", "Endpoint", "Ok/Attempts", "Result"],
          "No probe runs in this session",
          "Run a latency, download, or upload probe on the Quality tab. Every attempt lands here with its endpoint.");
        section("Observed transfers (latest 20)", "Resource Timing",
          report.transfers.slice(-20).reverse().map(function (r) {
            return [shortName(r.name, 56), r.initiator || "not exposed",
              r.durationMs === null ? "no data" : r.durationMs + " ms",
              r.sizesHidden ? "hidden by headers or served from cache"
                : (r.transferBytes === null ? "no data" : r.transferBytes + " B"),
              r.protocol || "(hidden)"];
          }),
          ["Resource", "Initiator", "Duration", "Bytes", "Protocol"],
          "No transfers recorded",
          "Refresh the Traffic tab snapshot after the page loads resources. Only this page's own entries can appear.");
        section("Session events (latest 20)", "session store",
          report.events.slice(-20).reverse().map(function (e) {
            return [e.t || "?", e.type || "?", (e.detail === null || e.detail === undefined) ? "" : String(e.detail).slice(0, 120)];
          }),
          ["Time", "Type", "Detail"],
          "No session events yet",
          "Connectivity changes, probe completions, and exports will appear here.");
      }

      var persistRoot = document.getElementById("result-session-persist");
      if (persistRoot) {
        var hist = P ? P.loadHistory(store) : [];
        var byteLen = null;
        try {
          var raw = window.localStorage
            ? window.localStorage.getItem(window.NetpulseStore.STORAGE_KEY) : null;
          byteLen = raw === null || raw === undefined ? 0 : raw.length;
        } catch (e) {
          byteLen = null;
        }
        resultTable(persistRoot, [
          ["Storage key", window.NetpulseStore.STORAGE_KEY],
          ["Events stored", String(store.getEvents().length)],
          ["Probe runs stored", String(hist.length)],
          ["Approximate stored size", byteLen === null ? "not exposed" : byteLen + " characters"]
        ], "localStorage", caps.localStorage ? "live" : "missing");
      }
    }

    function exportGuard() {
      if (EXP.isDownloadSupported(window)) return true;
      resultError(document.getElementById("result-export-summary"),
        "File downloads are not supported by this browser",
        "Export needs Blob object URLs. This browser exposes none, so " +
        "Netpulse refuses to pretend a file was saved. The printable " +
        "report preview below still works.",
        "missing: Blob / URL.createObjectURL");
      setStatus("status-report", "Download unavailable; print preview still works.", "error");
      return false;
    }

    function save(kind, filename, mime, content) {
      if (!exportGuard()) return;
      var ok = EXP.download(window, filename, mime, content);
      if (ok) {
        setStatus("status-report", "Saved " + filename + " locally. Logged with timestamp.", "ok");
        store.logEvent("report-export", kind + " " + filename);
      } else {
        setStatus("status-report", "The browser refused the download.", "error");
        store.logEvent("report-export", kind + " refused by browser");
      }
    }

    var reportBtn = document.getElementById("btn-export-json");
    if (reportBtn) reportBtn.addEventListener("click", function () {
      var report = currentReport();
      save("full-json", EXP.stampFilename("report", new Date(report.generatedAt)) + ".json",
        "application/json", EXP.reportToJson(report));
    });
    var probesBtn = document.getElementById("btn-export-probes");
    if (probesBtn) probesBtn.addEventListener("click", function () {
      save("probe-runs-csv", EXP.stampFilename("probe-runs") + ".csv",
        "text/csv", EXP.probesToCsv(P ? P.loadHistory(store) : []));
    });
    var trafficBtn = document.getElementById("btn-export-traffic");
    if (trafficBtn) trafficBtn.addEventListener("click", function () {
      save("transfers-csv", EXP.stampFilename("transfers") + ".csv",
        "text/csv", EXP.trafficToCsv(T ? T.snapshot(window) : []));
    });
    var eventsBtn = document.getElementById("btn-export-events");
    if (eventsBtn) eventsBtn.addEventListener("click", function () {
      save("events-csv", EXP.stampFilename("events") + ".csv",
        "text/csv", EXP.eventsToCsv(store.getEvents()));
    });
    var printBtn = document.getElementById("btn-report-print");
    if (printBtn) printBtn.addEventListener("click", function () {
      if (EXP.printReport(window)) {
        setStatus("status-report", "Print dialog opened for the source-stamped report.", "ok");
        store.logEvent("report-print", "window.print from Reports tab");
      } else {
        setStatus("status-report", "Printing is not available in this browser.", "error");
      }
    });
    var clearBtn = document.getElementById("btn-report-clear");
    if (clearBtn) clearBtn.addEventListener("click", function () {
      store.clear();
      store.logEvent("session-clear", "saved session cleared from Reports tab");
      renderAll();
    });

    store.onEvent(function () {
      try { renderAll(); } catch (e) { /* report refresh never breaks logging */ }
    });
    renderAll();
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
    bootDnsIdentity(store);
    bootTraffic(store);
    bootMonitor(store);
    bootReports(store);

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
