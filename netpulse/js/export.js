"use strict";
/* Netpulse export and report engine: JSON plus CSV snapshots of the real
 * session measurement stream, plus a printable source-stamped report view.
 * Everything exported was actually measured or logged this session: probe
 * history, observed transfers, the session event log, and the capability
 * map. Empty sessions export honest empty sections, never invented rows.
 * Pure builders (buildReport, toJSON, CSV converters, stampFilename) carry
 * no DOM dependencies so ?selftest=1 and the static harness can audit
 * them on fixtures; only download() and printReport() touch the DOM. */
(function (global) {
  function finiteOrNull(v) {
    return (typeof v === "number" && isFinite(v)) ? v : null;
  }

  /* CSV numeric parity with buildReport: non-finite numbers render as
   * empty cells, matching the nulls JSON emits, never "NaN"/"Infinity". */
  function csvNum(v) {
    return (typeof v === "number" && isFinite(v)) ? v : "";
  }

  function text(v) {
    if (v === null || v === undefined) return null;
    if (typeof v === "number" && !isFinite(v)) return null;
    return String(v);
  }

  /* Assemble one auditable report object. Inputs are the session's real
   * artifacts; nothing is synthesized. Each section carries its source
   * label so the printed view and the JSON stay honest about provenance. */
  function buildReport(opts) {
    var o = opts || {};
    var caps = o.capabilities || null;
    var events = Array.isArray(o.events) ? o.events.slice() : [];
    var history = Array.isArray(o.history) ? o.history.slice() : [];
    var traffic = Array.isArray(o.trafficRows) ? o.trafficRows.slice() : [];
    var summary = o.sessionSummary || null;
    var generatedAt = o.generatedAt || new Date().toISOString();
    var userAgent = o.userAgent || null;

    var probeRuns = history.map(function (run) {
      if (!run || typeof run !== "object") return null;
      var s = run.summary || {};
      var rate = run.throughputKBps !== undefined ? run.throughputKBps : run.throughputKbps;
      return {
        t: text(run.t),
        kind: text(run.kind),
        endpoint: text(run.endpoint),
        attempts: finiteOrNull(s.attempts),
        succeeded: finiteOrNull(s.succeeded),
        failed: finiteOrNull(s.failed),
        medianMs: finiteOrNull(s.median),
        p95Ms: finiteOrNull(s.p95),
        minMs: finiteOrNull(s.min),
        maxMs: finiteOrNull(s.max),
        jitterMs: finiteOrNull(s.jitter),
        throughputKBps: finiteOrNull(rate),
        totalBytes: finiteOrNull(run.totalBytes),
        payloadBytes: finiteOrNull(run.payloadBytes),
        source: "HTTP timing (fetch)"
      };
    }).filter(function (r) {
      if (r === null) return false;
      /* Drop fully-null junk rows (e.g. a bare {} in history): every
       * identifier and every measurement is null, so the row carries
       * no signal and would export as an empty line. */
      return (r.t !== null || r.kind !== null || r.endpoint !== null ||
        r.attempts !== null || r.succeeded !== null || r.failed !== null ||
        r.medianMs !== null || r.p95Ms !== null || r.minMs !== null ||
        r.maxMs !== null || r.jitterMs !== null || r.throughputKBps !== null ||
        r.totalBytes !== null || r.payloadBytes !== null);
    });

    var transfers = traffic.map(function (r) {
      if (!r || typeof r !== "object") return null;
      return {
        name: text(r.name),
        initiator: text(r.initiator),
        durationMs: finiteOrNull(r.durationMs),
        startMs: finiteOrNull(r.startMs),
        transferBytes: finiteOrNull(r.transferBytes),
        encodedBytes: finiteOrNull(r.encodedBytes),
        decodedBytes: finiteOrNull(r.decodedBytes),
        protocol: text(r.protocol),
        sizesHidden: !!r.sizesHidden,
        source: "Resource Timing"
      };
    }).filter(function (r) {
      if (r === null) return false;
      /* Drop fully-null junk rows the same way as probe runs. */
      return (r.name !== null || r.initiator !== null || r.protocol !== null ||
        r.durationMs !== null || r.startMs !== null ||
        r.transferBytes !== null || r.encodedBytes !== null ||
        r.decodedBytes !== null);
    });

    var log = events.filter(function (e) {
      return e && typeof e === "object" && typeof e.type === "string";
    }).map(function (e) {
      return { t: text(e.t), type: text(e.type), detail: text(e.detail), source: "session store" };
    });

    return {
      tool: "Netpulse",
      version: 1,
      generatedAt: generatedAt,
      userAgent: userAgent,
      sources: {
        connection: "Network Information API (where exposed)",
        quality: "HTTP timing (fetch)",
        dns: "DNS-over-HTTPS resolver answers",
        identity: "opt-in third-party echo (provider-labeled)",
        webrtc: "local RTCPeerConnection + getStats",
        traffic: "Resource Timing",
        events: "session store"
      },
      capabilities: caps,
      sessionSummary: summary,
      probeRuns: probeRuns,
      transfers: transfers,
      events: log
    };
  }

  function reportToJson(report) {
    return JSON.stringify(report || {}, null, 2);
  }

  /* RFC 4180 quoting: quote fields holding commas, quotes, or newlines,
   * doubling embedded quotes. Nulls render as empty cells, never as the
   * string "null", so a sparse session stays visibly sparse. Leading
   * =,+,-,@ cells are single-quote prefixed so spreadsheet formula
   * injection cannot go live on CSV import; the quote is part of the
   * cell text and survives RFC 4180 quoting below. */
  function csvCell(v) {
    if (v === null || v === undefined) return "";
    /* Text-column parity with buildReport: a non-finite number reaching a
     * text field (t, kind, endpoint, name, initiator, protocol, detail)
     * renders as an empty cell, matching the null JSON emits, never the
     * literal strings "NaN"/"Infinity". Numeric columns are already safe
     * via csvNum; this guards the raw-text path. */
    if (typeof v === "number" && !isFinite(v)) return "";
    var s = String(v);
    /* Formula prefix applies to strings only: a finite negative number
     * such as -5 must stay "-5" to match the JSON numeric, never "'-5". */
    if (typeof v === "string" && /^[=+\-@]/.test(s)) s = "'" + s;
    if (s.indexOf(",") !== -1 || s.indexOf('"') !== -1 ||
        s.indexOf("\n") !== -1 || s.indexOf("\r") !== -1) {
      return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
  }

  function csvRow(cells) {
    return cells.map(csvCell).join(",");
  }

  function eventsToCsv(events) {
    var lines = [csvRow(["timestamp", "type", "detail", "source"])];
    var evts = Array.isArray(events) ? events : [];
    evts.forEach(function (e) {
      /* Parity with buildReport: keep only rows with a string type, so a
       * bare {} emits no data row in either JSON or CSV. */
      if (!e || typeof e !== "object" || typeof e.type !== "string") return;
      lines.push(csvRow([e.t, e.type, e.detail, "session store"]));
    });
    return lines.join("\n") + "\n";
  }

  function probesToCsv(history) {
    var lines = [csvRow(["timestamp", "kind", "endpoint", "attempts",
      "succeeded", "failed", "medianMs", "p95Ms", "minMs", "maxMs",
      "jitterMs", "throughputKBps", "totalBytes", "payloadBytes", "source"])];
    var runs = Array.isArray(history) ? history : [];
    runs.forEach(function (run) {
      if (!run || typeof run !== "object") return;
      var s = run.summary || {};
      /* Parity with buildReport: drop fully-null junk rows (e.g. a bare
       * {}) so JSON and CSV agree that the row carries no signal. */
      if (text(run.t) === null && text(run.kind) === null &&
          text(run.endpoint) === null &&
          finiteOrNull(s.attempts) === null &&
          finiteOrNull(s.succeeded) === null &&
          finiteOrNull(s.failed) === null &&
          finiteOrNull(s.median) === null && finiteOrNull(s.p95) === null &&
          finiteOrNull(s.min) === null && finiteOrNull(s.max) === null &&
          finiteOrNull(s.jitter) === null &&
          finiteOrNull(run.throughputKBps !== undefined ?
            run.throughputKBps : run.throughputKbps) === null &&
          finiteOrNull(run.totalBytes) === null &&
          finiteOrNull(run.payloadBytes) === null) return;
      var rate = run.throughputKBps !== undefined ? run.throughputKBps : run.throughputKbps;
      lines.push(csvRow([run.t, run.kind, run.endpoint,
        csvNum(s.attempts), csvNum(s.succeeded), csvNum(s.failed),
        csvNum(s.median), csvNum(s.p95), csvNum(s.min), csvNum(s.max),
        csvNum(s.jitter), csvNum(rate), csvNum(run.totalBytes),
        csvNum(run.payloadBytes), "HTTP timing (fetch)"]));
    });
    return lines.join("\n") + "\n";
  }

  function trafficToCsv(rows) {
    var lines = [csvRow(["name", "initiator", "durationMs", "startMs",
      "transferBytes", "encodedBytes", "decodedBytes", "protocol",
      "sizesHidden", "source"])];
    var arr = Array.isArray(rows) ? rows : [];
    arr.forEach(function (r) {
      if (!r || typeof r !== "object") return;
      /* Parity with buildReport: drop fully-null junk rows. */
      if (text(r.name) === null && text(r.initiator) === null &&
          text(r.protocol) === null &&
          finiteOrNull(r.durationMs) === null &&
          finiteOrNull(r.startMs) === null &&
          finiteOrNull(r.transferBytes) === null &&
          finiteOrNull(r.encodedBytes) === null &&
          finiteOrNull(r.decodedBytes) === null) return;
      lines.push(csvRow([r.name, r.initiator, csvNum(r.durationMs),
        csvNum(r.startMs), csvNum(r.transferBytes), csvNum(r.encodedBytes),
        csvNum(r.decodedBytes), r.protocol,
        r.sizesHidden ? "true" : "false", "Resource Timing"]));
    });
    return lines.join("\n") + "\n";
  }

  /* Filesystem-safe UTC stamp: netpulse-<base>-20260929-143210.json.
   * Non-word characters in the base collapse to hyphens; an empty base
   * falls back to "session". */
  function stampFilename(base, when) {
    var safe = String(base === null || base === undefined ? "session" : base)
      .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "session";
    var d = when instanceof Date ? when : new Date(when || Date.now());
    /* Invalid-date fallback: a garbage `when` string yields NaN fields
     * without this guard, stamping "NaN" into the filename. */
    if (isNaN(d.getTime())) d = new Date();
    function pad(n) { return (n < 10 ? "0" : "") + n; }
    var stamp = d.getUTCFullYear() + pad(d.getUTCMonth() + 1) + pad(d.getUTCDate()) +
      "-" + pad(d.getUTCHours()) + pad(d.getUTCMinutes()) + pad(d.getUTCSeconds());
    return "netpulse-" + safe + "-" + stamp;
  }

  function isDownloadSupported(win) {
    var w = win || global;
    try {
      return !!(w.Blob && w.URL && typeof w.URL.createObjectURL === "function" &&
        w.document && typeof w.document.createElement === "function");
    } catch (e) {
      return false;
    }
  }

  /* Trigger a client-side file save. Returns true when the anchor click
   * was dispatched, false where the browser offers no Blob download path
   * (the caller renders an honest empty state instead of pretending). */
  function download(win, filename, mime, content) {
    var w = win || global;
    if (!isDownloadSupported(w)) return false;
    try {
      var blob = new w.Blob([content], { type: mime || "application/octet-stream" });
      var url = w.URL.createObjectURL(blob);
      var a = w.document.createElement("a");
      a.href = url;
      a.download = filename;
      if (w.document.body) w.document.body.appendChild(a);
      a.click();
      if (a.remove) a.remove();
      try {
        if (typeof setTimeout === "function") {
          setTimeout(function () { try { w.URL.revokeObjectURL(url); } catch (e) { /* gone */ } }, 4000);
        }
      } catch (e) { /* revocation is best-effort only */ }
      return true;
    } catch (e) {
      return false;
    }
  }

  function printReport(win) {
    var w = win || global;
    try {
      if (w && typeof w.print === "function") { w.print(); return true; }
      return false;
    } catch (e) {
      return false;
    }
  }

  global.NetpulseExport = {
    buildReport: buildReport,
    reportToJson: reportToJson,
    csvCell: csvCell,
    eventsToCsv: eventsToCsv,
    probesToCsv: probesToCsv,
    trafficToCsv: trafficToCsv,
    stampFilename: stampFilename,
    isDownloadSupported: isDownloadSupported,
    download: download,
    printReport: printReport
  };
})(typeof window !== "undefined" ? window : this);
