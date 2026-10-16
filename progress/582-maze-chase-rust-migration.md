# Progress - Maze-Chase Rust Migration

- **Issue:** #582 (parent tracker; gameplay reference #552 stays functional until replacement is verified)
- **Branch:** opencode/issue582-20261016085929
- **Status:** in-progress
- **Updated:** 2026-10-16
- **Active Phase:** Phase 1: Research Synthesis and Legal Guardrails

## Phase Roadmap

- Phase 1: Research Synthesis and Legal Guardrails: [ ] mechanics research from legitimate public sources, [ ] clean-room legal review with flagged items, [ ] shared feature-completeness matrix scaffolded in docs, [ ] original naming plus branding plus maze-geometry authorship log, [ ] #552 behavior reference spec pinned (PR 1 target, Refs #582)
- Phase 2: Shared Engine Core and Deterministic Simulation: [ ] Cargo workspace plus pure engine crate, [ ] maze plus movement plus collision plus tunnel, [ ] scoring plus lives plus level-clear loop, [ ] seeded RNG plus replay hash plus headless verify harness (PR 2 target, Refs #582)
- Phase 3: Ghost Intelligence Scoring and Progression: [ ] four authored personalities plus scatter corners, [ ] scatter/chase wave clock with reversals, [ ] fright with flash plus chains plus eyes return, [ ] house exits plus tunnel clamp plus pursuer stages, [ ] bonus items plus difficulty ramp plus extra modes rules (PR 3 target, Refs #582)
- Phase 4: Original Assets Audio and Identity System: [ ] original sprites plus animations plus themes, [ ] original sound effects plus music plus audio trait impls, [ ] settings plus keymap plus persistence model, [ ] Design Council pass with design.md plus tokens (PR 4 target, Refs #582)
- Phase 5: Terminal Publication Layer: [ ] fullscreen canvas layout plus scale engine, [ ] Kitty plus Sixel plus Unicode backends with detection and watchdog, [ ] dynamic resize with re-layout, [ ] menus plus help plus scores plus settings screens, [ ] installable package plus launch command plus docs (PR 5 target, Refs #582)
- Phase 6: Desktop Publication Layer: [ ] windowed plus fullscreen GUI on one renderer core, [ ] keyboard plus gamepad input with remap, [ ] menus plus settings plus scores plus audio controls, [ ] Windows plus macOS plus Linux packaging with reproducible steps (PR 6 target, Refs #582)
- Phase 7: WebAssembly Publication Layer and Web Hub: [ ] browser-playable WASM build on same renderer core, [ ] keyboard plus touch controls with mobile polish, [ ] DPR-aware resize plus web-audio unlock, [ ] maze-chase index.html hub with play entry plus per-layer docs (PR 7 target, Refs #582)
- Final Phase: Packaging Verification and Release Audit: [ ] desktop packages plus terminal package plus WASM deploy shipped, [ ] engine plus per-layer E2E green (terminal sizes/capabilities, desktop OSes, browser keyboard/touch), [ ] reproducible build/release instructions, [ ] matrix plus scoreboard plus test results published, [ ] #552 retirement only after verified parity (Final PR, Closes #582)

## Current step

Ready for initial build (Phase 1: Research Synthesis and Legal Guardrails)

## Next steps

- Builder to implement Phase 1 with real research notes, real legal log, and a real matrix scaffold; no code stubs for later phases
- Reserve the Design Council pass (`/oc design`) in Phase 4 before visual polish is declared done; it ships `maze-chase/docs/design.md` plus `maze-chase/docs/design-tokens.json`
- Keep `Status: in-progress` with `Refs #582` until the final phase passes test and eval; only the final phase uses `Closes #582`

## Standing notes

- Builder implements the active phase only, with real code and zero stubs; features planned for later phases MUST NOT appear as dummy buttons or placeholder banners in earlier phases
- One shared engine: any gameplay branch in a layer crate is a blocking review finding
- Every matrix row needs test proof; unavoidable limitations are documented, never silently dropped
- Every merge leaves repo and workflows green

## Agent log

- 2026-10-16 (architect): charted Phase Epic from the owner order plus three subagent spikes (Rust stack trade-offs, module decomposition, legal and matrix planning). Selected pure-Rust engine with macroquad/miniquad shared renderer (eframe fallback), ratatui plus crossterm terminal with image-plus-Unicode tiers, rodio plus web-audio shim behind an engine Audio trait. Wrote unified blueprint in `ideas/2026-10-16-maze-chase-rust-migration.md` and this epic tracker. Handoff to Builder for Phase 1. - the Architect
