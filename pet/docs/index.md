# Desktop Pet Documentation

A lightweight, always-on-top desktop companion that feels alive. Stdlib-only
Python, offline by default, honest about platform limits.

## Behavior brain

The whole companion personality lives in `pet_core`, with no GUI imports, so
every frontend and every test drives the same code:

- **State** (`pet_core/state.py`): name, activity, mood, energy, hunger,
  affection, position, tick counters, with JSON round-trip. Hunger 0 means
  full and 100 means starving; energy 0 is exhausted and 100 is rested;
  affection 0 is neglected and 100 is adored.
- **Needs** (`pet_core/needs.py`): hunger fills over 10 minutes, awake
  energy drains over 15 minutes, sleep restores over 5 minutes, affection
  fades over 20 minutes. Time-delta correct, dt clamped to 5 s.
- **Personality** (`pet_core/personality.py`): offline line pools per mood
  (happy, curious, sleepy, grumpy, hungry, affectionate) and per event
  (poke, feed, play, wake, sleep, greet). Seeded, no repeats until each
  pool is exhausted, renameable.
- **Brain** (`pet_core/brain.py`): `tick(dt)` at 10 Hz nominal advances
  needs, drifts position while walking, rolls one needs-weighted activity
  transition, and emits at most one event. REACT is transient, SLEEP
  auto-wakes once rested. Interactions (`poke`, `feed_pet`, `stroke`,
  `invite_play`, `send_to_sleep`, `wake`, `rename`) are the same calls the
  window and the tests use.
- **Persistence** (`pet_core/persistence.py`): atomic tmp-plus-rename JSON
  in the platform user-data dir, schema-checked, corrupt files backed up
  to `.bak` with a fresh start and a logged notice.

## Command reference

- `python -m pet run [--ticks N] [--seed S] [--name NAME] [--realtime]
  [--dt SEC] [--save PATH] [--no-save]`: run the brain headlessly.
- `python -m pet selftest`: headless suite plus a seeded soak proving all
  five activities are reachable.
- `python -m pet help` / `python -m pet version`: usage and version.

## Troubleshooting

- **Save file corrupt**: the pet starts fresh and the old file is kept
  next to it with a `.bak` suffix. Nothing is deleted silently.
- **Pet always sleepy**: energy drains while awake and restores only in
  SLEEP. Send it to sleep (or let the brain decide) and it wakes rested.
- **Pet always hungry**: hunger fills over about 10 minutes of pet time.
  Feed it through the event API (or the window feed control once the
  window layer lands).
- **Deterministic replay**: pass `--seed` to `run` for a reproducible
  session, useful when reporting odd behavior.
