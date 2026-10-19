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

All rows were refreshed on 2026-10-19 from the release binary built at
`af1c1496` (the pause-surface fix round), so every number below
re-derives from the named JSON and uses true binary units (KiB = 1024 B,
MiB = 1024^2 B). The kitty-graphics `pass` rows also carry a
sprite-palette census per capture (`sprite_census` in each phase,
`sprite_visibility.playing_captures_with_sprites` at the top level); the
collector refuses to sign a kitty-graphics `pass` without a playing
capture containing sprite pixels or with a paused phase whose capture
still carries sprite pixels (the opaque board over the pause menu)
unless the paused capture has no sprite pixels and is >=90% one color
(the text panel on a solid background). It also refuses a playing,
resized, or refit capture that is >=98% one color on the bitmap tiers
(a blank board).

| terminal | version | tier requested | tier observed | disposition | notes | evidence |
| --- | --- | --- | --- | --- | --- | --- |
| kitty | 0.32.2 | auto | kitty-graphics | pass | full session, clean exit; 1.52 MiB transcript. The playing phase ran 99 frames in 4.79 s (20.7 fps) with 17 static/atlas transmits (128.2 KiB payload), 414 placements and 388 deletes; mean frame 5.4 KiB, max 13.9 KiB; its capture carries 228 sprite-palette pixels. For the whole session: 21 transmits / 156.1 KiB PNG payload. The paused capture is a solid text panel (99.9% one color, zero sprite pixels) and the paused phase has zero transmits and zero placements | `kitty-linux-auto.json` |
| kitty (forced cells) | 0.32.2 | truecolor | truecolor-cells | pass | full session, clean exit, pause and menus work (6.14 MiB transcript) | `kitty-linux-truecolor.json` |
| Ghostty | 1.3.1 | auto | kitty-graphics | pass | full session, clean exit; 1.34 MiB transcript. `TERM_PROGRAM=ghostty` proves capability, so this row skips the probe (its trace carries no probe record); playing 104 frames in 4.79 s (21.7 fps), 17 transmits / 139.3 KiB, 423 placements and 397 deletes; mean frame 5.5 KiB, max 15.4 KiB. The playing capture carries 402 sprite-palette pixels, so sprites render on the terminal that used to hide them | `ghostty-linux-auto.json` |
| Ghostty (forced kitty) | 1.3.1 | kitty | kitty-graphics | pass | full session, clean exit; 1.34 MiB transcript. 21 transmits / 160.1 KiB for the session, playing 104 frames in 4.76 s (21.9 fps) at a 5.5 KiB mean frame; the playing capture census is 412 sprite pixels. The forced row confirms the environment identification is not masking a capability gap. The paused capture is a solid text panel (93.0% one color, zero sprite pixels); 7 trailing placements attributed to that phase are checkpoint-boundary tail, recorded in the JSON, not a board over the menu | `ghostty-linux-kitty.json` |
| xterm | 390 | auto | legacy-cells | partial | full session and clean exit, but on the default light background the cream chrome text is invisible: 7 of its 10 captures are >=98% white and the row was downgraded with the list recorded (`light_background_captures`). The bounded Kitty probe is visible in this row (1x1 transmit plus cleanup) and correctly falls through to cells | `xterm-linux-auto.json` |
| xterm (dark background) | 390, `-bg black -fg white` | auto | legacy-cells | pass | full session, clean exit; proves the light-row fault is the palette, not the layout (4.03 MiB transcript) | `xterm-dark-linux-auto.json` |
| xterm (VT340 mode, forced) | 390, `-ti vt340 -bg black -fg white` | sixel | sixel | pass | 140 Sixel transmits / 3.39 MiB payload (25,392 B per transmit, 24.8 KiB); the playing checkpoint ran at 18.9 fps (466 KiB/s average); full session. The playing capture census is 52 sprite pixels, so the Sixel path renders sprites too, and the resized-wide capture is 51% one color with 208 sprite pixels (the former blank checkpoint now proves the board) | `xterm-linux-sixel.json` |
| xterm (VT340 mode, auto) | 390, `-ti vt340 -bg black -fg white` | auto | sixel | pass | the DA1 probe answered and the game upgraded itself from legacy-cells to sixel (`tier_requested=auto`); full session (141 Sixel transmits / 3.41 MiB); the Kitty probe is sent first (its 1x1 transmit plus cleanup appear in this row's kitty totals) and the session still upgrades through Sixel, so this is the row that exercises the Sixel probe path | `xterm-vt340-linux-auto.json` |

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
  carry every moving sprite with explicit per-warden `z` stacking layers
  (body `i` below eyes `i` below body `i + 1`, mirroring the raster's
  paint order even when two warden boxes overlap), and
  steady transmits are silent (`q=2`), so replies cannot spin the input
  loop. Both rows exit cleanly, and their playing captures prove sprite
  visibility by census (no equal-z tie-break can hide the atlas).
  Measured cost is 21 transmits and 156.1-160.1 KiB of PNG payload per
  session, against the pre-pipeline flood (a historical 1642 transmits
  and 348.6 MiB, not re-derivable from the regenerated JSONs). The
  pause surface releases the board and atlas before
  painting its text menu, and the collector refuses a kitty `pass` whose
  paused capture still carries sprite pixels.
- `sixel` is fully playable on a real Sixel terminal. The encoder caps
  its palette at 64 colors and a frame at 2 MiB (with a smaller-palette
  retry and a cell fallback), and the tier paces at 24 Hz with
  byte-rate backpressure. A whole session is 140-141 transmits /
  3.39-3.41 MiB.
- `legacy-cells` and `truecolor-cells` are fully playable on every
  executed cell row (kitty forced cells, xterm dark).
- Ghostty is no longer a detection defect: its 1.3.1 build implements
  the Kitty graphics protocol and answers the live probe when one is
  sent (a direct pty experiment with the game's exact probe request,
  `../tools/compat/probe-graphics.py`, 2026-10-19, recorded both
  replies); `TERM_PROGRAM=ghostty` and `TERM=xterm-ghostty` select the
  graphics path directly and skip the probe on those rows. The watchdog
  watches the frame write path (steady transmits are silent by design),
  so a terminal that silently mis-composites cannot be detected; that
  is why placements carry explicit stacking layers instead of relying
  on tie-breaking. Both its auto and forced rows pass.
- Light-background terminals remain a palette defect: the committed
  light xterm row lists seven >=98% white captures (the cream chrome
  text is unreadable on white), while the dark row at the same size
  renders and exits cleanly.

The measured floor is 62 columns by 35 rows (the too-small card names
it); below that the game keeps running and re-fits live on the next
resize.

Known input limitation: the event source is crossterm's global parser,
which holds an unrecognized private CSI sequence (for example
`ESC [ ? 99999 h`) and suppresses key delivery until a completion byte
such as `u` arrives. The harness cannot synthesize a recovery the game
does not have, so the limitation is documented in `terminal.md` and
pinned by a PTY regression test; it is not a row-level pass claim.

Findings and root causes behind this table:
`../../progress/582-maze-chase-overhaul-findings.md`.
