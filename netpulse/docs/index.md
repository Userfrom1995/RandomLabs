# Netpulse docs

Netpulse shows only what the browser can actually observe. This page is the
unified product and method reference: capability matrix, per-datum sources,
and verification steps.

## Capability matrix

| Capability | API | Chrome/Edge | Firefox | Safari | Netpulse behavior |
| --- | --- | --- | --- | --- | --- |
| Connection hints | `navigator.connection` | exposed | not exposed | not exposed | Live values with source badges; honest empty card where absent |
| Online state | `navigator.onLine` + events | exposed | exposed | exposed | Live indicator plus persistent offline banner |
| Device hints | `hardwareConcurrency`, `deviceMemory`, UA | partial | partial | partial | Labeled hints, never network state |
| Own-traffic timing | Resource Timing | exposed | exposed | partial | Reserved for the traffic observer phase |
| Live resource stream | `PerformanceObserver` | exposed | exposed | partial | Reserved for the traffic observer phase |
| Connection analysis | `RTCPeerConnection` + `getStats` | exposed | exposed | exposed | Reserved for the WebRTC inspector phase |
| Real DNS answers | DNS over HTTPS via `fetch` | reachable | reachable | reachable | Reserved for the DNS toolkit phase |
| Raw sockets / ICMP / capture | none in sandbox | impossible | impossible | impossible | Never simulated; documented as impossible |

## Method notes

- **Connection profile:** reads `navigator.connection` once at boot and on
  its `change` event. Downlink and RTT are browser estimates from recent
  traffic, not benchmarks. Displayed with per-datum `Network Information
  API` badges.
- **Online state:** `navigator.onLine` plus `online`/`offline` window
  events. Reflects the browser stack view, which can differ from real
  internet reachability. Offline shows a persistent banner.
- **Device context:** `navigator.hardwareConcurrency`,
  `navigator.deviceMemory`, and the user agent string. Useful for
  interpreting results, labeled as device hints.
- **Capability gate:** `js/capabilities.js` probes feature presence once at
  boot. Each panel renders live, degraded, or unsupported from that map.
- **Session store:** append-only event log plus small state, persisted in
  `localStorage` under `netpulse.v1`, capped at 500 events. Cleared only by
  the explicit Clear button.

## Verification

1. `python3 netpulse/tests/test_netpulse.py` must pass.
2. Open `index.html?selftest=1`: expect ALL PASS.
3. Toggle offline (DevTools network offline): banner appears, an
   offline event lands in the log, panels keep last known state.
4. In Firefox or Safari: the connection panel shows the honest empty card
   naming the missing API.
5. At 390 px width: single column, no horizontal scroll, tabs reachable by
  keyboard (arrow keys move between tabs).
