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
    beveled walls, pulsing sunseeds). The static board layer (walls,
    gate, house, crumbs) and the transparent sprite atlas are
    transmitted with real DEFLATE PNG (`a=t`) once per change, then each
    frame moves per-entity placements (`a=p`, source rectangles, stable
    placement ids) over them; a full-frame transmit is the fallback when
    the bounded live probe reports no placement support. Steady
    transmits are silent (`q=2`) so `OK` replies can never spin the
    event loop, and protocol errors feed the watchdog. The tier engages
    on positive environment proof (`KITTY_WINDOW_ID`,
    `TERM=xterm-kitty`, `TERM_PROGRAM=kitty|ghostty`,
    `TERM=xterm-ghostty`) or when the live probe answers on an
    unidentifiable terminal; keys typed during the probe are replayed,
    never swallowed. Kitty keyboard enhancement is enabled for
    disambiguated input. Measured on kitty 0.32.2 (2026-10-19): 23
    transmits and 174 KiB of PNG payload for a whole session, playing at
    20.7 frames/s with a 5.7 KiB mean frame (before this pipeline: 1642
    transmits and 348.6 MiB).
2. **sixel**: true pixels through a hand-rolled Sixel encoder (palette
   registers, six-row bands, run-length rows). The palette is capped at
   64 colors and a frame at 2 MiB (smaller-palette retry, then a cell
   fallback), and the tier paces at 24 Hz with byte-rate backpressure.
   Engages after the terminal answers the DA1 probe at startup (250 ms
   budget, then the game starts regardless, and keys typed while the
   probe waits are replayed, never swallowed), or via `--tier sixel` on
   known Sixel terminals (foot, contour, mlterm, Sixel-build xterm).
   Measured on xterm 390: 143 transmits / 3.75 MiB per session.
3. **truecolor-cells**: 24-bit Unicode board (solid-block walls, dotted
   crumbs, letter wardens in theme colors, facing Pip mouth) with
   synchronized tear-free frames. The WezTerm, foot-fallback, iTerm2,
   and VS Code path.
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

Ghostty note: Ghostty 1.3.1 implements the Kitty graphics protocol but
does not answer graphics probe commands, so auto-detect identifies it
from `TERM_PROGRAM=ghostty` / `TERM=xterm-ghostty` and paints pixels by
default. Both the auto and forced rows pass on Ghostty 1.3.1
(`../tools/compat/evidence/ghostty-linux-auto.json` and
`ghostty-linux-kitty.json`); the watchdog still degrades if the
protocol fails at runtime.

## Layout and resize

The 28x31 warren plus HUD fits windows from 62x35 up, and every window
size gets a plan fitted for it: the layout solver scans continuous tile
scales (1 to 8 columns per tile, up to 4 rows per tile) and keeps the
largest square-ish board that fits, then places the chrome it can host:
a right-hand side panel with score, best, lives, level, mode clock,
tune, tier, and controls when there is room, a two-row HUD band above
the board when only rows are tight, or just the bottom hint line in the
tightest rooms. Smaller windows get an honest "too small" card naming
the exact minimum. Resizing re-fits live, including mid-run, and the
simulation never restarts on resize: the frame is cleared and repainted
in one step, so no stale board fragments survive the change (on the
Kitty tier the old image placement is deleted in the same frame). The
render loop re-reads the real window size every frame and re-fits on any
difference, so a window change is applied even when the terminal
delivers its resize signal in the same batch as a keypress. On the
pixel tiers the board rasterizes at the detected cell pixel size,
clamped to 6..20 pixels per tile so encode cost stays bounded (large
windows get an upscaled capped raster by design), so the image maps
nearly 1:1 onto its cell footprint; terminals that report no pixel size
keep the proven 8-pixels-per-tile nominal raster.

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
