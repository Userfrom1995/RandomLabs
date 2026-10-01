# Desktop Pet - Cross-Platform Interactive Companion

A lightweight, always-on-top desktop companion that feels alive: it idles,
wanders, plays, sleeps, and reacts to you. It has a nameable personality
(Pip by default), procedural animation with zero image assets, and per-OS
native integration on Windows, macOS, and Linux. Stdlib-only Python,
offline by default, and honest about platform limits.

## Current state

The behavior brain is fully built, tested, and runnable headlessly: state
model, needs decay math, seeded personality dialogue, atomic persistence,
and the tick state machine, all driven through `python -m pet`. The
on-screen companion window, interaction layer, settings, per-OS shells,
and packaging recipes land on top of this same brain without changing it.

## Quickstart

Requires Python 3.10 or newer. No third-party packages.

```sh
python -m pet selftest
python -m pet run --ticks 300 --seed 7
python -m pet run --ticks 600 --name Mochi --realtime
python -m pet help
python -m pet version
```

`run` drives the brain headlessly in your terminal: it loads the saved
pet (or starts fresh), prints activity changes and dialogue lines, and
saves on exit. Saves live in the platform user-data dir
(`~/.local/share/desktop-pet` on Linux,
`~/Library/Application Support/DesktopPet` on macOS,
`%APPDATA%/DesktopPet` on Windows), overridable with
`DESKTOP_PET_DATA_DIR` for tests and portable setups.

## How it works

Strict core/presentation split: `pet_core` never imports `tkinter` or any
OS shell module. The window (when it lands) is a thin renderer that
translates core state into canvas poses and forwards pointer events into
the core event API below. The Tester drives the entire behavior loop
headlessly through that same API.

- **Tick loop.** `Brain.tick(dt)` advances needs, rolls activity
  transitions from a needs-weighted table, emits at most one event per
  tick, and stays O(1). The GUI schedules it at 10 Hz; rendering
  interpolates at display rate from the latest state.
- **Activities.** IDLE, WALK, PLAY, SLEEP, REACT. A tired pet seeks sleep,
  a starving pet begs for attention, a neglected pet invites play.
  REACT is transient (never lingers), SLEEP restores energy and
  auto-wakes once rested.
- **Needs math.** Hunger rises 0 to 100 over 10 minutes; awake energy
  drains 100 to 0 over 15 minutes; sleep restores 0 to 100 over 5
  minutes; affection decays 100 to 0 over 20 minutes. All updates are
  time-delta correct with dt clamped to 5 s so a suspended laptop never
  teleports the pet to starvation.
- **Personality.** Curated offline line pools per mood (happy, curious,
  sleepy, grumpy, hungry, affectionate) and per event (poke, feed, play,
  wake, sleep, greet). No network, no telemetry: drawing is seeded and
  no-repeat-until-exhausted, and `{name}` slots carry the pet's name.
- **Persistence.** Debounced atomic write (tmp file plus rename). Load
  validates the schema version, clamps ranges, backs corrupt files up to
  `.bak`, and starts fresh with a logged notice.

## Core API

```python
from pet.pet_core import Brain, Personality, PetState, load, save

state, notice = load()                      # platform save dir
brain = Brain(state=state, seed=1234)
for _ in range(100):
    for event in brain.tick(0.1):           # at most one event
        print(event.kind, event.text)
brain.feed_pet(35.0)                        # hunger restore
brain.stroke()                              # affection boost
brain.invite_play()                         # ball game invite
brain.poke()                                # startle reaction
brain.send_to_sleep() / brain.wake()        # rest cycle
brain.rename("Mochi")                       # rename persona
save(brain.state)
```

## Support matrix

| Layer | Windows | macOS | Linux |
| --- | --- | --- | --- |
| Behavior brain (`python -m pet`) | yes | yes | yes |
| Headless tests (`selftest`) | yes | yes | yes |
| Companion window | planned | planned | planned |
| Startup entry + notifications | planned | planned | planned |
| PyInstaller recipe | planned | planned | planned |

Where a platform denies a capability, the pet says so in-app instead of
failing silently.

## Layout

- `pet_core/` - headless brain: `state.py`, `brain.py`, `needs.py`,
  `personality.py`, `persistence.py`. No GUI imports, no dependencies.
- `__main__.py` - CLI dispatch (`run`, `selftest`, `help`, `version`).
- `tests/` - headless suite: state, needs, personality, persistence,
  brain (43 tests, seeded and deterministic).
- `docs/` - unified product documentation.
- `index.html` - Pages hub for this project.

## Verification

```sh
python -m unittest discover -s pet/tests -t .
python -m pet selftest
python tests/test_desktop_pet.py
```

All three must be green: the headless suite, the CLI selftest (suite
plus a seeded soak proving the brain reaches every activity), and the
static gate (file wiring, dependency rule, facade scan, docs unity).
