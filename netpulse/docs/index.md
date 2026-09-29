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
| Own-traffic timing | Resource Timing | exposed | exposed | partial | Reserved for the traffic observer |
| Live resource stream | `PerformanceObserver` | exposed | exposed | partial | Reserved for the traffic observer |
| Connection analysis | `RTCPeerConnection` + `getStats` | exposed | exposed | exposed | Reserved for the WebRTC inspector |
| Real DNS answers | DNS over HTTPS via `fetch` | reachable | reachable | reachable | Reserved for the DNS toolkit |
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
- **Latency probes:** repeated `fetch` GETs against a cache-busted endpoint
  (default `probe.bin` beside the page, or a URL you enter), timed with
  `performance.now()` including full body read. Results report median, p95,
  min, max, and jitter (mean absolute successive difference) over the real
  samples, plus failed-attempt counts. Timed out requests resolve as failed
  samples after 15 s, never as silent drops. This is application-layer HTTP
  timing; Netpulse never labels it ping.
- **Download throughput:** sequential cache-busted GETs; the real received
  bytes (from the response body length) divided by the real elapsed time.
   Small same-origin files produce small honest numbers in KB/s; the panel
   scales to MB/s only when the bytes justify it. Units are binary and
   byte-based throughout (KB/s = KiB/s, MB/s = MiB/s), never megabits.
- **Upload throughput:** POSTs a generated random payload (16/64/256 KB) to
  an echo endpoint you choose, timing bytes handed to the stack over elapsed
  time. Static file hosts reject POST, so an empty field fails closed with
  an explanatory state and nothing is sent until you configure a URL.
- **Loss approximation:** the share of this session's probe attempts that
  failed at the HTTP layer (timeouts, refusals, offline aborts), computed
  over stored runs. It is the closest a page can get to loss and must not
  be read as ICMP packet loss, which browsers cannot measure.
- **Probe history:** every run (kind, endpoint, per-sample times, summary,
  timestamp) persists in `localStorage` under `netpulse.v1` alongside the
  event log, capped at 50 runs, with charts of latency medians and download
  rates plus an explicit clear control.
- **Session store:** append-only event log plus small state, persisted in
  `localStorage` under `netpulse.v1`, capped at 500 events. Cleared only by
  the explicit Clear button.

## Verification

1. `python3 netpulse/tests/test_netpulse.py` must pass.
2. Open `index.html?selftest=1`: expect ALL PASS (capability map, store,
   probe percentile math on fixtures, chart point counts, empty states).
3. Run a latency probe: median/p95/jitter appear with the endpoint and
   timestamp, and the run lands in the history table and charts.
4. Toggle offline (DevTools network offline): banner appears, an
   offline event lands in the log, and starting a probe fails closed with
   an explanatory state instead of recording.
4. In Firefox or Safari: the connection panel shows the honest empty card
   naming the missing API.
5. At 390 px width: single column, no horizontal scroll, tabs reachable by
  keyboard (arrow keys move between tabs).
