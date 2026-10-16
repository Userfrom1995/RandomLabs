# Progress - Maze-Chase Rust Migration

- **Issue:** #582 (parent tracker; gameplay reference #552 stays functional until replacement is verified)
- **Branch:** opencode/issue582-20261016091213
- **Status:** in-progress
- **Updated:** 2026-10-16
- **Active Phase:** Phase 2: Shared Engine Core and Deterministic Simulation (Complete, ready for review)

## Phase Roadmap

- Phase 1: Research Synthesis and Legal Guardrails: [x] mechanics research from legitimate public sources, [x] clean-room legal review with flagged items, [x] shared feature-completeness matrix scaffolded in docs, [x] original naming plus branding plus maze-geometry authorship log, [x] #552 behavior reference spec pinned (PR 1 target, Refs #582)
- Phase 2: Shared Engine Core and Deterministic Simulation: [x] Cargo workspace plus pure engine crate, [x] maze plus movement plus collision plus tunnel, [x] scoring plus lives plus level-clear loop, [x] seeded RNG plus replay hash plus headless verify harness (PR 2 target, Refs #582)
- Phase 3: Ghost Intelligence Scoring and Progression: [ ] four authored personalities plus scatter corners, [ ] scatter/chase wave clock with reversals, [ ] fright with flash plus chains plus eyes return, [ ] house exits plus tunnel clamp plus pursuer stages, [ ] bonus items plus difficulty ramp plus extra modes rules (PR 3 target, Refs #582)
- Phase 4: Original Assets Audio and Identity System: [ ] original sprites plus animations plus themes, [ ] original sound effects plus music plus audio trait impls, [ ] settings plus keymap plus persistence model, [ ] Design Council pass with design.md plus tokens (PR 4 target, Refs #582)
- Phase 5: Terminal Publication Layer: [ ] fullscreen canvas layout plus scale engine, [ ] Kitty plus Sixel plus Unicode backends with detection and watchdog, [ ] dynamic resize with re-layout, [ ] menus plus help plus scores plus settings screens, [ ] installable package plus launch command plus docs (PR 5 target, Refs #582)
- Phase 6: Desktop Publication Layer: [ ] windowed plus fullscreen GUI on one renderer core, [ ] keyboard plus gamepad input with remap, [ ] menus plus settings plus scores plus audio controls, [ ] Windows plus macOS plus Linux packaging with reproducible steps (PR 6 target, Refs #582)
- Phase 7: WebAssembly Publication Layer and Web Hub: [ ] browser-playable WASM build on same renderer core, [ ] keyboard plus touch controls with mobile polish, [ ] DPR-aware resize plus web-audio unlock, [ ] maze-chase index.html hub with play entry plus per-layer docs (PR 7 target, Refs #582)
- Final Phase: Packaging Verification and Release Audit: [ ] desktop packages plus terminal package plus WASM deploy shipped, [ ] engine plus per-layer E2E green (terminal sizes/capabilities, desktop OSes, browser keyboard/touch), [ ] reproducible build/release instructions, [ ] matrix plus scoreboard plus test results published, [ ] #552 retirement only after verified parity (Final PR, Closes #582)

## Current step

Phase 2 complete on `opencode/issue582-20261016091213` (Refs #582):
`maze-chase/Cargo.toml` workspace plus `maze-chase/crates/engine`
(zero-dependency: tuning, maze with `include_str!` level loading,
actors, steering trait with wander baseline plus greedy helper, ghosts
with house exits/fright/chains/collisions, game state machine, mulberry32
streams bit-exact with the reference port, hand-rolled SHA-256 pinned by
FIPS vectors, replay log, 12-row verify harness with binary),
`maze-chase/levels/ember-warren.maze` (original authored layout, 445+4,
flood-fill proof in header), `tests/golden.rs` (pinned hashes),
`ideas/2026-10-16-maze-chase-phase-2-engine.md`, matrix engine rows to
`done`, README/hub status to Phase 2. Proof: 23 unit + 2 golden green,
`maze-chase-verify` 12/12, 0.7 us/tick, zero warnings. Ready for review.

## Next steps

- Reviewer pass on the Phase 2 engine, then Phase 3 (ghost intelligence,
  scoring chains polish, wave clock, fright flash, eyes, relishes,
  pursuer stages, extra modes) on a fresh phase branch from main
  referencing `Refs #582`
- Reserve the Design Council pass (`/oc design`) in Phase 4 before visual polish is declared done; it ships `maze-chase/docs/design.md` plus `maze-chase/docs/design-tokens.json`
- Keep `Status: in-progress` with `Refs #582` until the final phase passes test and eval; only the final phase uses `Closes #582`

## Standing notes

- Builder implements the active phase only, with real code and zero stubs; features planned for later phases MUST NOT appear as dummy buttons or placeholder banners in earlier phases
- One shared engine: any gameplay branch in a layer crate is a blocking review finding
- Every matrix row needs test proof; unavoidable limitations are documented, never silently dropped
- Every merge leaves repo and workflows green

## Agent log

- 2026-10-16 (architect): charted Phase Epic from the owner order plus three subagent spikes (Rust stack trade-offs, module decomposition, legal and matrix planning). Selected pure-Rust engine with macroquad/miniquad shared renderer (eframe fallback), ratatui plus crossterm terminal with image-plus-Unicode tiers, rodio plus web-audio shim behind an engine Audio trait. Wrote unified blueprint in `ideas/2026-10-16-maze-chase-rust-migration.md` and this epic tracker. Handoff to Builder for Phase 1. - the Architect
- 2026-10-16 (builder): implemented Phase 1 on the epic branch. New `maze-chase/docs/` (research with the #552-feel basis and crate trade-offs, legal with source log plus four flagged mitigations, identity with the Pip-vs-wardens cast and maze authorship log, behavior-spec with live-measured #552 values, feature-matrix with every row honestly planned, index map) plus `maze-chase/README.md` and `maze-chase/index.html` hub (honest Phase 1 status, no play button until Phase 7) plus `ideas/2026-10-16-maze-chase-phase-1-research.md` plus root landing entries. No `crates/` scaffold (Phase 2's deliverable). Delegation ledger: no subagents (docs-only phase synthesizing in-repo sources the primary had already read: tuning.py, ghosts.py, game.py, maze.py, modes.py, plus live measurement runs; only known skill customize-opencode covers opencode config, not game docs). Primary verified itself by measuring every pinned value from the real code. - the Builder
- 2026-10-16 (builder): implemented Phase 2 on the epic branch. New `maze-chase/Cargo.toml` workspace plus `maze-chase/crates/engine` (zero-dep lib: tuning/maze/actors/steering/ghosts/game/rng/sha256/replay/verify, `maze-chase-verify` binary, golden tests) plus `maze-chase/levels/ember-warren.maze` (original 28x31 layout, 445+4, flood-fill proof) plus `ideas/2026-10-16-maze-chase-phase-2-engine.md`; matrix engine rows to done, README/hub to honest Phase 2 status. Proof: 23 unit + 2 golden green, verify 12/12, 0.7 us/tick, zero warnings. Notable catches: f32 STEP widening would have starved the tick loop (f64 accounting), Python-mulberry32 middle-step overflow quirk replicated bit-exact, `#`-comment filter collided with wall rows (narrowed predicate). Delegation ledger: no subagents (single-crate engine the primary authored directly; only known skill customize-opencode covers opencode config, not game code). - the Builder
