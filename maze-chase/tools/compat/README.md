# maze-chase terminal compatibility harness

Real-terminal evidence for the terminal layer. Every file in
`evidence/` is produced by driving the release binary inside a
real emulator window: keystrokes go through the operating system's input
system, screenshots capture the running window (the X11 window on Linux
via ImageMagick `import`; the whole Aqua desktop on macOS via
`screencapture`, which cannot crop to a window reliably; the window
rectangle's screen region on Windows via .NET `CopyFromScreen`), and on
Linux the raw escape bytes the game wrote to its pty are recorded and
measured.

Nothing here is simulated. A row is either **executed** (evidence JSON
plus screenshots committed) or recorded as `unverified` with the exact
reason. There are no guessed rows.

## Pieces

- `run-linux.sh` - Linux runner. Starts Xvfb when headless, builds or
  reuses the release binary, launches Kitty, Ghostty, and xterm, drives
  each session, and writes one evidence file per run. `--row-name`
  writes a distinct evidence row for a non-default launch (for example
  a dark-background xterm); `--keep` retains the scratch transcripts.
- `run-macos.sh` - macOS runner. Drives the system Terminal, plus iTerm2
  and Ghostty when installed, via the shared driver's `macos` path
  (System Events keystrokes, `screencapture`).
- `run-windows.ps1` - Windows runner. Drives Windows Terminal and conhost
  through PowerShell keystroke injection and .NET screen capture. It
  never pipes the game's stdout (the game refuses a non-terminal stdout
  on Windows), so there is no pty transcript: the game shares the session
  runner's own console (`Start-Process -NoNewWindow`) and each row is
  graded from the game's own process (pid plus exit code files written by
  the session runner) and the capture set. A pass requires a zero exit
  code and at least one valid PNG capture; a row whose game process never
  started is `unverified` with the reason.
- `drive.sh` - shared scripted-session driver. Launches one emulator
  command, waits for the window, walks the game's real state machine with
  named checkpoints, captures screenshots, and logs every event with the
  transcript byte offset and the measured window size at that moment.
  Window resizes are only exercised by the X11 driver (xdotool sets
  exact sizes); the macOS driver skips the resize checkpoints and records
  the skip as an event instead of capturing resize-named images.
- `probe-graphics.py` - live graphics-probe experiment for one
  emulator: sends the game's exact kitty probe request on the terminal's
  pty, records the raw reply bytes for a bounded window, and cleans up.
  It verifies capability claims when a row's environment proof skips the
  in-game probe (see the Ghostty note in `../docs/terminal.md`); the
  committed captures, their exact commands, and their hashes live in
  `probe-captures/`.
- `collect.py` - turns a run directory into one evidence JSON: transcript
  hash and byte totals, synchronized-frame stats, Kitty/Sixel protocol
  counters (full chunked payload totals), first-transmit PNG dimensions,
  per-phase layout-addressing stats, per-phase durations and frame
  rates, observed video tier read from the game's own video line,
  screenshot inventory with PNG dimensions, light-background validation,
  and a sprite-palette census per capture, the committed `events.log`,
  and the trace ingestion (`session/trace.jsonl`; an absent file is
  recorded as absent with the reason "the session never reached the
  trace loop").

Each evidence directory also carries the run's `events.log` (timestamp,
key, transcript byte offset per event; a few KiB of TSV, no transcript
payload) so every quoted count and rate can be re-derived from the
committed bundle.

## The session

`drive.sh` runs the same key choreography on Linux and macOS, and
`run-windows.ps1` follows the same state-machine path. It follows
`../../crates/terminal/src/{app,screens}.rs` exactly:

1. title screen captured on boot;
2. Confirm starts a run, arrow keys steer for a bounded window;
3. on Linux only: the window resizes wide, then below the 62x35 floor
   (too-small card), then back (re-fit);
4. Esc pauses (pause menu captured), then Down + Confirm quits to title;
   the second executed row of an emulator sets
   `MAZE_CHASE_COMPAT_PAUSE_SELECT=1`, which moves the pause cursor to
   "Quit to title" before the capture so two rows of the same emulator
   never commit byte-identical paused images (the extra key is in
   `events.log` and in the row's `pause_select` field; the session still
   leaves through the same menu item);
5. the title menu walks Help, Scores, and Settings with Esc returns;
6. Down + Confirm quits the game and the run records whether the game
   process exited on its own.

Esc is never pressed while on the title screen: per the state machine
that quits the game.

## Running

Run these from the repository's `maze-chase/` directory (the commands
use paths relative to it; the docs elsewhere use `../tools/compat/...`
relative to `maze-chase/docs/`):

```sh
# Linux, all emulators, deps preselected
tools/compat/run-linux.sh --install-deps

# one emulator, reuse an existing release binary
tools/compat/run-linux.sh --emulator kitty --skip-build

# forced-tier probes (recorded as their own rows; pause-select moves the
# pause cursor so the second row of an emulator has a distinct capture)
MAZE_CHASE_COMPAT_PAUSE_SELECT=1 \
  tools/compat/run-linux.sh --emulator kitty --tier truecolor --skip-build
MAZE_CHASE_COMPAT_PAUSE_SELECT=1 \
  tools/compat/run-linux.sh --emulator ghostty --tier kitty --skip-build
MAZE_CHASE_COMPAT_PAUSE_SELECT=1 \
MAZE_CHASE_COMPAT_XTERM_FLAGS="-ti vt340 -bg black -fg white" \
  tools/compat/run-linux.sh --emulator xterm --tier sixel --skip-build
```

Requirements: `python3`, `jq`, `xdotool`, ImageMagick (`import`), and
`Xvfb` on headless Linux; `osascript`/`screencapture` on macOS;
PowerShell plus .NET on Windows. `--install-deps` reaches the configured
apt sources, including the third-party community PPA
`ppa:mkasberg/ghostty-ubuntu` that builds Ghostty for Ubuntu (Ghostty is
not in the distribution archive); `cargo build` fetches the workspace's
crates. The harness writes nothing else outside its scratch and evidence
directories.

## Evidence format

`schema: maze-chase-compat-evidence/1`. One JSON per row plus its
screenshots and `events.log` under `evidence/<row>/`. The human-readable
roll-up lives in `../../docs/terminal-compat.md`; the measured findings
and their root causes live in
`../../../progress/582-maze-chase-overhaul-findings.md`.

Honesty rules the harness enforces mechanically:

- `tier_observed` is read only from the game's own on-screen video line
  (`VIDEO  <tier>` on the side panel, `video tier: <tier>` on the title)
  in the captured transcript, never from the requested flag and never
  from the watchdog's downgrade trail. A row with no transcript (Windows)
  records no observed tier (`null`); it is never guessed.
- `tier_requested` records the flag only; `auto` means the game picked.
- `disposition` is `pass` only when the game process exited on its own
  and the captures actually rendered: on Linux/macOS a session that
  produced no escape transcript at all is recorded `unverified` with the
  reason; a row with checkpoint captures that are >=98% white on a light
  background is downgraded to `partial` with the reason recorded; and on
  every OS the collector downgrades a proposed `pass` with zero accepted
  captures in the bundle to `partial` (a pass requires at least one
  rendered capture); and a proposed `pass` on the `kitty-graphics` tier
  with placements on the wire requires at least one playing capture
  carrying sprite-palette pixels (the static board layer alone decodes as
  a valid frame while every sprite can sit hidden behind it), recorded
  as `sprite_visibility` with the per-capture census in each phase. A
  proposed `pass` on any bitmap tier (`kitty-graphics` or `sixel`) also
  requires at least one decodable playing capture: a capture set made of
  static menus alone can never sign a pass, because the playing surface
  itself is what a pass claims. A proposed `pass` whose transcript never
  names the active video tier is refused outright, because every bitmap
  gate above is keyed on that observation and cannot run without it. On
  Windows, where the pty transcript deliberately
  does not exist, a row is graded from the game's own pid plus exit code
  and the capture set: a pass requires a zero exit code and at least one
  valid PNG capture, and a row whose game process never started is
  `unverified` with the reason.
- `build` names the generating build copied from the run metadata
  (`commit`, `binary_sha256`, `sources_dirty`), and `pause_select`
  records how many menu items the paused capture moved the cursor (0 for
  the plain checkpoint), so bundles are provenance-complete: metadata
  written before these fields existed records `build.recorded: false`
  with the reason instead.
- `unverified_reason` is mandatory for unverified rows (the collector
  refuses to write a row without it).
- Capture validation happens in layers, scoped per OS: on Linux/macOS
  `drive.sh` decodes each capture's PNG structure at capture time
  (signature, declared chunk lengths, decompressible IDAT stream) and
  rejects a bad capture before it is logged; on Windows
  `run-windows.ps1` checks the PNG signature and nonzero dimensions. The
  collector then decodes every capture again itself and refuses to copy
  an undecodable file into the bundle (listed under `rejected_captures`),
  records each accepted capture's dimensions and white-pixel share, and
  records duplicate capture hashes inside one row under
  `duplicate_screenshots`.
