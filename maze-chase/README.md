# Maze Chase (Rust)

A complete original maze-chase game in Rust: one deterministic engine with
three full publication layers (terminal, desktop, browser). All code,
mazes, art, audio, tuning, and branding are originals written for this
project; the in-repo Python game (`pacman/`, issue #552) is a behavioral
feel reference, never a code source. Clean-room rules live in
`docs/legal.md`.

Current status: **Phase 1 (research and legal foundations) is done; no
playable build exists yet.** The engine (Phase 2), ghosts and progression
(Phase 3), assets and identity system (Phase 4), and the three publication
layers (Phases 5-7) are planned and tracked in the shared
[feature matrix](docs/feature-matrix.md). This README describes the whole
product honestly; anything not yet built is marked planned.

## What this will be

- **One engine** (`crates/engine`, Phase 2-3): fixed 120 Hz deterministic
  simulation with seeded RNG streams, replay log, and state hash. Tile
  movement with buffered turns, four warden personalities (Bram the leader,
  Kessa the ambusher, Jory the flanker, Nib the lurker), scatter/chase
  waves with reversals, sunseed fright with 200/400/800/1600 chains, eyes
  that drift home, gatehouse dot counters with idle timeout, tunnel clamp,
  late-level pursuer stages, crumb scoring with extra life, relish bonuses,
  endless level ramp, and honest extra modes. Layers map input to
  `TickInput` and render `Game` state plus `GameEvent`s; any gameplay
  branch in a layer crate is a blocking review finding.
- **Terminal game** (`crates/terminal`, Phase 5): installable package with
  a fullscreen canvas layout engine, magnification that fills the window,
  Kitty plus Sixel plus Unicode backends with detection and auto-degrade
  watchdog, dynamic resize, menus, scores, settings, and launch docs.
- **Desktop game** (`crates/desktop`, Phase 6): windowed plus fullscreen
  GUI on the shared renderer core, keyboard plus gamepad input, menus and
  audio controls, packaged per OS with reproducible steps.
- **Browser game** (`crates/wasm`, Phase 7): the same renderer compiled to
  WebAssembly, keyboard plus touch controls, DPR-aware resize, web-audio
  unlock, served from the Pages hub.

## Docs

- `docs/research.md` - mechanics and stack research with the #552-feel
  basis and crate trade-offs.
- `docs/legal.md` - clean-room log, sources consulted, flagged items, and
  per-phase obligations.
- `docs/identity.md` - original naming, cast, terminology, and maze
  authorship log.
- `docs/behavior-spec.md` - pinned #552 behavior contract the Rust engine
  must reproduce (measured values with sources).
- `docs/feature-matrix.md` - shared binding tracker: one row per mechanic,
  columns per layer, every row needing test proof.

## Clean-room rule

Original code, original names, original mazes, original art, original
audio, original branding only. No proprietary sources, ROMs, ripped
sprites, or copied timing tables. Replacing assets alone is never assumed
to remove risk; open questions are flagged in `docs/legal.md` and
escalated, never shipped on assumption.

## Layout

- `docs/` - unified product documentation (this phase's deliverable).
- `index.html` - Pages hub and documentation entry point.
- `crates/` - arrives in Phase 2 (workspace plus pure engine crate).
- `levels/`, `assets/` - arrive with their authoring phases.

## Verification

Each phase keeps the feature matrix current and proves its rows with named
tests: headless engine suites with golden replay hashes, escape-sequence
capture for terminal backends, per-OS runners for desktop, Playwright
keyboard and touch runs for WASM, and a bench harness publishing FPS, input
latency, and parity results. Issue #552 stays functional until the Rust
build proves verified parity on all three layers.
