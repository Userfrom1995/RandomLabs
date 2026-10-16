# Maze Chase Phase 3: Ghost Intelligence, Scoring, and Progression

## What was built

Phase 3 of the Maze-Chase Rust migration (issue #582) on the shared
engine (`maze-chase/crates/engine`, v0.2.0 to v0.3.0). The wander-steering
baseline is gone from the simulation path: the four wardens now hunt with
authored personalities on a reversing scatter/chase wave clock, eaten
wardens path home as eyes, relishes ripen twice per level, Bram enrages
late-level, and four mode rulesets run on the same core. Zero layer code
(no stubs, no buttons, no banners for future phases).

## Why this shape

- Personalities are pure target functions (`personalities.rs`) consumed
  through the existing greedy-exit helper, so steering stays
  deterministic (fixed Up/Left/Down/Right tie-breaks) and testable
  without a maze: Bram runs Pip down, Kessa aims 4 ahead, Jory mirrors
  Bram across a 2-ahead pivot, Nib hunts past 8 tiles and retreats
  inside. Targets may point at walls or off-board; clamping would change
  the hunt, so the greedy choice only minimizes toward them.
- The wave clock (`modes.rs`) is data, not branches: six scatter/chase
  pairs with a level shave on scatter legs (floor 1 s) and a chase-hold
  after the table. Every leg switch and every fright start reverses the
  pack through one `reverse_all` path, and the decide-once gate re-arms.
- Eyes replace the Phase 2 respawn timer with real navigation at 1.5x
  cruise to the gatehouse door, reviving at the mouth exactly where the
  timer used to drop them, so the revival endpoint is unchanged while
  the journey is now simulated.
- Modes are engine rules, not layer flags: sprint starts on zero lives
  (one life under defeat-below-zero accounting) with no fright and no
  spare wick, banking 10 points per spare second against a 300 s par;
  time-attack refills the same maze on a 120 s clock; fright-frenzy runs
  4x windows with a 1.0 s floor and 0.9x wardens.
- `Wardens::step` takes a `PlayerCtx` struct (tile, heading, speed, mode
  factor) instead of seven loose arguments, which also keeps clippy quiet
  for the layer call sites coming in Phases 5-7.

## How it works (key files)

- `crates/engine/src/tuning.rs`: wave table, scatter shave/floor,
  pursuer thresholds (+3% at 20, +6% at 10), relish schedule (70/170,
  9.5 s, tile (13,16), 100-5000 tiers), mode clocks and multipliers,
  plus `wave_scatter`/`wave_chase`/`relish_value` helpers.
- `crates/engine/src/personalities.rs`: the four target functions plus
  the cast-order `chase_target` dispatch and boundary tests (Nib is
  strict-greater-than 8 tiles).
- `crates/engine/src/modes.rs`: `WaveClock` (tick returns true on leg
  switch; `pin_chase` latches the hunt) and `GameMode` rule queries.
- `crates/engine/src/ghosts.rs`: `WardenState::Eyes`, personality
  steering per leg, fright-stream random wandering, reversals, pursuer
  cruise, door-seeking eyes with wall-safety; canonical string extended
  with the wave clock.
- `crates/engine/src/relish.rs`: two-window spawn/expire/pickup state
  machine; death fades the board without rewinding the schedule.
- `crates/engine/src/game.rs`: `with_mode` constructor (`new` stays
  classic), relish integration, mode fan-out on level clear
  (descend / sprint bonus / time-attack refill), mode clocks, canonical
  string extended with mode, mode clock, and relish.
- `crates/engine/src/replay.rs`: replay header carries the mode so
  cross-mode hashes never collide.
- `crates/engine/src/verify.rs`: 19-row matrix (12 Phase 2 rows intact
  plus personalities-targets, wave-clock, fright-reversal, eyes-return,
  relish-cycle, pursuer-stages, mode-rules).
- `crates/engine/tests/golden.rs`: one investigated re-pin (new hash
  `23c17f89...`, score still 50, run still live) with the old hash
  retired in a comment. Re-pin rationale: steering, eyes, and canonical
  intentionally changed; replay converges and 19/19 verify is green.

## Proof

- 45 unit + 2 golden + 12 hostile + 2 quiescence tests green
  (tester suites untouched and passing).
- `maze-chase-verify` 19/19 green, 0.8 us/tick headless (far below the
  8,333 us 120 Hz budget).
- `cargo fmt --check` clean; clippy reports no warnings in new/changed
  modules (pre-existing maze/rng/sha256 style notes left untouched).

## Notable catches

- Sprint bonus math truncated twice (`as u32` before multiplying):
  instant clears banked 2,990 instead of ~2,999. Multiply in float first.
- Verify/game tests that drain events through `step` must keep the
  returned batch: the "time-up" assertion read an already-drained
  log. (Fixed by holding the last batch.)
- The relish pickup tick also eats the crumb standing under the relish
  tile, so the exact-score assertion pre-clears that crumb first.
- Nib's shyness is strict `>`: exactly 8.0 tiles retreats (test caught
  the wrong assumption before it shipped).

## Notes

- Delegation ledger: no subagents (single-crate engine phase the primary
  authored directly; only known skill customize-opencode covers opencode
  config, not game code). Primary verified with the full suite, the
  verify binary, clippy, and fmt.
- Next: Phase 4 (original assets, audio, settings, Design Council pass
  with design.md plus tokens) before any layer work.

- the Builder
