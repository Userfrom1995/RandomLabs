# Terminal compatibility matrix

What the release binary actually does in real terminal
emulators, measured by the harness in `../tools/compat/`. Every executed
row names its committed evidence bundle (`../tools/compat/evidence/<row>.json`,
that row's screenshots, and the row's `events.log`); every number quoted
below re-derives from those files. `unverified` rows name their executor
and why they have not run. Nothing in this table is estimated.

Session: a fixed choreography that boots the game, plays, steers,
resizes wide, shrinks below the floor, re-fits, pauses, quits to title,
walks help/scores/settings, and quits. On Linux the X11 driver sets real
window sizes (measured with xdotool and recorded per event); the macOS
Aqua driver skips the resize checkpoints and records the skip. `pass`
means the game process exited on its own and the captures rendered;
`partial` means part of the session measurably fell short (keys landed
too late for the process to exit before the harness timeout, or captures
failed the render check) with the exact reason in the JSON
(`exit.killed`, `light_background_captures`); `unverified` means the row
did not execute.

## Executed rows (Linux, harness on this build)

Rows refreshed on 2026-10-19 exercise the render pipeline: live
capability probes, atlas plus placements, wall-clock pacing, and
DEFLATE PNG transmits. Rows dated 2026-10-18 were executed by the same
harness against the preceding build and are kept because their paths
did not change (forced cell and Sixel tiers); every quoted number
re-derives from the named JSON.

| terminal | version | tier requested | tier observed | disposition | notes | evidence |
| --- | --- | --- | --- | --- | --- | --- |
| kitty | 0.32.2 | auto | kitty-graphics | pass | full session, clean exit; 1.76 MiB transcript. The playing phase ran 99 frames in 4.77 s (20.7 fps) with 17 static/atlas transmits (131 KiB payload), 528 placements and 502 deletes; mean frame 5.7 KiB, max 14.3 KiB. For the whole session: 23 transmits / 174 KiB PNG payload | `kitty-linux-auto.json` |
| kitty (forced cells) | 0.32.2 | truecolor | truecolor-cells | pass | full session, clean exit, pause and menus work (16.9 MiB transcript) | `kitty-linux-truecolor.json` |
| Ghostty | 1.3.1 | auto | kitty-graphics | pass | full session, clean exit; 1.47 MiB transcript. Ghostty 1.3.1 does not answer graphics probe commands, so the auto path identifies it by `TERM_PROGRAM=ghostty` and paints pixels directly; playing 107 frames in 4.83 s (22.2 fps), 17 transmits / 157 KiB, 552 placements | `ghostty-linux-auto.json` |
| Ghostty (forced kitty) | 1.3.1 | kitty | kitty-graphics | pass | full session, clean exit; 23 transmits / 192 KiB for the session, playing 22.2 fps at a 5.9 KiB mean frame. The forced row confirms the environment identification is not masking a capability gap | `ghostty-linux-kitty.json` |
| xterm | 390 | auto | legacy-cells | partial | full session and clean exit, but on the default light background the cream chrome text is invisible: 7 of its 10 captures are >=98% white and the row was downgraded with the list recorded (`light_background_captures`). The bounded Kitty probe is visible in this row (1x1 transmit plus cleanup) and correctly falls through to cells | `xterm-linux-auto.json` |
| xterm (dark background) | 390, `-bg black -fg white` | auto | legacy-cells | pass | full session, clean exit; proves the light-row fault is the palette, not the layout | `xterm-dark-linux-auto.json` |
| xterm (VT340 mode, forced) | 390, `-ti vt340 -bg black -fg white` | sixel | sixel | pass | 143 Sixel transmits / 3.75 MiB payload (~26.8 KiB per transmit); the playing checkpoint ran at 18.8 fps (495 KiB/s average); full session | `xterm-linux-sixel.json` |
| xterm (VT340 mode, auto) | 390, `-ti vt340 -bg black -fg white` | auto | sixel | pass | the DA1 probe answered and the game upgraded itself from legacy-cells to sixel (`tier_requested=auto`); full session; this is the row that exercises the Sixel probe path | `xterm-vt340-linux-auto.json` |

## Rows awaiting their host

| terminal | OS | executor | status |
| --- | --- | --- | --- |
| Apple Terminal | macOS | `../tools/compat/run-macos.sh` | unverified: no macOS host in the Linux run |
| iTerm2 | macOS | `../tools/compat/run-macos.sh` | unverified: no macOS host in the Linux run |
| Ghostty | macOS | `../tools/compat/run-macos.sh` | unverified: no macOS host in the Linux run |
| Windows Terminal | Windows | `../tools/compat/run-windows.ps1` | unverified: no Windows host in the Linux run |
| conhost | Windows | `../tools/compat/run-windows.ps1` | unverified: no Windows host in the Linux run |
| WezTerm, foot, contour, mlterm | Linux | harness extension (no launch profile yet; the Linux runner covers kitty, ghostty, xterm) | unverified: not installable on this runner from its configured sources |

## Session view of the tier ladder

- `kitty-graphics` is fully playable on a real Kitty and Ghostty. The
  static board and sprite atlas transmit once per change, placements
  carry every moving sprite, and steady transmits are silent (`q=2`),
  so replies cannot spin the input loop. Both rows exit cleanly.
  Measured cost is 23 transmits and under 200 KiB of PNG payload per
  session, against 1642 transmits and 348.6 MiB before the render
  pipeline phase.
- `sixel` is fully playable on a real Sixel terminal. The encoder caps
  its palette at 64 colors and a frame at 2 MiB (with a smaller-palette
  retry and a cell fallback), and the tier paces at 24 Hz with
  byte-rate backpressure. A whole session is 143 transmits / 3.75 MiB.
- `legacy-cells` and `truecolor-cells` are fully playable on every
  executed cell row (kitty forced cells, xterm dark).
- Ghostty is no longer a detection defect: its 1.3.1 build implements
  the Kitty graphics protocol but never answers graphics probe
  commands, so `TERM_PROGRAM=ghostty` and `TERM=xterm-ghostty` select
  the graphics path directly, and the watchdog still degrades on real
  protocol errors. Both its auto and forced rows pass.
- Light-background terminals remain a palette defect: the committed
  light xterm row lists seven >=98% white captures (the cream chrome
  text is unreadable on white), while the dark row at the same size
  renders and exits cleanly.

The measured floor is 62 columns by 35 rows (the too-small card names
it); below that the game keeps running and re-fits live on the next
resize.

Findings and root causes behind this table:
`../../progress/582-maze-chase-overhaul-findings.md`.
