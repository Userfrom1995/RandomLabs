# Web layer E2E scripts (Phase 7)

Two durable, dependency-free harnesses (Node 18+, no npm packages) that
prove the browser layer against the real artifacts. Both exit nonzero
on failure and print `ALL GREEN` on success.

- `wasm-smoke.js [path-to-wasm]`: instantiates the release `.wasm`
  with zero imports and drives a session through the C ABI (boot,
  reset, steering, scoring, frame determinism across instances, audio
  tables, hostile boundary probes). Defaults to the release artifact
  under `maze-chase/target/`.
- `browser-e2e.js [page-url] [debug-port]`: drives the served
  `play.html` in headless chromium over CDP with node's built-in
  WebSocket (boot with zero console errors, title visible, canvas
  pixels, real button click to play, real ArrowUp keypresses scoring,
  P pause plus Resume, touch swipe, mobile 390x844 viewport, gameplay
  screenshots to `/tmp/mc-e2e-*.png`).

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
