"use strict";
/* Netpulse session store: append-only event log plus small key-value state.
 * Persisted to localStorage under netpulse.v1. Explicit clear only. */
(function (global) {
  var STORAGE_KEY = "netpulse.v1";
  var MAX_EVENTS = 500;

  function load(win) {
    var storage = null;
    try {
      storage = (win || global).localStorage || null;
    } catch (e) {
      storage = null;
    }
    if (!storage) return { events: [], state: {} };
    try {
      var raw = storage.getItem(STORAGE_KEY);
      if (!raw) return { events: [], state: {} };
      var parsed = JSON.parse(raw);
      if (!parsed || !Array.isArray(parsed.events)) return { events: [], state: {} };
      return { events: parsed.events.slice(-MAX_EVENTS), state: parsed.state || {} };
    } catch (e) {
      return { events: [], state: {} };
    }
  }

  function createStore(win) {
    var data = load(win);
    var listeners = [];
    var storage = null;
    try {
      storage = (win || global).localStorage || null;
    } catch (e) {
      storage = null;
    }

    function persist() {
      if (!storage) return;
      try {
        storage.setItem(STORAGE_KEY, JSON.stringify(data));
      } catch (e) {
        /* Storage full or blocked: keep in-memory copy. */
      }
    }

    function notify(evt) {
      listeners.forEach(function (fn) {
        try { fn(evt); } catch (e) { /* listener errors never break logging */ }
      });
    }

    return {
      logEvent: function (type, detail) {
        var evt = {
          t: new Date().toISOString(),
          type: String(type),
          detail: detail === undefined ? null : detail
        };
        data.events.push(evt);
        if (data.events.length > MAX_EVENTS) {
          data.events = data.events.slice(-MAX_EVENTS);
        }
        persist();
        notify(evt);
        return evt;
      },
      getEvents: function () { return data.events.slice(); },
      onEvent: function (fn) { listeners.push(fn); },
      set: function (key, value) { data.state[key] = value; persist(); },
      get: function (key) { return data.state[key]; },
      clear: function () {
        data = { events: [], state: {} };
        if (storage) {
          try { storage.removeItem(STORAGE_KEY); } catch (e) { /* ignore */ }
        }
        notify({ t: new Date().toISOString(), type: "store-cleared", detail: null });
      }
    };
  }

  global.NetpulseStore = {
    createStore: createStore,
    STORAGE_KEY: STORAGE_KEY,
    MAX_EVENTS: MAX_EVENTS
  };
})(typeof window !== "undefined" ? window : this);
