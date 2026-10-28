# Terminal Game

The fullscreen terminal publication layer for Maze Chase: the
`maze-chase-terminal` game running the shared deterministic engine with
a fullscreen canvas, four render tiers, live resize, menus, help, high
scores, settings with key rebinding, and launch docs (this file).

## Install and launch

Every release ships `maze-chase-terminal` as a Debian package, an RPM,
a portable tarball on Linux and macOS, and a zip on Windows. Once a
release is published, pick the artifact for your OS from its page;
`SHA256SUMS.txt` verifies the download. [release.md](release.md) covers
upgrading, uninstalling, and clearing saved settings.

Debian/Ubuntu:

```sh
sudo dpkg -i maze-chase-terminal_<version>_<arch>.deb
maze-chase-terminal
sudo apt-get remove maze-chase-terminal
```

Fedora/RHEL:

```sh
sudo rpm -i maze-chase-terminal-<version>-1.<arch>.rpm
maze-chase-terminal
sudo rpm -e maze-chase-terminal
```

Portable tarball, no root:

```sh
mkdir maze-chase-terminal && tar -xzf maze-chase-terminal-<version>-<os>-<arch>.tar.gz -C maze-chase-terminal
cd maze-chase-terminal
./install-linux.sh              # $HOME/.local, prints the --version probe
./uninstall-linux.sh
```

Windows: extract `maze-chase-terminal-<version>-windows-x86_64.zip` and
run `maze-chase-terminal.exe`.

To build from source, use Rust 1.85 or newer and run from `maze-chase/`:

```sh
cargo build --release --locked -p maze-chase-terminal
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

Packaging scripts build the release binary and stage versioned
packages into `maze-chase/dist/` (never committed): `build-deb.sh`,
`build-rpm.sh`, `linux-tarball.sh` / `macos-tarball.sh`, and
`windows-zip.ps1`. Each name records its real build host; never relabel
a cross-OS archive. Full per-OS release steps live in
[release.md](release.md).

## Controls

| Keys | Action |
|---|---|
| Arrows or WASD | steer Rill (remappable) |
| P or Esc (in game) | pause menu |
| M | mute toggle (works everywhere) |
| Enter | confirm / select |
| Esc | back (quits from the title) |
| Up/Down, Left/Right | menus: move, change values |

Every binding except the fixed arrows/WASD twins is rebindable in
Settings, then Key bindings: pick an action, press Enter, press the new
key. Conflicts are refused with the reason shown; nothing ever binds
two actions to one key.

Input parsing has one known boundary. The event source is crossterm's
global parser, which buffers an unrecognized private CSI sequence (for
example `ESC [ ? 99999 h`) and delivers no key events until a
completion byte such as `u` arrives. The game never sees those keys,
so it cannot time the buffer out; if typing suddenly stops after a
stray escape sequence, send `u` to complete the sequence and input
resumes. The behavior is pinned by a PTY regression test
(`tester_kitty_render_pipeline.rs`) so this note cannot drift from the
shipped binary.

## Render tiers

The game picks the best tier its terminal proves, best first:

1. **kitty-graphics**: true pixel art (the original 11x11 sprites,
    beveled walls, pulsing sunseeds). The static board layer (walls,
    gate, house, crumbs) and the transparent sprite atlas are
    transmitted with real DEFLATE PNG (`a=t`) once per change, then each
    frame moves per-entity placements (`a=p`, source rectangles, stable
    placement ids, explicit per-warden `z` stacking layers) over them; a full-frame
    transmit is the fallback when the bounded live probe reports no
    placement support. Steady transmits are silent (`q=2`) so `OK`
    replies can never spin the event loop; the probe's answers feed the
    tier choice and frame write failures feed the watchdog. The tier engages
    on positive environment proof (`KITTY_WINDOW_ID`,
    `TERM=xterm-kitty`, `TERM_PROGRAM=kitty|ghostty`,
    `TERM=xterm-ghostty`) or when the live probe answers on an
    unidentifiable terminal; keys typed during the probe are replayed,
    never swallowed. Kitty keyboard enhancement is enabled for
   disambiguated input. Measured on kitty 0.32.2 (2026-10-21): 21
   transmits and 169.9 KiB of PNG payload for a whole session, playing
   at 21.6 frames/s with a 6.2 KiB mean frame (before this pipeline: a
    historical 1642 transmits and 348.6 MiB, not re-derivable from the
    regenerated JSONs).
2. **sixel**: true pixels through a hand-rolled Sixel encoder (palette
   registers, six-row bands, run-length rows). The palette is capped at
   64 colors and a frame at 2 MiB (smaller-palette retry, then a cell
   fallback), and the tier paces at 24 Hz with byte-rate backpressure.
   Engages after the terminal answers the DA1 probe at startup (250 ms
   budget, then the game starts regardless, and keys typed while the
   probe waits are replayed, never swallowed), or via `--tier sixel` on
   known Sixel terminals (foot, contour, mlterm, Sixel-build xterm).
   Measured on xterm 390: 137-138 transmits / 4.25-4.31 MiB per
   session across the two VT340 rows.
3. **truecolor-cells**: 24-bit Unicode board (solid-block walls, dotted
   crumbs, letter wardens in theme colors, facing Rill mouth) with
   synchronized tear-free frames. The WezTerm, foot-fallback, iTerm2,
   and VS Code path.
4. **legacy-cells**: the same board folded to the 16 ANSI colors for
   conventional terminals. Fully playable: the only difference is
   palette depth, and every painted run carries the theme's own
   background, so a terminal with a light default (an unconfigured
   xterm) renders the Dusk Pond canvas instead of vanishing into
   white (the compatibility matrix records the committed default-light
   xterm row and its dark-background twin, both passing).

A watchdog drops one tier per failure burst (3 strikes) and records
why; the title screen shows the active tier and the downgrade trail,
so a fallback is always explained, never silent. In steady state it
watches the output path: a terminal that stops accepting frame writes
triggers the downgrade. It cannot see a terminal silently
mis-compositing placements, which is why every placement carries an
explicit `z` stacking layer instead of relying on equal-z tie-breaking.
The title screen always names the tier in use (`video tier: ...`), and
the wide-window side panel carries a `VIDEO` line; the narrow top bar
and the menus (help, scores, settings) do not.

Ghostty note: Ghostty 1.3.1 implements the Kitty graphics protocol and
answers the live probe when one is sent: a direct pty experiment with
the game's exact probe request (`tools/compat/probe-graphics.py`,
2026-10-19) recorded both replies (`i=..;OK` and `i=..,p=..;OK`), and
the raw capture is committed under
`tools/compat/probe-captures/` together with the exact command and its
SHA-256 (`ghostty-1.3.1.bin`, byte-identical to kitty's reply capture
because both answer the same protocol frames with the protocol's own
acknowledgement form).
Because `TERM_PROGRAM=ghostty` / `TERM=xterm-ghostty` already prove the
capability, the auto and forced rows select the graphics path from the
environment without probing (their traces carry no probe record, a
fast path rather than a capability gap). Both rows pass on Ghostty
1.3.1 with sprite visibility proven by the capture census
(`../tools/compat/evidence/ghostty-linux-auto.json` and
`ghostty-linux-kitty.json`).

## Layout and resize

The 28x31 pond maze plus HUD fits windows from 62x35 up, and every window
size gets a plan fitted for it: the layout solver scans the tile scale
grid (2 to 8 columns per tile, 1 to 4 rows per tile; the 2x1 compact
scale is the floor) and keeps the plan that covers the most of the
window, breaking ties by tile squareness, chrome, area, and width.
Every scale gets the best chrome it can host: a right-hand side panel with score, best, lives, level, mode
clock, tune, tier, and controls when the board leaves room, a three-row
HUD band above the board when only rows are tight, or just the bottom
hint line in the tightest rooms. Wide-short rooms reach wide-short
scales (7x1, 8x1) and tall rooms reach tall ones (2x2 through 4 rows)
instead of collapsing to a single derived diagonal: the fitted plan
uses the best scale the grid can place, and the measured sweep floor is
280/1000 at 399x62. Smaller windows get an honest "too small" card
naming the exact minimum. While the card is up, gameplay and menu keys
are ignored; mute (M) and Esc on the title screen still work, and the
full key map returns as soon as the window fits. Resizing
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
overflow) and clamped to 6..21 pixels per tile so encode cost stays
bounded (the cap bounds encode cost, not the on-screen scale: a large window
draws the capped raster at its native size on the centered footprint). The
21-pixels-per-tile rung selects Rill's authored 21x21 sheet; the Kitty
atlas centers that 21-pixel sheet in the same 22-pixel cell used by the
11x11 sheet at scale 2, so the rung keeps the quiet single-transmit atlas
path instead of falling back to per-frame full-board images. The
image is drawn on a centered footprint inside the board, mapped from the
raster's pixel size through the detected window pixels: Kitty terminals
scale the image into that footprint (which tracks the raster's aspect to
within a cell of rounding per axis, so the art is never stretched across
the whole board), and the Sixel raster paints from the centered image
origin at its natural size, so, in every window that can host the
6-pixels-per-tile legibility floor, it stays inside the board box
instead of bleeding into the hint line or hugging a corner of a larger
box.

Terminals that report no pixel size keep the proven 8-pixels-per-tile
nominal raster, exactly as before: Kitty stretches it across the full
board box, while the Sixel path paints it at its natural size from the
board origin.

## Settings and scores

Settings live in `~/.maze-chase/settings.txt` (human-readable
`key = value`, shared with the other layers): difficulty (Cozy,
Standard, Harsh: honest engine presets only), theme (dusk-pond,
morning-shallows, moonwake; legacy ids migrate), master/music/SFX levels, mute,
terminal chime (off by default), reduced flashing (holds the hollow warning mask instead of blinking),
and the full keymap. High scores live in `~/.maze-chase/scores.txt`
(top 10, `score | level | mode | date`); corrupt lines are skipped,
never fatal. A path replaced with a FIFO is refused on read and write
(defaults or an empty table plus a notice), so a hostile or half-restored
config directory cannot block startup. Pass `--dir` to relocate both
files (per-machine arcade cabinets, shared accounts, testing).

## Sound in a terminal

Terminals play no samples. An opt-in BEL chime (off by default) marks
sharp beats (warden eaten, relish, death, extra life, level events); the
status-line ticker always narrates the run ("a relish ripens (worth
500)", "the wardens flee!") and never depends on the chime. Volumes and
mute are honored: muted or zero SFX means silence, while the ticker and
the visual twins keep telling the story. Crumb ticks stay silent by
design. Turning the chime on is a Settings row; the choice persists with
the rest of the config.

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
