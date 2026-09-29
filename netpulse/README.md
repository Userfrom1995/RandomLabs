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

## What it deliberately does not do

Raw sockets, ICMP ping, promiscuous packet capture, LAN scans, and real
host-IP discovery do not exist inside the browser sandbox and are not
simulated here. Features that need them (DNS over HTTPS, WebRTC
inspection, traffic observation, export) are not present yet and no panel
pretends otherwise. A modern browser masks real host IPs with mDNS, and
Netpulse will say so where relevant.

## Use

Open `index.html` in any modern browser. No install, no flags.

- `?selftest=1` runs the built-in harness (capability map, store math,
  probe percentile math on fixtures, chart point counts, panel render, tab
  order, no-CDN check) and prints PASS/FAIL lines into the page.
- Works offline: panels show last known state or honest empty states, and
  probes refuse to start with an explanatory state.

## Files

- `index.html` - tab shell, overview and quality layouts, banner, log.
- `css/netpulse.css` - tokens, responsive grid (390 px single column),
  focus-visible rings, form and chart styles, print rules.
- `js/capabilities.js` - feature-detection map, the honest-render source.
- `js/store.js` - append-only session store with `localStorage` persistence.
- `js/netinfo.js` - connection, online, device, and capability rendering.
- `js/probes.js` - latency/download/upload engines, percentile math, history.
- `js/charts.js` - dependency-free SVG line charts with honest empty states.
- `js/ui.js` - tabs (arrow-key paths), source badges, empty states, banner.
- `js/app.js` - boot, live event wiring, quality tab wiring, self-test harness.
- `probe.bin` - tiny static blob for same-origin timing.
- `docs/` - capability matrix and method notes.
- `tests/test_netpulse.py` - static gate (wiring, no-CDN, honest-render).

## Verification

- `python3 netpulse/tests/test_netpulse.py` (static gate, dependency-free).
- Open `index.html?selftest=1` in Chromium, Firefox, and Safari if
  available; confirm Network Information fails closed honestly where
  absent and the banner reacts to offline mode.
