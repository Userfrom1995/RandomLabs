# Feature-Completeness Matrix

Shared binding tracker for every mechanic across the one engine and the
three publication layers. One row per mechanic; columns name the engine
module, each layer's status, and the test proof. Kept current every phase.

Status words: `done` (implemented, tested, verified), `planned` (scoped in
a future phase, no code yet), `degraded` (documented capability fallback,
never silent), `n/a` (genuinely not applicable to that layer).

Phase 3 note: the engine simulation rows and the ghost/progression rows
below are `done` (implemented, tested, verified headless: 45 unit tests,
2 golden replay hashes, 19-row verify green). Assets and all three
layers remain `planned`; no layer code exists yet, and by the zero-stub
rule no layer UI pretends otherwise.

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

## Assets, audio, identity, config (Phase 4 target)

| Mechanic | Engine module | Terminal | Desktop | WASM | Test proof |
|---|---|---|---|---|---|
| Original sprites, themes, wall styles | `crates/assets` | planned | planned | planned | asset-validation step + paint tests |
| Original SFX/music, Audio trait impls | `audio.rs` + rodio/web shim | planned | planned | planned | cue-routing + degrade tests |
| Settings, keymap, persistence | `crates/config` | planned | planned | planned | validation round-trip tests |
| Design Council pass (design.md + tokens) | docs | planned | planned | planned | Design Council review (design.md + tokens) signed |

## Terminal layer (Phase 5 target: `crates/terminal`)

| Mechanic | Engine module | Terminal | Desktop | WASM | Test proof |
|---|---|---|---|---|---|
| Fullscreen layout + scale engine | n/a (adapter) | planned | n/a | n/a | layout/scale unit + pty tests |
| Kitty/Sixel/Unicode backends, detect, watchdog | n/a (adapter) | planned | n/a | n/a | escape-capture + degrade tests |
| Dynamic resize with re-layout | n/a (adapter) | planned | n/a | n/a | resize pty tests |
| Menus, help, scores, settings screens | n/a (adapter) | planned | n/a | n/a | screen + flow tests |
| Installable package + launch docs | n/a (adapter) | planned | n/a | n/a | clean-install check |

## Desktop layer (Phase 6 target: `crates/desktop`)

| Mechanic | Engine module | Terminal | Desktop | WASM | Test proof |
|---|---|---|---|---|---|
| Windowed/fullscreen shared-renderer core | n/a (adapter) | n/a | planned | n/a | per-OS runner tests |
| Keyboard + gamepad input with remap | n/a (adapter) | n/a | planned | n/a | input-mapping tests |
| Menus, settings, scores, audio controls | n/a (adapter) | n/a | planned | n/a | flow tests |
| Per-OS packaging with reproducible steps | n/a (adapter) | n/a | planned | n/a | install checks per OS |

## WASM layer and hub (Phase 7 target: `crates/wasm`)

| Mechanic | Engine module | Terminal | Desktop | WASM | Test proof |
|---|---|---|---|---|---|
| Same-renderer browser build | n/a (adapter) | n/a | n/a | planned | Playwright desktop + mobile |
| Keyboard + touch (swipe + d-pad) | n/a (adapter) | n/a | n/a | planned | touch-mapping tests |
| DPR resize + web-audio unlock | n/a (adapter) | n/a | n/a | planned | viewport + mute tests |
| Pages hub with play + per-layer docs | docs/hub | n/a | n/a | planned | hub link + load checks |

## Cross-cutting (Final phase target)

| Mechanic | Engine module | Terminal | Desktop | WASM | Test proof |
|---|---|---|---|---|---|
| Per-layer E2E green | all | planned | planned | planned | E2E suites per layer |
| Scoreboard (FPS, latency, parity) | all | planned | planned | planned | bench harness output |
| Reproducible build/release instructions | docs | planned | planned | planned | clean-checkout rebuild |
| #552 retirement only after verified parity | n/a | planned | planned | planned | parity checklist signed |

## Rules

- Every row needs test proof; a row without a named test file stays
  `planned`.
- Any gameplay branch inside a layer crate is a blocking review finding;
  layers map input to `TickInput` and render `Game` state plus `GameEvent`s.
- Unavoidable capability gaps become `degraded` with a documented fallback
  path, never silent drops.
