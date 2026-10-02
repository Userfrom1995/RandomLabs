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

## Conversation and living moments

The pet chats offline (`pet_core/converse.py`): no network, no model,
just an intent parser over fourteen intents (greetings, name, mood,
hunger, energy, affection, jokes, comfort, feed, sleep, wake, play,
time, help) answered in the active character's voice with a shared
fallback for anything a character does not override. Answers are
stat-aware ("are you hungry" reads the real hunger meter, "what time
is it" reads the clock) and cycle with no-repeat-until-exhausted bags
per character, so Kiki chirps, Rusty beeps, and Luna moons over every
answer differently. Unknown lines earn a curious deflection, never
silence. Chat from the terminal or from the window:

- `python -m pet talk "tell me a joke" [--character ID] [--seed S]`:
  one offline reply in the saved (or flagged) character voice.
  `converse` is an alias for `talk`.
- In the window, typed lines are answered out loud in the speech
  bubble with the live needs context behind them.

The pet also volunteers moments on its own (`pet_core/events.py`): a
morning greeting when the day starts, a drowsy line late at night,
idle antics when nobody has interacted for a while (Kiki chatters
every 45 seconds of silence, Rusty holds out for 3 minutes),
affection milestones when the bond crosses upward, and a contented
note shortly after meals. Every moment is drawn from the active
character voice and paced by its trait record.

Interaction itself is per-character too: Mochi gains affection faster
from gentle clicks and purrs through a longer munch animation,
Bramble's eager leap catches the ball in a wider radius, Rusty barely
notices snacks and narrates catches literally, and Luna savours meals
a little more. Every difference is a number in the trait tables, never
a branch in the brain, and Pip matches the original constants exactly.

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
  and says so. Pass `--service` to `startup on` to launch the
  background service at login instead of the window; the window
  attaches to the same save when opened later.

## Background service and tray

The background service keeps one pet ticking with no window open: a
PID-locked daemon (`service.pid` under the user-data dir) runs the
headless brain at 10 Hz with atomic saves every 300 ticks. Second
starts report the live pid instead of forking; stale locks are
reclaimed with a notice; `stop` ends the process gracefully
(SIGTERM saves and exits, with a forceful fallback). The tray layer
tries `pystray` where installed, then a native shim, then the stdlib
mini-controller where the window doubles as the controller; every
denied path renders an honest note. The overlay window stays out of
the taskbar, clamps onto the visible screen on multi-monitor setups,
and hides/re-shows without losing the pet.

## Command reference

- `python -m pet run [--ticks N] [--seed S] [--name NAME] [--character ID] [--realtime]
  [--dt SEC] [--save PATH] [--no-save]`: run the brain headlessly.
- `python -m pet gui [--scale F] [--alpha A] [--no-topmost] [--name NAME] [--character ID]
  [--save PATH] [--no-save] [--seed S]`: open the on-screen companion.
- `python -m pet settings [--set field=value ...]`: show or change
  saved settings (wander, play_invites, sleep_schedule, dialogue,
  topmost, alpha, scale, bedtime, wake, character_id). The dialog
  version adds a character picker with a live rendered preview.
- `python -m pet characters (list|show ID|switch ID)`: list the
  character catalog (built-ins plus installed creator packs), show one
  character's details, or switch the active character with atomic
  persistence.
- `python -m pet pack (validate SRC|install SRC|list|remove SLUG|show SLUG)`:
  creator-pack framework: validate a pack directory or zip, install it
  into the user-data dir, list installed packs, show one manifest, or
  remove it. Invalid packs are rejected before anything is copied;
  corrupt installed packs are moved aside with a notice.
- `python -m pet talk TEXT [--character ID] [--seed S] [--no-save]`
  (`converse` is an alias): chat with the pet offline.
- `python -m pet startup (on|off|status)`: launch-at-login entry.
- `python -m pet service (start|stop|status|logs|show|hide|switch ID)`:
  background service lifecycle: spawn the always-on pet, report the
  live pid plus character and uptime, tail the log, switch the shared
  pet, or route window show/hide against the same save.
- `python -m pet tray (status|show|hide)`: system-tray state, with an
  honest note where no tray host answers.
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
- True installers wrap the binary per OS:
  `packaging/desktop-pet.iss` (Windows setup via Inno Setup 6),
  `packaging/build-macos.sh` (app bundle plus `.pkg` plus `.dmg`),
  `packaging/build-linux.sh` (`.deb` plus AppImage).
- Run-from-source shortcut scripts: `packaging/install.sh` and
  `packaging/uninstall.sh` (Linux/macOS), `packaging/install.ps1`
  and `packaging/uninstall.ps1` (Windows). Install verifies the
  interpreter, runs `selftest`, and enables launch-at-login;
  uninstall stops the service, removes autostart, and keeps saves
  unless asked to purge.

## Creator packs

Anyone can ship new characters as data: a pack directory (or zip)
with a `pack.json` manifest plus one file per character under
`characters/`, validated against `pet/packs/schema.json`. Installs
merge into the live catalog with trait rates, dialogue voices,
converse replies, palettes, and sprite hints; built-ins win slug
collisions with a notice, and unknown character ids in saves fall
back to Pip with a notice, never a traceback. The worked example at
`pet/packs/examples/sunny-pack` adds Sunny and Ember and proves the
third-party path end to end.

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
