# Progress - Pac-Man Terminal Arcade

- **Issue:** #552 (reopened 2026-10-15: real-terminal remediation)
- **Branch:** opencode/issue552-pacman-remediation
- **Status:** in-progress
- **Updated:** 2026-10-15
- **Active Phase:** Remediation A: Ghost-Movement Freeze (Complete) -> Remediation B: Frame Clearing and Layout (active)

## Phase Roadmap

- Phase 1: Deterministic Engine Core and Maze Foundation: [x] original maze plus dot field plus tunnel plus walkability queries, [x] tile-center movement with buffered turns and cornering, [x] scoring plus lives plus level-clear loop, [x] seeded PRNG plus replay hash plus headless self-check, [x] renderer protocol spike (Kitty transmit-once plus place, Sixel path, Unicode diff) with detection draft (PR 1 target, Refs #552)
- Phase 2: Ghost Personalities and Mode Timing: [x] four chase targets plus scatter corners, [x] scatter/chase wave clock with reversals, [x] frightened mode with flash plus chain scoring plus eyes return, [x] house exit counters plus timeout, [x] tunnel slowdown plus Elroy stages (PR 2 target, Refs #552)
- Phase 3: Tiered Renderer and Capability Detection: [x] FrameBuffer plus RenderBackend interface plus cell diff, [x] Kitty backend with atlas cache, [x] Sixel backend with fps cap, [x] Unicode reference backend with sync output, [x] detect plus override plus auto-degrade watchdog (PR 3 target, Refs #552)
- Phase 4: Input Audio Menus and Shell: [x] raw-mode input with remap plus resize, [x] pluggable audio (null, bell, spawn-player synth, never blocking), [x] title plus pause/resume plus restart plus game-over flows, [x] CLI with honest flags only, [x] minimum-size handling plus crash-safe teardown (PR 4 target, Refs #552)
- Phase 5: Progression Fruit Scores Themes and Extra Modes: [x] fruit spawn/expire plus original tier values, [x] high-score table with name entry, [x] configurable controls persistence plus themes (Classic plus two originals) plus reduced-flash mode, [x] extra modes (time attack, sprint, fright-frenzy) each fully working, [x] level progression ramp to endless (PR 5 target, Refs #552)
- Final Phase: Verification Benchmarks Docs Hub and Pages: [x] full gameplay verification (transitions, collisions, power-ups, game-over, restart), [x] terminal-size plus capability plus input-method matrix, [x] perf scoreboard (FPS per backend, input latency, parity checklist) published, [x] unified docs plus README plus ideas entry integration, [x] Pages hub with instructions, controls, scoreboard, doc links (Final PR, Closes #552)

## Current step

Final Phase complete on `opencode/issue552-pacman-final-verification-scoreboard` (Closes #552): `shell/verify.py` (41-row gameplay/size/capability/input/parity matrices plus input and render benches, all headless against the real code) with CLI `--verify`/`--input-bench`/`--scoreboard`; 9 new tests, suite 277 green; `docs/verification.md` plus `docs/scoreboard.md` published with reference numbers (unicode ~875, kitty ~595, sixel ~72 fps; decode ~1.9M keys/s; sim ~25 us/tick); README/docs/hub/ideas updated. Ready for review.

Phase 5 complete and pushed on `opencode/issue552-pacman-phase-5-progression-modes` (Refs #552): `engine/fruit.py` (threshold spawns plus expiry plus tier points) plus `engine/modes.py` (four honest rulesets) integrated into `game.py` (mode param, timers, refill, sprint bonus, reasons, extended canonical); `render/themes.py` (classic/neon/amber) plus themed `scene.py` with reduced-flash and mode/fruit HUD; `shell/scores.py` (persistent top-10) plus `shell/config.py` (validated persistence) plus name-entry flow in `app.py`/`screens.py` plus 13 honest CLI flags and a fruit synth voice; 30 new tests, suite 233 green; README/docs/hub/ideas updated. Ready for review.

## Remediation (owner reopen, 2026-10-15)

Forensic pty harness (`/tmp/opencode/forensic.py`, drives the real
`shell.app.run` + ANSI emulator) confirmed all three reported defects:
- Remediation A (ghost freeze): DONE. `_move_ghost` re-snapped to the tile
  center on every near tick; 120 Hz strides are shorter than CENTER_SNAP so
  each stride was undone and every active ghost quivered 0.07 tiles off
  spawn forever. Fix: decide-once-per-tile-visit gate (`Ghost.decided`,
  cleared on reversals/leaving/revive), one-at-a-time house dot feed.
  Self-check pin resurveyed 170 -> 147 dots (live hunters intercept the
  autopilot: 1 ghost eaten, 2 deaths); 3 new regression tests.
- Remediation B (frame clearing / kitty stale placements): active.
- Remediation C (dynamic terminal-size adaptation / centering): queued.

## Next steps

- Reviewer pass on the final diff, then Tester (plus per-OS terminal runners where applicable), then Eval, then Maintainer merges with Closes #552

## Standing notes

- Builder to implement the active phase only, with real code and zero stubs
- Reserve the Design Council pass (`/oc design`) before visual polish is declared done; it ships `pacman/docs/design.md` plus `pacman/docs/design-tokens.json`
- Keep `Status: in-progress` with `Refs #552` until the final phase passes test and eval; only the final phase uses `Closes #552`

## Agent log

- 2026-10-12 (architect): charted Phase Epic from owner spec plus three subagent spikes (terminal graphics protocols, stack trade-offs, clean-room ghost-AI behavior). Selected Python 3.11+ stdlib core with Pillow optional: preinstalled everywhere, no native toolchain, Unicode path always plays, image backends upgrade where supported. Wrote unified blueprint in `ideas/2026-10-12-pacman-terminal-arcade.md` and this epic tracker. Handoff to Builder for Phase 1. - the Architect
- 2026-10-12 (builder): implemented Phase 1 on the epic branch. Engine: `pacman/src/engine/` (tuning tables, mulberry32 with SHA-256 stream splits, original 28x31 maze with 282 dots plus 4 energizers all flood-fill reachable, tile-center movement with buffered turns and tunnel wrap, 120 Hz game state with scoring/chains/extra-life/death/levels, replay hashes). Render spike: `pacman/src/render/` (backend protocol, framebuffer with dirty sets, Unicode reference with sync output, Kitty transmit/place framing, Sixel DCS framing, detection with honest Pillow degrade). Shell: `pacman/pacman.py` with `--maze-check` and `--self-check` (BFS autopilot ate 167 dots in 2400 ticks). Suite: 45 pytest cases green, including golden RNG values and 30 Hz vs 120 Hz convergence. Docs: `pacman/README.md`, `pacman/docs/index.md`, `pacman/index.html` hub, root landing entries. Notable fixes during build: spawn tiles must be walkable plain (not house interior), builtin hash() is process-salted so stream mixing uses SHA-256. - the Builder
- 2026-10-12 (builder): implemented Phase 2 on a fresh branch from main. New `pacman/src/engine/ghosts.py`: four authored personalities (chaser/ambusher/flanker/drifter) with corner scatter targets, tile-center min-distance steering with fixed tie-breaks, wave clock with reversals, fright with flash plus chains plus eyes-revive, dot-counter plus idle-timeout house exits with scripted walk-out, tunnel slowdown, Elroy stages with chase pin. `game.py` integration: fright player speedup, energizer triggers fright, house dot feed, ghost stepping with collisions, death/level resets, canonical hash covers ghosts. Suite 101 green (20 new); resurveyed seed-1 pin 167 -> 170 dots with zero deaths; CLI prints ghost stats; README/docs/hub/ideas updated. - the Builder
- 2026-10-12 (builder): implemented Phase 3 on a fresh branch from main. New `pacman/src/render/atlas.py` (original Pillow-rasterized sprites, cached) plus `scene.py` (one 28x34 painter feeding every backend: HUD, box-drawn walls, dots, blinking energizers, directional player, fright/flash/eyes ghosts). Full `KittyBackend` (transmit-once atlas, cursor-anchored placements, text fallback) and `SixelBackend` (dirty-region raster, bounded palette, genuine band RLE, 10 fps coalescing cap, injectable clock). New `manager.py` `TieredRenderer` (detect chain, error plus slow-frame watchdog, never-raising present). CLI `--render-check`/`--render-bench`; suite 135 green (21 new); README/docs/hub/ideas updated. - the Builder
- 2026-10-12 (builder): implemented Phase 4 on a fresh branch from main. New `pacman/src/shell/input.py` (byte decoder with partial-escape holds, validated remappable Keymap incl. restart) plus `terminal.py` (RawTerminal with guaranteed restore, non-blocking reads, size guard) plus `screens.py` (title/pause/over/too-small FrameBuffer cards) plus `app.py` (flow machine with pause-freeze plus fixed-timestep frame loop with finally-teardown) plus `audio.py` (null/bell/original-PCM-synth backends, daemon-thread spawn, honest degrade). CLI `--play`/`--audio`/`--bind`/`--keys`/`--fps`; `TieredRenderer.shutdown` pass-through. Suite 188 green (43 new, incl. real-pty restore test and scripted headless playthrough); README/docs/hub/ideas updated. - the Builder
- 2026-10-12 (builder): Phase 5 engine half: new `engine/fruit.py` (spawn at 70/170 dots, 9.5 s expiry, tier points, canonical) and `engine/modes.py` (classic/time-attack/sprint/fright-frenzy with real modifiers); `game.py` gains mode param, per-mode lives/speeds/fright, sprint no-fright plus par bonus plus clear-to-win, time-attack countdown plus maze refill, defeat/timeout/clear reasons, fruit pickup/expiry events, extended canonical; `Ghosts` gains mode speed multiplier; `tuning.level_summary` exposes the endless ramp. Suite 203 green. - the Builder
- 2026-10-12 (builder): completed Phase 5 on the same branch. New `render/themes.py` (classic/neon/amber originals) with themed `scene.py` (mode clocks, fruit glyph, reduced-flash steadiness); new `shell/scores.py` (persistent top-10) plus `shell/config.py` (validated persistence); name-entry flow in `app.py`/`screens.py` with reason headlines; 13 honest CLI flags plus fruit synth voice; fixed `--save-config` standalone no-op found by the new tests. Suite 233 green (30 new); README/docs/hub/ideas updated with zero milestone leakage. - the Builder
- 2026-10-12 (builder): completed the Final Phase on a fresh branch from main. New `pacman/src/shell/verify.py` (41-row gameplay/size/capability/input/parity matrices plus input and render benches, all headless against the real code) with CLI `--verify`/`--input-bench`/`--scoreboard`; new `pacman/docs/verification.md` plus `pacman/docs/scoreboard.md` with reference numbers (unicode ~875, kitty ~595, sixel ~72 fps; decode ~1.9M keys/s; sim ~25 us/tick vs the 8,333 us 120 Hz budget); README/docs/hub/ideas updated. Suite 277 green (9 new, matrix counts pinned). - the Builder
