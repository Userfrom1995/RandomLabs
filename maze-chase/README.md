# Maze Chase (Rust)

A complete original maze-chase game in Rust: one deterministic engine with
three full publication layers (terminal, desktop, browser). All code,
mazes, art, audio, tuning, and branding are originals written for this
project; the in-repo Python game (`pacman/`, issue #552) is a behavioral
feel reference, never a code source. Clean-room rules live in
`docs/legal.md`.

Current status: **playable on Linux, macOS, and Windows. The Linux
release packages (deb, rpm, tarballs) are built and smoke-tested; the
packaging scripts cover a per-user Windows installer plus zip and a
macOS app, dmg, and tarball (unsigned), and those native artifacts ship
once the release workflow is installed. The open tracking issue #582
carries native per-OS release verification and the final re-verification
of every claim.** The terminal layer's
real-emulator truth is recorded in
[docs/terminal-compat.md](docs/terminal-compat.md) with committed
evidence and outstanding findings in
[progress/582-maze-chase-overhaul-findings.md](../progress/582-maze-chase-overhaul-findings.md),
and the measured numbers live in
[docs/scoreboard.md](docs/scoreboard.md) plus the retirement record in
[docs/parity.md](docs/parity.md). The deterministic engine
simulates the full core loop plus the complete hunt headless (120 Hz
timestep, movement with buffered turns and cornering, crumbs and
sunseeds, four authored personalities with scatter corners, scatter/chase
wave clock with reversals and chase-hold, fright windows with flash
staging and 200/400/800/1600 chains, pathing eyes that drift home,
relish bonuses on a 70/170 schedule with level tiers, pursuer stages,
spare wick, death/respawn, level flow, gatehouse counters with idle
release, four extra mode rulesets, seeded streams, replay log, state
hash, 19-row verify harness green). The identity system is original art
and sound data with settings: 11x11 and 21x21 Rill plus 11x11 wardens with
shape-distinct accents, fright masks, eye pairs, six relish icons,
the three contrast-checked Pondwake themes, every engine event routed to a layered
synthesized SFX bank plus five original multi-track tunes at a shared 108 BPM,
and difficulty/keymap/persistence with honest engine presets. The terminal game (`crates/terminal`) plays the
full hunt fullscreen: Kitty pixel graphics, Sixel pixels after a live
probe, 24-bit and 16-color cell tiers with watchdog auto-degrade, live
resize with magnification, title/help/scores/settings/rebind/pause
surfaces, machine high scores, and opt-in BEL plus ticker sound. Install and
launch details live in [docs/terminal.md](docs/terminal.md). The desktop
  game is covered in [docs/desktop.md](docs/desktop.md); the browser game
  plays from the game-first [index.html](index.html) and is covered in
  [docs/web.md](docs/web.md). The shared [feature matrix](docs/feature-matrix.md)
  tracks every mechanic, with every row carrying its test proof.

Run the checks: `cargo test` and
`cargo run --bin maze-chase-verify` inside `maze-chase/`.
Play the terminal game: `cargo run --release -p maze-chase-terminal`.
Play the desktop game: `cargo run --release -p maze-chase-desktop`.
Play the browser game: serve `maze-chase/` over http and open `index.html`
(browsers refuse `.wasm` over `file://`).
Ship a release: follow `docs/release.md` (workspace version and tag
parity, engine checks, layer builds, per-OS package staging and smoke,
the committed reproducible `.wasm`, install/upgrade/uninstall); measured
results land in `docs/scoreboard.md` and the parity gate in
`docs/parity.md`.

## What it is

- **One engine** (`crates/engine`, done): fixed 120 Hz
  deterministic simulation with seeded RNG streams, replay log, and
  state hash. Tile movement with buffered turns, four warden
  personalities (Bram leads, Kessa ambushes ahead, Jory flanks the
  mirror, Nib lurks at range) alternating scatter corners with the hunt
  on a reversing wave clock, gatehouse counters with idle release,
  sunseed fright with 200/400/800/1600 chains and pathing eyes, relish
  bonuses, pursuer stages, spare wick at 10,000, endless level ramp,
  and classic plus time-attack plus sprint plus fright-frenzy rulesets.
  Layers map input to `TickInput` and render `Game` state plus
  `GameEvent`s; any gameplay branch in a layer crate is a blocking
  review finding.
- **Identity system** (`crates/assets`, `crates/audio`,
  `crates/config`, done): original 11x11 and 21x21 sprite art with a
  shared legend and derived facings, animation clips and flash/bob
  timing, the three contrast-checked Pondwake themes, every engine event routed to
  every audio cue with layered synthesized SFX and five original multi-track tunes
  behind a backend-agnostic `Audio` trait, and difficulty presets
  (Cozy/Classic-from-L1, Standard/Classic-from-L2, Harsh/Sprint), keymap
  with duplicate-safe rebinds, and a human-readable settings file.
  Design language pinned in `docs/design.md` plus `design-tokens.json`.
- **Terminal game** (`crates/terminal`, done, [launch docs](docs/terminal.md)): Linux deb, rpm,
  and tarball plus a Windows zip, with a fullscreen canvas layout engine, magnification that fills the window,
  Kitty plus Sixel plus Unicode tiers with detection and auto-degrade
  watchdog, dynamic resize, title/help/scores/settings/key-rebind/pause
  surfaces, machine high scores, and opt-in BEL plus ticker sound.
- **Desktop game** (`crates/desktop`, done, [launch docs](docs/desktop.md)): windowed plus fullscreen
  GUI on the shared rasterizer core (the fixed 8-ppt reference raster;
  the terminal's bitmap tiers render the same art at the detected cell
  geometry), keyboard plus gamepad input with duplicate-safe
  remap screens, title/help/scores/settings/audio/keybinds/padbinds/pause
  surfaces, machine high scores shared with the terminal game, rodio
  synthesized effects and tunes with silent fallback, per-OS packages
  (Linux deb/rpm/tarball, a per-user Windows installer plus zip, and a
  macOS app/dmg/tarball), a HiDPI-aware bounded render path, and a
  `--probe` frame-run plus screenshot mode for display-free
  verification.
- **Browser game** (`crates/web` 0.1.0 plus the game-first `index.html` plus
  `web/maze-chase.js`, done, [launch docs](docs/web.md)): the same hunt
  as dependency-free WebAssembly behind a plain C ABI (no wasm-bindgen;
  the committed `web/maze-chase.wasm` builds reproducibly with stock
  `cargo build --target wasm32-unknown-unknown`), canvas board at
  bitmap density with DPR-aware integer scaling, keyboard plus swipe
  plus d-pad with a remap screen, DOM title/help/scores/settings/pause
  flows, WebAudio layered SFX plus the five multi-track tunes from the crate's own data
  with gesture unlock, localStorage scores and settings, and
  node plus headless-chromium E2E (`web/e2e/`).

## Docs

- `docs/research.md` - mechanics and stack research with the #552-feel
  basis and crate trade-offs.
- `docs/legal.md` - clean-room log, sources consulted, flagged items, and
  release obligations.
- `docs/identity.md` - original naming, cast, terminology, and maze
  authorship log.
- `docs/behavior-spec.md` - pinned #552 behavior contract the Rust engine
  must reproduce (measured values with sources).
- `docs/design.md` plus `docs/design-tokens.json` - visual and
  interaction language with machine tokens mirroring the theme store.
- `docs/feature-matrix.md` - shared binding tracker: one row per mechanic,
  columns per layer, every row needing test proof.
- `docs/terminal.md` - terminal install, launch, controls, render tiers,
  layout, settings/scores files, and troubleshooting.
- `docs/desktop.md` - desktop install, launch, controls, gamepad,
  settings/audio, per-OS packaging, `--probe` verification, and
  troubleshooting.
- `docs/web.md` - browser install, launch, controls, canvas/audio,
  localStorage, reproducible `.wasm` builds, and troubleshooting.
- `docs/audio.md` - the shared sound identity, score, mix defaults,
  per-layer synthesis, and accessibility contract.
- `docs/release.md` - reproducible build and release guide: toolchain,
  system libraries, layer builds, per-OS packaging matrix, and the
  clean-checkout release checklist.
- `docs/scoreboard.md` - measured release results: tick cost, suite
  totals, E2E evidence per OS, frame budgets, and the native proof
  record.
- `docs/parity.md` - #552 parity checklist mapping every pinned
  reference behavior to its engine table and verify row, with the
  per-layer sound row's macOS/Windows real-speaker review deferred to
  the Final Phase and the retirement step recorded.

## Clean-room rule

Original code, original names, original mazes, original art, original
audio, original branding only. No proprietary sources, ROMs, ripped
sprites, or copied timing tables. Replacing assets alone is never assumed
to remove risk; open questions are flagged in `docs/legal.md` and
escalated, never shipped on assumption.

## Layout

- `docs/` - unified product documentation.
- `index.html` - Pages hub and documentation entry point.
- `crates/engine` - the deterministic simulation:
  `tuning`, `maze`, `actors`, `steering`, `ghosts`,
  `personalities`, `modes`, `relish`, `game`, `rng`, `sha256`,
  `replay`, `verify`, plus the `maze-chase-verify` binary and golden
  tests.
- `levels/ember-warren.maze` - the authored launch maze with its
  authorship header and reachability proof, compiled into the engine.
- `crates/assets`, `crates/audio`, `crates/config` - the original
  identity system: sprites and animation
  timing plus themes (`assets`), cues plus original tunes and SFX plus
  test sinks (`audio`), difficulty presets plus keymap plus settings
  persistence (`config`).
- `crates/terminal` - the playable terminal game: fullscreen canvas
  layout (`layout`), shared pixel raster plus Kitty/Sixel/Unicode tiers
  (`raster`, `kitty`, `sixel`, `unicode`, `backend` with watchdog),
  crossterm input mapping (`input`), machine high scores (`scores`),
  opt-in BEL chime plus ticker (`chime`), menu/help/scores/settings/rebind
  flows (`screens`, `chrome`), the session on the shared engine (`app`),
  and the `maze-chase-terminal` binary (`main`).
- `crates/desktop` - the native desktop game: windowed/fullscreen GUI
  (`window` on winit plus softbuffer), session on the shared engine
  (`app`), keyboard mapping (`input`), gamepad mapping plus remap
  (`gamepad`), rodio synth backend (`sound`), menu flow (`screens`),
  XRGB framebuffer plus original 5x7 face (`frame`, `font`), play and
  menu composition over the shared rasterizer (`render`), strict CLI
  plus `--probe` verification (`cli`), and the `maze-chase-desktop`
  binary (`main`).
- `crates/web` - the browser game: fixed-step session on the shared
  engine (`session`), keyboard plus swipe mapping (`input`), RGBA
  board composer mirroring the terminal raster (`video`), top-10
  scores (`scores`), cue/SFX/tune routing tables (`audio_map`), and
  the plain C-ABI boundary (`bridge`); `index.html` plus
  `web/maze-chase.js` (DOM screens, HUD, WebAudio synth, touch pad,
  localStorage), the committed `web/maze-chase.wasm`, and durable
  node plus headless-chromium E2E (`web/e2e/`).

## Verification

Every layer keeps the feature matrix current and proves its rows with named
tests: headless engine suites with golden replay hashes, escape-sequence
capture for terminal backends, real GUI drives plus per-OS runners for
desktop, headless-chromium CDP keyboard and touch runs for WASM, and a
release scoreboard publishing measured tick cost, suite totals, and frame
budgets. Parity is verified on Linux on this tree; macOS and Windows were
verified pre-Pondwake, with fresh reruns tracked in the final sign-off.
The #552 Python reference game is retired in favor of this game, kept as
the reference implementation.
