# #552 Behavior Reference Spec (Pinned)

Empirical behavior contract for the Rust engine, measured from the #552
Python reference on 2026-10-16 (suite 495 green, 106-row verify matrix).
The Rust engine must reproduce every row below; each row names
the #552 source module and the pinned value. Values are feel references
for authoring original Rust tables with provenance comments, per
`legal.md`: they are not to be transcribed without understanding.

## Maze and movement (`engine/maze.py`, `engine/actors.py`)

- Grid 28 wide by 31 tall; side tunnel on row 14 wrapping horizontally;
  central gatehouse (house) with a one-way door.
- 282 dots plus 4 energizers; flood fill from the player start reaches all
  286 pickups (`reachable_dots_from` returns 286).
- Player start tile (13, 23); ghost door tile (13, 12); ghost outside tile
  (13, 11); house slots (11, 14), (13, 14), (15, 14).
- Tile-center movement with buffered turns; cornering assist window 0.35
  tiles; ghost tile-center decision window 0.09 tiles with the decide-once
  gate (`Ghost.decided`, cleared on reversals, tile exit, and revive).

## Simulation core (`engine/game.py`, `engine/tuning.py`, `engine/rng.py`)

- Fixed 120 Hz timestep (`STEP = 1/120`), accumulator with 0.5 s
  spiral-of-death clamp; player base speed 8.5 tiles/s times a level curve
  (1.00 to 1.20 over 9 entries, clamped); ghost cruise 0.96x player speed.
- Tunnel modifiers: ghosts 0.55x, player 0.95x of current speed.
- Collision: same-tile or within 0.55 tiles; frightened contact eats the
  ghost, otherwise the player dies (eat-vs-death priority).
- Lives: 3 to start; death sequence 1.4 s then respawn; defeat when lives
  go below 0; extra life once at 10,000 points.
- Level clear: 2.0 s sequence then next level on a fresh maze; win-to-next
  progression, endless ramp.
- Scoring: dot 10, energizer 50, ghost chains 200/400/800/1600 per
  energizer, fruit tiers 100 to 5000 by level.
- Determinism: seeded RNG with per-subsystem stream splits; canonical
  state string plus SHA-256 hash covering seed, level, score, lives, tick
  count, positions, dot field, ghost clocks, mode, fruit, and timers.

## Ghosts (`engine/ghosts.py`)

- Four personalities as pure target functions: Leader (player tile),
  Ambusher (4 tiles ahead), Flanker (mirror of the Leader across a pivot 2
  tiles ahead), Lurker (player while at least 8 tiles away, else its
  scatter corner). Scatter corners: (1,1), (26,1), (1,29), (26,29).
- Steering: greedy minimum squared-Euclidean exit choice, no direct
  reversal, fixed tie-break order up/left/down/right; frightened steering
  uniform-random from the seeded fright stream.
- Wave clock (scatter/chase seconds): (7,20), (7,20), (5,20), (5,20),
  (3,25), (3,25), then chase-hold; scatter shaved 1 s per level above 1,
  floored at 1.0 s. Wave switches reverse all active ghosts.
- Fright durations by level: 6.0, 5.0, 4.0, 3.5, 3.0, 2.5, 2.0, 1.5, 1.0,
  0.5, then 0.0 from level 11; flash warning in the last 1.5 s; frightened
  ghost speed 0.62x, frightened player speed 1.04x.
- House exits: base dot counters (0, 7, 17, 32) easing toward (0, 0, 0, 0)
  on deep levels (level 1 measures (0, 3, 13, 28)); 4.0 s idle timeout
  releases the next ghost regardless; scripted L-shaped walk-out at 0.55x
  cruise; eyes return at 1.5x and revive at the door.

## Bonus and modes (`engine/fruit.py`, `engine/modes.py`)

- Fruit spawns after 70 and 170 dots eaten per level, expires after 9.5 s;
  tiers by level: 100, 300, 500, 700, 1000, 1500, 2000, 3000, 5000.
- Modes on one engine: classic (standard loop); time-attack (120 s on a
  refilling maze); sprint (one life, no fright, par-time bonus against
  300 s at 10 points per spare second); fright-frenzy (4x fright windows
  with slower ghosts and a 1.0 s duration floor).
- Pursuer stages: 20 dots left adds 3% leader speed; 10 dots left adds 6%
  and pins chase mode.

## Renderer and shell behavior (adapter contract, not engine logic)

- One scene painter feeds every backend so maze, entity, and HUD positions
  agree within one cell; Kitty transmit-once plus cursor-anchored erase,
  Sixel dirty-region raster with an fps cap, Unicode diff-only reference;
  detection chain (override flag, then environment, then live query with
  timeout, then safe Unicode default) with a watchdog that steps down one
  tier on errors or slow frames and never steps up from inside `present`.
- Fullscreen canvas: layout engine maps terminal size to maze, dashboard,
  legend, and strip regions; magnification fills the window (HUD text
  stays native-size); short windows down to 28x16 play through a follow-cam
  viewport; resize re-layouts with a full repaint.
- Shell: raw-mode input with remappable keys, title/pause/over/help/scores
  flows, persistent top-10 scores with name entry, validated config
  persistence, pluggable audio that degrades honestly, crash-safe teardown.

## Verification baseline

#552 ships a 106-row headless verify matrix plus input/render/canvas
benches and true-pty tours; the Rust `verify` harness had to reach the
same bar per layer (gameplay, size, capability, input, parity rows)
before the retirement of #552. Reference perf floors from the #552
scoreboard: Unicode well above 500 fps headless, sim tick cost far below
the 8,333 us 120 Hz budget, key decode above 1M keys/s.
