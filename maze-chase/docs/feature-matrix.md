# Feature-Completeness Matrix

Shared binding tracker for every mechanic across the one engine and the
three publication layers. One row per mechanic; columns name the engine
module, each layer's status, and the test proof. Kept current every phase.

Status words: `done` (implemented, tested, verified), `planned` (scoped in
a future phase, no code yet), `degraded` (documented capability fallback,
never silent), `n/a` (genuinely not applicable to that layer).

Phase 4 note: the assets, audio, identity, and config rows below are
`done` (implemented, tested, reviewed headless: 20 assets tests, 13
audio tests, 18 config tests, plus the palette cross-check against
`design-tokens.json`). All three layers remain `planned`; no layer
code exists yet, and by the zero-stub rule no layer UI pretends
otherwise.

## Engine simulation (Phase 2: `crates/engine`, done)

| Mechanic | Engine module | Terminal | Desktop | WASM | Test proof |
|---|---|---|---|---|---|
| Fixed 120 Hz timestep, accumulator, spiral clamp | `game.rs` | planned | planned | planned | `verify: determinism-replay` + `game::determinism_same_seed_same_hash` |
| Maze load, walkability, tunnel wrap, reachability | `maze.rs` | planned | planned | planned | `verify: maze-geometry, maze-reachability` + `maze::*` + `levels/ember-warren.maze` proof |
| Tile-center movement, buffered turns, cornering | `actors.rs` | planned | planned | planned | `verify: movement-cornering, movement-tunnel-wrap` + `actors::*` |
| Dot/sunseed pickup, scoring, lives, level flow | `game.rs`, `tuning.rs` | planned | planned | planned | `verify: scoring-lives, lives-death-defeat, level-clear-flow, fright-chain` + `game::*` |
| Seeded RNG streams, replay log, state hash | `rng.rs`, `replay.rs` | planned | planned | planned | `rng::*` (bit-exact vectors), `replay::record_replay_converges`, `tests/golden.rs` |
| Headless verify harness | `verify.rs` + `maze-chase-verify` | planned | planned | planned | CI: `cargo run --bin maze-chase-verify` 19/19 green |

## Ghosts and progression (Phase 3: `crates/engine`, done)

| Mechanic | Engine module | Terminal | Desktop | WASM | Test proof |
|---|---|---|---|---|---|
| Four personalities + scatter corners | `personalities.rs`, `ghosts.rs` | planned | planned | planned | `verify: personalities-targets` + `personalities::*` + `ghosts::scatter_and_chase_steer_differently` |
| Scatter/chase wave clock with reversals | `modes.rs` | planned | planned | planned | `verify: wave-clock, fright-reversal` + `modes::*` (12-switch table walk, shave, chase-hold, pin) |
| Fright with flash, chains, eyes return | `ghosts.rs`, `game.rs` | planned | planned | planned | `verify: fright-chain, fright-reversal, eyes-return` + `ghosts::eyes_drift_home_and_revive, fright_start_reverses_the_pack` |
| House exits, tunnel clamp, pursuer stages | `ghosts.rs`, `tuning.rs` | planned | planned | planned | `verify: house-exits, pursuer-stages` + `ghosts::pursuer_stages_enrage_bram_only` |
| Bonus items, difficulty ramp, extra modes | `relish.rs`, `game.rs`, `modes.rs`, `tuning.rs` | planned | planned | planned | `verify: relish-cycle, mode-rules` + `relish::*` + `game::sprint_*, time_attack_*, frenzy_*` |

## Assets, audio, identity, config (Phase 4: done)

| Mechanic | Engine module | Terminal | Desktop | WASM | Test proof |
|---|---|---|---|---|---|
| Original sprites, themes, wall styles | `crates/assets` | planned | planned | planned | `assets::sprites::*` (glyph validation, accent diffs) + `assets::anim::*` + `themes::tokens_mirror_theme_palettes` |
| Original SFX/music, Audio trait impls | `crates/audio` (`cue`, `score`, `sink`) | planned | planned | planned | `audio::cue::*` (every engine event maps) + `audio::score::*` + `audio::sink::*` (Record/Null) |
| Settings, keymap, persistence | `crates/config` | planned | planned | planned | `config::{settings,keymap,persist}::*` (presets, rebind, round-trip) |
| Design pass (design.md + tokens) | docs | planned | planned | planned | Builder design pass signed (`design.md` + `design-tokens.json`); formal Design Council review may refine |

## Terminal layer (`crates/terminal`, done)

| Mechanic | Engine module | Terminal | Desktop | WASM | Test proof |
|---|---|---|---|---|---|
| Fullscreen layout + scale engine | n/a (adapter) | done | n/a | n/a | `terminal::layout::*` (centered, magnified, too-small card, resize sweep) |
| Kitty/Sixel/Unicode backends, detect, watchdog | n/a (adapter) | done | n/a | n/a | `terminal::{kitty,sixel,backend}::*` (PNG CRC walk, probe parse, tier ladder, override) + `tests/headless.rs::tier_override_selects_every_backend` |
| Dynamic resize with re-layout | n/a (adapter) | done | n/a | n/a | `tests/headless.rs::resize_sweep_never_breaks_layout` (0..200 x 0..70 sweep) |
| Menus, help, scores, settings screens | n/a (adapter) | done | n/a | n/a | `terminal::{screens,chrome,scores,chime}::*` + `tests/headless.rs::full_session_boots_plays_pauses_and_quits` + `settings_persist_across_sessions` + `game_over_lands_on_the_scores_table` |
| Installable package + launch docs | n/a (adapter) | done | n/a | n/a | `cargo build --release -p maze-chase-terminal` + `--help` smoke + `packaging/terminal/{linux-tarball,install-linux}.sh` (staged + installed + `--version`-probed on Linux) + `docs/terminal.md` |

## Desktop layer (Phase 6 target: `crates/desktop`)

| Mechanic | Engine module | Terminal | Desktop | WASM | Test proof |
|---|---|---|---|---|---|
| Windowed/fullscreen shared-renderer core | n/a (adapter) | n/a | done | n/a | `desktop::render::*` (layout, play determinism, small card, menu cursor) + `desktop::frame::*` + `desktop/tests/headless.rs` + `desktop/tests/tester_hostile.rs::tiny_and_zero_windows_draw_card` + Xvfb `--probe` PPM (`docs/desktop-probe.ppm`) |
| Keyboard + gamepad input with remap | n/a (adapter) | n/a | done | n/a | `desktop::{input,gamepad,screens}::*` (winit map, stick deadzone, padmap, capture) + `desktop/tests/headless.rs` + `desktop/tests/tester_hostile.rs::corrupt_padmap_falls_back_to_defaults` |
| Menus, settings, scores, audio controls | n/a (adapter) | n/a | done | n/a | `desktop::{screens,app,sound}::*` (flows, session, synth) + `desktop/tests/headless.rs` + `desktop/tests/tester_hostile.rs::corrupt_config_boots_with_defaults` + `::accumulator_drops_surplus` + `::wild_menu_cursors_never_panic` |
| Per-OS packaging with reproducible steps | n/a (adapter) | n/a | done | n/a | `packaging/desktop/{linux-tarball,install-linux}.sh` (`bash -n` clean) + `windows-zip.ps1` + `macos-app.sh` + `maze-chase.desktop` + `docs/desktop.md` |

## WASM layer and hub (Phase 7: `crates/web`, done)

| Mechanic | Engine module | Terminal | Desktop | WASM | Test proof |
|---|---|---|---|---|---|
| Same-renderer browser build | n/a (adapter) | n/a | n/a | done | `web::video::*` (board composition mirrors the terminal raster at 8 ppt, determinism, sunseed/relish/fright/pip animation cadence) + `web::bridge::*` (hostile probes) + node `web/e2e/wasm-smoke.js` (zero-import instantiate, scoring, bit-identical frames) + committed `web/maze-chase.wasm` |
| Keyboard + touch (swipe + d-pad) | n/a (adapter) | n/a | n/a | done | `web::input::*` (key table round-trip, defaults, rebind lookup, swipe deadzone/axis) + `web::session::*` (steering reaches the engine, menus, steal rebinds) + `web/e2e/browser-e2e.js` (real ArrowUp scores, P pause/resume, touch swipe, 390x844 board visible, zero console errors) |
| DPR resize + web-audio unlock | n/a (adapter) | n/a | n/a | done | `web::video::*` (fit math incl. clip case, blit round-trip/letterbox) + `web::audio_map::*` (every engine event reaches SFX, loop, or sting; 132 BPM mirrored) + harness gesture unlock + volume/mute persistence (E2E boot clean; headless has no audio device, documented in `docs/web.md`) |
| Pages hub with play + per-layer docs | docs/hub | n/a | n/a | done | `maze-chase/play.html` (Play entry from the hub, all six screens, favicon, offline-safe) + `docs/web.md` + `docs/index.md` entry + CDP DOM proof (title visible, panels sync from `mc_screen`) |

## Cross-cutting (release audit: done except native-OS proof)

| Mechanic | Engine module | Terminal | Desktop | WASM | Test proof |
|---|---|---|---|---|---|
| Per-layer E2E green | all | done | done | done | terminal headless (layout sweep, full session, resize) + desktop headless + Xvfb `--probe` PPM + node `wasm-smoke.js` + `tester-regression.js` + CDP `browser-e2e.js` 13/13 (all green on Linux; Windows/macOS native runs pending per-OS runners, see `docs/parity.md`) |
| Scoreboard (tick cost, suites, budgets) | all | done | done | done | `docs/scoreboard.md`: `perf-headless` 0.8 us/tick, 344/344 `cargo test` green, node smokes green, budgets with measured anchors |
| Reproducible build/release instructions | docs | done | done | done | `docs/release.md` (toolchain, system libraries, layer builds, packaging matrix, clean-checkout checklist) + `packaging/{terminal,desktop}/` scripts + committed byte-reproducible `web/maze-chase.wasm` |
| #552 retirement only after verified parity | n/a | planned | planned | planned | `docs/parity.md`: every engine rule row signed against `behavior-spec.md` + 19/19 verify; native-OS package/E2E rows still open, so `pacman/` is untouched and #552 stays functional |

## Rules

- Every row needs test proof; a row without a named test file stays
  `planned`.
- Any gameplay branch inside a layer crate is a blocking review finding;
  layers map input to `TickInput` and render `Game` state plus `GameEvent`s.
- Unavoidable capability gaps become `degraded` with a documented fallback
  path, never silent drops.
