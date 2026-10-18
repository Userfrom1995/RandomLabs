# Release scoreboard

Measured results for the packaged release, recorded from real runs on
the release machine (Linux x86_64, stable Rust 1.99.0) plus the two
native per-OS passes (macOS arm64 and Windows Server 2025). No number
here is estimated: every figure names the command or run that produced
it. Rerun the commands in `docs/release.md` on another machine and
append a new dated section rather than editing these rows.

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
- `web/e2e/browser-e2e.js` (headless chromium over CDP): 17
  assertions in the current harness; 13/13 green at release sign-off
  (zero console errors, real ArrowUp scoring, pause/resume, touch
  swipe, 390x844 board visible, 60 FPS live), and the macOS native
  pass re-ran the current harness green. Not re-run in this audit
  (no display server on the release machine); the committed harness
  is unchanged since its green run.

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

## 2026-10-18 (cross-platform release verification)

The verified release: both native per-OS passes on their real
operating systems plus a fresh Linux rebuild of this exact tree.

Linux release machine (this pass, Rust 1.99.0):

- `cargo test --workspace --no-fail-fast`: 407 passed, 0 failed across
  45 test targets (the 2026-10-16 table above records the earlier
  344-pass run; the difference is the tester regression suites that
  landed since).
- `cargo run --release --bin maze-chase-verify`: `verify: 19/19 checks
  passed`, golden replay `23c17f89734e`, `perf-headless` 0.2 us/tick.
- Wasm rebuild (`cargo build --release --target
  wasm32-unknown-unknown -p maze-chase-web`): sha256
  `5ec2a05af55f7256a5603f7047446d319f342303d0194d8f2f8920f1ee9dea87`,
  byte-identical to the committed `web/maze-chase.wasm`.
- `node web/e2e/wasm-smoke.js` and `tester-regression.js`: ALL GREEN.
  Real headless-chromium CDP `browser-e2e.js`: ALL GREEN (scoring 20
  to 30, pause/resume, touch swipe, mobile viewport, persisted scores
  row, zero console errors).
- Packaging smoke: terminal tarball staged, installed to a scratch
  prefix, `--version` probed; desktop tarball staged, installed, and a
  real Xvfb `--probe 30` rendered a 1100x760 PPM.
- `cargo fmt --all --check` clean; `cargo clippy --workspace
  --all-targets` reports only the six documented pre-existing engine
  lints plus the pre-existing rng test lint.

macOS native pass (tester run 39068848280, macOS 26.6.2 arm64):

- `cargo test --workspace --no-fail-fast`: 398 passed, 0 failed
  across 41 targets; `maze-chase-verify` 19/19, golden `23c17f89734e`,
  0.1 us/tick.
- Terminal PTY E2E: 28/28 (full session with termios restore, probe
  window cases, tier precedence, live resize recovery, corrupt-config
  boot, `--dir` with spaces, game-over score persistence).
- Desktop: `--probe 30`, `--probe 90`, and fullscreen probes exit 0
  with real PPMs; a real GUI drive (osascript) created settings plus
  padmap files, changed difficulty, and quit cleanly.
- Packaging: `macos-app.sh` staged `Maze Chase.app` (Info.plist,
  bundle hash matching the release binary, probe exit 0); the terminal
  tarball staged, installed, and driven in a full PTY session.
- Web: wasm rebuild byte-identical (sha256 `5ec2a05a...`), node
  smokes green, CDP browser E2E green. Three new PTY regressions
  committed on the vehicle (PR #631).

Windows native pass plus fix round (tester run 39068849150, Windows
Server 2025 with real ConPTY, vehicle PR #632):

- `cargo test --workspace --no-fail-fast`: 374 passed, 0 failed
  across 41 targets; `maze-chase-verify` 19/19, golden `23c17f89734e`.
- Terminal CLI matrix green in Git Bash and pwsh; ConPTY sessions
  rendered title/play/pause/too-small/resize (9 pass; the 6 fails all
  shared the Release-key double-fire defect this pass found).
- Desktop probe PPM byte-identical to the committed
  `docs/desktop-probe.ppm` (sha256 `8de66bae...`); the packaged zip
  `maze-chase-desktop-0.1.0-windows-x86_64.zip` (609,776 bytes)
  extracted a binary byte-identical to the release build.
- Web node smokes and CDP browser E2E green.
- The three defects the pass found (terminal Release-key double fire,
  desktop `--probe` option order, CRLF wasm drift) are fixed in the
  merged vehicle: the fix contracts (`tester_windows_key_release.rs`,
  `tester_windows_probe_order.rs`,
  `tester_windows_checkout_bytes.rs`, `tester_key_kind_filter.rs`)
  were executed red on the pre-fix head and green on the fixed head by
  the Quality Council (`approve-eval` 9.8/10), and the root
  `.gitattributes` pins the `include_str!` sources to LF so a CRLF
  checkout can never reintroduce the wasm drift.

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

## Native-OS proof (completed 2026-10-18)

Windows and macOS packaged artifacts plus their per-layer E2E runs
executed on their native operating systems (the dated section above
records the measured numbers). With them, every
[parity checklist](parity.md) row is signed; the #552 reference game
was retired in favor of this game by the Maintainer's explicit step
after this verified release merged.
