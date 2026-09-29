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
    } catch (e) {
      results.push("FAIL harness-exception - " + (e && e.message));
    }
    var failed = results.filter(function (r) { return r.indexOf("FAIL") === 0; }).length;
    box.hidden = false;
    box.textContent = "Netpulse selftest: " + (failed ? failed + " FAILING" : "ALL PASS") + "\n" + results.join("\n");
    box.setAttribute("data-selftest-failed", String(failed));
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
