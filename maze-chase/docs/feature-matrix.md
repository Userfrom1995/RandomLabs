# Feature-Completeness Matrix

Shared binding tracker for every mechanic across the one engine and the
three publication layers. One row per mechanic; columns name the engine
module, each layer's status, and the test proof. Kept current every phase.

Status words: `done` (implemented, tested, verified), `planned` (scoped in
a future phase, no code yet), `degraded` (documented capability fallback,
never silent), `n/a` (genuinely not applicable to that layer).

Phase 1 note: the engine and all three layers are `planned`; only the
research, legal, identity, and behavior-spec foundations are `done`. No
layer code exists yet, and by the zero-stub rule no layer UI pretends
otherwise.

## Engine simulation (Phase 2 target: `crates/engine`)

| Mechanic | Engine module | Terminal | Desktop | WASM | Test proof |
|---|---|---|---|---|---|
| Fixed 120 Hz timestep, accumulator, spiral clamp | `game.rs` | planned | planned | planned | headless tick tests + replay hashes |
| Maze load, walkability, tunnel wrap, reachability | `maze.rs`, `level.rs` | planned | planned | planned | load + flood-fill + wrap tests |
| Tile-center movement, buffered turns, cornering | `actors.rs` | planned | planned | planned | movement + turn-window tests |
| Dot/energizer pickup, scoring, lives, level flow | `game.rs`, `tuning.rs` | planned | planned | planned | scoring/lives/clear tests |
| Seeded RNG streams, replay log, state hash | `rng.rs`, `replay.rs` | planned | planned | planned | golden-hash tests |
| Headless verify harness | `verify.rs` | planned | planned | planned | CI matrix run |

## Ghosts and progression (Phase 3 target: `crates/engine`)

| Mechanic | Engine module | Terminal | Desktop | WASM | Test proof |
|---|---|---|---|---|---|
| Four personalities + scatter corners | `ghosts.rs` | planned | planned | planned | target-function + displacement tests |
| Scatter/chase wave clock with reversals | `modes.rs` | planned | planned | planned | wave-table tests |
| Fright with flash, chains, eyes return | `ghosts.rs`, `game.rs` | planned | planned | planned | fright-chain + revive tests |
| House exits, tunnel clamp, pursuer stages | `ghosts.rs`, `tuning.rs` | planned | planned | planned | counter + timeout + stage tests |
| Bonus items, difficulty ramp, extra modes | `game.rs`, `tuning.rs` | planned | planned | planned | spawn/expire + mode-rule tests |

## Assets, audio, identity, config (Phase 4 target)

| Mechanic | Engine module | Terminal | Desktop | WASM | Test proof |
|---|---|---|---|---|---|
| Original sprites, themes, wall styles | `crates/assets` | planned | planned | planned | asset-validation step + paint tests |
| Original SFX/music, Audio trait impls | `audio.rs` + rodio/web shim | planned | planned | planned | cue-routing + degrade tests |
| Settings, keymap, persistence | `crates/config` | planned | planned | planned | validation round-trip tests |
| Design Council pass (design.md + tokens) | docs | planned | planned | planned | `/oc design` output reviewed in |

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
