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
- **Play layer** (`pet_app/interact.py`): stroke streaks, munch
  sessions, the ball-toss mini-game, and the bedtime sleep schedule,
  all headless with no GUI imports so tests drive the same code as the
  window.
- **Needs** (`pet_core/needs.py`): hunger fills over 10 minutes, awake
  energy drains over 15 minutes, sleep restores over 5 minutes, affection
  fades over 20 minutes. Time-delta correct, dt clamped to 5 s. Rates are
  resolved per active character through the trait tables (Pip matches the
  base rates exactly).
- **Catalog** (`pet_core/catalog.py`, `pet_core/traits.py`): six originals
  (Pip, Bramble, Mochi, Kiki, Rusty, Luna) with distinct body plans,
  palettes, temperaments, stat rates, walk speeds, and transition biases.
  Every stat difference is data in the trait tables, never a branch in the
  brain. Third-party pack entries merge in by slug with built-ins winning
  collisions and unknown ids falling back to Pip.
- **Personality** (`pet_core/personality.py`): offline line pools per mood
  (happy, curious, sleepy, grumpy, hungry, affectionate) and per event
  (poke, feed, play, wake, sleep, greet, stroke, catch). Seeded, no repeats until each
  pool is exhausted, renameable. Each character ships its own voice with a
  shared Pip fallback for missing keys; draw bags are keyed per character.
- **Brain** (`pet_core/brain.py`): `tick(dt)` at 10 Hz nominal advances
  needs, drifts position while walking, rolls one needs-weighted activity
  transition, and emits at most one event. REACT is transient, SLEEP
  auto-wakes once rested. Interactions (`poke`, `feed_pet`, `stroke`,
  `invite_play`, `send_to_sleep`, `wake`, `rename`, `set_character`) are the same calls the
  window and the tests use. `python -m pet characters (list|show|switch)`
  mirrors switching in the CLI with atomic persistence.
- **Persistence** (`pet_core/persistence.py`): atomic tmp-plus-rename JSON
  in the platform user-data dir, schema-checked, corrupt files backed up
  to `.bak` with a fresh start and a logged notice. Schema v2 adds
  `character_id`; v1 saves migrate automatically with Pip selected.

## On-screen companion

`python -m pet gui` opens the borderless always-on-top window: a
procedurally drawn pet on a tkinter canvas, no image assets. The window
is a thin shell over the same brain: single click strokes (repeat
gentle clicks for an affection streak and a purring celebration),
double click pokes, press-drag picks the pet up and carries it
(movement suspends, drop shows a relieved line), right click opens the
menu (Feed, Play, Sleep/Wake, Sleep schedule toggle, Settings, About,
Quit). Feeding opens a munch animation; Play starts a ball-toss mini-game
where the pet chases a bouncing ball and scores each catch, ending at
5 catches or 30 seconds with a score line. A bedtime schedule
(22:00 to 7:00 local by default) tucks the pet in and wakes it up;
manual sleep/wake choices hold for 2 minutes first. While walking the
window itself drifts across the screen inside display bounds.

Window options: `--scale 0.5..3.0` (multiplied by probed display DPI),
`--alpha 0.3..1.0` (opacity), `--no-topmost`, `--save PATH`,
`--no-save`, `--seed N`, `--name NAME`, `--character ID`. Window position, stats, settings, and name persist across restarts:
the pet state (`pet.json`) and the dialog settings (`settings.json`)
save atomically beside each other. Where tkinter or a display is
missing, `gui` exits with an honest note pointing at headless `run`.

## Character cast and animation

One parametric engine draws all six characters (`pet_app/sprite.py`):
shared activity keyframes (blink cycle, breathing squash, walk bob,
play jumps, sleep Z-float, startle squash, carried dangle) layered with
per-character motion style (Bramble jumps highest, Mochi barely leaves
the floor, Kiki darts its gaze, Rusty moves stiffly, Luna hovers), then
rendered through body-plan geometry (blob, quadruped, slime, avian,
robot, winged) painted with each character's catalog palette plus its
own accessories (fox tail tip and legs, slime shine and puddle, crest
and beak, antenna and visor, wings and moon mark). Every pose is a pure
function of `(character, activity, phase)` and every coordinate scales
linearly with size, so DPI scaling stays crisp and the Pages showcase
mirrors the same math value-for-value in canvas calls.

Switching is live and safe: `python -m pet characters switch bramble`
persists the selection atomically, `python -m pet gui --character kiki`
opens as that character, and the desktop window can hot-swap without
reopening (the pose blend restarts from the current pose so the swap
morphs instead of popping). Stats carry across switches; unknown ids
fall back to Pip with a notice, never a traceback.

## Settings, startup, notifications

The Settings menu entry opens a form for name, behavior toggles
(wander, play invitations, bedtime routine, speech-bubble chatter),
transparency, size, bedtime and wake hours, always-on-top, and start
at login. Changes apply live and persist; restart restores everything
including window position. The same file is manageable headlessly:

- `python -m pet settings [--set field=value ...]`: show or change
  saved settings (wander, play_invites, sleep_schedule, dialogue,
  topmost, alpha, scale, bedtime, wake).
- `python -m pet startup (on|off|status)`: launch-at-login entry per
  OS (Registry Run key on Windows, LaunchAgent plist on macOS, XDG
  autostart file on Linux).
- `python -m pet notify --message TEXT [--title TEXT]`: best-effort OS
  note via osascript (macOS) or notify-send (Linux); where the path is
  missing it fails closed with an honest note and the pet shows the
  notice in its speech bubble instead. Windows always uses the bubble
  and says so.

## Command reference

- `python -m pet run [--ticks N] [--seed S] [--name NAME] [--character ID] [--realtime]
  [--dt SEC] [--save PATH] [--no-save]`: run the brain headlessly.
- `python -m pet gui [--scale F] [--alpha A] [--no-topmost] [--name NAME] [--character ID]
  [--save PATH] [--no-save] [--seed S]`: open the on-screen companion.
- `python -m pet settings [--set field=value ...]`: show or change
  saved settings.
- `python -m pet characters (list|show ID|switch ID)`: list the
  six-character catalog, show one character's details, or switch the
  active character with atomic persistence.
- `python -m pet startup (on|off|status)`: launch-at-login entry.
- `python -m pet notify --message TEXT [--title TEXT]`: OS note with
  honest bubble fallback.
- `python -m pet selftest`: headless suite plus a seeded soak proving all
  five activities are reachable.
- `python -m pet help` / `python -m pet version`: usage and version.

Set `DESKTOP_PET_NO_DISPLAY=1` to force the honest headless path for
`gui` on any OS (used by CI and automated tests so GUI behavior stays
deterministic on machines that do have a display).

## Packaging

Run-from-source is the primary install path; the optional one-file
binaries are built from documented recipes, never downloaded blind:

- `packaging/build.sh` (Linux/macOS) and
  `packaging/build-windows.ps1` (Windows) wrap
  `packaging/desktop-pet.spec` (PyInstaller, console build, zero
  assets), write `dist/SHA256SUMS.txt`, and run `selftest` on the
  finished bundle. Artifacts: `dist/desktop-pet` (Linux/macOS),
  `dist/desktop-pet.exe` (Windows). Full matrix and checksum commands
  live in `packaging/README.md`.

## Troubleshooting

- **No window on a machine with a screen**: Linux needs a display
  (`DISPLAY` or Wayland) plus tkinter (`python3-tk` on Debian/Ubuntu).
  Set `DESKTOP_PET_NO_DISPLAY=1` to force the honest headless path
  anywhere, e.g. in CI.
- **Save file corrupt**: the pet starts fresh and the old file is kept
  next to it with a `.bak` suffix. Nothing is deleted silently.
- **Pet always sleepy**: energy drains while awake and restores only in
  SLEEP. Send it to sleep (or let the brain decide) and it wakes rested.
- **Pet always hungry**: hunger fills over about 10 minutes of pet time.
  Feed it through the event API or the window Feed menu item.
- **Pet falls asleep at night**: the bedtime schedule (22:00 to 7:00
  local) tucks it in automatically. Wake it from the menu for a
  2-minute grace window, or turn the routine off with the Sleep
  schedule toggle.
- **Deterministic replay**: pass `--seed` to `run` for a reproducible
  session, useful when reporting odd behavior.
