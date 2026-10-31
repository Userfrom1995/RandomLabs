# Web layer E2E scripts

Eight durable, dependency-free harnesses (Node 22+ for the CDP harnesses, which
use the built-in WebSocket; no npm packages) that
prove the browser layer against the real artifacts. All exit nonzero
on failure and print an `ALL GREEN` (or `PASS`) banner on success.
`run-browser-e2e.sh` runs the CDP suites with a fresh browser per suite,
and `tests/` pins the runner and nav-pill contracts with `node --test`.

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
  Ready. It also proves the failure card stays inside the visual viewport
  with no horizontal page overflow at 390x844 and 320x568.
- `browser-e2e.js [page-url] [debug-port]`: drives the served
  `index.html` in headless chromium over CDP with node's built-in
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
- `site-e2e.js [base-url] [debug-port]`: crawls the shipped site over
  HTTP and in chromium (every page's title, one h1, shared navigation,
  active item, no raw markdown links, no horizontal overflow at desktop
  and 390x844, every internal link and fragment resolving), proves the
  current nav pill is fully visible and that a clipped pill is scrolled
  into view (a fully visible fitting pill is valid at any scroll offset;
  platform font metrics, not nav overflow, decide whether a scroll is
  needed), checks the
  game page's opened Site menu at 390x844 and the two short landscape
  sizes (480x320, 568x320), proves a wheel over the uncapped open menu
  still scrolls the page, boots the game-first `index.html`, starts a
  run, pauses, resumes, and verifies the mobile board minimum and
  title-card bounds with zero console errors. Runs unchanged against a
  local server or the deployed preview URL; record the deployed command
  and result in `progress/`.
- `macos-case-audit.js`: walks every local href/src in the shipped HTML
  and verifies each path component matches the on-disk spelling exactly,
  so a link that opens on the default case-insensitive APFS volume cannot
  404 on the case-sensitive Pages host. No server required.

## Fresh-browser runner (recommended)

The CDP suites each expect their own browser. Reusing one Chrome across
suites leaks storage, service workers, and pending CDP sessions between
them, which produced boot-gate/rebind failures and a Node undici
assertion on a second site-e2e run. `web/e2e/run-browser-e2e.sh` isolates
every suite: one Chrome process, one profile, one debug port, and one
Node process per script, with a static server on an ephemeral port.

From `maze-chase/`:

```
web/e2e/run-browser-e2e.sh                     # all five CDP suites
web/e2e/run-browser-e2e.sh site-e2e.js         # selected suites
web/e2e/run-browser-e2e.sh --base-url URL      # external static server
web/e2e/run-browser-e2e.sh --chrome PATH       # explicit Chrome binary
web/e2e/run-browser-e2e.sh --plan              # per-suite URL/port/profile
```

It needs node 22+ and python3 (for the static server and a free debug
port); Chrome is found through `CHROME` or the usual platform names. The
runner prints the server URL and each suite's CDP port and profile;
`--plan` prints `script<TAB>url<TAB>port<TAB>profile` for every suite
without launching a browser or a server. The Node-only suites
(`wasm-smoke.js`, `tester-regression.js`, `macos-case-audit.js`) run
directly with `node`.

Manual two-shell setup (one suite at a time; prefer the runner). Launch a
fresh Chrome with its own profile for each suite and stop it before
starting the next one:

```
python3 -m http.server 8931   # Windows: python -m http.server 8931
chromium --headless=new --disable-gpu --no-sandbox \
  --user-data-dir="$(mktemp -d)" \
  --remote-debugging-port=9331 --window-size=1280,900 \
  http://localhost:8931/index.html
node web/e2e/boot-gate-e2e.js
```

Stop Chrome and remove its profile, then relaunch with a fresh
`--user-data-dir` before running another suite. Reusing one browser
across suites is the contamination this runner avoids.

The site harness also accepts a deployed base URL, for example
`node web/e2e/site-e2e.js https://<owner>.github.io/<repo>/preview/pr-<N>/maze-chase/`
(with chromium launched against `about:blank` and the same debug port).

The wasm must match the harness: rebuild with
`cargo build --release --target wasm32-unknown-unknown -p maze-chase-web`
and copy the artifact to `web/maze-chase.wasm` first (see
`docs/web.md`). The page gates on `mc_version() == 3`, so skew fails
loudly instead of half-working.
