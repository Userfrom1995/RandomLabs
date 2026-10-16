# Web layer E2E scripts (Phase 7)

Three durable, dependency-free harnesses (Node 18+, no npm packages) that
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
- `browser-e2e.js [page-url] [debug-port]`: drives the served
  `play.html` in headless chromium over CDP with node's built-in
  WebSocket (boot with zero console errors, title visible, canvas
  pixels, real button click to play, real ArrowUp keypresses scoring,
  P pause plus Resume, touch swipe, mobile 390x844 viewport, scores
  panel restoring a persisted row across reload plus in-page clear,
  gameplay screenshots to `/tmp/mc-e2e-*.png`).

Setup for the browser run (two shells, from `maze-chase/`):

```
python3 -m http.server 8931
chromium --headless=new --disable-gpu --no-sandbox \
  --remote-debugging-port=9331 --window-size=1280,900 \
  http://localhost:8931/play.html
node web/e2e/browser-e2e.js
```

The wasm must match the harness: rebuild with
`cargo build --release --target wasm32-unknown-unknown -p maze-chase-web`
and copy the artifact to `maze-chase/web/maze-chase.wasm` first (see
`docs/web.md`). The page gates on `mc_version() == 1`, so skew fails
loudly instead of half-working.
