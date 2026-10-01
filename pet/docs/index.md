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
  fades over 20 minutes. Time-delta correct, dt clamped to 5 s.
- **Personality** (`pet_core/personality.py`): offline line pools per mood
  (happy, curious, sleepy, grumpy, hungry, affectionate) and per event
  (poke, feed, play, wake, sleep, greet, stroke, catch). Seeded, no repeats until each
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
`--no-save`, `--seed N`, `--name NAME`. Window position, stats, settings, and name persist across restarts:
the pet state (`pet.json`) and the dialog settings (`settings.json`)
save atomically beside each other. Where tkinter or a display is
missing, `gui` exits with an honest note pointing at headless `run`.

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

- `python -m pet run [--ticks N] [--seed S] [--name NAME] [--realtime]
  [--dt SEC] [--save PATH] [--no-save]`: run the brain headlessly.
- `python -m pet gui [--scale F] [--alpha A] [--no-topmost] [--name NAME]
  [--save PATH] [--no-save] [--seed S]`: open the on-screen companion.
- `python -m pet settings [--set field=value ...]`: show or change
  saved settings.
- `python -m pet startup (on|off|status)`: launch-at-login entry.
- `python -m pet notify --message TEXT [--title TEXT]`: OS note with
  honest bubble fallback.
- `python -m pet selftest`: headless suite plus a seeded soak proving all
  five activities are reachable.
- `python -m pet help` / `python -m pet version`: usage and version.

## Troubleshooting

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
