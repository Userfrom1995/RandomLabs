# Maze Chase Phase 6: Ember Window (desktop publication layer)

## What was built

The native desktop game (`maze-chase/crates/desktop`, `maze-chase-desktop`
0.1.0, binary `maze-chase-desktop`): a windowed/fullscreen GUI on the
shared deterministic engine, and the second playable publication layer
of the maze-chase Rust migration (#582).

## Why this shape

- **One renderer core, not two**: the board pixels come from
  `maze_chase_terminal::raster` (the same core behind the Kitty and
  Sixel terminal tiers), blitted integer-scaled into an XRGB8888
  framebuffer. Desktop, terminal-bitmap, and (next phase) browser
  pixels match by construction; Phase 7 reuses `raster` plus `frame`
  the same way.
- **Software rendering everywhere**: winit 0.30 for windows plus
  softbuffer 0.4 for presentation. No GPU needed, no shaders, fully
  headless-testable, and it compiles on Linux with zero system headers.
- **Stack proven by compile probes first**: winit/softbuffer build
  clean on a bare container; gilrs 0.11 and rodio 0.20 build once the
  documented `libasound2-dev`/`libudev-dev` (build) and
  `libxkbcommon0`/`libxkbcommon-x11-0` (runtime) packages exist.
- **Shared machine state**: `~/.maze-chase/settings.txt` and
  `scores.txt` are byte-compatible with the terminal game, so settings
  and the top-10 leaderboard carry across layers. Gamepad bindings live
  in a new `padmap.txt` beside them.

## How it works (key files)

- `src/font.rs`: original 5x7 pixel face, 52 glyphs, pairwise-distinct
  test, lowercase folding, hollow-box fallback.
- `src/frame.rs`: XRGB framebuffer (fill, clip-safe set/get, scaled
  board blits, text, panels, PPM screenshots).
- `src/render.rs`: pure layout (integer board scale, side HUD,
  too-small card), `render_play` (board plus score/best/level/wicks/
  mode/fright/relish/game-over/fps/tune HUD), `render_menu`, pause
  panel is drawn by the session over the frozen board.
- `src/input.rs`: winit physical codes to neutral keys (layout
  independent); action/heading resolution reuses the terminal adapter.
- `src/gamepad.rs`: stick deadzone plus dominant axis, stable button
  codes, duplicate-safe `PadMap` with save/parse, `PadPoll` hardware
  wrapper with a clean absent state.
- `src/sound.rs`: deterministic PCM synth (SFX sweeps, 132 BPM tunes
  with loop-seam fades) plus a rodio backend with silent fallback.
- `src/screens.rs`: title/help/scores/settings/audio/rebinds/padbind/
  pause/over flow with live sliders and capture screens.
- `src/app.rs`: session on the shared engine (fixed 120 Hz accumulator,
  tune-by-screen state, score recording, settings/padmap persistence).
- `src/window.rs`: winit event loop, softbuffer presentation, resize,
  fullscreen toggle, per-frame pad poll plus tick plus present.
- `src/cli.rs` + `src/main.rs`: strict flags (`--fullscreen`,
  `--no-pad`, `--dir`, `--probe`, `--help`, `--version`).
- `packaging/desktop/`: XPM icon transcribed from PIP_RIGHT_MID,
  .desktop entry, Linux tarball plus installer, Windows zip script,
  macOS app script. `docs/desktop.md` is the launch guide.

## Notes

- Stick Y-up polarity is pinned behind `STICK_Y_UP_POSITIVE` for the
  per-OS hardware passes to confirm or flip in one line.
- The real Xvfb window run (`--probe 90`, exit 0, 1100x760 PPM with
  the 5-color title composition) is the evidence the window path is
  real, not just unit-tested.
- Zero gameplay logic in the layer; zero engine/assets/audio/config
  file changes; `maze-chase-verify` stays 19/19.
