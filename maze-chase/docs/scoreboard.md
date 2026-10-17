# Release scoreboard

Measured results for the packaged release, recorded from real runs on
the release machine (Linux x86_64, stable Rust 1.99.0). No number here
is estimated: every figure names the command that produced it. Rerun
the commands in `docs/release.md` on another machine and append a new
dated section rather than editing these rows.

## 2026-10-16 (Linux x86_64, release audit)

Engine determinism (`cargo run --bin maze-chase-verify`):

- `verify: 19/19 checks passed` (all rows in `verify.rs`, including
  the two pinned golden replay hashes).
- `perf-headless`: 0.8 us/tick for 12k ticks (100 simulated seconds),
  against the 8,333 us frame budget of the 120 Hz timestep. That is
  four orders of magnitude of headroom: the simulation can never be
  the frame bottleneck on any of the three layers.

Unit and integration suites (`cargo test --workspace`, exit 0):

| Crate | Suites | Passed |
|---|---|---|
| engine (lib 45, golden 2, hostile 12 + 12, quiescence 2) | 6 | 73 |
| assets (lib 20, hostile 11, doc 2) | 3 | 33 |
| audio (lib 13, hostile 6) | 2 | 19 |
| config (lib 18, hostile 8) | 2 | 26 |
| terminal (lib 62, headless 6, CLI strictness 4, hostile 6) | 4 | 78 |
| desktop (lib 55, headless 3, eval-fix 6, hostile 8) | 4 | 72 |
| web (lib 43) | 1 | 43 |
| doc-tests, remaining binaries | 8 | 0 |
| **Total** | **30** | **344 passed, 0 failed** |

Browser artifacts (Node 18+, committed `web/maze-chase.wasm`):

- `node web/e2e/wasm-smoke.js`: `NODE SMOKE: ALL GREEN` (zero
  imports, boot/reset/steering/scoring live, bit-identical frames
  across instances, audio tables, hostile boundary probes).
- `node web/e2e/tester-regression.js`: `TESTER REGRESSION: ALL GREEN`
  (warden-chain wire domain, scores push/getter round-trip, hostile
  boundaries, determinism).
- `web/e2e/browser-e2e.js` (headless chromium over CDP): 13/13 green
  at release sign-off (zero console errors, real ArrowUp scoring,
  pause/resume, touch swipe, 390x844 board visible, 60 FPS live).
  Not re-run in this audit (no display server on the release
  machine); the committed harness is unchanged since its green run.

Packaging (this audit):

- Terminal tarball (`packaging/terminal/linux-tarball.sh`): staged
  `dist/maze-chase-terminal-0.1.0-linux-x86_64.tar.gz`, contents
  listed by the script, ends with a `--version` probe.
- Terminal install (`install-linux.sh --tarball ... --prefix
  /tmp/mc-terminal-prefix`): installed and re-probed `--version`
  clean.
- Desktop Linux tarball plus installer: scripted and documented;
  release-build plus Xvfb `--probe` run was green at release
  sign-off (`docs/desktop-probe.ppm` committed). Not rebuilt in this
  audit (same sources, workspace build green here).
- Windows zip and macOS bundle: scripts shipped, must be staged on
  their native OSes (see below).

Style and lints:

- `cargo fmt --check`: clean.
- `cargo clippy --workspace --all-targets`: only the six
  pre-existing engine lints from clippy 1.99 remain (untouched
  `maze.rs`/`rng.rs`/`sha256.rs` style notes, present since the
  engine was written; consensus-critical code is not churned for style).
  This audit fixed the only two layer-test lints (`assert_eq!` with a
  boolean in terminal headless, `chunks_exact(3)` over an
  exactly-sized buffer in desktop eval-fix); both suites re-run green
  after the fix.

## Frame budgets (design, with measured anchors)

- Engine tick: 0.8 us measured (above). At 120 Hz the simulation
  costs about 0.01% of the frame budget; every layer can spend its
  frame on presentation.
- Terminal: 60 fps loop with watchdog auto-degrade (measured
  implicitly by the headless layout sweep and the tier ladder tests;
  no wall-clock FPS is claimed because CI terminals have no
  comparable clock).
- Desktop: fixed 120 Hz session matching the engine timestep;
  Xvfb `--probe` run rendered real titled frames to PPM.
- Browser: 60 FPS live in the CDP run (release evidence); the canvas
  composer mirrors the terminal raster with a frame-determinism test
  (`web::video`, `web::bridge` hostile probes).

## Pending (not claimed)

- Windows/macOS packaged artifacts and per-OS E2E runs: scripts and
  docs shipped, proof pending native runners. The
  [parity checklist](parity.md) records these as the only open rows
  before #552 retirement.
