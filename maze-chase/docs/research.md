# Mechanics and Stack Research

Phase 1 research synthesis for the Maze-Chase Rust migration (issue #582).
All gameplay numbers below are measured from the in-repo #552 Python
reference (`pacman/`, suite 495 green, 106-row verify matrix); no external
game code, ROMs, or data tables were consulted or copied. External sources
are limited to public behavioral descriptions of the genre and the public
API documentation of the Rust crates we depend on.

## 1. Behavior model (from the #552 reference implementation)

The genre loop, as implemented and verified in `pacman/src/engine/`:

- **Maze**: orthogonal grid, left-right symmetric, side tunnel wrapping
  horizontally, central ghost house with a one-way door. Reference geometry:
  28 wide by 31 tall, tunnel on row 14, 282 dots plus 4 energizers, every
  pickup flood-fill reachable from the player start (13, 23). Measured with
  `Maze().reachable_dots_from(PLAYER_START_TILE)` returning 286 of 286.
- **Movement**: tile-center movement with buffered turns and a cornering
  assist window (`TURN_WINDOW_TILES = 0.35`). The player commits to a wanted
  direction that applies at the next tile center; ghosts decide steering at
  most once per tile visit (the `decided` gate in `ghosts.py`), because
  120 Hz strides are shorter than the center snap window (`CENTER_SNAP =
  0.09`) and re-snapping every tick freezes movement.
- **Ghost steering**: at each tile center the active ghost picks the
  walkable exit (never a direct reversal) minimizing squared Euclidean
  distance to its personality target; ties break in fixed priority order
  (up, left, down, right) so replays are identical everywhere. Reversals
  happen only on wave switches and fright starts.
- **Personalities** (all pure target functions in `ghosts.py`):
  Leader targets the player tile; Ambusher targets 4 tiles ahead of the
  player's heading (`AHEAD_AMBUSH = 4`); Flanker mirrors the Leader across
  a pivot 2 tiles ahead of the player (`AHEAD_FLANK = 2`); Lurker hunts the
  player while farther than 8 tiles (`DRIFTER_SHY_TILES = 8.0`) and retreats
  to its scatter corner when closer. Scatter corners are the four maze
  corners ((1,1), (26,1), (1,29), (26,29)). Frightened ghosts pick uniformly
  at random from the seeded `fright` RNG stream. Eaten ghosts become eyes
  that path back to the house door (`GHOST_DOOR_TILE = (13, 12)`) at 1.5x
  cruise speed and revive on arrival.
- **Wave clock**: scatter/chase pairs (7/20, 7/20, 5/20, 5/20, 3/25, 3/25,
  then 1/chase-hold), with early scatter shaved 1 s per level above 1
  (floored at 1 s). Late-level pursuer stages at 20 and 10 dots remaining
  add +3% / +6% leader speed, the second stage also pinning chase mode.
- **Fright**: energizer opens a timed hunt window (6.0 s on level 1,
  falling to 0.0 by level 11), chains score 200/400/800/1600 per ghost on
  one energizer, last 1.5 s render as a flashing warning
  (`FRIGHT_FLASH_THRESHOLD = 1.5`). Collision priority: frightened contact
  eats the ghost, unfrightened contact kills the player (`COLLIDE_DIST =
  0.55` tiles, same-tile or near check).
- **House exits**: per-ghost dot counters easing with level (level 1
  measures (0, 3, 13, 28) via `house_counters(1)`; base table (0, 7, 17,
  32) with 4 dots of ease below level 5), plus a 4 s idle timeout that
  releases the next ghost even with no dots eaten.
- **Scoring and flow**: dot 10, energizer 50, extra life at 10,000, 3
  starting lives, death sequence 1.4 s, level-clear sequence 2.0 s, endless
  ramp (player base 8.5 tiles/s times a curve to 1.20x). Fruit ripens at 70
  and 170 dots eaten per level, expires after 9.5 s, tier values 100 to
  5000 by level. Extra modes on the same engine: time-attack (120 s on a
  refilling maze), sprint (one life, no fright, par-time bonus against 300
  s), fright-frenzy (4x fright windows with slower ghosts, 1.0 s floor).
- **Determinism**: fixed 120 Hz timestep with a spiral-of-death clamp,
  seeded RNG with per-subsystem stream splits, canonical state string plus
  SHA-256 hash covering seed, level, score, lives, ticks, positions, dot
  field, ghost clocks, mode, fruit, and timers. The 30 Hz vs 120 Hz
  convergence check and golden replay hashes pin this in the #552 suite.

## 2. What the Rust engine must reproduce (behavioral contract)

The full pinned contract lives in `behavior-spec.md`. In short: 120 Hz
fixed-step simulation, integer-friendly tile math, the four target
functions, the wave/fright/house/pursuer clocks with the authored tables
above re-expressed as original Rust tables with provenance comments, the
scoring chains and mode rulesets, tunnel wrap, collision priority, and
seeded-stream determinism with replay log plus state hash. Anything the
engine cannot prove with a headless test does not ship; the verify harness
(`verify.rs`) is the CI gate, mirroring the #552 `--verify` practice.

## 3. Rust stack (selected with trade-offs)

- **Engine**: pure Rust, stable toolchain, 2021 edition or newer. No I/O,
  no wall-clock, no platform imports in the engine crate. The seeded RNG is
  vendored in-repo (small, auditable, no `getrandom` dependency for the
  headless core) with subsystem stream splits.
- **Desktop**: macroquad/miniquad as the primary renderer (one draw core
  shared with the WASM target; miniquad compiles the same code to WebGL),
  eframe noted as fallback if miniquad windowing gaps block any OS.
  Rejected for v1: bevy (engine-weight framework for a 2D maze game) and
  Tauri/webview shells (a native game loop needs none of it).
- **Terminal**: ratatui plus crossterm (the maintained standard for Rust
  terminal UIs) plus ratatui-image for the Kitty/Sixel tiers, Unicode
  half-block reference backend always available. Raw Kitty-only rendering
  rejected: capability detection with override plus auto-degrade watchdog,
  matching the #552 tiered-renderer discipline.
- **WASM**: miniquad same-renderer build plus wasm-bindgen and web-sys
  shims for canvas sizing, input, and the web-audio unlock path. Raw-canvas
  2D and wgpu/ggez backends rejected for v1 (triple-maintained renderer
  risk; the shared-core constraint is load-bearing).
- **Audio**: engine-owned `Audio` trait (cue, tick, shutdown; never blocks
  the sim); rodio native implementation, web-audio WASM shim, null
  implementation for CI and headless runs.
- **Config/assets**: shared crates loading authored level files, theme
  palettes, keymaps, and persisted settings (native config dir; browser
  localStorage shim for WASM). A build-time validation step rejects
  missing, oversized, or misnamed assets with a clear error.

Target-gated dependencies are expected (native-only rodio/crossterm,
wasm-only web-sys shims); the workspace keeps them behind target gates so
`cargo test` on the engine needs no platform SDK.

## 4. Sources consulted

- The in-repo #552 implementation and its docs (`pacman/src/engine/`,
  `pacman/docs/verification.md`, `pacman/docs/scoreboard.md`) as the
  empirical behavior reference: ghost timing feel, renderer tier practice,
  layout engine, verify-matrix discipline.
- Public behavioral descriptions of the maze-chase genre (scatter/chase
  alternation, personality archetypes, fright chains, fruit bonuses as
  understood mechanics, not copied tables). No source code, ROMs, timing
  dumps, or data tables from any proprietary game were used; see
  `legal.md` for the clean-room log.
- Public API documentation of the selected Rust crates (macroquad,
  miniquad, ratatui, crossterm, rodio, wasm-bindgen) for capability
  assessment only.
- Rust toolchain present in this environment (stable 1.99.0) for build
  verification in later phases.
