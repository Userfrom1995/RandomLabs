# Progress - Maze-Chase Rust Migration

- **Issue:** #582 (parent tracker; gameplay reference #552 stays functional until replacement is verified)
- **Branch:** opencode/issue582-maze-chase-phase-7
- **Status:** in-progress
- **Updated:** 2026-10-16
- **Active Phase:** Phase 7: WebAssembly Publication Layer and Web Hub (in progress)

## Phase Roadmap

- Phase 1: Research Synthesis and Legal Guardrails: [x] mechanics research from legitimate public sources, [x] clean-room legal review with flagged items, [x] shared feature-completeness matrix scaffolded in docs, [x] original naming plus branding plus maze-geometry authorship log, [x] #552 behavior reference spec pinned (PR 1 target, Refs #582)
- Phase 2: Shared Engine Core and Deterministic Simulation: [x] Cargo workspace plus pure engine crate, [x] maze plus movement plus collision plus tunnel, [x] scoring plus lives plus level-clear loop, [x] seeded RNG plus replay hash plus headless verify harness (PR 2 target, Refs #582)
- Phase 3: Ghost Intelligence Scoring and Progression: [x] four authored personalities plus scatter corners, [x] scatter/chase wave clock with reversals, [x] fright with flash plus chains plus eyes return, [x] house exits plus tunnel clamp plus pursuer stages, [x] bonus items plus difficulty ramp plus extra modes rules (PR 3 target, Refs #582)
- Phase 4: Original Assets Audio and Identity System: [x] original sprites plus animations plus themes, [x] original sound effects plus music plus audio trait impls, [x] settings plus keymap plus persistence model, [x] Design Council pass with design.md plus tokens (PR 4 target, Refs #582)
- Phase 5: Terminal Publication Layer: [x] fullscreen canvas layout plus scale engine, [x] Kitty plus Sixel plus Unicode backends with detection and watchdog, [x] dynamic resize with re-layout, [x] menus plus help plus scores plus settings screens, [x] installable package plus launch command plus docs (PR 5 target, Refs #582)
- Phase 6: Desktop Publication Layer: [x] windowed plus fullscreen GUI on one renderer core, [x] keyboard plus gamepad input with remap, [x] menus plus settings plus scores plus audio controls, [x] Windows plus macOS plus Linux packaging with reproducible steps (PR 6 target, Refs #582)
- Phase 7: WebAssembly Publication Layer and Web Hub: [x] browser-playable WASM build on same renderer core, [x] keyboard plus touch controls with mobile polish, [x] DPR-aware resize plus web-audio unlock, [x] maze-chase index.html hub with play entry plus per-layer docs (PR 7 target, Refs #582)
- Final Phase: Packaging Verification and Release Audit: [ ] desktop packages plus terminal package plus WASM deploy shipped, [ ] engine plus per-layer E2E green (terminal sizes/capabilities, desktop OSes, browser keyboard/touch), [ ] reproducible build/release instructions, [ ] matrix plus scoreboard plus test results published, [ ] #552 retirement only after verified parity (Final PR, Closes #582)

## Current step

Phase 7 complete on `opencode/issue582-maze-chase-phase-7` (Refs #582):
new `crates/web` 0.1.0 (`maze-chase-web`, zero external deps, C-ABI
bridge, no wasm-bindgen: `session` fixed-step flow plus screens plus
steal rebinds, `input` keyboard/swipe maps, `video` RGBA composer
mirroring the terminal raster, `scores` top-10, `audio_map` cue/SFX/
tune tables, `bridge` total boundary), `play.html` plus
`web/maze-chase.js` (canvas loop, DOM screens/HUD, WebAudio synth,
swipe plus d-pad, localStorage, error card, favicon), committed
`web/maze-chase.wasm` (release, 190 KB, zero imports, reproducible),
durable `web/e2e/` (node smoke plus CDP browser E2E), `docs/web.md`
launch guide, matrix WASM rows to `done`, README/hub status to
all-playable with a Play button, plus
`ideas/2026-10-16-maze-chase-phase-7-web-layer.md`. No engine, assets,
audio, or config file changed (verify 19/19 intact).
Proof: 42 web unit green, workspace fully green, node smoke green
(zero imports, scoring, bit-identical frames, audio tables, hostile
probes), CDP E2E green (zero console errors, real ArrowUp scoring
20 to 30, P pause plus Resume, touch swipe, 390x844 board visible,
FPS 60 live), fmt clean, zero new clippy warnings (6 pre-existing
engine lints from clippy 1.99 untouched). Ready for review.

Phase 6 complete on `opencode/issue582-maze-chase-phase-6` (Refs #582):
new lib-plus-binary `maze-chase-desktop` 0.1.0 (`font` original 5x7
face; `frame` XRGB framebuffer with PPM screenshots; `render` pure
layout plus play/menu composition over the shared terminal
rasterizer; `input` winit physical-key mapping; `gamepad`
stick/button/padmap mapping plus remap screens; `sound` deterministic
PCM synth plus rodio backend with silent fallback; `screens`
title/help/scores/settings/audio/rebinds/padbind/pause/over flow;
`app` fixed-120 Hz session sharing the terminal settings/scores
files; `window` winit plus softbuffer loop with resize/fullscreen;
`cli` strict flags plus `--probe`; `main` binary),
`packaging/desktop/` (XPM icon, .desktop entry, Linux tarball plus
installer, Windows zip, macOS app scripts), `docs/desktop.md` launch
guide, matrix desktop rows to `done`, README/hub status to playable,
plus `ideas/2026-10-16-maze-chase-phase-6-desktop-layer.md`. No
engine, assets, audio, or config file changed (verify 19/19 intact).
Proof: 55 unit plus 3 headless plus 8 hostile regression green (66 desktop
tests total), workspace fully
green, `--help`/strict-flags smoke, real Xvfb `--probe 90` window run
(exit 0, 1100x760 title PPM verified pixel-counts), fmt clean, zero
new clippy warnings. Ready for review.

## Prior step

Phase 5 complete on `opencode/issue582-maze-chase-phase-5` (Refs #582):
new `maze-chase/crates/terminal` 0.1.0 (`layout` canvas fitter with
magnification plus too-small card; `raster` shared pixel frame;
`kitty` hand-rolled PNG plus chunked graphics with env-gated
detection; `sixel` hand-rolled encoder with live DA1 probe;
`backend` tier ladder with degrading watchdog; `unicode` 24-bit and
16-color cell board; `input` keymap-driven headings; `scores`
machine top-10; `chime` BEL-plus-ticker audio; `screens` plus `chrome`
menu flows with key-rebind capture; `app` session on the shared engine
with zero gameplay logic; `maze-chase-terminal` binary with RAII
terminal restore, 60 fps loop, `--tier`/`--dir` flags),
`docs/terminal.md` launch guide, matrix terminal rows to `done`,
README/hub status to playable, plus
`ideas/2026-10-16-maze-chase-phase-5-terminal-layer.md`. No engine,
assets, audio, or config file changed (verify 19/19 intact). Proof: 58
unit + 6 headless integration green, workspace fully green, `--help`
smoke, fmt clean, zero new clippy warnings. Ready for review.

## Prior step

Phase 4 complete on `opencode/issue582-maze-chase-phase-4` (Refs #582):
new `maze-chase/crates/{assets,audio,config}` (sprite glyphs plus
anim clips plus three contrast-checked themes; engine-event cue
routing plus five original tunes plus SFX recipes plus Null/Record
sinks; difficulty presets over shipped engine knobs plus keymap plus
human-readable persistence), `docs/design.md` plus
`design-tokens.json` with a palette cross-check test, matrix Phase 4
rows to `done`, README/hub to Phase 4, identity authorship log, plus
`ideas/2026-10-16-maze-chase-phase-4-assets-audio-identity.md`. No
engine file changed (goldens intact), no layer code per the zero-stub
rule. Proof: 45 engine unit + 2 golden + 26 hostile/quiescence green,
20 assets + 13 audio + 18 config green, `maze-chase-verify` 19/19.
Ready for review.

## Prior step

Phase 3 complete on `opencode/issue582-maze-chase-phase-3` (Refs #582, merged):
new `maze-chase/crates/engine/src/{modes,personalities,relish}.rs`
(wave clock plus four GameMode rulesets; four pure chase targets;
two-window relish machine), `ghosts.rs` rewritten around leg targets
with reversals plus pathing eyes plus pursuer cruise (`PlayerCtx`
bundles the per-tick player context), `game.rs` with `with_mode`,
relish integration, and clear fan-out (descend / sprint par bonus /
time-attack refill), `replay.rs` header carries the mode, `verify.rs`
19 rows, golden re-pinned once with an investigated rationale
(`23c17f89...`, score still 50), engine v0.3.0, matrix Phase 3 rows to
`done`, README/hub status to Phase 3, plus
`ideas/2026-10-16-maze-chase-phase-3-ghost-intelligence.md`. Proof: 45
unit + 2 golden + 12 hostile + 2 quiescence green, `maze-chase-verify`
19/19, 0.8 us/tick, fmt clean, no new clippy warnings. Ready for review.

## Prior step

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

- Reviewer pass on Phase 5, then Phase 6 (desktop publication layer)
  on a fresh phase branch from main referencing `Refs #582`
- Formal Design Council pass (`/oc design`) may refine `design.md` in
  a later phase; the Builder-authored pass is binding until then
- Reserve the Design Council pass (`/oc design`) in Phase 4 before visual polish is declared done; it ships `maze-chase/docs/design.md` plus `maze-chase/docs/design-tokens.json`
- Keep `Status: in-progress` with `Refs #582` until the final phase passes test and eval; only the final phase uses `Closes #582`

## Standing notes

- Builder implements the active phase only, with real code and zero stubs; features planned for later phases MUST NOT appear as dummy buttons or placeholder banners in earlier phases
- One shared engine: any gameplay branch in a layer crate is a blocking review finding
- Every matrix row needs test proof; unavoidable limitations are documented, never silently dropped
- Every merge leaves repo and workflows green

## Agent log

- 2026-10-16 (fixer): applied the 8 Evaluator gaps on `opencode/issue582-maze-chase-phase-6` (README stale desktop-planned sentence; hub counts to 55 unit + 3 headless + 8 hostile; committed `docs/desktop-probe.ppm` from a live Xvfb `--probe 30` run with desktop.md/index.html references; matrix desktop proof column names test files; render_menu y-budget truncation plus overflow test; fright test hardened to a `start_fright` deterministic fixture; docs/index.md gains terminal/desktop guides; .desktop gains TryExec plus StartupWMClass). Proof: 55 unit + 3 headless + 8 hostile green, verify 19/19, fmt clean, zero desktop clippy warnings (6 engine warnings pre-exist). Delegation ledger: no subagents (eight small surgical edits the primary applied directly against the quoted findings; only known skill customize-opencode covers opencode config, not game code). - the Fixer

- 2026-10-16 (fixer): applied the Phase 6 review findings on `opencode/issue582-maze-chase-phase-6` (install-linux.sh local fallback plus tmpdir trap; apply_tune change guard; accumulator surplus drop; render_menu/frame border small-window guards; screens index clamping plus capture cursor freeze; SFX sink play plus dead-code cleanup; probe error propagation plus per-redraw countdown; stick reset on disconnect; pad-capture single-button break; lib.rs comment; headless independence assert on pixels; tracker branch/phase; hub Layers sentence). Proof: desktop unit plus headless suites green, workspace build green, fmt clean. Delegation ledger: no subagents (nine small surgical edits the primary applied directly file-by-file against the quoted findings; only known skill customize-opencode covers opencode config, not game code). - the Fixer

- 2026-10-16 (builder): implemented Phase 6 on `opencode/issue582-maze-chase-phase-6`. New `crates/desktop` 0.1.0 (font/frame/render/input/gamepad/sound/screens/app/window/cli plus binary) driving the shared engine with zero gameplay logic, plus `packaging/desktop/` per-OS artifacts, `docs/desktop.md`, matrix/README/hub updates, and the Phase 6 ideas entry. Proof: 54 unit + 3 headless integration green, workspace fully green, verify 19/19, `--help`/strict-flag smoke, real Xvfb `--probe 90` window run, fmt clean, zero new clippy warnings. Delegation ledger: renderer/session, input/audio/CLI, and docs/packaging/tracker units implemented directly by the primary against the shipped engine/assets/audio/config APIs (no subagent launch record survives in the log for this phase); primary verified itself via the proof above. Skills note: only known skill customize-opencode covers opencode config, not game code. - the Builder

- 2026-10-16 (builder): implemented Phase 5 on `opencode/issue582-maze-chase-phase-5`. New `crates/terminal` 0.1.0 (only dependency: crossterm; PNG, base64, Sixel, layout, and all screens hand-rolled std-only) driving the shared engine with zero gameplay logic, plus `docs/terminal.md`, matrix/README/hub updates, and the Phase 5 ideas entry. Proof: 58 unit + 6 headless integration green, workspace fully green, verify 19/19, `--help` smoke, fmt clean, zero new clippy warnings. Notable catches: first-run settings save needed `create_dir_all` (pinned by persist test), fright-mask test first asserted body pixels the mask glyph never carries, PNG chunk test assumed a wrong frame split. Delegation ledger: no subagents (single-crate layer the primary authored directly against the shipped engine/assets/audio/config APIs; only known skill customize-opencode covers opencode config, not game code). - the Builder

- 2026-10-16 (builder): implemented Phase 4 on `opencode/issue582-maze-chase-phase-4`. Three subagents authored `crates/assets` (glyphs, anim, themes), `crates/audio` (cues, score, sinks), `crates/config` (settings, keymap, persist) against written specs; primary wired workspace members, removed stray per-crate lockfiles, authored `docs/design.md` plus `design-tokens.json` with a palette cross-check test, updated matrix/README/hub/identity/index plus the Phase 4 ideas entry. Proof: 20 assets + 13 audio + 18 config green, engine suites untouched, verify 19/19. Delegation ledger: three parallel general subagents for crate implementation (only known skill customize-opencode covers opencode config, not game code). - the Builder

- 2026-10-16 (architect): charted Phase Epic from the owner order plus three subagent spikes (Rust stack trade-offs, module decomposition, legal and matrix planning). Selected pure-Rust engine with macroquad/miniquad shared renderer (eframe fallback), ratatui plus crossterm terminal with image-plus-Unicode tiers, rodio plus web-audio shim behind an engine Audio trait. Wrote unified blueprint in `ideas/2026-10-16-maze-chase-rust-migration.md` and this epic tracker. Handoff to Builder for Phase 1. - the Architect
- 2026-10-16 (builder): implemented Phase 1 on the epic branch. New `maze-chase/docs/` (research with the #552-feel basis and crate trade-offs, legal with source log plus four flagged mitigations, identity with the Pip-vs-wardens cast and maze authorship log, behavior-spec with live-measured #552 values, feature-matrix with every row honestly planned, index map) plus `maze-chase/README.md` and `maze-chase/index.html` hub (honest Phase 1 status, no play button until Phase 7) plus `ideas/2026-10-16-maze-chase-phase-1-research.md` plus root landing entries. No `crates/` scaffold (Phase 2's deliverable). Delegation ledger: no subagents (docs-only phase synthesizing in-repo sources the primary had already read: tuning.py, ghosts.py, game.py, maze.py, modes.py, plus live measurement runs; only known skill customize-opencode covers opencode config, not game docs). Primary verified itself by measuring every pinned value from the real code. - the Builder
- 2026-10-16 (builder): implemented Phase 2 on the epic branch. New `maze-chase/Cargo.toml` workspace plus `maze-chase/crates/engine` (zero-dep lib: tuning/maze/actors/steering/ghosts/game/rng/sha256/replay/verify, `maze-chase-verify` binary, golden tests) plus `maze-chase/levels/ember-warren.maze` (original 28x31 layout, 445+4, flood-fill proof) plus `ideas/2026-10-16-maze-chase-phase-2-engine.md`; matrix engine rows to done, README/hub to honest Phase 2 status. Proof: 23 unit + 2 golden green, verify 12/12, 0.7 us/tick, zero warnings. Notable catches: f32 STEP widening would have starved the tick loop (f64 accounting), Python-mulberry32 middle-step overflow quirk replicated bit-exact, `#`-comment filter collided with wall rows (narrowed predicate). Delegation ledger: no subagents (single-crate engine the primary authored directly; only known skill customize-opencode covers opencode config, not game code). - the Builder
- 2026-10-16 (builder): implemented Phase 3 on `opencode/issue582-maze-chase-phase-3`. New `modes.rs` (WaveClock plus GameMode), `personalities.rs` (four pure targets plus dispatch), `relish.rs` (two-window machine); rewrote `ghosts.rs` (leg targets, reversals, eyes, pursuer, PlayerCtx) and extended `game.rs` (with_mode, relish, clear fan-out, mode clocks, canonical), `replay.rs` (mode in header), `verify.rs` (19 rows), one investigated golden re-pin, engine v0.3.0; matrix Phase 3 rows to done, README/hub to Phase 3, plus `ideas/2026-10-16-maze-chase-phase-3-ghost-intelligence.md`. Proof: 45 unit + 2 golden + 12 hostile + 2 quiescence green, verify 19/19, 0.8 us/tick, fmt clean, no new clippy warnings. Notable catches: sprint bonus float truncation, drained-event reads in step-based tests, crumb under the relish tile in exact-score assertions, Nib strict-greater-than-8 boundary. Delegation ledger: no subagents (single-crate engine the primary authored directly; only known skill customize-opencode covers opencode config, not game code). - the Builder
