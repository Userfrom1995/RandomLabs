# Maze Chase Phase 1: research synthesis and legal guardrails

Phase 1 build report for the Maze-Chase Rust migration (issue #582,
`maze-chase/`). The Architect's blueprint scoped this phase as mechanics
research from legitimate public sources, a clean-room legal review with
flagged items, a shared feature-matrix scaffold, an original
naming/branding/maze-authorship log, and a pinned #552 behavior reference.
All five landed as real docs; no engine or layer code was written, and by
the zero-stub rule no UI pretends otherwise.

## What was built

- `maze-chase/docs/research.md`: behavior model extracted from the #552
  reference implementation (maze geometry, tile-center movement with the
  decide-once gate, four personality target functions, wave/fright/house/
  pursuer clocks, scoring chains, mode rulesets, determinism design), the
  behavioral contract the Rust engine must meet, and the selected Rust
  stack (pure engine crate; macroquad/miniquad shared desktop/WASM
  renderer with eframe fallback; ratatui plus crossterm plus ratatui-image
  terminal; rodio plus web-audio shim behind an engine Audio trait) with
  rejected alternatives and reasons.
- `maze-chase/docs/legal.md`: complete source log (in-repo #552 behavior
  only, genre-level public descriptions, crate API docs), four flagged
  items with mitigations (maze-geometry similarity, lookalike
  sprites/sounds, cloned tables, trademarked terms), naming rationale, and
  per-phase obligations including asset-authorship recording in Phase 4.
- `maze-chase/docs/identity.md`: original identity. Title "Maze Chase"
  with the "Outrun the wardens" tagline; Pip the courier lantern against
  four wardens (Bram the leader, Kessa the ambusher, Jory the flanker, Nib
  the lurker) with hue-plus-shape reads; crumb/sunseed/relish/gatehouse
  terminology allowlist; maze authorship log committing Phase 2 to fresh
  original level files rather than copying the #552 layout.
- `maze-chase/docs/behavior-spec.md`: pinned measured contract (28x31
  grid, tunnel row 14, 282 plus 4 pickups all reachable, 8.5 tiles/s base
  speed, wave/fright/house/pursuer tables, chain scores, mode rules,
  renderer adapter contract, verification baseline). Every number was
  measured live from `pacman/src/engine/` in this run, not transcribed
  from memory.
- `maze-chase/docs/feature-matrix.md`: shared binding tracker with one row
  per mechanic across engine, terminal, desktop, and WASM columns plus
  test-proof column; every row honestly `planned` except the Phase 1
  foundations, with the review rules recorded (no gameplay branches in
  layer crates, no silent capability drops).
- `maze-chase/README.md` (unified product view with honest Phase 1
  status), `maze-chase/index.html` (Pages hub: no play button until the
  WASM layer ships in Phase 7, full doc links), `maze-chase/docs/index.md`
  (doc map).

## Key files

- `maze-chase/docs/research.md`, `legal.md`, `identity.md`,
  `behavior-spec.md`, `feature-matrix.md`, `index.md`
- `maze-chase/README.md`, `maze-chase/index.html`
- `progress/582-maze-chase-rust-migration.md` (Phase 1 checked off)

## Notes

- No `crates/` scaffold in this phase: the workspace plus pure engine
  crate is Phase 2's deliverable, and scaffolding it now would be a stub
  by definition.
- The trademarked-term flag names the forbidden words exactly once in
  `legal.md` so future contributors know what to avoid; they appear
  nowhere else in the project.
- Next: Phase 2 (shared engine core and deterministic simulation) on a
  fresh phase branch from main, referencing `Refs #582`.

- the Builder
