"use strict";
/* Netpulse DNS toolkit: real DNS answers over DNS-over-HTTPS (DoH).
 * Browsers cannot send raw DNS packets (no UDP sockets in the sandbox),
 * so Netpulse fetches answers from a DoH JSON endpoint you choose and
 * shows exactly which resolver answered what, with per-query timing.
 * Every query resolves (never rejects) into an auditable result object. */
(function (global) {
  var TIMEOUT_MS = 15000;

  var RESOLVERS = [
    { id: "cloudflare", label: "Cloudflare", url: "https://cloudflare-dns.com/dns-query" },
    { id: "google", label: "Google", url: "https://dns.google/resolve" }
  ];

  var RECORD_TYPES = ["A", "AAAA", "CNAME", "MX", "NS", "TXT", "SOA"];

  var TYPE_CODES = { A: 1, NS: 2, CNAME: 5, SOA: 6, MX: 15, TXT: 16, AAAA: 28 };

  function typeName(code) {
    var n = Number(code);
    for (var k in TYPE_CODES) {
      if (Object.prototype.hasOwnProperty.call(TYPE_CODES, k) && TYPE_CODES[k] === n) return k;
    }
    return "TYPE" + code;
  }

  function resolverById(id) {
    for (var i = 0; i < RESOLVERS.length; i++) {
      if (RESOLVERS[i].id === id) return RESOLVERS[i];
    }
    return null;
  }

  /* Validate and normalize a hostname typed by the user. Returns the
   * cleaned name, or null when the input is not a plausible hostname. */
  function cleanName(raw) {
    if (raw === null || raw === undefined) return null;
    var name = String(raw).trim().toLowerCase();
    if (!name) return null;
    if (name.indexOf("://") !== -1 || name.indexOf(" ") !== -1 || name.indexOf("/") !== -1) return null;
    if (name.charAt(name.length - 1) === ".") name = name.slice(0, -1);
    if (!name || name.length > 253) return null;
    var labels = name.split(".");
    for (var i = 0; i < labels.length; i++) {
      if (!labels[i] || labels[i].length > 63) return null;
      if (!/^[a-z0-9-]+$/.test(labels[i])) return null;
      if (labels[i].charAt(0) === "-" || labels[i].charAt(labels[i].length - 1) === "-") return null;
    }
    return name;
  }

  /* Normalize a dns-json Answer array (Cloudflare and Google share the
   * shape) into rows of {name, type, ttl, data}. Unknown input yields []. */
  function parseAnswers(payload) {
    if (!payload || !Array.isArray(payload.Answer)) return [];
    var rows = [];
    payload.Answer.forEach(function (a) {
      if (!a || a.data === undefined) return;
      rows.push({
        name: a.name ? String(a.name) : "",
        type: typeName(a.type),
        ttl: (typeof a.TTL === "number" && isFinite(a.TTL)) ? a.TTL : null,
        data: String(a.data)
      });
    });
    return rows;
  }

  function nowMs(win) {
    var perf = (win || global).performance || null;
    if (perf && typeof perf.now === "function") return perf.now();
    return Date.now();
  }

  /* One DoH lookup. opts: {endpoint} overrides the resolver base URL
   * (used by the test harness against a local stub). Never rejects. */
  function query(resolver, name, type, opts) {
    var win = global;
    opts = opts || {};
    var clean = cleanName(name);
    var upper = RECORD_TYPES.indexOf(String(type).toUpperCase()) !== -1
      ? String(type).toUpperCase() : null;
    function fail(error) {
      return {
        ok: false, resolver: resolver ? resolver.label : "unknown",
        endpoint: opts.endpoint || (resolver ? resolver.url : ""),
        name: clean, type: upper, ms: null, answers: [], raw: null, error: error
      };
    }
    if (!clean) return Promise.resolve(fail("not a valid hostname"));
    if (!upper) return Promise.resolve(fail("unsupported record type"));
    if (typeof win.fetch !== "function") {
      return Promise.resolve(fail("fetch is not available in this browser"));
    }
    var base = opts.endpoint || (resolver && resolver.url);
    if (!base) return Promise.resolve(fail("no DoH endpoint configured"));
    var url = base + (base.indexOf("?") === -1 ? "?" : "&") +
      "name=" + encodeURIComponent(clean) + "&type=" + encodeURIComponent(upper);
    var controller = null;
    var timer = null;
    var fetchOpts = {
      method: "GET",
      headers: { Accept: "application/dns-json" },
      cache: "no-store",
      credentials: "omit"
    };
    try {
      if (typeof win.AbortController === "function") {
        controller = new win.AbortController();
        fetchOpts.signal = controller.signal;
        timer = win.setTimeout(function () {
          try { controller.abort(); } catch (e) { /* already settled */ }
        }, TIMEOUT_MS);
      }
    } catch (e) {
      controller = null;
    }
    var t0 = nowMs(win);
    return win.fetch(url, fetchOpts).then(function (resp) {
      if (timer) win.clearTimeout(timer);
      if (!resp.ok) return fail("HTTP " + resp.status + " from the resolver");
      return resp.json().then(function (payload) {
        var ms = nowMs(win) - t0;
        var answers = parseAnswers(payload);
        var status = payload && typeof payload.Status === "number" ? payload.Status : null;
        if (status !== null && status !== 0) {
          return {
            ok: false, resolver: resolver ? resolver.label : base,
            endpoint: base, name: clean, type: upper, ms: ms,
            answers: answers, raw: payload,
            error: "resolver status " + status + " (DNS error, not a transport failure)"
          };
        }
        return {
          ok: true, resolver: resolver ? resolver.label : base,
          endpoint: base, name: clean, type: upper, ms: ms,
          answers: answers, raw: payload, error: null
        };
      });
    }).catch(function (err) {
      if (timer) {
        try { win.clearTimeout(timer); } catch (e) { /* ignore */ }
      }
      var msg = (err && err.name === "AbortError")
        ? "timed out after " + TIMEOUT_MS + " ms"
        : "request failed (" + (err && err.message ? err.message : "network error") + ")";
      return fail(msg);
    });
  }

  /* Ask every built-in resolver the same question in parallel so the user
   * can compare answers and timings. Custom endpoints are compared only
   * through single lookups. Never rejects. */
  function compare(name, type, opts) {
    var jobs = RESOLVERS.map(function (r) { return query(r, name, type, opts); });
    return Promise.all(jobs).then(function (results) {
      var timed = results.filter(function (r) { return r.ok && typeof r.ms === "number"; });
      var fastest = timed.length
        ? timed.slice().sort(function (a, b) { return a.ms - b.ms; })[0].resolver
        : null;
      return { results: results, fastest: fastest };
    });
  }

  global.NetpulseDNS = {
    RESOLVERS: RESOLVERS,
    RECORD_TYPES: RECORD_TYPES,
    TYPE_CODES: TYPE_CODES,
    TIMEOUT_MS: TIMEOUT_MS,
    typeName: typeName,
    resolverById: resolverById,
    cleanName: cleanName,
    parseAnswers: parseAnswers,
    query: query,
    compare: compare
  };
})(typeof window !== "undefined" ? window : this);
