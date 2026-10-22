# Web layer E2E scripts

Six durable, dependency-free harnesses (Node 22+ for the CDP harnesses, which
use the built-in WebSocket; no npm packages) that
prove the browser layer against the real artifacts. All exit nonzero
on failure and print `ALL GREEN` on success.

- `wasm-smoke.js [path-to-wasm]`: instantiates the release `.wasm`
  with zero imports and drives a session through the C ABI (boot,
  reset, steering, scoring, frame determinism across instances, audio
  tables, hostile boundary probes). Defaults to the shipped
  `web/maze-chase.wasm`, falling back to the cargo release artifact.
- `tester-regression.js [path-to-wasm]`: pins review-found fixes at the
  shipped-artifact level (warden-chain wire domain plus single Rust-side
  pitch doubling, scores getter names plus push/getter round-trip plus
  clear, hostile boundaries, determinism). Same default path rule as
  `wasm-smoke.js`.
- `boot-gate-e2e.js [page-url] [debug-port]`: serves hand-built stale
  wasm through a page-level `fetch` override and asserts the error card
  for a version-1 module missing `mc_fright_segments`, an ABI version
  skew, and an ABI-3 module missing one export from each first-frame
  group (fright flash, reduced flash, theme, difficulty) or the layered
  sound table (`mc_sfx_tone_count`), with the boot status never reaching
  Ready.
- `browser-e2e.js [page-url] [debug-port]`: drives the served
  `play.html` in headless chromium over CDP with node's built-in
  WebSocket (boot with zero console errors, title visible, canvas
  pixels, real button click to play, real ArrowUp keypresses scoring,
  P pause plus Resume, touch swipe, mobile 390x844 viewport plus
  sticky-header clearance and primary-CTA bounds/hit-testing at 320x480,
  320x568, 360x640, 375x667, and 390x844, a scrolled title reopening at its
  top, the 480x320 pause Resume bound/hit test, scores panel restoring a
  persisted row across reload plus in-page clear, the three labeled mixer
  rows, the unlock chip's full first-viewport geometry at 390x844 and
  320x480, the summed-output limiter at 100/100, gameplay screenshots to
  the system temp directory (`os.tmpdir()`, `mc-e2e-*.png`).
- `tester-rebind-lifecycle.js [page-url] [debug-port]`: pins the rebind
  capture lifecycle around Settings form controls at the shipped page and
  wasm (Escape always cancels an armed capture, field keys leave it armed,
  and the Rust binding plus visible labels agree).
- `tester-audio-e2e.js [page-url] [debug-port]`: drives every stable wire
  cue, every warden chain arm, the crumb pitch-variation arms, the four
  loud SFX ceiling recipes, and a live title loop across multiple
  scheduler iterations through the shipped page.

Setup for the browser run (two shells, from `maze-chase/`):

```
python3 -m http.server 8931   # Windows: python -m http.server 8931
chromium --headless=new --disable-gpu --no-sandbox \
  --remote-debugging-port=9331 --window-size=1280,900 \
  http://localhost:8931/play.html
node web/e2e/boot-gate-e2e.js
node web/e2e/browser-e2e.js
```

The wasm must match the harness: rebuild with
`cargo build --release --target wasm32-unknown-unknown -p maze-chase-web`
and copy the artifact to `web/maze-chase.wasm` first (see
`docs/web.md`). The page gates on `mc_version() == 3`, so skew fails
loudly instead of half-working.
