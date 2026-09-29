"use strict";
/* Netpulse connection profile: Network Information plus online state plus
 * labeled device context. Every datum carries a source badge. Absent APIs
 * render honest empty states naming the missing API. */
(function (global) {
  var UI = null;
  function ui() {
    if (!UI) UI = global.NetpulseUI;
    return UI;
  }

  function getConnection(nav) {
    return nav.connection || nav.mozConnection || nav.webkitConnection || null;
  }

  function formatValue(v) {
    if (v === null || v === undefined) return null;
    if (typeof v === "boolean") return v ? "yes" : "no";
    return v;
  }

  function renderConnectionPanel(root, nav, caps) {
    var helpers = ui();
    root.innerHTML = "";
    var conn = getConnection(nav || global.navigator || {});
    if (!conn) {
      root.appendChild(helpers.emptyState(
        "Network Information is not exposed by this browser",
        "Firefox and Safari do not implement navigator.connection. " +
        "Netpulse shows this empty state instead of guessing a speed or type. " +
        "Use the online indicator and active probes (later phases) for what this browser can actually observe.",
        "missing: Network Information API"
      ));
      var note = helpers.el("p", "np-sub",
        "Source: feature detection at boot (\"connection\" in navigator === false). " +
        "Chrome and Edge on desktop and Android expose this API; Firefox and Safari do not.");
      root.appendChild(note);
      return;
    }
    var dl = document.createElement("dl");
    dl.className = "np-kv";
    var rows = [
      ["Effective type", formatValue(conn.effectiveType)],
      ["Downlink (Mb/s, estimate)", formatValue(conn.downlink)],
      ["Round-trip time (ms, estimate)", formatValue(conn.rtt)],
      ["Save-Data mode", formatValue(conn.saveData)],
      ["Connection type", formatValue(conn.type)]
    ];
    rows.forEach(function (row) {
      helpers.kvRow(dl, row[0], row[1], "Network Information API", "live");
    });
    root.appendChild(dl);
    var sub = helpers.el("p", "np-sub",
      "These are coarse hints from the browser networking stack, not measured throughput. " +
      "Downlink and RTT are estimates the browser derives from recent traffic; treat them as orientation, not benchmarks.");
    root.appendChild(sub);
  }

  function renderOnlinePanel(root, nav) {
    var helpers = ui();
    root.innerHTML = "";
    nav = nav || global.navigator || {};
    if (typeof nav.onLine !== "boolean") {
      root.appendChild(helpers.emptyState(
        "Online state is not exposed",
        "This browser did not report navigator.onLine. Netpulse cannot determine connectivity without it.",
        "missing: Browser online state"
      ));
      return;
    }
    var dl = document.createElement("dl");
    dl.className = "np-kv";
    helpers.kvRow(dl, "Status", nav.onLine ? "online" : "offline", "Browser online state", "live");
    root.appendChild(dl);
    var sub = helpers.el("p", "np-sub",
      "Backed by online and offline window events plus navigator.onLine. " +
      "It reflects the browser network stack view, which can differ from real internet reachability.");
    root.appendChild(sub);
  }

  function renderDevicePanel(root, nav) {
    var helpers = ui();
    root.innerHTML = "";
    nav = nav || global.navigator || {};
    var dl = document.createElement("dl");
    dl.className = "np-kv";
    var cores = typeof nav.hardwareConcurrency === "number" ? nav.hardwareConcurrency : null;
    var mem = typeof nav.deviceMemory === "number" ? nav.deviceMemory + " GB (approx)" : null;
    helpers.kvRow(dl, "CPU cores (device hint)", cores, "Device hint - not network state", "hint");
    helpers.kvRow(dl, "Device memory (device hint)", mem, "Device hint - not network state", "hint");
    var ua = nav.userAgent || null;
    helpers.kvRow(dl, "User agent string", ua ? String(ua).slice(0, 160) : null, "Device hint - not network state", "hint");
    root.appendChild(dl);
    var sub = helpers.el("p", "np-sub",
      "Device context helps interpret measurements (a 2-core phone behaves differently from a desktop) " +
      "but says nothing about the network itself. It is labeled as a hint on purpose.");
    root.appendChild(sub);
  }

  function renderCapabilityPanel(root, caps) {
    var helpers = ui();
    root.innerHTML = "";
    var wrap = helpers.el("div", "np-table-wrap");
    var table = helpers.el("table", "np-table");
    table.setAttribute("aria-label", "Browser capability map");
    var thead = document.createElement("thead");
    var hr = document.createElement("tr");
    ["Capability", "This browser", "Source"].forEach(function (h) {
      var th = helpers.el("th", null, h);
      hr.appendChild(th);
    });
    thead.appendChild(hr);
    table.appendChild(thead);
    var tbody = document.createElement("tbody");
    var rows = [
      ["Network Information", caps.networkInformation ? "exposed" : "not exposed", "navigator.connection"],
      ["Online state", caps.onlineState ? "exposed" : "not exposed", "navigator.onLine"],
      ["Device memory hint", caps.deviceMemory !== null ? caps.deviceMemory + " GB" : "not exposed", "navigator.deviceMemory"],
      ["CPU cores hint", caps.hardwareConcurrency !== null ? String(caps.hardwareConcurrency) : "not exposed", "navigator.hardwareConcurrency"],
      ["Resource timing", caps.resourceTiming ? "exposed" : "not exposed", "performance.getEntriesByType"],
      ["Performance observer", caps.performanceObserver ? "exposed" : "not exposed", "PerformanceObserver"],
      ["WebRTC inspection", caps.rtcPeerConnection ? "exposed" : "not exposed", "RTCPeerConnection"],
      ["Fetch probes", caps.fetch ? "exposed" : "not exposed", "window.fetch"],
      ["Session persistence", caps.localStorage ? "exposed" : "not exposed", "localStorage"]
    ];
    rows.forEach(function (r) {
      var tr = document.createElement("tr");
      tr.appendChild(helpers.el("td", null, r[0]));
      tr.appendChild(helpers.el("td", null, r[1]));
      tr.appendChild(helpers.el("td", null, r[2]));
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    wrap.appendChild(table);
    root.appendChild(wrap);
  }

  function watchConnection(nav, onChange) {
    var conn = getConnection(nav || global.navigator || {});
    if (conn && typeof conn.addEventListener === "function") {
      conn.addEventListener("change", onChange);
      return function () { conn.removeEventListener("change", onChange); };
    }
    return function () { /* nothing to unwatch */ };
  }

  global.NetpulseNetinfo = {
    renderConnectionPanel: renderConnectionPanel,
    renderOnlinePanel: renderOnlinePanel,
    renderDevicePanel: renderDevicePanel,
    renderCapabilityPanel: renderCapabilityPanel,
    watchConnection: watchConnection
  };
})(typeof window !== "undefined" ? window : this);
