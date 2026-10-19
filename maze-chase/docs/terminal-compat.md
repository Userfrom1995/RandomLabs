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
`15b387c85a47c68aa9477dec754fa29bf3e01f8f` (release
`maze-chase-terminal`, SHA-256
`cfa761c0c08bf287e395a5ed5af4ea300d880177f149f5476b35330decd3b682`,
Rust sources clean), so every number below re-derives from the named
JSON and uses true binary units (KiB = 1024 B, MiB = 1024^2 B). Every
row records that identity in its own `build` block
(`build.commit`, `build.binary_sha256`, `build.sources_dirty`), so each
bundle names the exact code and binary that produced it instead of
implying the current head did. The forced-tier rows also record
`pause_select: 1`: they move the pause menu cursor to "Quit to title"
before the paused checkpoint, so the second executed row of an emulator
never commits a byte-identical paused capture (each `events.log` shows
the extra Down key at its byte offset).

The kitty-graphics `pass` rows also carry a
sprite-palette census per capture (`sprite_census` in each phase,
`sprite_visibility.playing_captures_with_sprites` at the top level); when
placements are on the wire, the collector refuses to sign a
kitty-graphics `pass` without a playing capture containing sprite pixels,
and on any bitmap tier (kitty-graphics or sixel) it refuses a `pass`
with no decodable playing capture at all, so a menu-only capture set can
never sign one. On Linux and macOS, a `pass` whose transcript never names
the active video tier is refused outright, because the bitmap gates are
keyed on the observed tier (Windows rows carry no transcript by design and
are graded from the process record and the capture set). Independently of
the placement count, it refuses a kitty-graphics `pass` whose
paused capture carries sprite pixels, has no decodable capture, or
is not a near-solid text panel (at least 90% and less than 100% one
color), or whose phase list does not carry exactly one paused
checkpoint (the fixed session always takes exactly one, so a missing
or duplicated checkpoint is refused as unverifiable pause evidence).
It also refuses a playing, resized, or refit capture that is
>=90% one color on the bitmap tiers (a blank board).

| terminal | version | tier requested | tier observed | disposition | notes | evidence |
| --- | --- | --- | --- | --- | --- | --- |
| kitty | 0.32.2 | auto | kitty-graphics | pass | full session, clean exit; 1.67 MiB transcript. The playing phase ran 97 frames in 4.71 s (20.6 fps) with 17 static/atlas transmits (128.2 KiB payload), 406 placements and 380 deletes; mean frame 6.0 KiB, max 14.5 KiB; its capture carries 227 sprite-palette pixels. For the whole session: 21 transmits / 156.1 KiB PNG payload. The paused capture is a solid text panel (99.9% one color, zero sprite pixels) and the paused phase has zero transmits and zero placements (3 deletes release the board and atlas) | `kitty-linux-auto.json` |
| kitty (forced cells) | 0.32.2 | truecolor | truecolor-cells | pass | full session, clean exit, pause and menus work (7.92 MiB transcript) | `kitty-linux-truecolor.json` |
| Ghostty | 1.3.1 | auto | kitty-graphics | pass | full session, clean exit; 1.41 MiB transcript. `TERM_PROGRAM=ghostty` proves capability, so this row skips the probe (its trace carries no probe record); playing 98 frames in 4.68 s (20.9 fps), 17 transmits / 139.3 KiB, 405 placements and 379 deletes; mean frame 6.1 KiB, max 16.0 KiB. The playing capture carries 402 sprite-palette pixels, so sprites render on the terminal that used to hide them | `ghostty-linux-auto.json` |
| Ghostty (forced kitty) | 1.3.1 | kitty | kitty-graphics | pass | full session, clean exit; 1.44 MiB transcript. 21 transmits / 160.1 KiB for the session, playing 100 frames in 4.71 s (21.2 fps) at a 6.1 KiB mean frame; the playing capture census is 402 sprite pixels. The forced row confirms the environment identification is not masking a capability gap. The paused capture is a solid text panel (92.2% one color, zero sprite pixels) with zero transmits and zero placements in that phase | `ghostty-linux-kitty.json` |
| xterm | 390 | auto | legacy-cells | pass | full session, clean exit; 4.61 MiB transcript. The default light background no longer washes the row out: every painted run carries the theme's own canvas, so the worst capture is 6.2% white (too-small) and the playing capture is 1.7% white (before the fix this row was 7 of 10 captures at >=98% white and was downgraded). The bounded Kitty probe is visible in this row (1x1 transmit plus cleanup) and correctly falls through to cells | `xterm-linux-auto.json` |
| xterm (dark background) | 390, `-bg black -fg white` | auto | legacy-cells | pass | full session, clean exit; 4.61 MiB transcript. The dark twin of the light row: both passes render the same theme canvas now, so a future background-suppression regression shows up as the light row diverging again | `xterm-dark-linux-auto.json` |
| xterm (VT340 mode, forced) | 390, `-ti vt340 -bg black -fg white` | sixel | sixel | pass | 141 Sixel transmits / 3.41 MiB payload (24.8 KiB mean per transmit); the playing checkpoint ran 89 transmits in 4.61 s (19.3 fps) at a 20.9 KiB mean transmit (404 KiB/s); full session. The playing capture census is 52 sprite pixels, so the Sixel path renders sprites too, and the resized-wide capture is 32.4% one color with 208 sprite pixels (the former blank checkpoint now proves the board) | `xterm-linux-sixel.json` |
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
  paused capture carries sprite pixels, has no decodable capture, or is
  not a near-solid text panel (at least 90% and less than 100% one
  color), or whose phase list does not carry exactly one paused
  checkpoint; on every bitmap tier it also refuses a `pass` with no
  decodable playing capture, or (on Linux and macOS, whose sessions carry
  a transcript) one whose transcript never names the
  active video tier.
- `sixel` is fully playable on a real Sixel terminal. The encoder caps
  its palette at 64 colors and a frame at 2 MiB (with a smaller-palette
  retry and a cell fallback), and the tier paces at 24 Hz with
  byte-rate backpressure. A whole session is 141 transmits /
  3.41 MiB.
- `legacy-cells` and `truecolor-cells` are fully playable on every
  executed cell row (kitty forced cells, xterm default-light, xterm
  dark).
- Ghostty is no longer a detection defect: its 1.3.1 build implements
  the Kitty graphics protocol and answers the live probe when one is
  sent (a direct pty experiment with the game's exact probe request,
  `../tools/compat/probe-graphics.py`, 2026-10-19; both raw reply
  captures are committed under
  `../tools/compat/probe-captures/` with their commands and hashes);
  `TERM_PROGRAM=ghostty` and `TERM=xterm-ghostty` select the
  graphics path directly and skip the probe on those rows. The watchdog
  watches the frame write path (steady transmits are silent by design),
  so a terminal that silently mis-composites cannot be detected; that
  is why placements carry explicit stacking layers instead of relying
  on tie-breaking. Both its auto and forced rows pass.
- Light-background terminals render identically to dark ones: the game
  now paints the theme's own background on every painted run (the cell
  tiers no longer rely on the terminal's default background), so the
  committed default-light xterm row passes with a 1.7% white playing
  capture and 6.2% at worst, and its dark twin renders the same canvas.
  The former defect (seven >=98% white captures with the cream chrome
  text invisible) is pinned by the Unicode backend regression test.

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
