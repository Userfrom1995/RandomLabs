# Maze Chase: desktop install and launch guide

The native desktop game (`maze-chase-desktop`): a windowed/fullscreen GUI
on the shared deterministic engine, with keyboard plus gamepad input,
pixel menus, machine high scores, and synthesized audio. Settings and
scores live in the same directory as the terminal game (`~/.maze-chase`
by default), so both layers share configuration and the leaderboard.

## Install

Rust 1.85+ with cargo. System needs:

- **Linux**: `sudo apt-get install libasound2-dev libudev-dev`
  (build-time ALSA headers for audio, udev headers for gamepad
  input) plus `libxkbcommon0 libxkbcommon-x11-0` (winit
  runtime for window creation and keyboard handling). Most desktop
  distributions already ship the xkbcommon pair; the ALSA and udev
  headers are the packages a fresh build machine is likely missing.
- **Windows**: nothing beyond the Rust toolchain (WASAPI audio and
  Win32 windowing need no extra installs).
- **macOS**: nothing beyond the Rust toolchain (CoreAudio and AppKit
  need no extra installs). The bundle is unsigned: first launch needs
  right-click Open, then Gatekeeper remembers it.

Build and install from the repo root (`RandomLabs/`):

```sh
# Linux: release tarball plus install into $HOME/.local
bash maze-chase/packaging/desktop/linux-tarball.sh
bash maze-chase/packaging/desktop/install-linux.sh
# From a tarball instead:
bash maze-chase/packaging/desktop/install-linux.sh --tarball maze-chase/dist/maze-chase-desktop-0.1.0-linux-x86_64.tar.gz --prefix /tmp/mcprefix

# Windows (on a Windows machine): zipped .exe plus docs
powershell -ExecutionPolicy Bypass -File maze-chase/packaging/desktop/windows-zip.ps1

# macOS (on a Mac): Maze Chase.app bundle
bash maze-chase/packaging/desktop/macos-app.sh
```

Or run uninstalled during development:

```sh
cargo run --release -p maze-chase-desktop -- --help
```

## Launch

```sh
maze-chase-desktop [OPTIONS]

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
game), Settings (difficulty, theme, reduced flash, FPS readout,
keybinds, padbinds), Audio (master/music/SFX sliders plus mute),
Keybinds and Padbinds (duplicate-safe capture, `Esc` cancels),
Pause (resume or quit to title over the frozen board), Game over
(score, level, rank).

Difficulty presets are honest engine configurations: Cozy is Classic
from level 1, Standard is Classic from level 2, Harsh is Sprint
(single wick). Volumes apply live while sliders move.

## Audio

One-shot effects and the five original tunes synthesize at runtime
(44.1 kHz) from the shared audio data: square/sine/triangle/noise
sweeps for effects, sine-plus-harmonic notes at 132 BPM for music.
On machines with no audio device the game starts silently instead of
failing; the Audio screen still records every level.

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
frame without building.
The 5x7 HUD face, the framebuffer, the board rasterizer, input
mapping, pad parsing, the synth, and the screens all carry unit tests
(`cargo test -p maze-chase-desktop`); `tests/headless.rs` replays a
scripted run and asserts pixel-identical output across seeds.

## Troubleshooting

- `cannot open a display`: run inside a desktop session (or Xvfb for
  probes). Wayland and X11 both work through winit.
- `libxkbcommon-x11.so could not be loaded` (Linux): install
  `libxkbcommon0 libxkbcommon-x11-0`.
- ALSA `cannot find card` spew on voiceless machines: harmless stderr
  from the audio backend while it falls back to silence.
- `alsa-sys build failed` at compile time (Linux): install
  `libasound2-dev` and rebuild.
- No gamepad appears: check the OS sees it first (`/dev/input`,
  Game Controllers, System Information); the Padbinds screen only
  lists OS-present devices.
- Window too small card: drag larger; the minimum is roughly 480x360
  for the board at scale 1 plus the HUD.

## Reproducible builds

Pin the toolchain (`rustc --version` is recorded in release notes),
`cargo build --release -p maze-chase-desktop` from a clean checkout,
then the per-OS staging script above. The engine, assets, audio, and
config crates are dependency-light on purpose; the desktop crate adds
exactly four third-party crates (winit, softbuffer, gilrs, rodio),
all pinned in `maze-chase/Cargo.lock`.
