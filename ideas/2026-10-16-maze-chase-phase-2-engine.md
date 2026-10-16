# Maze Chase Phase 2: Shared Engine Core and Deterministic Simulation

## What was built

One zero-dependency Rust simulation crate (`maze-chase/crates/engine`,
crate `maze-chase-engine` v0.2.0) plus the authored launch maze
(`maze-chase/levels/ember-warren.maze`) and a headless verify harness.
No layer code: terminal, desktop, and WASM arrive in Phases 5-7, and by
the zero-stub rule nothing in this phase pretends otherwise.

## Why this shape

- **One engine, no triple-maintained logic.** Every gameplay rule lives in
  the engine; layers will map input to `TickInput` and render `Game`
  state plus event strings. `add_score` is `pub(crate)` so only the
  in-crate verify harness can stage scores, never a layer.
- **Zero dependencies.** No crates.io surface to audit, no version drift
  between desktop and WASM builds, deterministic everywhere. SHA-256 and
  mulberry32 are hand-rolled and pinned by vectors.
- **Level files, not level code.** The maze compiles in through
  `include_str!`: authors edit `levels/*.maze` (with authorship headers),
  the engine stays filesystem-free and WASM-safe, and later phases reuse
  the same `Maze::from_rows` loader.
- **Trait boundary for Phase 3.** `Steer::choose` separates steering from
  the core loop; the Phase 2 `WanderSteering` baseline plus the shared
  `greedy_exit` helper mean personalities plug in without touching
  movement, collision, or timing code.

## How it works

- `tuning.rs`: every authored number (120 Hz, 8.5 tiles/s base, speed
  curves, fright table, 200/400/800/1600 chains, house counters easing to
  a floor, 3 lives, 1.4 s death, 2.0 s clear, 0.35 turn window, 0.55
  touch distance). Values match the behavior-spec pins; provenance notes
  point at the in-repo feel reference without transcribing it.
- `maze.rs`: `Maze::new` loads the launch maze; walkability (ghost-only
  door/interior, wrapping tunnel mouths), tunnel stretches, pickup eating
  with counts, raw field bytes for hashing, flood-fill reachability.
- `actors.rs`: continuous tile-center movement, instant reversal,
  buffered perpendicular turns with corner-cut snap, wall glide-and-halt,
  tunnel wrap gated on continuous position (wrapping early breaks
  rightward travel; `% WIDTH` folds float absorption at the edge).
- `steering.rs`: `WanderSteering` (uniform-random non-reversing exit from
  the `wander` stream, Up/Left/Down/Right ties) plus `greedy_exit`
  (squared-Euclidean, same tie order) ready for Phase 3.
- `ghosts.rs`: Bram starts active at the mouth; Kessa, Jory, Nib wait on
  per-level counters with a 4 s idle release, then walk y-first/x-second
  through the door on a scripted path. Fright timer with chain index,
  tunnel and fright slowdowns, eat-vs-death collision priority, eaten
  wardens back at the mouth after 4 s (Phase 3 swaps in drifting eyes).
- `game.rs`: `Game::step` (f64 accumulator, 0.5 s spiral clamp) and
  `Game::tick` (Play/Dying/Clearing/Over, pickup, house clock, warden
  step, collisions, clear check), spare wick once at 10,000, canonical
  state string with fixed-precision floats, SHA-256 hash.
- `rng.rs`: mulberry32 streams forked by `seed XOR sha256(name)[..4]`
  through splitmix32; new consumers never shift existing streams.
- `replay.rs`: record intents, re-simulate, compare hashes.
- `verify.rs` + `maze-chase-verify` binary: 12 matrix rows as code.
- `tests/golden.rs`: pinned 1200-tick hash plus cross-level divergence.

## Key files

- `maze-chase/Cargo.toml`, `maze-chase/crates/engine/{Cargo.toml,src/*.rs,src/bin/verify.rs,tests/golden.rs}`
- `maze-chase/levels/ember-warren.maze`
- `maze-chase/docs/feature-matrix.md` (engine rows done), `identity.md`
  (Ember Warren authorship), `README.md`, `index.html` (honest Phase 2)

## Verification notes

- `cargo test`: 23 unit + 2 golden green. `cargo run --bin
  maze-chase-verify`: 12/12 green, 0.7 us/tick (budget 8,333 us).
- Three real bugs caught during the build: f32 `STEP` widens above f64
  `1/120` and would have starved the tick loop (f64 accounting now, with
  a comment); the reference mulberry32 leaks bit 32 of its middle sum
  through unbounded ints (replicated bit-exact via a u64 middle step,
  proven by cross-implementation vectors); the `#`-comment level filter
  ate wall rows (narrowed to `#`/`# `-prefixed prose).
- SHA-256 round table derived from first principles (integer cube roots)
  and confirmed by FIPS vectors; an early from-memory draft was wrong
  and the vectors caught it before it could spread into fork mixing.

## Open questions for later phases

- Phase 3: personalities, wave clock with reversals, flash staging, eyes,
  relishes, pursuer stages, extra modes. The `Steer` trait and the
  `WardenState` shape are ready; `CENTER_SNAP` documents the decision-gate
  detail the personality pass must honor.
- The launch maze plays long (449 pickups vs the reference 282+4): an
  original layout, deliberately, with the count in its header. Later
  level sets can tune par length; the loader already supports them.
