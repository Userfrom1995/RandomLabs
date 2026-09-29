# Netpulse

An honest in-browser network diagnostics tool. It answers "what can this
device actually observe about its network right now" and refuses to pretend
otherwise: every panel labels its data source, and anything the browser
sandbox forbids fails closed with an empty state instead of a fabricated
number.

Live entry: `netpulse/index.html` (served at `/netpulse/` on Pages, works
from `file://` and offline except for the measurements that inherently need
connectivity). Zero dependencies, no CDN, no build step, no backend.

## What it does today

- **Connection profile (Overview tab):** `navigator.connection` fields
  (effective type, downlink estimate, RTT estimate, save-data, type) where
  the browser exposes them, each with a `Network Information API` source
  badge. Firefox and Safari do not implement this API, so there the panel
  renders an honest "not exposed by this browser" card, never a guess.
- **Online state:** `navigator.onLine` plus `online`/`offline` events with a
  persistent banner. Labeled `Browser online state`.
- **Device context:** CPU cores, device memory, and user agent string,
  each labeled `Device hint - not network state`.
- **Capability map:** a table of what this exact browser exposes
  (Network Information, online state, resource timing, observer, WebRTC,
  fetch, persistence), which is the single source of truth every panel
  renders from.
- **Session events:** timestamped log of connectivity changes, refreshes,
  probe completions, and session starts, persisted in `localStorage` under
  `netpulse.v1` with an explicit Clear button. Nothing auto-phones-home.
- **Active quality probes (Quality tab):** user-triggered latency, download,
  and upload measurements over HTTP (`js/probes.js`), each reporting
  median/p95/jitter over real samples with endpoint and timestamp. Loss is
  approximated honestly as the failed share of session probe attempts, with
  per-run history charts (`js/charts.js` SVG) and a run table. Offline,
  blocked, or POST-rejecting endpoints fail closed with explanatory states.
- **DNS toolkit (DNS and Identity tab):** real answers over DNS-over-HTTPS
  (`js/dns.js`) from Cloudflare, Google, or a custom DoH JSON endpoint you
  paste. Types A/AAAA/CNAME/MX/NS/TXT/SOA with per-query timing, resolver
  comparison, hostname validation, and raw-reply inspection. Browsers
  cannot emit raw DNS packets; the panel says so and names the resolver
  behind every answer.
- **Egress identity (opt-in):** one click fetches one provider-labeled echo
  (`js/identity.js`) showing the public IP the internet sees, cached per
  session with Re-check for a fresh read. Nothing fetches on load.
- **WebRTC inspector:** loopback ICE gathering through a public STUN server
  (`js/webrtc.js`) with candidate table, selected-pair RTT, jitter, and
  packet counters, always torn down afterwards. mDNS-masked host addresses
  are labeled, never de-obfuscated.
- **Traffic observer (Traffic tab):** this page's own subresource timings
  (`js/traffic.js`) with snapshot refresh, opt-in live stream, filter and
  search, per-origin aggregation, protocol breakdown, and a load
  waterfall. Cross-origin sizes hidden by headers are flagged, never
  zeroed. A dedicated panel documents the impossible capabilities (packet
  capture, other tabs, LAN scans) instead of simulating them.
- **Monitor dashboard (Monitor tab):** the live session measurement stream
  (`js/monitor.js`): per-run probe medians, per-run throughput, cumulative
  observed bytes, a session rollup, and a timestamped monitor event log.
  Empty until you measure; nothing invented.
- **Reports and export (Reports tab):** the session as portable data
  (`js/export.js`): a full source-stamped JSON report, per-section CSV
  downloads (probe runs, observed transfers, session events), and a
  printable report preview with the same source labels. Generated locally
  in the browser; nothing is uploaded. Empty sessions export empty
  sections, never invented rows.
- **Session persistence:** probe history and the event log persist in
  `localStorage` under `netpulse.v1` (50-run and 500-event caps), with an
  explicit Clear control on both the Overview and Reports tabs.

## What it deliberately does not do

Raw sockets, ICMP ping, promiscuous packet capture, LAN scans, and real
host-IP discovery do not exist inside the browser sandbox and are not
simulated here.
A modern browser masks real host IPs with mDNS, and Netpulse says so where
relevant.

## Use

Open `index.html` in any modern browser. No install, no flags.

- `?selftest=1` runs the built-in harness (capability map, store math,
  probe percentile math on fixtures, chart point counts, DNS/identity/
  WebRTC fixtures, traffic normalization plus aggregation plus filter,
  monitor series plus events, export report plus CSV plus filename
  fixtures, panel render, tab order, no-CDN check) and
  prints PASS/FAIL lines into the page.
- Works offline: panels show last known state or honest empty states, and
  probes refuse to start with an explanatory state.

## Files

- `index.html` - tab shell, all six tab layouts, banner, log.
- `css/netpulse.css` - tokens, responsive grid (390 px single column),
  focus-visible rings, form, chart, and waterfall styles, print rules.
- `js/capabilities.js` - feature-detection map, the honest-render source.
- `js/store.js` - append-only session store with `localStorage` persistence.
- `js/netinfo.js` - connection, online, device, and capability rendering.
- `js/probes.js` - latency/download/upload engines, percentile math, history.
- `js/dns.js` - DoH client, hostname validation, resolver comparison.
- `js/identity.js` - opt-in egress echo with provider labels, session cache.
- `js/webrtc.js` - loopback ICE inspector with getStats summary, teardown.
- `js/traffic.js` - own-traffic observer: snapshot, live stream, origin
  rollup, protocol breakdown, filter, waterfall data.
- `js/monitor.js` - session series builders: probe medians, throughput,
  transfer activity, monitor event slice, session rollup.
- `js/export.js` - report snapshot, JSON plus CSV converters, stamped
  filenames, Blob download, print helper.
- `js/charts.js` - dependency-free SVG line charts with honest empty states.
- `js/ui.js` - tabs (arrow-key paths), source badges, empty states, banner.
- `js/app.js` - boot, live event wiring, quality plus DNS plus traffic
  plus monitor wiring, self-test harness.
- `probe.bin` - tiny static blob for same-origin timing.
- `docs/` - capability matrix and method notes.
- `tests/test_netpulse.py` - static gate (wiring, no-CDN, honest-render).
- `tests/test_dns_identity.py` - live engine tests (stub DoH plus echo).
- `tests/test_traffic_monitor.py` - live engine tests (fixture resource
  timings, observer stream, hostile shapes, monitor series).

## Verification

- `python3 netpulse/tests/test_netpulse.py` (static gate, dependency-free).
- `python3 netpulse/tests/test_dns_identity.py` (live engine tests against
  local stub DoH plus echo endpoints, dependency-free).
- `python3 netpulse/tests/test_traffic_monitor.py` (live engine tests with
  fixture resource timings plus observer stream, dependency-free).
- `python3 netpulse/tests/test_export_report.py` (report snapshot, CSV
  quoting, filename stamps, download guard, print path, hostile shapes).
- Open `index.html?selftest=1` in Chromium, Firefox, and Safari if
  available; confirm Network Information fails closed honestly where
  absent and the banner reacts to offline mode.
