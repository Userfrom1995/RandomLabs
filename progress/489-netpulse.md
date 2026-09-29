# Progress - Netpulse (browser-based network diagnostics and monitoring tool)

- **Issue:** #489
- **Branch:** opencode/issue489-20260929134959
- **Status:** in-progress
- **Blueprint:** `ideas/2026-09-29-netpulse-browser-network-diagnostics.md`

## Phase Roadmap

- **Active Phase:** Phase 1: App Shell and Honest Connection Core
- **Phase 1: App Shell and Honest Connection Core:** [ ] `netpulse/index.html` skeleton plus `css/styles.css` (desktop plus 390 px, focus-visible, reduced-motion) with seven labeled panel slots, [ ] `sources/connection.js` (online/offline heartbeat, `navigator.connection` with not-exposed empty state), [ ] `store.js` settings plus capped history with past-runs list, [ ] `ui/panels.js` empty/loading/error cards plus global error handling, [ ] honesty copy locked per panel (PR 1 target, Refs #489)
- **Phase 2: Active Latency and Live Quality Charts:** [ ] `probes/latency.js` N-shot series (median/p50/p95, jitter, loss, 0-100 quality, abort with partial samples), [ ] multi-target selector (same-origin plus opt-in CDN with opaque-withheld rendering), [ ] `ui/charts.js` RTT series plus gauge (empty-start, no seed data), [ ] run persistence plus cancel (PR 2 target, Refs #489)
- **Phase 3: Throughput and Name Resolution Reality:** [ ] `probes/bandwidth.js` byte-counted download (progress, truncated flag) plus Blob upload with fail-closed card, [ ] `probes/dns.js` DoH lookup (name/type/provider, Cloudflare plus Google fallback, answers plus TTL plus timing, NXDOMAIN verbatim), [ ] throughput history charts (PR 3 target, Refs #489)
- **Phase 4: Identity, Peer Stats, and Traffic Observability:** [ ] `sources/public-ip.js` chain (STUN-first plus HTTPS fallback, provider label, redaction), [ ] `sources/webrtc.js` candidates (redacted, mDNS shown masked) plus loopback `getStats`, [ ] `sources/traffic.js` sole-writer log plus `ui/log-view.js` (filter/search/sort/clear) plus HAR/CSV/JSON export of observed entries only (PR 4 target, Refs #489)
- **Final Phase: Dashboard Polish, History, Docs, and Landing Integration:** [ ] unified live dashboard, [ ] history detail plus per-run delete plus clear-all, [ ] `netpulse/docs/` plus `README.md` as one unified product view (no phase numbers), [ ] root landing card, [ ] cross-browser matrix pass plus final review (Final PR, Closes #489)

- **Current step:** Ready for initial build (Phase 1: App Shell and Honest Connection Core)
- **Next steps:** Builder to implement Phase 1: App Shell and Honest Connection Core with real code and zero stubs

## Agent Log

- **2026-09-29, Architect:** Blueprint plus Phase Epic written (capability survey: NetworkInformation estimates, Resource Timing TAO limits, WebRTC mDNS masking, DoH resolver-view DNS, fetch-based probes; packet capture/NIC/routing/ICMP ruled impossible and scoped to fail-closed empty states). Five capability-named phases; Refs #489 until the final phase lands. Handing to the Builder for Phase 1.
