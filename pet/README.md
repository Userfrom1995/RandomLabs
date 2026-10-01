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
`python -m pet gui`. The play layer is part of the same build: gentle
clicks stroke the pet into affection streaks, feeding opens a munch
animation, Play starts a ball-toss mini-game with a live score, and a
bedtime schedule tucks the pet in at night and wakes it in the
morning. The settings dialog and per-OS startup shells are part of
the same build: Settings on the menu opens a form for name, behavior
toggles, transparency, size, bedtime hours, and start-at-login, all
restored on restart.

## Quickstart

Requires Python 3.10 or newer. No third-party packages.

```sh
python -m pet selftest
python -m pet gui
python -m pet gui --scale 1.5 --alpha 0.9
python -m pet run --ticks 300 --seed 7
python -m pet run --ticks 600 --name Mochi --realtime
python -m pet settings
python -m pet settings --set wander=off --set alpha=0.8
python -m pet startup status
python -m pet notify --message "Time for a stretch"
python -m pet help
python -m pet version
```

`gui` opens the on-screen companion: it stays on top, wanders the
screen while walking, and answers back in a speech bubble. Single click
strokes (repeat gentle clicks for an affection streak and a purring
celebration), double click pokes, press-drag picks the pet up and
carries it, right click opens the menu (Feed, Play, Sleep/Wake, Sleep
schedule toggle, Settings, About, Quit). Feed opens a munch animation; Play
starts a ball-toss mini-game where the pet chases a bouncing ball and
scores each catch (first to 5, or 30 seconds, ends the rally with a
score line).
Window options: `--scale 0.5..3.0` (multiplied by display DPI),
`--alpha 0.3..1.0` (opacity), `--no-topmost`, `--save PATH`,
`--no-save`. Without tkinter or a display it exits with an honest note
instead of a traceback. Set `DESKTOP_PET_NO_DISPLAY=1` to force that
honest headless path on any OS (used by CI and automated tests).

`run` drives the brain headlessly in your terminal: it loads the saved
pet (or starts fresh), prints activity changes and dialogue lines, and
saves on exit. Saves live in the platform user-data dir
(`~/.local/share/desktop-pet` on Linux,
`~/Library/Application Support/DesktopPet` on macOS,
`%APPDATA%/DesktopPet` on Windows), overridable with
`DESKTOP_PET_DATA_DIR` for tests and portable setups. The pet state
(`pet.json`) holds stats and window position; `settings.json` beside
it holds the settings dialog values. Both restore on restart.

## Settings

The Settings menu entry (or `python -m pet settings`) manages the
persisted configuration: pet name, wander toggle (the pet stays put
but still chats and plays), play-invitation toggle (spontaneous play
offers stop; the Play menu action still works), bedtime routine toggle
plus bedtime and wake hours (`HH:MM`), speech-bubble chatter toggle,
always-on-top toggle, transparency (`0.3..1.0`), and size
(`0.5..3.0`, multiplied by display DPI). The dialog applies changes
live (the window re-renders, resizes, and re-layers immediately) and
saves them; restart restores name, stats, settings, and window
position. A corrupt settings file is backed up to `.bak` and replaced
with defaults, with a notice, never a traceback.

## Startup and notifications

`python -m pet startup (on|off|status)` manages launch at login
through the per-OS shell behind one contract (`set_startup`,
`is_startup_enabled`, `notify`, `platform_notes`): a per-user
Registry Run entry on Windows, a LaunchAgent plist on macOS, an XDG
autostart `.desktop` file on Linux. Notifications (`python -m pet
notify`) try `osascript` on macOS and `notify-send` on Linux; where a
path is missing the call fails closed with an honest note and the pet
shows the notice in its speech bubble instead. Windows has no bundled
toast path, so it always uses the bubble and says so. The settings
dialog surfaces the same startup toggle with the platform note beside
it, so a denied capability reads as an explanation, never an error.

## Packaging

Run-from-source is the primary install path. For a double-clickable
app, build the optional one-file binary from the documented recipes:

```sh
sh pet/packaging/build.sh                                # Linux/macOS
powershell -ExecutionPolicy Bypass -File pet\packaging\build-windows.ps1  # Windows
```

Each recipe wraps `packaging/desktop-pet.spec` (PyInstaller, console
build so `run`, `settings`, and `selftest` keep working), writes
`dist/SHA256SUMS.txt`, and runs `selftest` on the finished bundle.
No binaries are checked in; the per-OS matrix and checksum commands
live in `packaging/README.md`.

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
  wake, sleep, greet, stroke, catch). No network, no telemetry: drawing is seeded and
  no-repeat-until-exhausted, and `{name}` slots carry the pet's name.
- **Play layer.** `pet_app/interact.py` holds the headless interaction
  models with no GUI imports: stroke streaks (debounced passes inside a
  2.5 s window, celebration every few passes), munch sessions (a 3 s
  chew pose after feeding), the ball-toss game (seeded gravity and
  bounce physics in unit-box coordinates, pet marker chases the ball,
  catch on low meetings, rally ends at 5 catches or 30 s), and the
  bedtime schedule (asleep 22:00 to 7:00 by default, midnight-wrap
  correct, manual sleep/wake choices hold for 2 minutes before the
  schedule re-asserts). The controller wires these into gestures, menu
  actions, and ticks; the shell only renders.
- **Persistence.** Debounced atomic write (tmp file plus rename). Load
  validates the schema version, clamps ranges, backs corrupt files up
  to `.bak`, and starts fresh with a logged notice. Settings persist
  separately (`settings.json`) with the same atomicity and recovery.
- **Behavior toggles.** `Brain(allow_walk=..., allow_play=...)` gates
  spontaneous WALK and PLAY transitions at the weight table (manual
  menu actions bypass the gate), so the settings toggles reshape the
  personality without touching the state machine.

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
| Start at login (`startup`, dialog toggle) | yes (Run key) | yes (LaunchAgent) | yes (autostart) |
| OS notifications (`notify`) | bubble note | yes (osascript) | yes (notify-send) |
| One-file binary (recipe) | yes (`packaging/build-windows.ps1`) | yes (`packaging/build.sh`) | yes (`packaging/build.sh`) |

The window needs tkinter plus a display; where either is missing the
`gui` command exits with an honest note pointing at headless `run`.

Where a platform denies a capability, the pet says so in-app instead of
failing silently.

## Layout

- `pet_core/` - headless brain: `state.py`, `brain.py`, `needs.py`,
  `personality.py`, `persistence.py`. No GUI imports, no dependencies.
- `pet_app/` - on-screen companion: `sprite.py` (pure pose engine plus
  shape lists), `controller.py` (bubble, gestures, menu model, carry,
  blending, settings application; no GUI imports), `interact.py` (stroke
  streaks, munch sessions, ball-toss game, sleep schedule; no GUI
  imports), `settings.py` (validated settings model plus atomic
  persistence; no GUI imports), `shells.py` plus `shell_win.py`,
  `shell_macos.py`, `shell_linux.py` (startup and notifications behind
  one contract; no GUI imports), `platform.py` (capability probe,
  alpha and scale clamps), `window.py` (borderless tkinter shell plus
  settings dialog).
- `__main__.py` - CLI dispatch (`run`, `gui`, `settings`, `startup`,
  `notify`, `selftest`, `help`, `version`).
- `tests/` - headless suite: state, needs, personality, persistence,
  brain, sprite, window controller, interaction play layer, settings
  and brain toggles, per-OS shells (249 tests, seeded and
  deterministic).
- `packaging/` - one-file PyInstaller recipes: `desktop-pet.spec`,
  `build.sh` (Linux/macOS), `build-windows.ps1` (Windows), build
  README with the per-OS download matrix.
- `docs/` - unified product documentation.
- `index.html` - Pages hub for this project, with a live canvas
  showcase mirroring the real sprite math.

## Verification

```sh
python -m unittest discover -s pet/tests -t .
python -m pet selftest
python tests/test_desktop_pet.py
```

All three must be green: the headless suite, the CLI selftest (suite
plus a seeded soak proving the brain reaches every activity), and the
static gate (file wiring, dependency rule, facade scan, docs unity).
