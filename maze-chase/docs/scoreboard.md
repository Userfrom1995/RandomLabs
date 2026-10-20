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
- `web/e2e/browser-e2e.js` (headless chromium over CDP): 38
  assertions in the current harness; 38/38 green on this tree
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

macOS native pass, pre-Pondwake (tester run 39068848280, macOS 26.6.2 arm64):

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

Windows native pass plus fix round, pre-Pondwake (tester run
39068849150, Windows Server 2025 with real ConPTY, vehicle PR #632):

- `cargo test --workspace --no-fail-fast`: 374 passed, 0 failed
  across 41 targets; `maze-chase-verify` 19/19, golden `23c17f89734e`.
- Terminal CLI matrix green in Git Bash and pwsh; ConPTY sessions
  rendered title/play/pause/too-small/resize (9 pass; the 6 fails all
  shared the Release-key double-fire defect this pass found).
- Desktop probe PPM byte-identical to the committed
  `docs/desktop-probe.ppm` (pre-Pondwake file, sha256 `8de66bae...`; the current Pondwake file is `a5d4f892...`); the packaged zip
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
  the CI terminal tests claim no wall-clock FPS because CI terminals
  have no comparable clock; the compatibility harness measures it on a
  real terminal).
- Desktop: fixed 120 Hz session matching the engine timestep;
  Xvfb `--probe` run rendered real titled frames to PPM.
- Browser: 60 FPS live in the CDP run (release evidence); the canvas
  composer mirrors the shared 8-ppt reference raster with a
  frame-determinism test (`web::video`, `web::bridge` hostile probes).

## Native-OS proof (completed 2026-10-18)

Windows and macOS packaged artifacts plus their per-layer E2E runs
executed on their native operating systems (the dated section above
records the measured numbers). With them, every
[parity checklist](parity.md) row is signed; the #552 reference game
was retired in favor of this game by the Maintainer's explicit step
after this verified release merged.

## 2026-10-18 (overhaul: dynamic layout and full-window composition)

The dynamic-layout overhaul (#582), measured on the Linux build machine:

- `cargo test --workspace --no-fail-fast`: 430 passed, 0 failed across
  51 targets. This includes the new PTY resize-contract and trace
  tests in `crates/terminal/tests/plan_contract.rs`. The desktop
  window E2E ran under the local Xvfb (system libasound2, libudev,
  libxkbcommon-x11, xvfb packages present).
- `cargo run --release --bin maze-chase-verify`: 19/19 checks, the
  golden replay digest unchanged (`23c17f89734e`), `perf-headless`
  0.2 us/tick for 12k ticks.
- `cargo fmt --all --check` clean; `cargo clippy --workspace
  --all-targets` reports only the pre-existing engine style lints
  documented above (maze.rs/rng.rs/sha256.rs), none from the terminal
  crate.
- Layout solver: continuous tile scales 1 to 8 columns by 1 to 4 rows
  plus the 2x1 floor, chrome fitted in priority order (side panel,
  HUD band, hint only), single too-small card below the exact 62x35
  minimum. PTY sessions pin the planned scales: 62x35 to 2x1 band,
  100x40 to 3x1 band, 140x70 to 5x2 band, 170x64 to 5x2 side panel,
  200x100 to 7x3 band.
- Resize contract: a live resize repaints from scratch in one frame;
  asserted on the shipped binary on the Kitty tier, where that frame
  must carry `ESC[2J`, then `ESC_Ga=d` (delete every placement), then
  the re-display, in exactly that order.
- Trace mode: `MAZE_CHASE_TRACE` emits `start`/`plan`/`frame` JSONL;
  the launch plan at 62x35 and the post-resize plan at 100x40 are
  asserted, so the compatibility harness collector has machine
  evidence available.
- Real-emulator resize rows (Linux kitty/Ghostty/xterm and the macOS
  arm) stay with the per-OS testers: no emulator is installed on this
  build machine, and no claim here exceeds the PTY evidence above.

## 2026-10-18 (overhaul follow-up: tester round on #656)

The Linux Tester's real-PTY round on the dynamic-layout build returned three
blocking findings; all three are fixed with committed tests. The review
round after the fix then enforced the 2x1 compact floor on the pixel path
(a 1x2 side-panel plan used to tie the 2x2 minimal plan at 80x63 with 8x6
cells and win the chrome tie-break; pinned by
`layout::tests::pixel_path_never_drops_below_the_compact_floor`),
reconciled the scoring and raster claims across the blueprint, the
terminal docs, and the module header, and tightened the squareness
guard. The full gates re-run on the Linux build machine:

- `cargo test --workspace --no-fail-fast` (desktop E2E under Xvfb):
  451 passed, 0 failed across 47 test binaries plus 7 doc-test suites
  (the Tester's committed live-golden suite adds 4 tests and the 47th
  binary on top of the 447 measured through the review rounds).
- `cargo run --release --bin maze-chase-verify`: 19/19 checks, the
  golden replay digest unchanged (`23c17f89734e`).
- `cargo fmt --all --check` clean; clippy reports only the pre-existing
  warnings from `main` (the engine style lints plus the design-token
  test's suggestion lints), none from this branch's files.
- Solver (F1): the 2..8 x 1..4 scale grid (the 2x1 compact floor) is
  scanned and picked coverage-first (ties: squareness, chrome, area,
  width); goldens 200x60 -> 7x1 band and 62x80 -> 2x2 band are pinned,
  and the pixel-path floor too (a 1x2 side-panel plan used to tie 2x2
  at 80x63 with 8x6 cells). A 62..400 x 35..120 sweep holds the
  measured coverage floor (280/1000 at 399x62). The pinned scales in
  the section above all still hold.
- Bitmap tiers (F2/F3): the raster is drawn on a centered footprint
  bounded by the board's pixel box; Sixel paints from the centered
  origin instead of the board origin at natural size, and the Kitty
  display uses the footprint instead of the stretched full board box.
  Pinned by unit tests plus PTY placement/IHDR assertions.

## 2026-10-20 (overhaul: Pondwake visual identity)

Initial identity delivery, measured on the Linux build machine at code
commit `90cb9b87` (kept as history):

- `cargo test --workspace --no-fail-fast` (desktop E2E under the local
  Xvfb): 498 passed, 0 failed across 58 test targets.
- `cargo run --release --bin maze-chase-verify`: 19/19 checks, golden
  replay digest unchanged (`23c17f89734e`), `perf-headless` 0.1 us/tick.
- Wasm rebuild sha256 `1abe2665...`; `wasm-smoke.js`,
  `tester-regression.js`, and the real headless-chromium
  `browser-e2e.js` ALL GREEN with zero console errors.

Review fix rounds, measured on the same Linux machine at the head of
this PR (round 6 reviewed head `88ee1467`, code commit `470a050f`):

- `cargo test --workspace --no-fail-fast` (desktop E2E under Xvfb):
  545 passed, 0 failed across 58 test targets, including the new
  engine-clock, chomp-phase, 120 Hz ticker-age, renderer-clock, web-clock,
  effect-window, authored-facing, death-hold, sweep-order, mirrored-eye,
  death-boundary, fright-slot, cell-clear, cell-death-bubble,
  cell-relish-order, desktop-ticker, and Kitty image-one tests.
- `cargo run --release --bin maze-chase-verify`: 19/19 checks, golden
  replay digest unchanged (`23c17f89734e`); `perf-headless` 0.2-0.4 us/tick
  across CI reruns (the release machine measured 0.1;
  the gate is the verify pass, not the host's absolute rate).
- `cargo fmt --all --check` clean; `cargo clippy --workspace
  --all-targets` reports only the documented pre-existing engine style
  lints (six lib warnings plus the rng test lint), none from the art,
  theme, renderer, or bridge code.
- Wasm rebuild (`cargo build --release --target
  wasm32-unknown-unknown -p maze-chase-web`): sha256
  `11f75cd2c9bf3e4502ada166774be7b62895776600d38025f021394700a57327`,
  committed as `web/maze-chase.wasm` (206,253 bytes; rebuilt
  byte-identically with rustc 1.99.0 commit `b940084d7`); `wasm-smoke.js`,
  `tester-regression.js`, and the real headless-chromium
  `browser-e2e.js` are ALL GREEN with zero console errors. The committed
  browser gameplay capture is `docs/web-gameplay.png` (1280x757).
- Quality Council fix round (same head family, `dd55b7df`): staged
  title and pause surfaces on terminal/desktop, a first-view browser
  title card and header Pause control, a 30-segment shape-distinct
  fright meter, persisted reduced motion, high-contrast MOONWAKE, and
  the reachable 5x5 eye / 11x11 relish ladders. `browser-e2e.js` grew
  to 38 assertions (first-view CTA and real Start click, mobile pause
  and Resume clicks, reduced-motion/high-contrast persistence); the
  workspace suite stayed at 545 passed across 58 targets, the desktop
  title probe was regenerated, and the wasm rebuilt to sha256
  `7545da6a...` (206,252 bytes) after a second clean build.
- Desktop Xvfb `--probe 30` stays byte-identical to
  `docs/desktop-probe.ppm`
  (sha256 `a5d4f892150840c7498829341cc1ff1537727d88e598d0d534304db0413f8f0a`);
  the desktop E2E asserts the probe bytes. The committed gameplay
  capture `docs/desktop-gameplay.ppm` (sha256
  `f6040ea93bd09ba057016972fb3e8320ce45229667cbae635a97754200625068`)
  was recorded from the same Xvfb window pipeline after driving a play
  state, so the #658 evidence is a real gameplay frame, not the title.
- Linux terminal compatibility harness: five kitty/xterm rows were
  re-executed at `14b939d9` (binary sha256
  `c81890e8d27c8f6914a8decf3df14ca02a9314fd2a9b70bf94991ca714821e9b`,
  `sources_dirty=false`): kitty auto and forced cells, xterm light and
  dark, and xterm VT340 auto. The forced xterm sixel row was re-executed
  after the renderer fixes at `e938ce5a` (binary
  `e06807bc1f4c0d3fb98552d436c5f4222b28d97cc25ea685d639475154bdc7e0`,
  `sources_dirty=false`, `pause_select=1`). Every row records
  `disposition: pass`; kitty-graphics rows carry 169.6-175.0 KiB per
  session with 163-271 exact sprite-palette pixels in the playing
  capture, and the VT340 rows carry 137-139 transmits / 4.27-4.33 MiB.
  The two Ghostty rows remain the `90cb9b87` record and are labeled
  pre-fix in `docs/terminal-compat.md`; the final sign-off phase reruns
  them. The evidence bundles under `tools/compat/evidence/` and their
  screenshots are the committed capture set.
- Terminal sprite census was updated from the retired Ember Warren
  palette to the Dusk Pond theme palette (Rill, sunseed, and the four
  hunters).
