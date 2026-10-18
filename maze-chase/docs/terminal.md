# Terminal Game

The fullscreen terminal publication layer for Maze Chase: one dev-grade
terminal package (`maze-chase-terminal`) running the shared deterministic engine
with a fullscreen canvas, four render tiers, live resize, menus, help,
high scores, settings with key rebinding, and launch docs (this file).

## Install and launch

Prerequisites: a Rust toolchain (1.80 or newer) and a real terminal
(not a pipe: the game needs raw mode and window-size queries).

```sh
cd maze-chase
cargo build --release -p maze-chase-terminal
./target/release/maze-chase-terminal
```

Or run unoptimized straight from source:

```sh
cargo run --release -p maze-chase-terminal
```

Useful flags:

```sh
maze-chase-terminal --tier legacy      # force the conventional-terminal tier
maze-chase-terminal --tier truecolor  # force 24-bit cells (skip detection)
maze-chase-terminal --tier sixel      # force Sixel pixels (needs support)
maze-chase-terminal --tier kitty      # force Kitty graphics (needs support)
maze-chase-terminal --dir ~/.maze-chase   # config/scores directory (default)
maze-chase-terminal --help            # all options

# Windows (cargo install): the binary carries the .exe suffix
maze-chase-terminal.exe --tier legacy
```

Install it on `PATH` with `cargo install --path crates/terminal` from
`maze-chase/`, then launch with `maze-chase-terminal` anywhere
(`maze-chase-terminal.exe` on Windows).

Portable package (Unix, from the repo root): the tarball script builds
the release binary and stages a versioned archive into
`maze-chase/dist/` (never committed), and the installer unpacks it
into a prefix with a `--version` probe at the end:

```sh
bash maze-chase/packaging/terminal/linux-tarball.sh
bash maze-chase/packaging/terminal/install-linux.sh --tarball maze-chase/dist/maze-chase-terminal-0.1.0-linux-x86_64.tar.gz
```

The tarball name records the machine that built it; build one per
release OS instead of relabeling. Windows installs via the
`cargo install` line above (binary:
`%CARGO_HOME%\bin\maze-chase-terminal.exe`). Full per-OS release steps
live in [docs/release.md](release.md).

## Controls

| Keys | Action |
|---|---|
| Arrows or WASD | steer Pip (remappable) |
| P or Esc (in game) | pause menu |
| M | mute toggle (works everywhere) |
| Enter | confirm / select |
| Esc | back (quits from the title) |
| Up/Down, Left/Right | menus: move, change values |

Every binding except the fixed arrows/WASD twins is rebindable in
Settings, then Key bindings: pick an action, press Enter, press the new
key. Conflicts are refused with the reason shown; nothing ever binds
two actions to one key.

## Render tiers

The game picks the best tier its terminal proves, best first:

1. **kitty-graphics**: true pixel art (the original 11x11 sprites,
    beveled walls, pulsing sunseeds) transmitted as PNG over the Kitty
    graphics protocol. Engages only on positive proof
    (`KITTY_WINDOW_ID`, `TERM=xterm-kitty`, `TERM_PROGRAM=kitty`)
    plus Kitty keyboard enhancement for disambiguated input. Forcing it
    elsewhere prints escape garbage: do not force it on other terminals.
    The compatibility harness measured the current build on kitty 0.32.2:
    one session sent 1642 full board transmits totalling 348.6 MiB of PNG
    payload, and the terminal's `OK` replies keep the event loop spinning
    at 70-77 synchronized frames/s (391/s with the too-small card up)
    against the intended pacing (see
    `../tools/compat/evidence/kitty-linux-auto/ack-spin-experiment.md`
    and the committed row JSON). Input queues behind the flood: the pause
    surface first paints 298 MB into the session and the quit path never
    lands, so the row is marked partial. Fixing the reply handling and
    the pacing is the terminal render pipeline phase of the #582
    overhaul.
2. **sixel**: true pixels through a hand-rolled Sixel encoder (palette
   registers, six-row bands, run-length rows). Engages after the
   terminal answers the DA1 probe at startup (250 ms budget, then the
   game starts regardless, and keys typed while the probe waits are
   replayed, never swallowed), or via `--tier sixel` on known Sixel
   terminals (foot, contour, mlterm, Sixel-build xterm).
3. **truecolor-cells**: 24-bit Unicode board (solid-block walls, dotted
   crumbs, letter wardens in theme colors, facing Pip mouth) with
   synchronized tear-free frames. The Ghostty, WezTerm, foot-fallback,
   iTerm2, and VS Code path.
4. **legacy-cells**: the same board folded to the 16 ANSI colors for
   conventional terminals. Fully playable: the only difference is
   palette depth. On a light background the cream chrome text is
   unreadable on white (the compatibility matrix records the committed
   light xterm row and its dark-background twin); a light-background
   palette is tracked in the #582 overhaul.

A watchdog drops one tier per failure burst (3 strikes) and records
why; the title screen shows the active tier and the downgrade trail,
so a fallback is always explained, never silent. The help screen's
video line always names the tier in use.

Ghostty note: Ghostty implements the Kitty graphics protocol, but the
current auto-detect routes `TERM_PROGRAM=ghostty` straight to
truecolor-cells, so Ghostty plays on the 24-bit cell tier even though it
could paint pixels. The compatibility harness verified a forced-PNG
session rendering through Ghostty 1.3.1
(`../tools/compat/evidence/ghostty-linux-kitty.json`); enabling it by
default is tracked in the #582 overhaul.

## Layout and resize

The 28x31 warren plus HUD fits windows from 62x35 up, and every window
size gets a plan fitted for it: the layout solver scans the full tile
scale grid (1 to 8 columns per tile, 1 to 4 rows per tile) and keeps
the plan that covers the most of the window, breaking ties by tile
squareness, chrome, and area. Every scale gets the best chrome it can
host: a right-hand side panel with score, best, lives, level, mode
clock, tune, tier, and controls when the board leaves room, a two-row
HUD band above the board when only rows are tight, or just the bottom
hint line in the tightest rooms. Wide-short rooms reach wide-short
scales (7x1, 8x1), tall rooms reach tall ones (2x2 through 4 rows), so
a plan never strands most of the window as dead space. Smaller windows
get an honest "too small" card naming the exact minimum. Resizing
re-fits live, including mid-run, and the simulation never restarts on
resize: the frame is cleared and repainted in one step, so no stale
board fragments survive the change (on the Kitty tier the old image
placement is deleted in the same frame). The render loop re-reads the
real window size every frame and re-fits on any difference, so a window
change is applied even when the terminal delivers its resize signal in
the same batch as a keypress.

On the pixel tiers the board rasterizes at the detected cell pixel size,
bounded so the raster's natural pixel size fits the board's pixel box
(whenever the box can host even the 6-pixels-per-tile legibility floor;
only absurdly tiny pixel windows fall back to the floor and may
overflow) and clamped to 6..20 pixels per tile so encode cost stays
bounded (large windows get an upscaled capped raster by design). The
image is drawn on a centered footprint inside the board, mapped from the
raster's pixel size through the detected window pixels: Kitty terminals
scale the image into that footprint (which tracks the raster's aspect to
within a cell of rounding per axis, so the art is never stretched across
the whole board), and the Sixel raster paints from the centered image
origin at its natural size, so it cannot bleed into the hint line or hug
a corner of a larger box.
Terminals that report no pixel size keep the proven 8-pixels-per-tile
nominal raster drawn across the full board box, exactly as before.

## Settings and scores

Settings live in `~/.maze-chase/settings.txt` (human-readable
`key = value`, shared with the other layers): difficulty (Cozy,
Standard, Harsh: honest engine presets only), theme (ember-warren,
abyss-lantern, parchment-dawn), master/music/SFX levels, mute,
reduced flashing (holds the steady fright mask instead of blinking),
and the full keymap. High scores live in `~/.maze-chase/scores.txt`
(top 10, `score | level | mode | date`); corrupt lines are skipped,
never fatal. Pass `--dir` to relocate both files (per-machine arcade
cabinets, shared accounts, testing).

## Sound in a terminal

Terminals play no samples, so engine cues become terminal BELs for
sharp beats (warden eaten, relish, death, extra life, level events)
plus a status-line ticker narrating the run ("a relish ripens (worth
500)", "the wardens flee!"). Volumes and mute are honored: muted or
zero SFX means silence, while the ticker keeps narrating. Crumb ticks
stay silent by design.

## Troubleshooting

- `cannot take over the terminal`: stdout is piped or there is no TTY.
  Run inside a real terminal emulator.
- Garbage escapes on screen: a forced tier the terminal lacks. Restart
  without `--tier` and let detection pick; the title shows the tier.
- No Sixel where expected: the DA1 probe timed out (some multiplexers
  swallow replies). Force with `--tier sixel`; if pixels appear, the
  terminal supports it and future runs can keep the flag.
- Tiny window card: enlarge past 62x35; the game re-fits without
  restarting the run.
