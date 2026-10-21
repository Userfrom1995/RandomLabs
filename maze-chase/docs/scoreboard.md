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
  sign-off (`docs/desktop-probe.ppm` committed), and recaptured in
  review round 9 after the title zones landed (Xvfb probe 30 bytes
  stable across runs).
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
  `docs/desktop-probe.ppm` (pre-Pondwake file, sha256 `8de66bae...`; the Pondwake file at that pass was `a5d4f892...`); the packaged zip
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
  Xvfb): 498 passed, 0 failed across 57 test targets.
- `cargo run --release --bin maze-chase-verify`: 19/19 checks, golden
  replay digest unchanged (`23c17f89734e`), `perf-headless` 0.1 us/tick.
- Wasm rebuild sha256 `1abe2665...`; `wasm-smoke.js`,
  `tester-regression.js`, and the real headless-chromium
  `browser-e2e.js` ALL GREEN with zero console errors.

Review fix rounds, measured on the same Linux machine at the head of
this PR (round 6 reviewed head `88ee1467`, code commit `470a050f`):

- `cargo test --workspace --no-fail-fast` (desktop E2E under Xvfb):
  535 passed, 0 failed across 57 test targets, including the new
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
  `029352dc0f54d074f6de1a200174e30fec76652caf115ca9d223a2d8357f819e`,
  committed as `web/maze-chase.wasm` (202,727 bytes; rebuilt
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
- Review round 9 (same head family): the three-zone title now carries a
  selected-item description strip plus the warden legend and goal line on
  terminal, desktop, and web, and the reduced-flash contract gates the
  pickup burst, golden lily, and death hold on terminal raster, atlas,
  cell tier, desktop attract board, and browser renderer. New
  `tester_reduced_flash.rs` enumerates every brightness call site and
  proves a 180-frame fright window is pixel-stable under reduced flash and
  reduced motion. Workspace suite 549 passed across 59 targets; wasm
  rebuilt to sha256 `69d5a55c...` (206,288 bytes, second clean build
  byte-identical); the browser E2E now carries 42 assertions and is all
  green.
- Review round 10 (same head family): the browser renderer now strips
  score floaters under reduced motion through the same early-return
  helper pattern as the desktop, with a behavioral test that renders a
  live floater under `Fx::new(true, true)` and asserts its absence.
  Web suite 51 tests; the public workspace count moves to 550 across 59
  targets (the full rerun remains the Tester's gate).
  Wasm rebuilt to sha256 `346ef9b8...` (206,295 bytes, second clean
  build byte-identical); node smokes and the 42-assertion browser E2E
  are all green.
- Tester round (head `f00dffdb`): the browser fright HUD calls
  `mc_fright_segments`, which the bridge did not export; the resulting
  `TypeError` was swallowed by `updateHud`'s catch, freezing the badge,
  meter, and later HUD rows for the whole fright window. The bridge now
  exports the countdown, the wasm was rebuilt with the recorded Rust
  1.99.0 toolchain to sha256 `68e331b2...` (206,711 bytes, second clean
  build byte-identical), and `tester-regression.js` (fright HUD ABI and
  drain assertions) plus `wasm-smoke.js` are ALL GREEN.
- Tester verification round (head `e78035c57`): the full workspace run
  recorded 552 passed / 0 failed across 60 targets, with harness 47/47,
  `maze-chase-verify` 19/19 (golden replay `23c17f89734e`, 0.2 us/tick),
  `cargo fmt --all --check` clean, and the committed wasm
  `68e331b2...` (206,711 bytes) matching `docs/web.md`. The cold
  headless-chromium `browser-e2e.js` passed 51/51 assertions with zero
  console errors, the desktop `--probe 90` stayed byte-identical to
  `docs/desktop-probe.ppm`, and the terminal PTY ran live at 143x64 and
  170x64.
- Desktop Xvfb `--probe 30` stays byte-identical to
  `docs/desktop-probe.ppm`
  (sha256 `594436905ae88af354253764f8f724300e0d173d88bc06acabb47743a8ef4dc3`);
  the desktop E2E asserts the probe bytes. The committed gameplay
  capture `docs/desktop-gameplay.ppm` (sha256
  `02ea979c910ddca2feea3a0731e812cae0cb8bd0f05416eb3d3fc8b32bd1390f`)
  was recorded from the same Xvfb window pipeline after driving a play
  state, so the #658 evidence is a real gameplay frame, not the title.
- Quality Council fix round (head `b6f82a24` family): the terminal play
  path now forwards `reduced_motion` into the shared `Fx` (bitmap, cell,
  and atlas paths), the title/pause cards clear an opaque one-cell ring
  before painting, and the desktop title/pause cards stage over the
  board center instead of the page center. Regression coverage: a live
  PTY run with `reduced_motion = true` (no sunseed halo glyph), a
  card-ring grid test, and desktop board-center tests. `docs/design.md`
  now records the shipped scope and an accepted-simplifications list
  instead of the deferred design targets. Full workspace rerun: 559
  passed / 0 failed across 61 targets; `docs/desktop-probe.ppm`
  recaptured (sha256
  `594436905ae88af354253764f8f724300e0d173d88bc06acabb47743a8ef4dc3`)
  and the desktop E2E is byte-identical.
- Linux terminal compatibility harness: all eight rows were re-executed at
  `96dc2be2` (binary sha256
  `ce3b1f91a78f00cbd72d09bd6132b367d027fd504e1e27d56e08ec9bd9f53f86`,
  `sources_dirty=false`), both Ghostty rows and every forced tier included.
  Every row records `disposition: pass`; kitty-graphics rows carry
  169.9-175.4 KiB per session with 153-217 exact sprite-palette pixels in
  the playing capture, and the VT340 rows carry 137-138 transmits /
  4.25-4.31 MiB. The evidence bundles under `tools/compat/evidence/` and
  their screenshots are the committed capture set.
- Terminal sprite census was updated from the retired Ember Warren
  palette to the Dusk Pond theme palette (Rill, sunseed, and the four
  hunters).
- Round 14 review fix (head `620b3d32`): the desktop compact title card
  clamps inside the frame at the 492x296 floor (production three-detail
  regression test), and the window-floor doc matches. The web bridge
  ABI moves to 2, the boot gate requires `mc_fright_segments`, and the
  rebuilt wasm is `ae474117...` (206,711 bytes, second clean build
  byte-identical); `boot-gate-e2e.js` proves stale version-1 modules
  reach the error card for both the missing export and version skew.
  The high-contrast label names the effective Moonwake theme, the cell
  tier keeps chomp and turn sparks under reduced flash, and the docs
  describe the static fresh title board, static help pages, and the
  shipped no-history-guard Back behavior. Full workspace rerun: 568
  passed / 0 failed across 61 targets; verify 19/19; all four web E2E
  scripts green.
- Tester verification round (head `23c10464` plus this selection-accent
  fix): the live run recorded 571 passed / 1 failed across 62 result
  lines, the only failure the intentional
  `selected_settings_row_uses_the_theme_accent` PTY test; `paint_panel`
  now trims the centering padding before testing the `"> "` cursor
  marker, so the selected Settings/Help/Scores/Rebind row paints in
  `theme.accent`. With the fix applied the public workspace count is 572
  passed / 0 failed across 62 targets; harness 47/47; `maze-chase-verify`
  19/19 (golden replay `23c17f89734e`, 0.2 us/tick); `cargo fmt
  --all --check` clean; the committed wasm is unchanged at
  `ae474117...` (206,711 bytes); the desktop probe is byte-identical to
  `docs/desktop-probe.ppm`; all four web E2E scripts are green with zero
  console errors.
- Quality Council fix round (head `96dc2be2`): the web screen panels are
  fixed overlays with scrollable bodies and pinned action rows (Settings
  fits at 390x844 and 1440x900), the mobile HUD correctly outranks
  `aside#hud dl`, and both HUDs now carry pickups/completion and relish;
  frame diagnostics moved behind a Settings checkbox. The terminal band
  grows to three rows, the fright meter is a fixed 30 shape-distinct
  segments, and the compact title card stages board-left/menu-right.
  Public workspace rerun: 573 passed / 0 failed across 62 targets;
  compat collector suite 48/48; `maze-chase-verify` 19/19 (golden replay
  `23c17f89734e`); all four web E2E scripts green. The compat harness
  re-ran all eight Linux rows at this checkout (binary
  `ce3b1f91a78f00cbd72d09bd6132b367d027fd504e1e27d56e08ec9bd9f53f86`,
  `sources_dirty=false`), all `pass`, including both Ghostty rows and
  all forced tiers; the pause gate now accepts the frozen dimmed board
  (PAUSED paint plus 0.55 <= dominant < 1.0). The wasm rebuild is
  `022761a1...` (207,338 bytes, second clean build byte-identical) on
  rustc 1.99.1 commit `58cf8f9c3`.
- Tester HUD-floor round (head `3b05525c` plus this fix): the committed
  `tester_hud_floor` pixel test caught the full desktop HUD's TUNE row
  painting through the bottom hint bar at the old 363 px compact/full
  switch. The full stack now starts at 365 px (363-364 use the compact
  stack), and the pixel tests pin both sides of the switch. Public
  workspace rerun under Xvfb: 578 passed / 0 failed across 63 targets;
  harness 49/49; `maze-chase-verify` 19/19 (golden replay `23c17f89734e`);
  all four web E2E scripts green. Current-state evidence claims corrected
  against the committed JSONs: kitty rows 169.9-175.4 KiB per session;
  VT340 rows 137-138 transmits / 4.25-4.31 MiB; Sixel playing 29.7 KiB
  mean wire frame / 29.9 KiB peak / 554 KiB/s (471 KiB/s payload); xterm
  light 1.85% white while playing. The macOS and Windows release rows are
  qualified as pre-Pondwake in `release.md` and `docs/index.md`.

## 2026-10-21 (current-tree verification)

- Browser E2E with the round-21 title/pause viewport assertions:
  `web/e2e/browser-e2e.js` passes 146/146 assertions with `E2E: ALL GREEN`
  and zero console errors (headless chromium over CDP). The small-viewport
  loop now also drives 320x568 and asserts the title's primary CTA is fully
  inside the viewport and hit-testable, the title body reopens at its top,
  and the 480x320 pause card is checked the same way; the 2026-10-16
  release-audit row above keeps its own historical measurement.

- Review round 22 hardens those same short-landscape surfaces:
  `web/e2e/browser-e2e.js` now passes 190/190 assertions with
  `E2E: ALL GREEN` and zero console errors. The title and pause loops
  cover 480x320, 320x360, and 568x320 with every action inside the card
  and viewport and the heading itself hit-testable; the scrolling panel
  bodies are keyboard-scrollable labelled regions and the title body
  reopens at its top. The full workspace rerun under Xvfb is 579 passed /
  0 failed across 63 targets, harness 49/49, and `maze-chase-verify`
  19/19 (golden replay `23c17f89734e`).

- Review round 23 restores the documented keyboard controls from focused
  panel actions: P, Esc, and M now reach the session from a focused button
  or scroll region, and `web/e2e/browser-e2e.js` proves pause with P,
  resume with P and Esc from the focused Resume action, mute toggling with
  M, and ArrowDown moving focus off the auto-focused Start. The harness
  now passes 200/200 assertions with `E2E: ALL GREEN` and zero console
  errors. The full workspace carried 581 tests across 63 targets in this
  round: 577 passed, 0 failed, and four desktop window E2E tests were
  blocked by this sandbox's missing libxkbcommon-x11. The Tester's final
  rerun at `61f96564` recorded 582 passed / 0 failed across 63 targets.

- Tester final rerun (head `61f96564`): the shipped artifacts were
  exercised live on all three layers and the full suite re-ran under
  Xvfb. `cargo test --workspace --no-fail-fast` records 582 passed / 0
  failed across 63 targets (581 plus the new live windowed
  settings-toggle test), `web/e2e/browser-e2e.js` passes 214/214
  assertions with `E2E: ALL GREEN` and zero console errors, the boot-gate
  E2E passes 30/30, the harness contract is 49/49, `maze-chase-verify` is
  19/19 (golden replay `23c17f89734e`), and `cargo fmt --all --check` is
  clean. Live evidence: the terminal release binary ran a truecolor PTY
  at 143x64; the desktop `--probe 90` reproduced `docs/desktop-probe.ppm`
  byte-for-byte (`9abc9150...`); the committed wasm is `022761a1...`
  (207,338 bytes).

- Review round 29 fixes the web rebind capture state: an unmapped key
  (for example `F1`) during a rebind capture now cancels the Rust-side
  capture as well as the visible UI, so the next key still performs its
  shortcut instead of completing the abandoned capture. `browser-e2e.js`
  arms the Pause row, presses `F1`, then proves `M` still toggles mute;
  the harness passes 218/218 assertions with `E2E: ALL GREEN` and zero
  console errors. Mutation check: the same block against the pre-fix
  harness fails the two mute assertions and the later persisted-mute
  checks. No Rust, wasm, or capture artifact changed.
