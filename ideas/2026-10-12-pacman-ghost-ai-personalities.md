# Pac-Man Ghost AI: four personalities, waves, fright, house, Elroy

Phase 2 of issue #552 (`pacman/src/engine/ghosts.py`, integrated into `game.py`).

## What was built

A deterministic ghost controller owning all four hunters plus the shared
clocks. Roles are clean-room originals described behaviorally: the chaser
targets the player tile, the ambusher aims 4 tiles ahead of the player's
heading, the flanker mirrors the chaser across a pivot 2 tiles ahead of the
player, and the drifter hunts while far but retreats to its corner inside 8
tiles. Each ghost owns one scatter corner from the maze's corner table.

## How it works

- Steering happens at tile centers: pick the walkable non-reversing exit
  minimizing squared distance to the target, ties broken in fixed
  up/left/down/right priority so replays are identical everywhere. Fright
  picks uniformly from the seeded `fright` RNG stream instead.
- The wave clock walks the authored scatter/chase schedule with an
  about-face reversal on every switch; fright pauses the clock, flashes
  during its final 1.5 s, and resets the chain on expiry.
- Eaten hunters become eyes that steer for the house door at 1.5x cruise
  and revive outside heading left on arrival. House exits combine per-ghost
  dot counters with a 4 s idle timeout and a scripted L-shaped walk-out
  through the ghosts-only door. Tunnel tiles slow hunters to 0.55x; the
  leader gains speed bonuses under 20/10 dots left, and the deeper stage
  pins the wave clock to chase.
- Collisions resolve by tile equality or sub-tile proximity: frightened
  hunters score 200/400/800/1600 chains, active hunters cost a life, eyes
  pass through. Death and level transitions reset positions, clocks, and
  counters; the canonical state hash covers every ghost.

## Verification

20 new pytest cases plus a resurveyed cross-process self-check pin
(seed 1, 2400 ticks: the greedy autopilot now routes 170 dots with 2
energizers and zero deaths, up from 167). Full suite: 101 green,
including a 6000-tick ghost wall-safety fuzz and eyes-revive/chase-pin
targeted tests.
