# Netpulse - Browser-Based Network Diagnostics and Monitoring Tool

A detailed network information, packet-analysis-surrogate, and network monitoring tool at `/netpulse/`, running entirely in the browser with no native backend, no build step, and no installation. Static Pages entrypoint `netpulse/index.html` (vanilla HTML/CSS/JS, ES modules, zero dependencies). Every panel labels its real data source; every capability the browser sandbox forbids fails closed with an honest empty state, never fabricated numbers.

## Browser-honesty rule (binding through every gate)

First principle, enforced by the Reviewer: the browser sandbox exposes estimates and scoped timings, not raw network access. Full packet capture, NIC enumeration, routing tables, ICMP ping, traceroute hops, and port scans are IMPOSSIBLE from page JavaScript and are never faked. Where capture is impossible, Netpulse ships the best browser-compatible alternative: a synthetic traffic log of its own fetches plus `PerformanceObserver` resource entries, labeled as such. Facade panels fail review.

## Deliverables

- **Connection and device-network panel** - `navigator.onLine` plus `online`/`offline` events treated as a link hint only, confirmed by a live same-origin heartbeat fetch; `navigator.connection` (`effectiveType`, `downlink`, `rtt`, `saveData`, `type`) shown ONLY on Chromium with the label "browser estimate, not a measurement", and a "Not exposed by this browser" empty state on Firefox/Safari; UA/platform/language shown as device context, never as network data.
- **Latency, loss, and quality probes** - N-shot `fetch` series against same-origin plus opt-in CDN targets with `cache: no-store` cache-busting, `AbortController` timeouts, and `performance.now()` timing; median/p50/p95, jitter, loss rate, and a documented 0-100 quality score; warmup sample discarded; abort leaves partial samples visible with a "cancelled" flag. Labeled "HTTP RTT, not ICMP ping".
- **Bandwidth measurement** - byte-counted download (streamed `response.body` reader over a same-origin asset, bytes/elapsed, progress bar, truncated flag on abort) and generated-Blob upload against a CORS echo endpoint that fails closed ("static host has no upload receiver") instead of rendering 0 Mbps. Labeled "HTTP throughput to this endpoint, not link capacity".
- **DNS, IP, and peer-path panels** - DNS-over-HTTPS JSON lookups (Cloudflare `dns-query` plus Google `resolve` fallback, name/type/provider selector, answers plus TTL plus timing table, NXDOMAIN shown verbatim) labeled "resolver view, not your local DNS"; public-IP chain (STUN xor-mapped primary, `api.ipify.org` fallback) with provider label and redaction toggle; WebRTC data-channel-only `RTCPeerConnection` candidate list (redacted, mDNS-masked names shown as such) plus `getStats()` loopback RTT/loss, labeled "peer-path STUN RTT, not page latency".
- **Traffic log with filter, search, and export** - session-only synthetic log: every probe call goes through a wrapped fetch writer, plus read-only `PerformanceObserver('resource')` entries; filter by text/type/status, search URLs, sort, clear, entry count; export real observed entries only as HAR, CSV, and JSON via Blob download. Labeled "own fetches plus page resources; browsers cannot sniff other traffic".
- **Live dashboard and history** - dependency-free canvas time-series (RTT series, throughput history, traffic count) plus quality gauge; charts start empty with "Run a probe" labels, never seed data; run summaries persisted to capped `localStorage` history (100 runs, version-guarded, quota-safe) with per-run delete and clear-all; traffic entries session-only unless explicitly exported.
- **Unified docs and landing** - `netpulse/README.md` plus `netpulse/docs/` as one product view (what each panel measures, per-source honesty notes, cross-browser support matrix, privacy notes on third-party resolvers/IP APIs), no milestone chapters; root landing card linking `/netpulse/`.

## Why

The owner commission (Brainstorm Board #42, issue #489) asks for a genuinely useful network diagnostics tool that runs anywhere with zero install. The honest engineering path is to design around what browsers actually expose: scoped high-resolution timings, estimator hints, STUN-derived peer stats, and resolver-view DNS over HTTPS, all executed for real in-page. That gives three things a fake dashboard cannot: every number is reproducible by re-running the probe, every limit is stated next to the number it constrains, and every forbidden capability is an explained empty state instead of a plausible-looking lie.

## How It Works

- **Same-origin-first measurement.** All latency and throughput assets are hosted under `/netpulse/` so Resource Timing entries are full-detail (DNS/TLS/TTFB splits, `transferSize`, `nextHopProtocol`) with no CORS or `Timing-Allow-Origin` pain. Cross-origin CDN targets are opt-in and their opaque entries render "timing withheld by server", never zeros.
- **Real probes, typed results.** `timedFetch()` (AbortController, `no-store`, `performance.now()`) returns `{ok, status, bytes, ttfbMs, totalMs, timingEntry, error}` and never throws for HTTP errors; latency aggregates median/p95/jitter/loss over N samples; bandwidth counts streamed body bytes over elapsed wall time; DoH parses `Answer` records verbatim. Timeouts, aborts, CORS blocks, UDP blocks, and adblock interference surface as named error cards.
- **Peer stats without permission prompts.** WebRTC tests use data-channel-only peer connections (no mic/camera), STUN servers (`stun.l.google.com:19302`, `stun.cloudflare.com:3478`), and bounded 3-10 s gathering timeouts. Local addresses hidden by mDNS obfuscation are displayed as masked, never "recovered".
- **Log is written only by observation.** `sources/traffic.js` is the sole log writer: app probes call `wrappedFetch`, and a `PerformanceObserver` mirrors page resource entries. Charts are views only; scoring lives in `probes/latency.js`. Export (`toHAR`/`toCSV`/Blob download) serializes observed entries only.
- **Privacy by default.** IP redaction toggle, session-only traffic log (no persistence unless exported), explicit labels wherever a third party (Google/Cloudflare/ipify/STUN) sees the query, settings plus history version-guarded in `localStorage`.
- **Fail-closed copy pattern.** Packet capture: "Not available in browsers. Netpulse logs only its own fetches plus page resource entries." Interfaces: "Browser does not expose NIC list." Routing/traceroute: "No ICMP/TTL API in browsers; HTTP RTT only." Upload on Pages: "Static host has no upload receiver." `navigator.connection` absent: "Not exposed by this browser."

## Module Breakdown

- `netpulse/index.html` - single page: header, dashboard canvases, seven panels (connection, latency/quality, bandwidth, DNS, IP plus WebRTC, traffic log, history), footer; one `<script type="module">` entry; desktop plus 390 px layouts, focus-visible keyboard paths, empty/loading/error slots per panel.
- `netpulse/css/styles.css` - layout, panels, tables, charts, responsive breakpoints, reduced-motion rules, accessible contrast tokens. No build.
- `netpulse/js/main.js` - boot, panel wiring, global error plus empty-state handling.
- `netpulse/js/config.js` - probe targets, DoH endpoints, STUN hosts, thresholds, quality weights.
- `netpulse/js/store.js` - `localStorage` settings plus capped run history with pub/sub; version-guarded, quota-safe.
- `netpulse/js/util/` - `format.js` (bytes, ms, Mbps, IP redaction), `time.js` (clocks, sleep, deadlines), `measure.js` (`timedFetch` with timing-entry hook), `export.js` (Blob download, `toCSV`, `toHAR`).
- `netpulse/js/sources/` - `connection.js` (NetworkInformation snapshot plus online/offline watch), `public-ip.js` (STUN-first plus HTTPS fallback chain), `webrtc.js` (candidate discovery plus loopback `getStats`), `traffic.js` (sole log writer: wrapped fetch plus `PerformanceObserver`).
- `netpulse/js/probes/` - `latency.js` (series runner, p50/p95/jitter/loss/quality), `bandwidth.js` (byte-counted down plus Blob up), `dns.js` (DoH JSON with provider fallback).
- `netpulse/js/ui/` - `charts.js` (dependency-free canvas series plus gauge), `log-view.js` (filter/search/sort plus export buttons), `panels.js` (render helpers plus empty/error cards), `history.js` (past-runs list, detail, delete).
- `netpulse/tests/` - headless plus unit gates per phase: honesty scan (no forbidden claims like "packet capture", "local IP", "ping", "traceroute" as real features), probe math (median/jitter/loss/quality on fixtures), export round-trips (HAR/CSV/JSON parse), store quota/version guards, page smoke (loads from `file://` and Pages with zero console errors, offline card correct, all buttons execute real functions).
- `netpulse/docs/` - unified product docs (per-panel data sources, limits, browser matrix, privacy, how to run probes and export), plus `netpulse/README.md`; no phase numbers in public docs.

## Test Matrix

- Honesty: static scan of shipped copy rejects unqualified "packet capture / sniff / LAN IP / interface list / ping / traceroute / port scan" claims; every forbidden capability renders its fail-closed empty state; cross-origin opaque timings render "withheld", never 0; failed upload never renders a 0 Mbps score.
- Probe math: fixture series verify median/p50/p95, jitter, loss rate, and quality-score boundaries; abort/timeout fixtures leave partial samples with cancellation flags.
- Export: logged fixture entries round-trip through HAR (valid `log.entries`), CSV (header plus rows), and JSON (schema parse); export of an empty log produces a valid empty artifact, not an error.
- Store: version-mismatch and corrupt-JSON fixtures reset to defaults without crashing; quota-exceeded path keeps in-memory state and warns.
- Page: loads with zero console errors on desktop and 390 px; airplane-mode shows the offline card; every visible button executes its real probe/log/export function (no dead controls, no "coming soon"); keyboard reaches all controls with visible focus; reduced-motion disables chart animation.
- Cross-browser: Chromium shows the connection estimate with its honesty label; Firefox/Safari show the "not exposed" empty state; WebRTC panel degrades gracefully under UDP-blocked networks.

## Team Note

No specialist agents are created up front. The Builder executes this blueprint through the standard pipeline (review, test, eval). If the Reviewer or Evaluator flags a gap needing specialist roles, the Lab Engineer creates them per `.github/agents/CREATING_AGENTS.md` through a reviewed PR.
