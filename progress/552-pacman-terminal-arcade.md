# Progress - Pac-Man Terminal Arcade

- **Issue:** #552
- **Branch:** opencode/issue552-20261012113721
- **Status:** in-progress
- **Updated:** 2026-10-12T00:00:00Z
- **Active Phase:** Phase 1: Deterministic Engine Core and Maze Foundation

## Phase Roadmap

- Phase 1: Deterministic Engine Core and Maze Foundation: [ ] original maze plus dot field plus tunnel plus walkability queries, [ ] tile-center movement with buffered turns and cornering, [ ] scoring plus lives plus level-clear loop, [ ] seeded PRNG plus replay hash plus headless self-check, [ ] renderer protocol spike (Kitty transmit-once plus place, Sixel path, Unicode diff) with detection draft (PR 1 target, Refs #552)
- Phase 2: Ghost Personalities and Mode Timing: [ ] four chase targets plus scatter corners, [ ] scatter/chase wave clock with reversals, [ ] frightened mode with flash plus chain scoring plus eyes return, [ ] house exit counters plus timeout, [ ] tunnel slowdown plus Elroy stages (PR 2 target, Refs #552)
- Phase 3: Tiered Renderer and Capability Detection: [ ] FrameBuffer plus RenderBackend interface plus cell diff, [ ] Kitty backend with atlas cache, [ ] Sixel backend with fps cap, [ ] Unicode reference backend with sync output, [ ] detect plus override plus auto-degrade watchdog (PR 3 target, Refs #552)
- Phase 4: Input Audio Menus and Shell: [ ] raw-mode input with remap plus resize, [ ] pluggable audio (null, bell, spawn-player synth, never blocking), [ ] title plus pause/resume plus restart plus game-over flows, [ ] CLI with honest flags only, [ ] minimum-size handling plus crash-safe teardown (PR 4 target, Refs #552)
- Phase 5: Progression Fruit Scores Themes and Extra Modes: [ ] fruit spawn/expire plus original tier values, [ ] high-score table with name entry, [ ] configurable controls persistence plus themes (Classic plus two originals) plus reduced-flash mode, [ ] extra modes (time attack, sprint, fright-frenzy) each fully working, [ ] level progression ramp to endless (PR 5 target, Refs #552)
- Final Phase: Verification Benchmarks Docs Hub and Pages: [ ] full gameplay verification (transitions, collisions, power-ups, game-over, restart), [ ] terminal-size plus capability plus input-method matrix, [ ] perf scoreboard (FPS per backend, input latency, parity checklist) published, [ ] unified docs plus README plus ideas entry integration, [ ] Pages hub with instructions, controls, scoreboard, doc links (Final PR, Closes #552)

## Current step

Ready for initial build (Phase 1: Deterministic Engine Core and Maze Foundation)

## Next steps

- Builder to implement Phase 1: Deterministic Engine Core and Maze Foundation with real code and zero stubs
- Reserve the Design Council pass (`/oc design`) before visual polish is declared done; it ships `pacman/docs/design.md` plus `pacman/docs/design-tokens.json`
- Keep `Status: in-progress` with `Refs #552` until the final phase passes test and eval; only the final phase uses `Closes #552`

## Agent log

- 2026-10-12 (architect): charted Phase Epic from owner spec plus three subagent spikes (terminal graphics protocols, stack trade-offs, clean-room ghost-AI behavior). Selected Python 3.11+ stdlib core with Pillow optional: preinstalled everywhere, no native toolchain, Unicode path always plays, image backends upgrade where supported. Wrote unified blueprint in `ideas/2026-10-12-pacman-terminal-arcade.md` and this epic tracker. Handoff to Builder for Phase 1. - the Architect
