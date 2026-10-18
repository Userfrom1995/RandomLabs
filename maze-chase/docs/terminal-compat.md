# Terminal compatibility matrix

What the shipped release binary actually does in real terminal
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

## Executed rows (Linux, 2026-10-18, harness on this PR)

| terminal | version | tier requested | tier observed | disposition | notes | evidence |
| --- | --- | --- | --- | --- | --- | --- |
| kitty | 0.32.2 | auto | kitty-graphics | partial | 381.8 MiB transcript: 1642 board transmits / 348.6 MiB PNG payload (~217 KiB per 224x248 transmit); the reply loop repaints 70-77 synchronized frames/s, 391/s with the too-small card up; input queues behind the flood (pause surface first paints 298 MB in) and the final quit never lands, process killed | `kitty-linux-auto.json` |
| kitty (forced cells) | 0.32.2 | truecolor | truecolor-cells | pass | full session, clean exit, pause and menus work (16.9 MiB transcript) | `kitty-linux-truecolor.json` |
| Ghostty | 1.3.1 | auto | truecolor-cells | pass | full session; auto-detect routes Ghostty to cells although Ghostty speaks kitty graphics | `ghostty-linux-auto.json` |
| Ghostty (forced kitty) | 1.3.1 | kitty | kitty-graphics | partial | paints the kitty raster through Ghostty's graphics implementation (921 transmits / 195.6 MiB payload); the pause surface first paints at byte 166,859,269, help and scores only in the tail (bytes 214,328,374 and 217,821,876), and the settings screen never reaches the wire before the kill; the final quit never lands, process killed | `ghostty-linux-kitty.json` |
| xterm | 390 | auto | legacy-cells | partial | full session and clean exit, but on the default light background the cream chrome text is invisible: 7 of its 10 captures are >=98% white and the row was downgraded with the list recorded (`light_background_captures`) | `xterm-linux-auto.json` |
| xterm (dark background) | 390, `-bg black -fg white` | auto | legacy-cells | pass | full session, clean exit; proves the light-row fault is the palette, not the layout | `xterm-dark-linux-auto.json` |
| xterm (VT340 mode, forced) | 390, `-ti vt340` | sixel | sixel | pass | 183 sixel transmits / 2.46 MiB payload (~13.7 KiB per transmit); full session | `xterm-linux-sixel.json` |
| xterm (VT340 mode, auto) | 390, `-ti vt340` | auto | sixel | pass | the DA1 probe answered and the game upgraded itself from legacy-cells to sixel (`tier_requested=auto`); full session; this is the row that exercises the probe path | `xterm-vt340-linux-auto.json` |

## Rows awaiting their host

| terminal | OS | executor | status |
| --- | --- | --- | --- |
| Apple Terminal | macOS | `../tools/compat/run-macos.sh` | unverified: no macOS host in the Linux run |
| iTerm2 | macOS | `../tools/compat/run-macos.sh` | unverified: no macOS host in the Linux run |
| Ghostty | macOS | `../tools/compat/run-macos.sh` | unverified: no macOS host in the Linux run |
| Windows Terminal | Windows | `../tools/compat/run-windows.ps1` | unverified: no Windows host in the Linux run |
| conhost | Windows | `../tools/compat/run-windows.ps1` | unverified: no Windows host in the Linux run |
| WezTerm, foot, contour, mlterm | Linux | `../tools/compat/run-linux.sh --emulator <name>` | unverified: not installable on this runner from its configured sources |

## Session view of the tier ladder

- `legacy-cells` and `truecolor-cells` are fully playable today,
  including the menu surfaces, on every executed cell row (kitty forced
  cells, Ghostty auto, xterm dark).
- `sixel` is fully playable on a real sixel terminal and is the most
  bandwidth-efficient bitmap path measured: ~13.7 KiB per transmit
  (183 transmits, 2.46 MiB for a whole session) against the kitty
  path's ~217 KiB per 224x248 board transmit (195.6-348.6 MiB per
  session at the same sizes).
- `kitty-graphics` paints, but its reply handling floods the event loop:
  `kitty-linux-auto` measures 70-77 synchronized frames/s sustained
  (391/s with the too-small card up) and `ghostty-linux-kitty` 39-49/s,
  against the intended pacing; input surfaces paint hundreds of
  megabytes behind their keys, and both kitty-graphics rows had to be
  killed when the quit path never landed. The fix and the re-proof are
  the terminal render pipeline phase of the #582 overhaul.
- Ghostty's auto row is a detection defect, not a capability gap:
  Ghostty implements the kitty graphics protocol, proven by the forced
  row above.
- Light-background terminals are a palette defect: the committed light
  xterm row lists seven >=98% white captures (the cream chrome text is
  unreadable on white), while the dark row at the same size renders and
  exits cleanly.

The measured floor is 62 columns by 35 rows (the too-small card names
it); below that the game keeps running and re-fits live on the next
resize.

Findings and root causes behind this table:
`../../progress/582-maze-chase-overhaul-findings.md`.
