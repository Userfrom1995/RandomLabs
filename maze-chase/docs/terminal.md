# Terminal Game

The fullscreen terminal publication layer for Maze Chase: one installable
package (`maze-chase-terminal`) running the shared deterministic engine
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
   graphics protocol, re-placed at 20 fps. Engages only on positive
   proof (`KITTY_WINDOW_ID`, `TERM=xterm-kitty`, `TERM_PROGRAM=kitty`)
   plus Kitty keyboard enhancement for disambiguated input. Forcing it
   elsewhere prints escape garbage: do not force it on other terminals.
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
   palette depth.

A watchdog drops one tier per failure burst (3 strikes) and records
why; the title screen shows the active tier and the downgrade trail,
so a fallback is always explained, never silent. The help screen's
video line always names the tier in use.

Ghostty note: Ghostty has no image protocol, so Ghostty plays on the
truecolor-cells tier (24-bit color, Kitty-compatible keyboard where
offered). That is a genuine capability gap with a documented fallback,
not a silent drop.

## Layout and resize

The 28x31 warren plus HUD fits windows from 62x35 up. Narrow rooms get
a top score bar; rooms 96 columns and wider get a side panel with
score, best, lives, level, mode clock, tune, tier, and controls. Huge
rooms (144x66 and up) magnify cells 2x. Smaller windows get an honest
"too small" card with the minimum size. Resizing re-fits live,
including mid-run; the simulation never restarts on resize.

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
