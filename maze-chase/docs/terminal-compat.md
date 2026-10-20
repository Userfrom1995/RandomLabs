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

All rows ran on 2026-10-20. The kitty rows and the xterm auto/dark rows
(five of the eight) were re-executed at checkout
`14b939d93b5e` (release `maze-chase-terminal`, SHA-256
`c81890e8d27c8f6914a8decf3df14ca02a9314fd2a9b70bf94991ca714821e9b`,
Rust sources clean). The forced xterm sixel row was re-executed after
the renderer fixes at checkout
`e938ce5a9883efca0c839447e29051d1a4c78810` (release
`maze-chase-terminal`, SHA-256
`e06807bc1f4c0d3fb98552d436c5f4222b28d97cc25ea685d639475154bdc7e0`,
Rust sources clean). The two Ghostty rows were recorded earlier at
`90cb9b87f11cae952f2093b3b81b8db01d7f27e5` (binary
`e5c9a284df71afe37413cb3e3047cfb2ce887cf81ad729feecb92ac3dfd0202a`)
and are marked as such in the table; their rerun is tracked in the
final sign-off phase. Every number below re-derives from the named JSON
and uses true binary units (KiB = 1024 B, MiB = 1024^2 B). Every row
records its identity in its own `build` block (`build.commit`,
`build.binary_sha256`, `build.sources_dirty`). The recorded commit is
the checkout when the row ran; because a `--skip-build` run can reuse a
binary built at an earlier commit, the binary SHA-256 is authoritative.
Each bundle therefore names the exact binary that produced it instead
of implying the current head did. The kitty forced-tier row and the
forced xterm sixel row record `pause_select: 1`: they move the pause
menu cursor to "Quit to title" before the paused checkpoint, so a
forced-tier rerun of an emulator never commits a byte-identical paused
capture (their `events.log` files show the extra Down key at its byte
offset). The xterm VT340 auto row keeps pause_select 0; the forced
sixel row's cursor move keeps the two paused captures distinct.

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
| kitty | 0.32.2 | auto | kitty-graphics | pass | full session, clean exit; 1.72 MiB transcript. The playing phase ran 98 frames in 4.75 s (20.6 fps); mean frame 6.1 KiB, max 15.2 KiB; its capture carries 163 sprite-palette pixels. For the whole session: 21 transmits / 169.6 KiB PNG payload, 879 placements and 859 deletes. The paused capture is a solid text panel (99.9% one color, zero sprite pixels) and the paused phase has zero transmits and zero placements (3 deletes release the board and atlas) | `kitty-linux-auto.json` |
| kitty (forced cells) | 0.32.2 | truecolor | truecolor-cells | pass | full session, clean exit, pause and menus work (8.19 MiB transcript); the playing phase ran 149 frames at 31.3 fps | `kitty-linux-truecolor.json` |
| Ghostty (pre-fix round, rerun tracked) | 1.3.1 | auto | kitty-graphics | pass | recorded at `90cb9b87`; full session, clean exit; 1.42 MiB transcript. `TERM_PROGRAM=ghostty` proves capability, so this row skips the probe (its trace carries no probe record); playing 98 frames in 4.68 s (20.9 fps), 17 transmits / 152.1 KiB during the phase; for the whole session 21 transmits / 175.0 KiB, 867 placements and 850 deletes; mean frame 6.3 KiB, playing max 16.9 KiB (18.9 KiB is the session-wide maximum in the refit phase). The playing capture carries 271 sprite-palette pixels, so sprites render on the terminal that used to hide them | `ghostty-linux-auto.json` |
| Ghostty (forced kitty, pre-fix round, rerun tracked) | 1.3.1 | kitty | kitty-graphics | pass | recorded at `90cb9b87`; full session, clean exit; 1.44 MiB transcript. 21 transmits / 175.0 KiB for the session, playing 101 frames in 4.66 s (21.7 fps) at a 6.2 KiB mean frame; the playing capture census is 271 sprite pixels. The forced row confirms the environment identification is not masking a capability gap. The paused capture is a solid text panel (92.2% one color, zero sprite pixels) with zero transmits and six placements (nine deletes release the board and atlas) in that phase | `ghostty-linux-kitty.json` |
| xterm | 390 | auto | legacy-cells | pass | full session, clean exit; 4.65 MiB transcript. The default light background no longer washes the row out: every painted run carries the theme's own canvas, so the worst capture is 6.2% white (too-small) and the playing capture is 1.7% white (before the fix this row was 7 of 10 captures at >=98% white and was downgraded). The bounded Kitty probe is visible in this row (1x1 transmit plus cleanup) and correctly falls through to cells | `xterm-linux-auto.json` |
| xterm (dark background) | 390, `-bg black -fg white` | auto | legacy-cells | pass | full session, clean exit; 4.65 MiB transcript. The dark twin of the light row: both passes render the same theme canvas now, so a future background-suppression regression shows up as the light row diverging again | `xterm-dark-linux-auto.json` |
| xterm (VT340 mode, forced) | 390, `-ti vt340 -bg black -fg white` | sixel | sixel | pass | 139 Sixel transmits / 4.33 MiB payload (31.9 KiB mean per transmit); the playing checkpoint ran 88 transmits in 4.63 s (19.0 fps) at a 25.3 KiB mean Sixel payload (29.5 KiB mean wire frame; 561 KiB/s wire, 480 KiB/s payload); full session 5.53 MiB. The Sixel palette quantizes the capture so the exact-RGB sprite census is not claimed here; the resized-wide capture is 29.2% one color, so the former blank checkpoint still proves the board. The paused checkpoint uses the changed menu selection, so it is distinct from the auto VT340 row | `xterm-linux-sixel.json` |
| xterm (VT340 mode, auto) | 390, `-ti vt340 -bg black -fg white` | auto | sixel | pass | the DA1 probe answered and the game upgraded itself from legacy-cells to sixel (`tier_requested=auto`); full session (137 Sixel transmits / 4.27 MiB); the Kitty probe is sent first (its 1x1 transmit plus cleanup appear in this row's kitty totals) and the session still upgrades through Sixel, so this is the row that exercises the Sixel probe path | `xterm-vt340-linux-auto.json` |

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
  Measured cost is 21 transmits and 169.6-175.0 KiB of PNG payload per
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
  byte-rate backpressure. A whole session is 137-139 transmits /
  4.27-4.33 MiB across the two VT340 rows.
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
