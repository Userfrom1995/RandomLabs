# maze-chase terminal compatibility harness

Real-terminal evidence for the terminal layer. Every file in
`evidence/` is produced by driving the shipped release binary inside a
real emulator window: keystrokes go through the operating system's input
system, screenshots capture the actual window pixels, and the raw escape
bytes the game wrote to its pty are recorded and measured.

Nothing here is simulated. A row is either **executed** (evidence JSON
plus screenshots committed) or recorded as `unverified` with the exact
reason. There are no guessed rows.

## Pieces

- `run-linux.sh` - Linux runner. Starts Xvfb when headless, builds or
  reuses the release binary, launches Kitty, Ghostty, and xterm, drives
  each session, and writes one evidence file per run.
- `run-macos.sh` - macOS runner. Drives the system Terminal, plus iTerm2
  and Ghostty when installed, via the shared driver's `macos` path
  (System Events keystrokes, `screencapture`).
- `run-windows.ps1` - Windows runner. Drives Windows Terminal and conhost
  through PowerShell keystroke injection and .NET screen capture.
- `drive.sh` - shared scripted-session driver. Launches one emulator
  command, waits for the window, walks the game's real state machine with
  named checkpoints, captures screenshots, and logs every event with the
  transcript byte offset at that moment.
- `collect.py` - turns a run directory into one evidence JSON: transcript
  hash and byte totals, synchronized-frame stats, Kitty/Sixel protocol
  counters, first-transmit PNG dimensions, per-phase layout-addressing
  stats, observed video tier, screenshot inventory, and the trace
  ingestion slot (`session/trace.jsonl`, recorded as absent with a reason
  until the binary emits the mode).

## The session

`drive.sh` drives a fixed choreography on every OS and emulator so rows
are comparable. It follows the state machine in
`crates/terminal/src/{app,screens}.rs` exactly:

1. title screen captured on boot;
2. Confirm starts a run, arrow keys steer for a bounded window;
3. the window resizes wide, then below the 62x35 floor (too-small card),
   then back (re-fit);
4. Esc pauses (pause menu captured), then Down + Confirm quits to title;
5. the title menu walks Help, Scores, and Settings with Esc returns;
6. Down + Confirm quits the game and the run records whether the game
   process exited on its own.

Esc is never pressed while on the title screen: per the state machine
that quits the game.

## Running

```sh
# Linux, all emulators, deps preselected
tools/compat/run-linux.sh --install-deps

# one emulator, reuse an existing release binary
tools/compat/run-linux.sh --emulator kitty --skip-build

# forced-tier probes (recorded as their own rows)
tools/compat/run-linux.sh --emulator kitty --tier truecolor \
  --game-env MAZE_CHASE_TIER=truecolor --skip-build
tools/compat/run-linux.sh --emulator ghostty --tier kitty \
  --game-env MAZE_CHASE_TIER=kitty --skip-build
MAZE_CHASE_COMPAT_XTERM_FLAGS="-ti vt340" \
  tools/compat/run-linux.sh --emulator xterm --tier sixel --skip-build
```

Requirements: `python3`, `jq`, `xdotool`, ImageMagick (`import`), and
`Xvfb` on headless Linux; `osascript`/`screencapture` on macOS;
PowerShell plus .NET on Windows. The harness never phones home and never
touches the repository's build state beyond `cargo build --release -p
maze-chase-terminal`.

## Evidence format

`schema: maze-chase-compat-evidence/1`. One JSON per row plus its
screenshots under `evidence/<row>/screenshots/`. The human-readable
roll-up lives in `../../docs/terminal-compat.md`; the measured findings
and their root causes live in `../../../progress/582-maze-chase-overhaul-findings.md`.

Honesty rules the harness enforces mechanically:

- `tier_observed` is read from the game's own on-screen `VIDEO` line in
  the captured transcript, never from the requested flag.
- `tier_requested` records the flag only; `auto` means the game picked.
- `disposition` is `pass` only when the game process exited on its own;
  a killed run is `partial`, a run without a transcript is `unverified`.
- `unverified_reason` is mandatory for unverified rows.
