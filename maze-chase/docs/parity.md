# #552 parity checklist

What the Rust build must prove before the #552 Python reference game
(`pacman/`, issue #552) can be retired. Retirement is a separate,
explicit step: nothing in `pacman/` is touched by any build or
packaging script here, and this checklist staying anything short of
fully signed means #552 stays.

Rule values below are feel references re-expressed as original Rust
tables (`crates/engine/src/tuning.rs`) under the clean-room rules in
`docs/legal.md`. The maze itself is intentionally NOT a copy: "Ember
Warren" (`levels/ember-warren.maze`) is original geometry with its own
counts (445 crumbs + 4 sunseeds vs the reference 282 + 4) and its own
authorship log (`docs/identity.md`). Parity means the rules and feel
match; the map is ours.

## Simulation core

| #552 pinned behavior (`docs/behavior-spec.md`) | Rust engine | Verify row | Status |
|---|---|---|---|
| 120 Hz timestep, accumulator, 0.5 s spiral clamp | `tuning.rs` (`SIM_HZ`, `STEP`, `MAX_ACCUMULATOR`) + `game.rs` | `determinism-replay`, `perf-headless` | signed |
| Player 8.5 tiles/s over the 1.00-1.20 level curve; warden cruise 0.96x | `tuning.rs` (`PLAYER_BASE_SPEED`, `PLAYER_SPEED_CURVE`, `WARDEN_SPEED_FRACTION`) | `movement-cornering`, `movement-tunnel-wrap` | signed |
| Tunnel 0.55x wardens / 0.95x player; wrap on row 14 | `tuning.rs` + `maze.rs` + `actors.rs` | `movement-tunnel-wrap`, `maze-geometry` | signed |
| Tile-center movement, buffered turns, 0.35 cornering window; warden 0.09 decide-once gate | `actors.rs`, `steering.rs` | `movement-cornering` | signed |
| Collision within 0.55 tiles; eat-vs-death priority | `tuning.rs` (`COLLIDE_DISTANCE`) + `game.rs` | `scoring-lives`, `lives-death-defeat` | signed |
| 3 lives, 1.4 s death sequence, defeat below 0, extra wick once at 10,000 | `tuning.rs` + `game.rs` | `lives-death-defeat` | signed |
| 2.0 s clear sequence, fresh maze next level, endless ramp | `tuning.rs` (`LEVEL_CLEAR_SEQUENCE_S`) + `game.rs` | `level-clear-flow` | signed |
| Crumb 10, sunseed 50, chains 200/400/800/1600 | `tuning.rs` + `game.rs` | `scoring-lives`, `fright-chain` | signed |
| Seeded streams, canonical state string, SHA-256 hash | `rng.rs`, `replay.rs`, `sha256.rs` | `determinism-replay`, golden hashes | signed |

## Ghosts, bonus, modes

| #552 pinned behavior | Rust engine | Verify row | Status |
|---|---|---|---|
| Four pure personality targets; corners (1,1), (26,1), (1,29), (26,29) | `personalities.rs` | `personalities-targets` | signed |
| Greedy exits, no reversal, up/left/down/right ties; seeded fright stream | `steering.rs`, `ghosts.rs` | `fright-chain`, `fright-reversal` | signed |
| Wave clock (7,20)x2, (5,20)x2, (3,25)x2 then hold; scatter shaved 1 s/level, floor 1.0; reversals on switch | `modes.rs` + `tuning.rs` (`WAVE_TABLE`) | `wave-clock`, `fright-reversal` | signed |
| Fright curve 6.0 down to 0.0 from level 11; 1.5 s flash; 0.62x wardens, 1.04x player; eyes home at 1.5x, revive at the door | `tuning.rs` + `ghosts.rs` + `game.rs` | `fright-chain`, `eyes-return` | signed |
| House counters (0,7,17,32); 4.0 s idle release; 0.55x walk-out | `tuning.rs` + `ghosts.rs` | `house-exits` | signed |
| Relish at 70/170, 9.5 s expiry, tiers 100-5000 | `relish.rs` + `tuning.rs` | `relish-cycle` | signed |
| Classic / time-attack (120 s refill) / sprint (par 300 s, 10/s) / fright-frenzy (4x) | `modes.rs` + `game.rs` | `mode-rules` | signed |
| Pursuer: 20 left +3%, 10 left +6% pinned to chase | `tuning.rs` + `ghosts.rs` | `pursuer-stages` | signed |

## Layer parity (all three play the same hunt)

| Requirement | Terminal | Desktop | Browser | Status |
|---|---|---|---|---|
| Same engine, no gameplay branches in layer code | maps input to `TickInput`, renders `Game` + `GameEvent`s | same | same | signed (review-enforced rule, see matrix) |
| Full menu/help/scores/settings/pause flows | `screens` + `chrome`, top-10 machine scores | `screens`, shares `~/.maze-chase` scores with terminal | DOM screens, localStorage top-10 | signed |
| Per-layer E2E green on this release | headless suite (layout sweep, full session, resize) | headless suite + Xvfb `--probe` PPM | node smoke + tester regression + CDP browser E2E | signed on Linux; Windows/macOS runs pending per-OS runners (see scoreboard) |
| Board pixels agree across layers | shared rasterizer reference | identical by construction (same composer) | mirrors the terminal raster at 8 ppt (frame-determinism test) | signed |

## Open before retirement

- Windows and macOS runs of the per-layer E2E plus the packaged
  artifacts (zip, `.app`) have not been executed on their native OSes
  in this release; the scripts and docs rows are shipped, the proof
  rows are pending per-OS runners.
- Therefore #552 stays functional. Retire it only when a later run
  flips those rows to signed and the Maintainer takes the explicit
  retirement step.
