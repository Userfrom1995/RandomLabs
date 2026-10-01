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
on-screen companion window is built on top of the same brain: a
borderless always-on-top tkinter window with a procedural sprite,
drag-carry, speech bubble, and right-click menu. Open it with
`python -m pet gui`. The interaction play layer, settings dialog,
per-OS startup shells, and packaging recipes build on these same two
layers without changing them.

## Quickstart

Requires Python 3.10 or newer. No third-party packages.

```sh
python -m pet selftest
python -m pet gui
python -m pet gui --scale 1.5 --alpha 0.9
python -m pet run --ticks 300 --seed 7
python -m pet run --ticks 600 --name Mochi --realtime
python -m pet help
python -m pet version
```

`gui` opens the on-screen companion: it stays on top, wanders the
screen while walking, and answers back in a speech bubble. Single click
chats, double click pokes, press-drag picks the pet up and carries it,
right click opens the menu (Feed, Play, Sleep/Wake, About, Quit).
Window options: `--scale 0.5..3.0` (multiplied by display DPI),
`--alpha 0.3..1.0` (opacity), `--no-topmost`, `--save PATH`,
`--no-save`. Without tkinter or a display it exits with an honest note
instead of a traceback.

`run` drives the brain headlessly in your terminal: it loads the saved
pet (or starts fresh), prints activity changes and dialogue lines, and
saves on exit. Saves live in the platform user-data dir
(`~/.local/share/desktop-pet` on Linux,
`~/Library/Application Support/DesktopPet` on macOS,
`%APPDATA%/DesktopPet` on Windows), overridable with
`DESKTOP_PET_DATA_DIR` for tests and portable setups.

## How it works

Strict core/presentation split: `pet_core` never imports `tkinter` or any
OS shell module. The window is a thin renderer that translates core
state into canvas poses and forwards pointer events into the core event
API below. The Tester drives the entire behavior loop headlessly
through that same API.

- **Companion window.** `pet_app/window.py` is a borderless topmost
  shell over `pet_app/controller.py` (bubble timing, click/drag/double
  click classification, menu model, carry sessions, pose blending, all
  headless-tested). The brain ticks at 10 Hz; the canvas redraws every
  50 ms from eased poses. While walking the window itself drifts across
  the screen; while carried it dangles and waits.
- **Procedural sprite.** `pet_app/sprite.py` draws a blob-cat from
  canvas primitives with parametric poses per activity plus eased
  blends between them (blink cycle, breathing squash, walk bob, play
  jumps, sleep Z-float, startle squash, carried dangle). Poses are pure
  functions of `(activity, phase)` and scale linearly, so DPI scaling
  and the Pages showcase mirror them exactly.
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
| Companion window (`gui`) | yes | yes | yes |
| Startup entry + notifications | planned | planned | planned |
| PyInstaller recipe | planned | planned | planned |

The window needs tkinter plus a display; where either is missing the
`gui` command exits with an honest note pointing at headless `run`.

Where a platform denies a capability, the pet says so in-app instead of
failing silently.

## Layout

- `pet_core/` - headless brain: `state.py`, `brain.py`, `needs.py`,
  `personality.py`, `persistence.py`. No GUI imports, no dependencies.
- `pet_app/` - on-screen companion: `sprite.py` (pure pose engine plus
  shape lists), `controller.py` (bubble, gestures, menu model, carry,
  blending; no GUI imports), `platform.py` (capability probe, alpha and
  scale clamps), `window.py` (borderless tkinter shell).
- `__main__.py` - CLI dispatch (`run`, `gui`, `selftest`, `help`,
  `version`).
- `tests/` - headless suite: state, needs, personality, persistence,
  brain, sprite, window controller (108 tests, seeded and
  deterministic).
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
