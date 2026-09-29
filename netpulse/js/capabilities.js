"use strict";
/* Netpulse capability map: the single source of honest-render truth.
 * Every panel reads this map and renders live, degraded, or unsupported.
 * No guessing: an absent API renders an honest empty state. */
(function (global) {
  function detectCapabilities(nav, win) {
    nav = nav || (global.navigator || {});
    win = win || global;
    var conn = nav.connection || nav.mozConnection || nav.webkitConnection || null;
    var caps = {
      onlineState: typeof nav.onLine === "boolean",
      onLine: nav.onLine !== false,
      networkInformation: !!conn,
      networkInformationFields: conn ? Object.keys(conn) : [],
      deviceMemory: typeof nav.deviceMemory === "number" ? nav.deviceMemory : null,
      hardwareConcurrency: typeof nav.hardwareConcurrency === "number" ? nav.hardwareConcurrency : null,
      userAgentData: !!(nav.userAgentData && typeof nav.userAgentData.getHighEntropyValues === "function"),
      performanceObserver: typeof win.PerformanceObserver === "function",
      resourceTiming: !!(win.performance && typeof win.performance.getEntriesByType === "function"),
      rtcPeerConnection: typeof win.RTCPeerConnection === "function",
      fetch: typeof win.fetch === "function",
      highResTime: !!(win.performance && typeof win.performance.now === "function"),
      localStorage: false,
      serviceWorker: !!(nav.serviceWorker && win.isSecureContext !== false)
    };
    try {
      var k = "__netpulse_probe__";
      win.localStorage.setItem(k, "1");
      win.localStorage.removeItem(k);
      caps.localStorage = true;
    } catch (e) {
      caps.localStorage = false;
    }
    caps.probes = !!(caps.fetch && caps.highResTime);
    return caps;
  }

  function supportLevel(caps, panel) {
    var table = {
      connection: caps.networkInformation ? "live" : "unsupported",
      online: caps.onlineState ? "live" : "unsupported",
      device: "hint",
      capabilities: "live",
      events: "live",
      latency: caps.probes ? "live" : "unsupported",
      download: caps.probes ? "live" : "unsupported",
      upload: caps.probes ? "live" : "unsupported",
      history: caps.localStorage || caps.probes ? "live" : "unsupported"
    };
    return table[panel] || "unsupported";
  }

  global.NetpulseCapabilities = {
    detectCapabilities: detectCapabilities,
    supportLevel: supportLevel
  };
})(typeof window !== "undefined" ? window : this);
