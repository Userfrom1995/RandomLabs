# Desktop Pet - Cross-Platform Interactive Companion

A lightweight, always-on-top desktop companion that feels alive: it idles,
wanders, plays, sleeps, and reacts to the user, with its own nameable
personality, procedural animation, and per-OS native integration on Windows,
macOS, and Linux. Zero third-party dependencies, offline by default, and
honest about platform limits.

## What Will Be Built

A Python 3.10+ stdlib-only application (`pet/`) plus a Pages hub at
`pet/index.html`. The native app is a borderless always-on-top window
rendering a procedurally drawn pet on a `tkinter` canvas. A shared headless
core drives all behavior; thin per-OS shells handle startup, transparency,
and notifications where each platform allows.

- **Companion core (headless, fully tested).** `pet/pet_core/` holds the
  whole brain with no GUI imports: `state.py` (dataclasses for mood,
  energy, hunger, affection, position, activity with JSON round-trip),
  `brain.py` (tick state machine IDLE / WALK / PLAY / SLEEP / REACT with
  probabilistic transitions modulated by needs, O(1) per tick at 10 Hz),
  `personality.py` (named persona "Pip" plus dialogue pools per mood and
  event, deterministic seeded picker, user-renameable), `needs.py`
  (hunger/energy/affection decay and restore math with clamped rates and
  time-delta correctness), `persistence.py` (atomic JSON save/load in the
  platform user-data dir, corrupt-file fail-closed to defaults with backup).
- **Native companion window.** `pet/pet_app/window.py`: borderless
  `tkinter.Toplevel` with `-topmost`, `-transparentcolor` / `-alpha`
  transparency, click-through-safe draganywhere carry mode, taskbar
  exclusion, and DPI-aware scaling (`tk scaling` probed from the display
  plus a manual override). Canvas is vector-drawn at 60 fps via
  `after()` scheduling; no image assets, no binary blobs.
- **Procedural sprite and animation.** `pet/pet_app/sprite.py`: a round
  blob-cat drawn from canvas primitives (body, ears, tail, eyes, blush)
  with parametric poses per activity plus eased interpolation between
  poses (blink cycle, breathing squash, walk bob and tail sway, sleep
  Z-float, happy jump, startled squash, dangle pose while dragged).
  Every pose is a pure function of `(activity, phase, scale)` so the
  Pages showcase can mirror it 1:1 in JS canvas.
- **Interactions.** Click (poke: startle reaction plus context dialogue),
  sustained press-drag (pick up and carry: movement suspends, dangle pose,
  drop triggers relieved/happy reaction), stroke (repeated slow passes
  raise affection), feed (tray/menu or key: hunger restore with munch
  animation and thanks line), play (ball toss mini-game: pet chases a
  bouncing dot on the canvas), sleep/wake (click when sleepy or menu
  toggle). Right-click menu: feed, play, sleep/wake, settings, about,
  quit. All interactions drive the same core event API the tests call.
- **Personality and dialogue.** Speech bubble above the pet with
  mood-labeled lines (happy, curious, sleepy, grumpy, hungry, affectionate
  plus event lines for poke, feed, play, wake). No network, no LLM, no
  telemetry: the persona is a curated offline line pool with
  no-repeat-until-exhausted cycling and user name insertion.
- **Settings and persistence.** `pet/pet_app/settings.py`: pet name,
  behavior toggles (wander, play invites, sleep schedule, dialogue),
  transparency slider, always-on-top toggle, scale selector, startup
  toggle. Persisted with core state; restart restores name, stats,
  settings, and window position.
- **Per-OS shells.** `pet/pet_app/shell_win.py` (registry Run key for
  startup, `plyer`-free balloon fallback to in-bubble notices),
  `shell_macos.py` (LaunchAgent plist writer, `osascript` notification
  best-effort), `shell_linux.py` (XDG autostart `.desktop` writer,
  `notify-send` best-effort). Each shell exposes the same three functions
  (`set_startup`, `notify`, `platform_notes`) and fails closed with an
  honest in-app note where the platform denies the capability.
- **Packaging and downloads.** Run-from-source (`python -m pet`) is the
  primary path on all three OS families; an optional PyInstaller one-file
  recipe per OS ships as documented build scripts (not opaque binaries),
  with SHA checks recorded in the hub download matrix.
- **Pages hub.** `pet/index.html` plus `pet/docs/`: live canvas replica
  of the sprite with activity switcher (idle/walk/play/sleep/react),
  interaction explainer, per-OS quickstart and honest support matrix,
  downloads, settings tour, and troubleshooting. Mirrors the real pose
  math so the showcase never drifts from the shipped pet.

## Why

The owner asked for a real companion, not a widget: something that stays
on screen, moves on its own, wants things, and answers back, on whatever
machine it lands on. The engineering depth is in making that aliveness
cheap and truthful: a deterministic needs-driven brain decoupled from
rendering, buttery procedural animation with zero assets, and per-OS
integration that degrades honestly instead of pretending every platform
behaves the same. Stdlib-only keeps it installable anywhere Python runs
with no supply-chain weight and trivial per-OS CI.

## How It Works

- **Strict core/presentation split.** `pet_core` never imports `tkinter`
  or any shell module; `pet_app` is a thin renderer translating core
  state into canvas poses and forwarding pointer events into core events.
  The Tester drives the entire behavior loop headlessly.
- **Tick loop.** `brain.tick(dt)` advances needs, rolls activity
  transitions from a needs-weighted table, emits at most one
  dialogue/action event per tick, and stays O(1). The GUI schedules it at
  10 Hz; rendering interpolates at display rate from the latest state.
- **Pose math.** Each activity defines keyframe parameter sets
  (body squash, eye openness, tail angle, ear tilt, hop offset);
  `sprite.pose(activity, phase)` cosine-interpolates between them with
  per-part easing. Scale factor multiplies every coordinate so DPI and
  user size selection stay crisp vector rendering.
- **Persistence.** Debounced atomic write (tmp plus rename) every 30 s
  and on quit; load validates schema version, clamps ranges, backs up
  corrupt files to `.bak`, and starts fresh with a logged notice.
- **Capability gating.** `platform.py` probes transparency, topmost, and
  notification support at boot; unsupported paths render the shared
  honest-note bubble instead of failing silently.
- **Verification.** `pet/tests/` headless suite (state transitions,
  needs math, dialogue cycling, persistence round-trip and corrupt-file
  recovery, per-shell contract with fakes) plus a static gate
  (`tests/test_desktop_pet.py`: file wiring, no-third-party-import rule,
  no-facade patterns, docs unity) and an in-app `?selftest`-style
  `--selftest` headless run. Per-OS testers run the real window natively
  on ubuntu, macos, and windows runners.

## Module Breakdown

- `pet/__main__.py` - CLI dispatch (`run`, `selftest`, `help`, `version`).
- `pet/pet_core/state.py`, `brain.py`, `needs.py`, `personality.py`,
  `persistence.py` - headless companion brain.
- `pet/pet_app/window.py` - borderless topmost window, drag, transparency,
  DPI scaling, menu, bubble.
- `pet/pet_app/sprite.py` - procedural pose engine and canvas renderer.
- `pet/pet_app/settings.py` - settings model and dialog.
- `pet/pet_app/platform.py`, `shell_win.py`, `shell_macos.py`,
  `shell_linux.py` - per-OS integration behind one contract.
- `pet/index.html`, `pet/css/`, `pet/js/`, `pet/docs/` - Pages hub and
  unified docs.
- `pet/tests/`, `tests/test_desktop_pet.py` - headless plus static gates.
- `pet/README.md` - unified product view (no phase or milestone language).

## Test Matrix

- Static gate: required files exist, `pet_core` imports nothing GUI/OS
  specific, no `pip install` requirement, no facade markers (fake
  buttons, coming-soon controls, simulated needs), docs present and
  unified, hub links resolve.
- Headless: brain reaches every activity within N ticks on seeded runs,
  needs decay/restore math exact on fixtures, dialogue pools cycle
  without immediate repeats, persistence round-trips and recovers from
  corrupt files, each shell honors the contract via fakes.
- GUI smoke: window opens topmost and borderless, drag moves it, every
  interaction fires its core event and visible reaction, transparency and
  scale controls re-render without exceptions, restart restores state.
- Per-OS native: run-from-source plus startup toggle plus notification
  path verified on Windows, macOS, and Linux runners; unsupported paths
  show honest notes instead of tracebacks.
- Hub: Pages build green, canvas replica animates every activity at
  desktop and 390 px widths with no horizontal scroll, quickstart commands
  copy-paste correct per OS.
