"use strict";
/* Netpulse WebRTC connection inspector: the closest the browser sandbox
 * offers to connection analysis. Gathers ICE candidates (host / srflx /
 * relay), reports the selected candidate pair plus ICE/connection states,
 * and samples getStats counters (RTT, jitter, packets, bytes) over a
 * loopback peer connection. Modern browsers mask real host IPs with mDNS
 * (.local names), which is reported honestly, never de-obfuscated.
 * The peer connection is always torn down; inspect() never rejects. */
(function (global) {
  var GATHER_TIMEOUT_MS = 12000;
  var STUN_URL = "stun:stun.l.google.com:19302";

  function isSupported(win) {
    win = win || global;
    return typeof win.RTCPeerConnection === "function";
  }

  /* Classify an address string for honest display: mDNS names are the
   * browser masking the real host IP, not a measurement failure. */
  function addressKind(address) {
    var a = String(address || "");
    if (!a) return "unknown";
    if (a.charAt(a.length - 1) === "." || a.slice(-6) === ".local") return "mdns-masked";
    if (a.indexOf(":") !== -1) return "ipv6";
    if (/^\d+\.\d+\.\d+\.\d+$/.test(a)) return "ipv4";
    return "hostname";
  }

  function candidateLabel(c) {
    return (c.type || "unknown") + " / " + (c.protocol || "udp") +
      " " + (c.address || "?") + ":" + (c.port || "?") +
      (addressKind(c.address) === "mdns-masked" ? " (host IP masked by browser)" : "");
  }

  function waitForGathering(pc, win, timeoutMs) {
    return new Promise(function (resolve) {
      var found = [];
      var done = false;
      function finish() {
        if (done) return;
        done = true;
        try { pc.onicecandidate = null; } catch (e) { /* ignore */ }
        resolve(found);
      }
      try {
        pc.onicecandidate = function (evt) {
          if (!evt || !evt.candidate) {
            finish();
            return;
          }
          var c = evt.candidate;
          found.push({
            type: c.type || null,
            protocol: c.protocol || null,
            address: c.address || null,
            port: typeof c.port === "number" ? c.port : null
          });
        };
      } catch (e) {
        resolve(found);
        return;
      }
      win.setTimeout(finish, timeoutMs || GATHER_TIMEOUT_MS);
    });
  }

  /* Pick the nominated/selected pair plus rtp counters out of a stats
   * report. Accepts any Map-like or plain object report; unknown shapes
   * yield nulls, never exceptions. Pure and covered by selftest fixtures. */
  function summarizeStats(report) {
    var out = { pair: null, rttMs: null, jitterMs: null, packetsSent: null, packetsLost: null, bytesSent: null };
    if (!report) return out;
    var entries = [];
    try {
      if (typeof report.forEach === "function") {
        report.forEach(function (v) { entries.push(v); });
      } else {
        Object.keys(report).forEach(function (k) { entries.push(report[k]); });
      }
    } catch (e) {
      return out;
    }
    var pairs = entries.filter(function (s) {
      return s && (s.type === "candidate-pair" || s.type === "candidatepair");
    });
    var chosen = null;
    pairs.forEach(function (p) {
      if (p.nominated === true || p.selected === true || p.state === "succeeded") {
        if (!chosen) chosen = p;
      }
    });
    if (!chosen && pairs.length) chosen = pairs[0];
    if (chosen) {
      out.pair = {
        localId: chosen.localCandidateId || null,
        remoteId: chosen.remoteCandidateId || null,
        state: chosen.state || null,
        writable: typeof chosen.writable === "boolean" ? chosen.writable : null
      };
      if (typeof chosen.currentRoundTripTime === "number" && isFinite(chosen.currentRoundTripTime)) {
        out.rttMs = chosen.currentRoundTripTime * 1000;
      }
    }
    entries.forEach(function (s) {
      if (!s) return;
      if (s.type === "inbound-rtp" || s.type === "outbound-rtp" || s.type === "remote-inbound-rtp") {
        if (typeof s.jitter === "number" && isFinite(s.jitter)) out.jitterMs = s.jitter * 1000;
        if (typeof s.packetsSent === "number") {
          out.packetsSent = (out.packetsSent || 0) + s.packetsSent;
        }
        if (typeof s.packetsLost === "number") {
          out.packetsLost = (out.packetsLost || 0) + s.packetsLost;
        }
        if (typeof s.bytesSent === "number") {
          out.bytesSent = (out.bytesSent || 0) + s.bytesSent;
        }
      }
    });
    return out;
  }

  /* Run one loopback inspection and tear everything down. This exercises
   * the local ICE/DTLS stack against a public STUN server, so srflx
   * results reflect the real NAT path; host addresses stay mDNS-masked.
   * Resolves (never rejects) with {ok, candidates, summary, states,
   * stunUrl, error}. */
  function inspect(win, opts) {
    win = win || global;
    opts = opts || {};
    function fail(error) {
      return {
        ok: false, candidates: [], summary: summarizeStats(null),
        states: null, stunUrl: STUN_URL, error: error
      };
    }
    if (!isSupported(win)) {
      return Promise.resolve(fail("RTCPeerConnection is not available in this browser"));
    }
    if (win.navigator && win.navigator.onLine === false) {
      return Promise.resolve(fail("the browser reports offline; ICE gathering needs connectivity"));
    }
    var RTC = win.RTCPeerConnection;
    var pc = null;
    try {
      pc = new RTC({ iceServers: [{ urls: opts.stunUrl || STUN_URL }] });
    } catch (e) {
      return Promise.resolve(fail("could not create a peer connection (" + (e && e.message ? e.message : "unknown error") + ")"));
    }
    function teardown() {
      try {
        if (pc.getTransceivers) {
          pc.getTransceivers().forEach(function (t) {
            try { if (t.stop) t.stop(); } catch (e) { /* ignore */ }
          });
        }
        pc.close();
      } catch (e) { /* close must never throw past the inspector */ }
    }
    var result;
    try {
      var dc = pc.createDataChannel("netpulse-probe");
      try { dc.onopen = function () { try { dc.close(); } catch (e) { /* ignore */ } }; } catch (e) { /* ignore */ }
      result = pc.createOffer().then(function (offer) {
        return pc.setLocalDescription(offer);
      }).then(function () {
        return waitForGathering(pc, win, opts.timeoutMs || GATHER_TIMEOUT_MS);
      }).then(function (candidates) {
        var states = null;
        var summary = summarizeStats(null);
        var statsJob = Promise.resolve(null);
        try {
          statsJob = pc.getStats(null).then(function (report) {
            return summarizeStats(report);
          }).catch(function () { return summarizeStats(null); });
        } catch (e) {
          statsJob = Promise.resolve(summarizeStats(null));
        }
        return statsJob.then(function (parsed) {
          summary = parsed;
          try {
            states = {
              ice: pc.iceConnectionState || null,
              connection: pc.connectionState || null,
              signaling: pc.signalingState || null
            };
          } catch (e) {
            states = null;
          }
          return {
            ok: true, candidates: candidates, summary: summary,
            states: states, stunUrl: opts.stunUrl || STUN_URL, error: null
          };
        });
      }).catch(function (err) {
        return fail("inspection failed (" + (err && err.message ? err.message : "unknown error") + ")");
      });
    } catch (err) {
      teardown();
      return Promise.resolve(fail("inspection failed (" + (err && err.message ? err.message : "unknown error") + ")"));
    }
    return result.then(function (r) {
      teardown();
      return r;
    });
  }

  global.NetpulseWebRTC = {
    STUN_URL: STUN_URL,
    GATHER_TIMEOUT_MS: GATHER_TIMEOUT_MS,
    isSupported: isSupported,
    addressKind: addressKind,
    candidateLabel: candidateLabel,
    summarizeStats: summarizeStats,
    inspect: inspect
  };
})(typeof window !== "undefined" ? window : this);
