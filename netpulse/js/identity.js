"use strict";
/* Netpulse egress identity: opt-in public-IP / egress echo only.
 * Nothing phones home on load. The user picks a provider (or pastes a
 * URL they trust), clicks once, and the JSON answer is rendered as a
 * labeled key/value table plus raw inspection. One successful answer per
 * URL is cached for the session so re-renders never re-fetch; Re-check
 * forces a fresh request. Every datum carries its provider label.
 * Never rejects: failures resolve into honest error objects. */
(function (global) {
  var TIMEOUT_MS = 15000;
  var MAX_FIELDS = 25;

  var PROVIDERS = [
    {
      id: "ipify",
      label: "ipify",
      url: "https://api.ipify.org?format=json",
      note: "Returns {ip} only. No ASN or geo."
    },
    {
      id: "ipapi",
      label: "ip-api (http)",
      url: "https://ip-api.com/json/?fields=status,message,country,countryCode,regionName,city,zip,isp,org,as,query",
      note: "Returns IP plus coarse geo/ASN over plain https GET."
    }
  ];

  var cache = {};

  function providerById(id) {
    for (var i = 0; i < PROVIDERS.length; i++) {
      if (PROVIDERS[i].id === id) return PROVIDERS[i];
    }
    return null;
  }

  function nowMs(win) {
    var perf = (win || global).performance || null;
    if (perf && typeof perf.now === "function") return perf.now();
    return Date.now();
  }

  function cleanUrl(raw) {
    if (raw === null || raw === undefined) return null;
    var url = String(raw).trim();
    if (!url) return null;
    if (url.indexOf("https://") !== 0 && url.indexOf("http://") !== 0) return null;
    if (url.indexOf(" ") !== -1) return null;
    return url;
  }

  /* Flatten the top-level scalar fields of an echo payload into
   * [key, value] rows for the table. Nested objects/arrays are
   * summarized by shape, never silently dropped without a marker. */
  function normalizeEcho(payload) {
    if (payload === null || payload === undefined) return [];
    if (typeof payload !== "object") return [["value", String(payload)]];
    var rows = [];
    var keys = Object.keys(payload).slice(0, MAX_FIELDS);
    keys.forEach(function (k) {
      var v = payload[k];
      if (v === null || v === undefined) {
        rows.push([k, "not provided"]);
      } else if (typeof v === "object") {
        rows.push([k, Array.isArray(v) ? ("[" + v.length + " items, see raw]") : "{object, see raw}"]);
      } else {
        rows.push([k, String(v)]);
      }
    });
    return rows;
  }

  /* One opt-in echo request. opts: {force} bypasses the session cache.
   * Resolves (never rejects) with {ok, provider, url, ms, rows, raw,
   * cached, error}. */
  function reveal(providerLabel, url, opts) {
    var win = global;
    opts = opts || {};
    var clean = cleanUrl(url);
    function fail(error) {
      return {
        ok: false, provider: providerLabel || "custom endpoint",
        url: clean, ms: null, rows: [], raw: null, cached: false, error: error
      };
    }
    if (!clean) {
      return Promise.resolve(fail("enter an https URL you trust, or pick a provider above"));
    }
    if (win.navigator && win.navigator.onLine === false) {
      return Promise.resolve(fail("the browser reports offline; reconnect and try again"));
    }
    if (typeof win.fetch !== "function") {
      return Promise.resolve(fail("fetch is not available in this browser"));
    }
    if (!opts.force && Object.prototype.hasOwnProperty.call(cache, clean)) {
      var hit = cache[clean];
      return Promise.resolve({
        ok: hit.ok, provider: providerLabel || hit.provider, url: clean,
        ms: hit.ms, rows: hit.rows, raw: hit.raw, cached: true, error: hit.error
      });
    }
    var controller = null;
    var timer = null;
    var fetchOpts = { method: "GET", cache: "no-store", credentials: "omit" };
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
    return win.fetch(clean, fetchOpts).then(function (resp) {
      if (timer) win.clearTimeout(timer);
      if (!resp.ok) {
        var denied = fail("HTTP " + resp.status + " from the endpoint");
        cache[clean] = denied;
        return denied;
      }
      return resp.json().then(function (payload) {
        var ms = nowMs(win) - t0;
        var result = {
          ok: true, provider: providerLabel || "custom endpoint",
          url: clean, ms: ms, rows: normalizeEcho(payload),
          raw: payload, cached: false, error: null
        };
        cache[clean] = result;
        return result;
      });
    }).catch(function (err) {
      if (timer) {
        try { win.clearTimeout(timer); } catch (e) { /* ignore */ }
      }
      if (err && (err.name === "SyntaxError" || (err.message && err.message.indexOf("JSON") !== -1))) {
        return fail("the endpoint did not return JSON; use a JSON echo service");
      }
      var msg = (err && err.name === "AbortError")
        ? "timed out after " + TIMEOUT_MS + " ms"
        : "request failed (" + (err && err.message ? err.message : "network error") + ")";
      return fail(msg);
    });
  }

  function clearCache() {
    cache = {};
  }

  global.NetpulseIdentity = {
    PROVIDERS: PROVIDERS,
    TIMEOUT_MS: TIMEOUT_MS,
    providerById: providerById,
    cleanUrl: cleanUrl,
    normalizeEcho: normalizeEcho,
    reveal: reveal,
    clearCache: clearCache
  };
})(typeof window !== "undefined" ? window : this);
