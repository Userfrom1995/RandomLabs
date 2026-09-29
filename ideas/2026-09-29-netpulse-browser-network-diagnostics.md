# Netpulse

A browser-based network diagnostics and monitoring tool served as a static
GitHub Pages site at `/netpulse/`, running entirely in the browser with no
native backend and no installation. It answers the question "what can this
device actually observe about its network right now" and refuses to pretend
otherwise: every panel labels its data source, and anything the browser
sandbox forbids fails closed with an honest empty state instead of fabricated
numbers.

## What Will Be Built

A zero-dependency static app (`netpulse/index.html` plus `netpulse/js/`,
`netpulse/css/`, `netpulse/docs/`) in vanilla HTML, CSS, and JavaScript with
SVG/canvas charts and no CDN or build step, so it loads from Pages, from
`file://`, and offline. Tabs: Overview dashboard, Quality probes, DNS and
identity, Traffic observer, Reports. Responsive desktop plus 390 px mobile,
accessible contrast, keyboard paths, and empty/loading/error states on every
panel.

- **Connection profile (Overview).** `navigator.connection` (effectiveType,
  downlink, rtt, saveData, type) where present, `navigator.onLine` plus
  online/offline events with a persistent banner, and device context the
  browser actually exposes (user agent hints, hardwareConcurrency,
  deviceMemory, hardware concurrency is device info, labeled as such). Each
  datum carries a source badge (`Network Information API`, `Browser online
  state`, `Device hint - not network state`). Where the API is absent
  (Firefox, Safari for Network Information), the panel renders an honest
  "not exposed by this browser" card, never a guess.
- **Active quality probes.** User-triggered, fully client-side measurements:
  multi-sample HTTP latency (timed `fetch` with cache-busting against a
  same-origin probe blob, falling back to a user-configurable endpoint, with
  median/p95/jitter math), download throughput (timed ranged blob transfers),
  upload throughput (POST of generated payloads), and loss approximation
  (repeated-probe success/timing distribution, plus WebRTC candidate-pair
  loss counters where available). Labeled as application-layer HTTP
  measurements, never "ICMP ping". Live SVG time-series plus a persistent
  probe-history store.
- **DNS toolkit.** Real DNS answers over DNS-over-HTTPS: `fetch` against
  user-selectable resolvers (Cloudflare and Google DoH JSON endpoints) for
  A/AAAA/CNAME/MX/NS/TXT/SOA records with per-query timing, resolver
  comparison, and raw-answer inspection. No raw-socket DNS exists in browsers;
  the panel says so and shows exactly which resolver answered what.
- **Egress identity (opt-in).** Public IP, ASN, and coarse geo only via
  explicit user-triggered third-party echo endpoints, each response labeled
  with the provider, cached per session, and cleanly degraded when offline
  or blocked. Nothing auto-phones-home on load.
- **WebRTC connection inspector.** The closest the sandbox offers to
  connection analysis: ICE candidate gathering (host/srflx/relay, with the
  honest note that modern browsers mask real host IPs with mDNS), selected
  candidate pair,DTLS/ICE states, and `getStats` series (RTT, jitter,
  packets sent/lost, bytes) rendered as live charts. Tear-down cleans up
  every peer connection.
- **Traffic observer.** No promiscuous capture exists in browsers, so
  Netpulse observes what it can legally see: its own page traffic via
  `PerformanceObserver` resource-timing entries (URL, initiator, transfer
  and encoded sizes, durations, `nextHopProtocol` for h1/h2/h3 insight),
  filterable/searchable table, per-origin aggregation, and a load waterfall.
  Cross-site and LAN sniffing are documented as impossible, not simulated.
- **Monitor dashboard.** A live dashboard that charts probe samples and
  observed-transfer activity over the session, plus a timestamped event log
  (connectivity changes, probe completions, DNS answers). It monitors the
  session's real measurement stream; it never invents background LAN
  traffic.
- **Reports and export.** One-click export of probe history, DNS answers,
  observed transfers, and event log as JSON and CSV, plus a printable
  report view (print CSS) that stamps every section with its data source,
  browser, and timestamp. Session persistence in `localStorage` with clear.
- **Docs.** `netpulse/docs/` as one unified product view: what browsers can
  and cannot see (capability matrix per API and browser), how each
  measurement works and its limits, and reproduction/verification steps.

## Why

The owner commissioned a genuinely useful in-browser network tool with a
binding honesty rule: design around what browser APIs can actually access
and never fake the rest. That constraint is the product's identity. Most
"network tools" web pages either phone home to a server backend or dress up
placeholder gauges; Netpulse does neither. The engineering depth lives in
doing application-layer measurement rigorously (cache discipline, timing
hygiene, percentile math, DoH parsing, WebRTC stats plumbing) and in
drawing a crisp, labeled boundary where the sandbox ends.

## How It Works

- **Static entry, modular scripts.** `index.html` shells five tabs and
  shared components (source badge, empty-state card, banner); one module
  per domain (`js/netinfo.js`, `js/probes.js`, `js/dns.js`, `js/identity.js`,
  `js/webrtc.js`, `js/traffic.js`, `js/monitor.js`, `js/store.js`,
  `js/charts.js`, `js/export.js`, `js/ui.js`). No framework, no CDN, no
  build: every page works offline except the measurements that inherently
  need connectivity, which then show error states.
- **Capability gating.** A `capabilities.js` probe runs once at boot
  (`'connection' in navigator`, DoH reachability, `RTCPeerConnection`
  presence, PerformanceObserver support) and each panel renders
  live/unsupported/degraded from that map. Unsupported renders the shared
  empty-state card naming the missing API and the browsers that expose it.
- **Measurement hygiene.** Latency uses `performance.now()` around
  cache-busted same-origin fetches of a tiny static blob (committed under
  `netpulse/probe.bin`), median plus p95 plus jitter over N samples;
  throughput divides real `transferSize`/bytes by real elapsed time over
  multi-size transfers; every result stores sample count, endpoint, and
  timestamp so numbers are auditable, not oracular.
- **State and export.** A single append-only session store (in-memory plus
  `localStorage` persistence) feeds history charts, the event log, and the
  JSON/CSV/print exporters; clearing is explicit and total.
- **Verification.** `tests/test_netpulse.py` static gate (file wiring, CSS
  tokens, no-CDN rule, no forbidden-facade patterns, docs unity) plus an
  in-page `?selftest=1` suite (capability map, store math, chart rendering,
  exporters against fixture data, empty-state matrix) driven headlessly via
  a dependency-free CDP script, following the lab's proven player-test
  pattern. Offline, empty, and corrupt-input runs are first-class cases.

## Module Breakdown

- `netpulse/index.html` - tab shell, dashboard layout, banner, badges.
- `netpulse/css/netpulse.css` - tokens, responsive grid, 390 px column,
  focus-visible, print rules.
- `netpulse/js/capabilities.js` - API presence map, the single source of
  honest-render truth.
- `netpulse/js/store.js` - session store, persistence, event log.
- `netpulse/js/netinfo.js` - Network Information plus online-state panel.
- `netpulse/js/probes.js` - latency/throughput/loss engines plus history.
- `netpulse/js/dns.js` - DoH client, record rendering, resolver compare.
- `netpulse/js/identity.js` - opt-in egress echo with provider labels.
- `netpulse/js/webrtc.js` - ICE inspector plus getStats series.
- `netpulse/js/traffic.js` - resource-timing observer, table, waterfall.
- `netpulse/js/monitor.js`, `js/charts.js` - dashboard series and SVG
  chart primitives.
- `netpulse/js/export.js`, `js/ui.js` - JSON/CSV/print exporters, tabs,
  badges, empty states, self-test harness.
- `netpulse/probe.bin` - tiny static blob for same-origin timing.
- `netpulse/docs/` - unified product and capability-matrix docs.
- `netpulse/tests/test_netpulse.py`, `tests/cdp_selftest.mjs` - gates.

## Test Matrix

- Static gate: required files exist, no external script/link URLs, no
  facade markers (placeholder gauges, simulated packets, hard-coded
  "72.4 Mbps" style literals outside fixtures), docs present and unified.
- Self-test (`?selftest=1`): capability map builds, store percentiles
  correct on fixtures, charts render point counts, CSV/JSON round-trip,
  every panel has a reachable empty state, keyboard tab order sane.
- Headless Chromium: online run green, offline/blocked-network run shows
  error states with zero exceptions, 390 px viewport usable with no
  horizontal scroll.
- Manual/assisted: Firefox and Safari runs confirm Network Information and
  WebRTC panels fail closed honestly; DoH against both resolvers returns
  real answers; export files open in spreadsheet and text tools.
