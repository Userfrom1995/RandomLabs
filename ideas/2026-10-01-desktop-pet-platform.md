# Desktop Pet Platform - Multi-Character Catalog, Tray Service, Installers

A full desktop companion platform built directly on top of the shipped
Desktop Pet from #498: the same stdlib-only headless brain, the same
procedural tkinter companion window, the same per-OS shells, extended
into a switchable multi-character catalog with distinct personalities,
moods, animations, and interaction styles, an always-on-top overlay
with a real background/tray service mode, proper per-OS installers
with clean install/uninstall and autostart, and a documented
creator-pack framework so third parties can add characters without
touching core. The Pages hub at `pet/` grows a catalog gallery plus
service and installer docs next to the existing showcase.

## What Will Be Built

A single unified platform in `pet/` (no rewrite: every existing
module stays API-compatible and migrates forward):

- **Character catalog core (headless, fully tested).** A new
  `pet/pet_core/catalog.py` registry plus `traits.py` parameter tables.
  The shipped `PetState` gains one field (`character_id`, schema v1 to
  v2 with automatic migration; v1 saves load with Pip selected and a
  notice). `needs.py` rate constants become per-character trait
  parameters (hunger horizon, energy drain/restore, affection decay,
  walk speed, play bias); `brain.py` reads them through a trait
  accessor so seeded determinism and the O(1) 10 Hz tick contract are
  unchanged. `personality.py` gains per-character voice packs: each
  character ships mood plus event line pools in its own voice with a
  shared Pip fallback for any missing key, keeping the
  no-repeat-until-exhausted bag cycling and `{name}` insertion.
  Launch cast is six originals with genuinely different bodies and
  temperaments: Pip the blob-cat (balanced baseline), Bramble the fox
  (playful, fast, affection-hungry), Mochi the slime (sleepy, slow,
  cuddle-positive), Kiki the sparrow (curious, darting walker, chatter
  frequency high), Rusty the robot (literal, grumpy-cute, poke-tolerant),
  Luna the moth-dragon (nocturnal energy curve, night antics). Every
  stat difference is data in `traits.py`, never a branch in the brain.
- **Parametric sprite cast.** `pet_app/sprite.py` is refactored from a
  single blob-cat painter into a character-parameterised pose engine:
  a shared `pose_for(character_id, activity, phase)` contract returning
  eased keyframe parameters plus a `shapes()` renderer dispatched by
  body plan (blob, quadruped, slime, avian, robot, winged). Palettes,
  ear/tail/wing/accessory geometry, eye styles, blush, hop/bob/sway
  amplitudes, and sleep Z-float all come from the character record, so
  adding a seventh character is data, not a new painter. Every pose
  stays a pure function of `(character, activity, phase, scale)` with
  linear DPI scaling, and the Pages canvas mirror is extended to render
  the same records value-for-value in JS.
- **Living behaviors and conversation.** A new headless
  `pet_core/converse.py` offline intent parser (no network, no LLM):
  keyword intents for greeting, name, mood, hunger, energy, joke,
  comfort, feed/sleep/play requests, time-of-day, and help, each
  answered from the active character voice with a deterministic seeded
  fallback. A lightweight event bus in the controller emits time-based
  moments (morning greeting, late-night drowsiness, long-idle antics,
  affection milestones, post-meal contentment) with per-character
  frequencies so pets feel alive rather than reactive. Click, stroke
  streaks, feed munch sessions, the ball-toss rally, and the bedtime
  schedule from #498 are kept and re-skinned per character through
  response modifiers (Mochi purrs longer, Bramble scores faster,
  Rusty narrates catches literally).
- **Always-on-top overlay plus tray and background service.**
  `pet_app/window.py` hardens the borderless topmost shell
  (multi-monitor spawn clamp, taskbar exclusion, click-through-safe
  carry, DPI probe plus manual override, live character hot-swap that
  re-renders without reopening the window). A new `pet_app/tray.py`
  abstraction exposes one contract (`show`, `hide`, `set_tooltip`,
  `set_menu`, `is_available`); backends are tried in order and fail
  closed to an honest stdlib mini-controller: optional `pystray`
  backend where installed (declared as a packaging extra, never a hard
  dependency), thin native shims (Win32 `Shell_NotifyIcon` via ctypes,
  macOS `osascript`/Cocoa best-effort, Linux SNI/`notify-send`
  best-effort), always with the in-bubble fallback the lab already
  trusts. A new `pet_app/service.py` daemon owns the background mode:
  single-instance lockfile plus PID file, headless brain loop with
  debounced atomic saves, `pet service (start|stop|status|logs)`
  commands, and show/hide/switch routing between service and window.
  Autostart reuses the shipped Run key / LaunchAgent / XDG autostart
  shells, now pointed at the service entrypoint.
- **Creator-pack framework (no core touch).** A documented data-only
  pack layout (`pack.json` manifest plus `traits.json`, `sprite.json`,
  `dialogue/*.json`, optional preview art) with a checked-in JSON
  Schema at `pet/packs/schema.json` and a stdlib-only loader plus
  validator in `pet_core/packs.py` (`validate`, `install`, `list`,
  `remove`, collision-safe slug namespacing, semver plus engine-range
  checks, clamped numeric ranges, palette and body-plan allowlists,
  minimum dialogue pool sizes, size caps, corrupt-pack fail-closed with
  backup, never executes code). CLI: `pet pack (validate|install|list|
  remove|show)`. One first-party example pack ships as a fixture and
  as docs, proving a third party can add a character with JSON alone.
  The catalog merges built-ins plus installed packs at load; unknown
  `character_id` values in saves fall back to Pip with a notice, never
  a traceback.
- **Settings, switching, and persistence.** `settings.py` gains
  `character_id` plus per-character last-used memory; the settings
  dialog gains a catalog picker with live preview canvas, search-safe
  names, and keyboard navigation; `pet characters (list|show|switch)`
  mirrors it in the CLI. Switching persists atomically beside
  `pet.json`/`settings.json`, restores on restart including window
  position, and keeps per-character affection/energy continuity (stats
  are per-pet-save, not reset on switch, unless the user asks).
- **Real per-OS installers and clean lifecycle.** Run-from-source
  stays primary; the `pet/packaging/` recipes grow from one-file
  PyInstaller builds into true installers: Windows Inno Setup script
  (`.iss`: per-user install, Start Menu entry, optional launch-at-login
  task, clean uninstaller that removes binary plus autostart entry but
  asks before touching saves), macOS `.app` bundle layout plus
  `pkgbuild` installer plus `create-dmg` recipe with LaunchAgent
  autostart and Applications symlink, Linux `.deb` (dpkg-deb with
  `control`, `.desktop` entry, icons, XDG autostart unit) plus an
  AppImage recipe as the distro-agnostic fallback. Every script is
  fail-closed (`set -euo pipefail` / `$ErrorActionPreference = Stop`),
  writes checksums, runs the bundle `selftest` before declaring
  success, and ships `install.sh` / `uninstall.sh` (plus `.ps1`
  equivalents) that leave no autostart or tray residue. No binaries are
  checked in; the Pages download matrix records recipes, artifact
  names, and verification commands.
- **Pages hub extension.** The existing `pet/index.html` showcase keeps
  working and grows a catalog gallery (one card per launch character
  with palette, temperament sliders, and signature line), a service
  section (tray plus background mode explainer), and an installer
  section (per-OS download matrix, autostart, install/uninstall,
  verification). New unified docs beside it: `pet/docs/catalog.md`,
  `service.md`, `installers.md`, `creator-packs.md`, all in one product
  voice with no phase or milestone language.

## Why

The owner asked for a platform, not a pet: a catalog users can choose
from, pets that live over every window and survive reboots, and a
system third-party creators can extend. The research consensus on
companions (Tamagotchi, Shimeji, Finch, Pou, and the Clippy
counter-example) is consistent: attachment comes from consistent
personality voice, visible needs loops with variable-ratio rewards,
frequent low-cost idle antics, naming plus continuity, and honest
limits, never from fake buttons or pretend intelligence. The
engineering depth here is making all of that cheap and truthful on
three OS families with no forced dependencies: a data-driven brain
where personality is parameters, a pose engine where species is
parameters, a service layer that degrades honestly where platforms
deny tray or autostart, and installers that clean up after
themselves. Extending the shipped #498 core instead of rewriting it
protects the 249-test headless suite and the approve-eval 9.96/10
craft verdict already earned.

## How It Works

- **Strict core/presentation split, preserved.** `pet_core` still
  never imports `tkinter`, tray, or shell modules; `pet_app` renders
  core state and forwards pointer, menu, tray, and service events into
  the same core event API the Tester drives headlessly. New modules
  (`catalog.py`, `traits.py`, `packs.py`, `converse.py`) are stdlib-only
  and headless-tested; `tray.py` and `service.py` keep all GUI and OS
  calls behind the capability probe with fakes for tests.
- **Tick loop, parameterised.** `brain.tick(dt)` is unchanged in shape:
  advance needs through the active character trait rates, update mood
  through the active voice mapping, drift position at the character
  walk speed, roll at most one transition from the needs-weighted
  table biased by character play/rest weights, emit at most one event.
  Switching characters swaps the parameter record mid-stream; saves
  migrate v1 to v2 by stamping `character_id: pip`.
- **Pose math, parameterised.** Each body plan defines keyframe
  parameter sets per activity (squash, eye openness, tail/wing angle,
  ear tilt, hop offset, accessory bob); `pose_for` cosine-interpolates
  with per-part easing exactly as #498 did, now indexed by character
  record. Scale multiplies every coordinate so DPI and the size
  selector stay crisp vector rendering on canvas and in the Pages
  mirror.
- **Conversation, offline.** `converse.reply(text)` normalises input,
  matches ordered intent patterns (character-specific overrides first,
  shared intents second), draws from the voice pool with
  no-repeat-until-exhausted cycling, and returns `(reply, mood_hint)`.
  Unknown input falls back to a curious deflection, never silence,
  never a network call.
- **Service lifecycle.** `service start` forks headless (POSIX
  double-fork, Windows detached `pythonw` note, macOS LaunchAgent
  path), writes lock plus PID under the user-data dir, ticks the brain
  at 10 Hz with debounced atomic saves, and routes notifications
  through the shell contract. `service stop` kills by PID with stale
  lock reclamation; `status` reports alive PID plus active character
  and uptime. The window attaches to the same save dir, so service and
  GUI never fork state.
- **Pack sandbox.** Install copies a pack dir or zip into the
  user-data `packs/<slug>/` namespace after schema validation;
  load merges built-ins (which win on slug collision, with a notice)
  plus installed packs sorted by slug. Validation rejects unknown
  body plans, out-of-range numbers, bad hex palettes, undersized
  dialogue pools, oversized payloads, and path traversal in zip
  entries, backing up the offender with a logged notice.
- **Capability gating.** `platform.py` probes window, tray, service,
  and notification support at boot; every denied path renders the
  shared honest-note bubble or CLI note instead of failing silently.
  Optional `pystray` is probed at runtime and never imported at core
  module top.
- **Verification.** The #498 headless suite stays green throughout
  (migration fixtures prove v1 saves still load); new suites cover
  catalog/traits/converse/packs/tray-fakes/service-lifecycle/installer
  script shellcheck plus `--help` smoke. The static gate extends its
  no-hard-dependency rule to the new core modules and scans installer
  scripts for fail-closed headers. Per-OS testers run the real window,
  tray, service, autostart toggle, and installer build plus
  install/uninstall natively on ubuntu, macos, and windows runners.

## Module Breakdown

- `pet/pet_core/state.py` - adds `character_id` plus schema v2 with
  v1 migration path; unknown IDs fall back to Pip.
- `pet/pet_core/traits.py`, `catalog.py` - per-character stat rates,
  speeds, bias weights, body-plan records; the six-original registry
  plus merged third-party entries behind `list/get/validate`.
- `pet/pet_core/personality.py` - per-character voice packs over the
  shared fallback pools; seeded no-repeat bags per
  `(character, key)`.
- `pet/pet_core/converse.py` - offline intent parser returning voice
  replies; no network, no GUI imports.
- `pet/pet_core/packs.py`, `pet/packs/schema.json` - data-only
  creator-pack loader plus validator; install/list/remove/show.
- `pet/pet_core/persistence.py` - atomic saves plus v1 to v2
  migration, corrupt-file backup, per-character continuity.
- `pet/pet_app/sprite.py` - body-plan-dispatched parametric renderer;
  pure `pose_for` plus `shapes` per character.
- `pet/pet_app/tray.py`, `service.py` - one tray contract with
  ordered backends plus stdlib fallback; PID-locked background loop.
- `pet/pet_app/window.py`, `controller.py`, `interact.py`,
  `settings.py`, `platform.py`, `shells.py` - extended in place:
  live character hot-swap, picker dialog with preview, per-character
  interaction modifiers, event bus, service-aware autostart.
- `pet/__main__.py` - CLI grows `characters`, `pack`, `converse`
  (`talk`), `service`, `install/uninstall` alongside run/gui/settings/
  startup/notify/selftest/help/version.
- `pet/packaging/` - PyInstaller base plus Inno Setup `.iss`, macOS
  `pkgbuild`/dmg scripts, Linux `deb`/AppImage recipes, per-OS
  install/uninstall scripts, all fail-closed with checksums plus
  bundle selftest.
- `pet/index.html`, `pet/docs/` - hub grows catalog gallery, service,
  installer, and creator-pack docs beside the existing showcase.
- `pet/tests/`, `tests/test_desktop_pet.py` - headless plus static
  gates extended to every new module and script.

## Test Matrix

- Static gate: required files exist; `pet_core` plus new catalog,
  traits, converse, and packs modules import nothing GUI/OS specific
  and add no hard third-party dependency; installer scripts carry
  fail-closed headers; no facade markers (fake tray buttons,
  coming-soon picker entries, simulated needs, no-op service flags);
  docs present and unified; hub links resolve.
- Headless: every character reachable and switchable with persisted
  selection round-trip; v1 saves migrate to v2; trait rates exact on
  fixtures; voice pools cycle without immediate repeats with fallback
  for missing keys; converse intents answer deterministically per
  character; valid example pack loads and invalid packs (bad plan,
  bad palette, thin pools, traversal zip, oversize) are rejected;
  service lifecycle (start/status/stop, stale lock, double-start)
  correct via fakes; tray contract honored via fakes.
- Brain parity: seeded soak reaches all five activities under every
  launch character; per-character walk speeds and sleep curves differ
  by fixture amounts; no character starves or never sleeps.
- GUI smoke: window opens topmost and borderless, picker switches
  characters live with correct re-render, drag-carry still works,
  transparency and scale still re-render, restart restores character
  plus position plus settings, denied tray renders the honest
  mini-controller instead of an exception.
- Per-OS native: run-from-source plus window plus tray plus service
  start/stop plus autostart toggle plus installer build plus
  install/uninstall-clean verified on Windows, macOS, and Linux
  runners; unsupported paths show honest notes.
- Hub: Pages build green; catalog gallery renders all characters at
  desktop and 390 px widths with no horizontal scroll; installer
  commands copy-paste correct per OS; creator-pack schema example
  validates with the checked-in validator.
