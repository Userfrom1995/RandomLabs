"use strict";
/* Netpulse active quality probes: user-triggered, fully client-side
 * application-layer HTTP measurements. No ICMP, no raw sockets, no invented
 * numbers: every result stores its samples, endpoint, and timestamp so it is
 * auditable. Percentile math is pure and covered by ?selftest=1 fixtures. */
(function (global) {
  var HISTORY_KEY = "probeHistory";
  var HISTORY_MAX = 50;
  var DEFAULT_TIMEOUT_MS = 15000;

  function sortNums(values) {
    return values.slice().sort(function (a, b) { return a - b; });
  }

  function median(values) {
    if (!values.length) return null;
    var s = sortNums(values);
    var mid = s.length >> 1;
    if (s.length % 2) return s[mid];
    return (s[mid - 1] + s[mid]) / 2;
  }

  /* Nearest-rank percentile over a non-empty array; null on empty input. */
  function percentile(values, p) {
    if (!values.length) return null;
    var s = sortNums(values);
    var rank = Math.ceil((p / 100) * s.length) - 1;
    rank = Math.max(0, Math.min(s.length - 1, rank));
    return s[rank];
  }

  /* Mean absolute successive difference (RFC 3550 style jitter). */
  function jitter(values) {
    if (values.length < 2) return null;
    var acc = 0;
    for (var i = 1; i < values.length; i++) {
      acc += Math.abs(values[i] - values[i - 1]);
    }
    return acc / (values.length - 1);
  }

  function summarize(samples) {
    var ok = samples.filter(function (s) { return s.ok; });
    var ms = ok.map(function (s) { return s.ms; });
    return {
      attempts: samples.length,
      succeeded: ok.length,
      failed: samples.length - ok.length,
      min: ms.length ? Math.min.apply(null, ms) : null,
      max: ms.length ? Math.max.apply(null, ms) : null,
      median: median(ms),
      p95: percentile(ms, 95),
      jitter: jitter(ms)
    };
  }

  function now(win) {
    var perf = (win || global).performance || null;
    if (perf && typeof perf.now === "function") return perf.now();
    return Date.now();
  }

  function cacheBusted(url) {
    var sep = url.indexOf("?") === -1 ? "?" : "&";
    return url + sep + "np=" + Date.now() + Math.floor(Math.random() * 100000);
  }

  /* One timed GET that reads the full body so `bytes` is the real transfer
   * size, not a header claim. Resolves (never rejects) with a sample. */
  function timedGet(url, timeoutMs) {
    return new Promise(function (resolve) {
      var win = global;
      if (typeof win.fetch !== "function") {
        resolve({ ok: false, ms: null, bytes: 0, error: "fetch is not available in this browser" });
        return;
      }
      var controller = null;
      var timer = null;
      var opts = { cache: "no-store", credentials: "omit" };
      try {
        if (typeof win.AbortController === "function") {
          controller = new win.AbortController();
          opts.signal = controller.signal;
          timer = win.setTimeout(function () {
            try { controller.abort(); } catch (e) { /* already settled */ }
          }, timeoutMs || DEFAULT_TIMEOUT_MS);
        }
      } catch (e) {
        controller = null;
      }
      var t0 = now(win);
      win.fetch(cacheBusted(url), opts).then(function (resp) {
        if (!resp.ok) {
          if (timer) win.clearTimeout(timer);
          resolve({ ok: false, ms: null, bytes: 0, error: "HTTP " + resp.status });
          return null;
        }
        return resp.arrayBuffer().then(function (buf) {
          if (timer) win.clearTimeout(timer);
          var ms = now(win) - t0;
          return { ok: true, ms: ms, bytes: buf ? buf.byteLength : 0, status: resp.status };
        });
      }).then(function (sample) {
        if (sample) resolve(sample);
      }).catch(function (err) {
        if (timer) {
          try { win.clearTimeout(timer); } catch (e) { /* ignore */ }
        }
        var msg = (err && err.name === "AbortError")
          ? "timed out after " + (timeoutMs || DEFAULT_TIMEOUT_MS) + " ms"
          : "request failed (" + (err && err.message ? err.message : "network error") + ")";
        resolve({ ok: false, ms: null, bytes: 0, error: msg });
      });
    });
  }

  /* One timed POST of a generated payload. The byte count is the real
   * payload handed to the stack. Static hosts (including GitHub Pages)
   * reject POST, which surfaces here as an honest error, not a number. */
  function timedPost(url, payloadBytes, timeoutMs) {
    return new Promise(function (resolve) {
      var win = global;
      if (typeof win.fetch !== "function") {
        resolve({ ok: false, ms: null, bytes: 0, error: "fetch is not available in this browser" });
        return;
      }
      var payload = null;
      try {
        payload = new Uint8Array(payloadBytes);
        if (win.crypto && typeof win.crypto.getRandomValues === "function") {
          win.crypto.getRandomValues(payload);
        } else {
          for (var i = 0; i < payload.length; i++) payload[i] = (Math.random() * 256) | 0;
        }
      } catch (e) {
        resolve({ ok: false, ms: null, bytes: 0, error: "could not build payload" });
        return;
      }
      var controller = null;
      var timer = null;
      var opts = {
        method: "POST",
        cache: "no-store",
        credentials: "omit",
        headers: { "Content-Type": "application/octet-stream" },
        body: payload
      };
      try {
        if (typeof win.AbortController === "function") {
          controller = new win.AbortController();
          opts.signal = controller.signal;
          timer = win.setTimeout(function () {
            try { controller.abort(); } catch (e) { /* already settled */ }
          }, timeoutMs || DEFAULT_TIMEOUT_MS);
        }
      } catch (e) {
        controller = null;
      }
      var t0 = now(win);
      win.fetch(url, opts).then(function (resp) {
        if (timer) win.clearTimeout(timer);
        var ms = now(win) - t0;
        if (!resp.ok) {
          resolve({ ok: false, ms: null, bytes: 0, error: "endpoint refused upload (HTTP " + resp.status + ")" });
          return null;
        }
        return resp.arrayBuffer().then(function () {
          return { ok: true, ms: now(win) - t0, bytes: payloadBytes, status: resp.status };
        });
      }).then(function (sample) {
        if (sample) resolve(sample);
      }).catch(function (err) {
        if (timer) {
          try { win.clearTimeout(timer); } catch (e) { /* ignore */ }
        }
        var msg = (err && err.name === "AbortError")
          ? "timed out after " + (timeoutMs || DEFAULT_TIMEOUT_MS) + " ms"
          : "request failed (" + (err && err.message ? err.message : "network error") + ")";
        resolve({ ok: false, ms: null, bytes: 0, error: msg });
      });
    });
  }

  function throughputKbps(bytes, ms) {
    if (!bytes || !ms || ms <= 0) return null;
    return (bytes / (ms / 1000)) / 1024;
  }

  function defaultEndpoint() {
    try {
      var href = String(global.location.href).split("?")[0].split("#")[0];
      var base = href.slice(0, href.lastIndexOf("/") + 1);
      return base + "probe.bin";
    } catch (e) {
      return "probe.bin";
    }
  }

  function runSeries(step, count, onProgress) {
    var samples = [];
    var chain = Promise.resolve();
    for (var i = 0; i < count; i++) {
      (function (index) {
        chain = chain.then(function () {
          if (onProgress) {
            try { onProgress(index + 1, count); } catch (e) { /* ignore */ }
          }
          return step().then(function (s) {
            samples.push(s);
            return null;
          });
        });
      })(i);
    }
    return chain.then(function () { return samples; });
  }

  function finishRun(kind, endpoint, samples, extra) {
    var summary = summarize(samples);
    var bytes = samples.reduce(function (acc, s) { return acc + (s.bytes || 0); }, 0);
    var wallMs = samples.reduce(function (acc, s) { return acc + (s.ms || 0); }, 0);
    var run = {
      kind: kind,
      t: new Date().toISOString(),
      endpoint: endpoint,
      samples: samples.map(function (s) {
        return {
          ok: s.ok,
          ms: s.ms === null || s.ms === undefined ? null : Math.round(s.ms * 100) / 100,
          bytes: s.bytes || 0,
          error: s.error || null
        };
      }),
      summary: summary,
      totalBytes: bytes,
      totalMs: Math.round(wallMs * 100) / 100,
      throughputKbps: throughputKbps(bytes, wallMs)
    };
    if (extra) {
      Object.keys(extra).forEach(function (k) { run[k] = extra[k]; });
    }
    return run;
  }

  function runLatency(endpoint, count, onProgress) {
    return runSeries(function () {
      return timedGet(endpoint, DEFAULT_TIMEOUT_MS);
    }, count, onProgress).then(function (samples) {
      return finishRun("latency", endpoint, samples, null);
    });
  }

  function runDownload(endpoint, count, onProgress) {
    return runSeries(function () {
      return timedGet(endpoint, DEFAULT_TIMEOUT_MS * 2);
    }, count, onProgress).then(function (samples) {
      return finishRun("download", endpoint, samples, null);
    });
  }

  function runUpload(endpoint, payloadBytes, count, onProgress) {
    return runSeries(function () {
      return timedPost(endpoint, payloadBytes, DEFAULT_TIMEOUT_MS * 2);
    }, count, onProgress).then(function (samples) {
      return finishRun("upload", endpoint, samples, { payloadBytes: payloadBytes });
    });
  }

  function loadHistory(store) {
    try {
      var raw = store.get(HISTORY_KEY);
      if (Array.isArray(raw)) return raw.filter(function (r) { return r && r.kind; });
    } catch (e) { /* corrupt state fails closed to empty */ }
    return [];
  }

  function saveRun(store, run) {
    var hist = loadHistory(store);
    hist.push(run);
    if (hist.length > HISTORY_MAX) hist = hist.slice(-HISTORY_MAX);
    try {
      store.set(HISTORY_KEY, hist);
    } catch (e) { /* persistence blocked: history stays in memory only */ }
    return hist;
  }

  /* Application-layer success rate across stored runs. This is the honest
   * browser-visible analogue of loss: share of probe attempts that failed
   * at the HTTP layer. It is never labeled ICMP or packet loss. */
  function lossApproximation(history) {
    var attempts = 0;
    var failed = 0;
    (history || []).forEach(function (run) {
      if (run && run.summary) {
        attempts += run.summary.attempts || 0;
        failed += run.summary.failed || 0;
      }
    });
    if (!attempts) return { attempts: 0, failed: 0, successRate: null };
    return {
      attempts: attempts,
      failed: failed,
      successRate: Math.round(((attempts - failed) / attempts) * 1000) / 10
    };
  }

  function formatMs(v) {
    if (v === null || v === undefined) return "no data";
    return (Math.round(v * 100) / 100) + " ms";
  }

  function formatRate(kbps) {
    if (kbps === null || kbps === undefined) return "no data";
    if (kbps >= 1024) return (Math.round((kbps / 1024) * 100) / 100) + " Mb/s";
    return (Math.round(kbps * 100) / 100) + " KB/s";
  }

  global.NetpulseProbes = {
    HISTORY_KEY: HISTORY_KEY,
    HISTORY_MAX: HISTORY_MAX,
    median: median,
    percentile: percentile,
    jitter: jitter,
    summarize: summarize,
    timedGet: timedGet,
    timedPost: timedPost,
    runLatency: runLatency,
    runDownload: runDownload,
    runUpload: runUpload,
    loadHistory: loadHistory,
    saveRun: saveRun,
    lossApproximation: lossApproximation,
    formatMs: formatMs,
    formatRate: formatRate,
    throughputKbps: throughputKbps,
    defaultEndpoint: defaultEndpoint
  };
})(typeof window !== "undefined" ? window : this);
