# Maze Chase: desktop install and launch guide

The native desktop game (`maze-chase-desktop`): a windowed/fullscreen GUI
on the shared deterministic engine, with keyboard plus gamepad input,
pixel menus, machine high scores, and synthesized audio. Settings and
scores live in the same directory as the terminal game (`~/.maze-chase`
by default), so both layers share configuration and the leaderboard.

## Install

Pick the artifact for your OS from the release page once a release is
published (or build one with the commands below). Every download is
checksummed with `SHA256SUMS.txt`; [release.md](release.md) covers
upgrading, uninstalling, and clearing saved settings.

- **Linux**: `maze-chase-desktop_<version>_<arch>.deb`,
  `maze-chase-desktop-<version>-1.<arch>.rpm`, or the portable tarball.
  `sudo dpkg -i <deb>` or `sudo rpm -i <rpm>` installs the game, menu
  entry, and icon system-wide; the tarball's `install-linux.sh` installs
  per-user.
- **Windows**: `maze-chase-desktop-<version>-windows-x86_64-setup.exe`
  installs per-user with no administrator prompt (Start Menu and optional
  desktop shortcut, standard uninstaller). The zip is portable.
- **macOS**: open the dmg and drag `Maze Chase.app` to Applications, or
  extract the tarball.

To build from source, use Rust 1.89+ with cargo. System needs:

- **Linux**: `sudo apt-get install libasound2-dev libudev-dev`
  (build-time ALSA headers for audio, udev headers for gamepad
  input) plus `libxkbcommon0 libxkbcommon-x11-0` (winit
  runtime for window creation and keyboard handling). Most desktop
  distributions already ship the xkbcommon pair; the ALSA and udev
  headers are the packages a fresh build machine is likely missing.
- **Windows**: nothing beyond the Rust toolchain (WASAPI audio and
  Win32 windowing need no extra installs). The zip ships an unsigned
  `.exe`: the first launch shows the SmartScreen "Windows protected
  your PC" prompt (choose More info, then Run anyway), and Windows
  remembers the choice after that.
- **macOS**: nothing beyond the Rust toolchain (CoreAudio and AppKit
  need no extra installs). The bundle is unsigned: first launch needs
  right-click Open, then Gatekeeper remembers it.

Build and install from the repo root (`RandomLabs/`):

```sh
# Linux: release tarball plus install into $HOME/.local
bash maze-chase/packaging/desktop/linux-tarball.sh
bash maze-chase/packaging/desktop/install-linux.sh
# From a tarball instead:
bash maze-chase/packaging/desktop/install-linux.sh --tarball maze-chase/dist/maze-chase-desktop-<version>-linux-x86_64.tar.gz --prefix /tmp/mcprefix

# Native packages (on the matching host):
bash maze-chase/packaging/desktop/build-deb.sh
bash maze-chase/packaging/desktop/build-rpm.sh

# Windows (on a Windows machine): zip plus per-user installer
powershell -ExecutionPolicy Bypass -File maze-chase/packaging/desktop/windows-installer.ps1

# macOS (on a Mac): app and dmg (tarball: macos-tarball.sh)
bash maze-chase/packaging/desktop/macos-dmg.sh
```

Or run uninstalled during development (cargo commands run from inside
`maze-chase/`, the workspace root):

```sh
cargo run --release -p maze-chase-desktop -- --help
```

## Launch

```sh
maze-chase-desktop [OPTIONS]        # Linux / macOS
maze-chase-desktop.exe [OPTIONS]    # Windows (from the zip; same options)

Options:
  --fullscreen                 start fullscreen
  --no-pad                     ignore gamepads
  --dir <path>                 config/scores directory (default ~/.maze-chase)
  --probe <frames> <shot.ppm>  render N frames, save a screenshot, exit
  --help / --version
```

The window opens at 1100x760 and rescales live: the board renders at an
integer magnification with a side HUD, and windows too small for scale 1
show a too-small card instead of a clipped game. `F` toggles
borderless fullscreen at runtime.

Window sizing is in physical pixels, so a HiDPI display renders at its
real density instead of at the logical size, and a display change
re-reads the scale factor and repaints. Frames stay bounded: a window
larger than the 16.7M-pixel software budget renders at the largest
proportional size inside it and is scaled up on presentation, with a
one-time stderr reason and a `(scaled render)` title suffix rather than
a silent freeze. The event loop only runs continuous frames while
playing (or while `--probe` counts down); menus, help, scores, settings,
pause, and game-over schedule no continuous frames, and a bounded 16 ms
gamepad poll redraws only on input, so an idle window does no continuous
rendering.

## Controls

Keyboard (physical codes, layout-independent; remappable in
Settings/Keybinds): arrows or WASD steer, `P` pauses, `M` mutes,
`F` fullscreen, `Esc` menus/back.

Gamepad (remappable in Settings/Padbinds): left stick or D-pad steers,
South/A confirms, East/B backs out, North/Y mutes, Start pauses.
Sticks use a 0.35 deadzone; the dominant axis wins on diagonals. With
no pad connected the game plays identically on keyboard (`--no-pad`
forces that state even with hardware present).

## Screens

Title (Play, How to play, High scores, Settings, Audio, Quit), Help
(scrollable), High scores (machine top 10, shared with the terminal
game), Settings (difficulty, theme, reduced flash, reduced motion, high contrast, FPS readout,
keybinds, padbinds), Audio (master/music/SFX sliders plus mute),
Keybinds and Padbinds (duplicate-safe capture, `Esc` cancels),
Pause (resume or quit to title over the frozen board), Game over
(score, level, rank).

Difficulty presets are honest engine configurations: Cozy is Classic
from level 1, Standard is Classic from level 2, Harsh is Sprint
(single wick). Volumes apply live while sliders move.

## Audio

Layered one-shot effects and the five original multi-track tunes
synthesize at runtime (44.1 kHz) from the shared audio data: seven
voice families build mallet plucks, drops, reeds, drones, glass,
bells, and dry plucks, and the music runs at the single shared 108 BPM
with swung eighths.
The title lead, counterline, and drop accents schedule on separate
track lanes. Music defaults to 60 percent and SFX to 80 percent;
master, music, and SFX gain changes take effect immediately on static
screens and fade over 120 ms during play, and mute silences both buses
without removing visual feedback. On machines with no audio
device the game starts silently instead of failing; the Audio screen
still records every level.

## Verification without a display

`--probe` opens the window, presents N real frames through the OS
compositor path, writes the last frame as binary PPM, and exits 0:

```sh
xvfb-run -a maze-chase-desktop --no-pad --probe 90 /tmp/shot.ppm
```

CI and per-OS runners use this to prove the window path end to end.
A committed sample from that pipeline ships in this repo
(`docs/desktop-probe.ppm`: P6 binary PPM, 1100x760, 2508016 bytes,
captured with `xvfb-run -a maze-chase-desktop --no-pad --probe 30`);
open it with any image viewer (`xdg-open
maze-chase/docs/desktop-probe.ppm` on Linux) to preview the title
frame without building. The committed gameplay capture
`docs/desktop-gameplay.ppm` (P6 binary PPM, 1100x760, 2508016 bytes,
sha256 `02ea979c910ddca2feea3a0731e812cae0cb8bd0f05416eb3d3fc8b32bd1390f`)
comes from the same window pipeline after driving a play state under
Xvfb (Return to start, then Right and Down to steer) before the probe
saved the frame, so the board, HUD, and actors are all visible.

`--fullscreen --probe` waits for the window manager to apply the
borderless-fullscreen resize before it captures, so the PPM carries
the display dimensions instead of the launch window's 1100x760 (the
wait is bounded at two seconds, so a window manager that never
resizes cannot hang the run; the capture is then re-rendered at the
size the window actually has). Borderless fullscreen is a
window-manager feature: a bare X server with no WM never resizes, so
start a WM inside Xvfb when verifying fullscreen captures:

```sh
Xvfb :99 -screen 0 1280x1024x24 &
DISPLAY=:99 openbox &
DISPLAY=:99 maze-chase-desktop --no-pad --fullscreen --probe 30 /tmp/shot.ppm
# the PPM header carries the display size: P6 1280 1024 ...
```

If the window or the software surface cannot be created at all, the
game prints the backend reason on stderr and exits 1: no silent
success with no window and no screenshot.

The 5x7 HUD face, the framebuffer, the board rasterizer, input
mapping, pad parsing, the synth, and the screens all carry unit tests
(`cargo test -p maze-chase-desktop`); `tests/headless.rs` replays a
scripted run and asserts pixel-identical output across seeds.

## Troubleshooting

- `cannot open a display`: run inside a desktop session (or Xvfb for
  probes). Wayland and X11 both work through winit.
- `cannot create the game window`, `cannot create the display
  context`, or `cannot create the presentation surface`: the display
  or window manager refused the window or the software surface; the
  game prints the backend reason on stderr and exits 1. Run on a
  desktop session, and add a window manager inside Xvfb for
  fullscreen probes (see above).
- `libxkbcommon-x11.so could not be loaded` (Linux): install
  `libxkbcommon0 libxkbcommon-x11-0`.
- ALSA `cannot find card` spew on voiceless machines: harmless stderr
  from the audio backend while it falls back to silence.
- `alsa-sys build failed` at compile time (Linux): install
  `libasound2-dev` and rebuild.
- No gamepad appears: check the OS sees it first (`/dev/input`,
  Game Controllers, System Information); the Padbinds screen only
  lists OS-present devices.
- Window too small card: drag larger; the minimum is 492x296 for the
  board at scale 1 plus the HUD.

## Reproducible builds

Pin the toolchain (`rustc --version` is recorded in release notes),
`cargo build --release -p maze-chase-desktop` from a clean checkout
(inside `maze-chase/`),
then the per-OS staging script above. The engine, assets, audio, and
config crates are dependency-light on purpose; the desktop crate adds
exactly four third-party crates (winit, softbuffer, gilrs, rodio),
all pinned in `maze-chase/Cargo.lock`.
