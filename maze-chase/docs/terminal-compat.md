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
did not execute. A transcript-driven `pass` also requires every fixed
checkpoint (`title`, `playing`, `paused`, `title-return`, `help`,
`scores`, `settings`, plus the resize checkpoints when the driver
exercised resizes) to be present, non-empty, and captured; a driver that
sees no transcript output within its bounded readiness wait records a
`readiness-timeout` and the row is `unverified`, never a blank-session
pass.

## Executed rows (Linux, published rc.1 artifacts)

All rows ran on 2026-10-28 against the published
`maze-chase-v0.1.0-rc.1` artifacts from tag commit
`11a0037b9692c4b3da711632ff9938533650efd3` (release run
[40161835683](https://github.com/Userfrom1995/RandomLabs/actions/runs/40161835683)),
using `maze-chase-terminal` SHA-256
`9f6cd45a440e37ddf22f9072a9991e7047284b7a04d7effa55e2ff3387b83c83`;
every row records `build.sources_dirty: false`. Every number below
re-derives from the named JSON and uses true binary units (KiB = 1024 B,
MiB = 1024^2 B). Each row records its identity in its own `build` block
(`build.commit`, `build.binary_sha256`, `build.sources_dirty`). The
recorded commit is the tag that produced the published binary; the
binary SHA-256 is authoritative. Each bundle therefore names the exact
binary that produced it instead of implying the current head did. The
forced kitty truecolor row, the forced Ghostty kitty row, and the forced
xterm sixel row record `pause_select: 1`: they move the pause menu
cursor to "Quit to title" before the paused checkpoint, so a forced-tier
rerun of an emulator never commits a byte-identical paused capture
(their `events.log` files show the extra Down key at its byte offset).
The auto rows keep pause_select 0.

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
are graded from the process record and the capture set). The pause hub
deliberately freezes the 55%-dimmed board with the actors exempt, so a
current paused capture is allowed to carry sprite pixels and sit between
55% and 100% one color: the collector requires the PAUSED card paint in
the paused transcript slice, a non-flat paused capture
(`0.55 <= dominant_share < 1.0`) with at least four sprite-palette
pixels, and exactly one paused checkpoint, and
still refuses a paused capture with no decodable screenshot
(`missing_paused_capture`) or an unpainted deck pane
(`missing_paused_panel`). It also refuses a playing, resized, or refit
capture that is >=90% one color on the bitmap tiers (a blank board).

| terminal | version | tier requested | tier observed | disposition | notes | evidence |
| --- | --- | --- | --- | --- | --- | --- |
| kitty | 0.32.2 | auto | kitty-graphics | pass | full session, clean exit; 2.22 MiB transcript. The playing phase ran 98 frames in 4.748 s (20.6 fps); mean frame 6.31 KiB, max 15.4 KiB; its capture carries 163 sprite-palette pixels. For the whole session: 21 transmits / 169.9 KiB PNG payload, 890 placements and 870 deletes. The paused capture freezes the dimmed board and the PAUSED card (66.25% one color, 200 sprite pixels); the paused phase has zero transmits and zero placements (three deletes release the board and atlas) | `kitty-linux-auto.json` |
| kitty (forced cells) | 0.32.2 | truecolor | truecolor-cells | pass | full session, clean exit, pause and menus work (8.67 MiB transcript); the playing phase ran 150 frames in 4.767 s (31.5 fps) at a 21.5 KiB mean frame; zero kitty transmits for the whole session, as expected on the forced cell tier. The paused capture uses the changed menu selection and carries the frozen board (66.25% one color, 200 sprite pixels) | `kitty-linux-truecolor.json` |
| Ghostty | 1.3.1 | auto | kitty-graphics | pass | full session, clean exit; 1.91 MiB transcript. `TERM_PROGRAM=ghostty` proves capability, so this row skips the probe (its trace carries no probe record); playing 110 frames in 4.815 s (22.8 fps), 17 transmits / 152.2 KiB during the phase; for the whole session 21 transmits / 175.4 KiB, 967 placements and 953 deletes; mean frame 6.32 KiB, playing max 17.2 KiB (the refit-phase maximum is 19.2 KiB; the session-wide maximum is 30.9 KiB). The playing capture carries 220 sprite-palette pixels, so sprites render on the terminal that used to hide them. The paused capture carries the frozen board (71.04% one color, 20 sprite pixels) with zero transmits and zero placements (three deletes release the board and atlas) in that phase | `ghostty-linux-auto.json` |
| Ghostty (forced kitty) | 1.3.1 | kitty | kitty-graphics | pass | full session, clean exit; 1.91 MiB transcript. 21 transmits / 175.4 KiB for the session, 957 placements and 940 deletes; playing 107 frames in 4.829 s (22.2 fps) at a 6.36 KiB mean frame; the playing capture census is 217 sprite pixels. The forced row confirms the environment identification is not masking a capability gap. The paused capture uses the changed menu selection and carries the frozen board (71.04% one color, 20 sprite pixels) with zero transmits and zero placements (three deletes release the board and atlas) in that phase | `ghostty-linux-kitty.json` |
| xterm | 390 | auto | legacy-cells | pass | full session, clean exit; 5.00 MiB transcript. The default light background no longer washes the row out: every painted run carries the theme's own canvas, so the worst capture is 6.17% white (too-small) and the playing capture is 1.85% white (before the fix this row was 7 of 10 captures at >=98% white and was downgraded). The bounded Kitty probe is visible in this row (1x1 transmit plus cleanup) and correctly falls through to cells | `xterm-linux-auto.json` |
| xterm (dark background) | 390, `-bg black -fg white` | auto | legacy-cells | pass | full session, clean exit; 4.97 MiB transcript. The dark twin of the light row: both passes render the same theme canvas now (worst capture 1.46% white, playing 0.43% white), so a future background-suppression regression shows up as the light row diverging again | `xterm-dark-linux-auto.json` |
| xterm (VT340 mode, forced) | 390, `-ti vt340 -bg black -fg white` | sixel | sixel | pass | 137 Sixel transmits / 4.27 MiB payload (31.9 KiB mean per transmit); the playing checkpoint ran 88 transmits in 4.677 s (18.8 fps) at a 25.28 KiB mean Sixel payload (29.72 KiB mean wire frame; 559 KiB/s wire, 476 KiB/s payload); full session 5.93 MiB. The Sixel palette quantizes the capture so the exact-RGB sprite census is not claimed here; the resized-wide capture is 29.15% one color, so the former blank checkpoint still proves the board. The paused checkpoint uses the changed menu selection and carries the frozen board (89.13% one color, 712 sprite pixels), so it is distinct from the auto VT340 row | `xterm-linux-sixel.json` |
| xterm (VT340 mode, auto) | 390, `-ti vt340 -bg black -fg white` | auto | sixel | pass | the DA1 probe answered and the game upgraded itself from legacy-cells to sixel (`tier_requested=auto`); full session (137 Sixel transmits / 4.27 MiB, 5.93 MiB transcript); playing 88 frames in 4.685 s (18.8 fps) at a 29.71 KiB mean wire frame; the Kitty probe is sent first (its 1x1 transmit plus cleanup appear in this row's kitty totals) and the session still upgrades through Sixel, so this is the row that exercises the Sixel probe path. The paused capture keeps the frozen board (89.12% one color, 520 sprite pixels) | `xterm-vt340-linux-auto.json` |

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
  Measured cost is 21 transmits and 169.9-175.4 KiB of PNG payload per
  session, against the pre-pipeline flood (a historical 1642 transmits
  and 348.6 MiB, not re-derivable from the regenerated JSONs). The pause
  hub freezes the 55%-dimmed board with the actors exempt and transmits
  no new frame image; the collector therefore accepts sprite pixels in
  the paused capture but requires the PAUSED card paint, a non-flat
  capture (`0.55 <= dominant_share < 1.0`) with at least four
  sprite-palette pixels, a decodable screenshot, and exactly one paused
  checkpoint. On every bitmap tier it also refuses a
  `pass` with no decodable playing capture, or (on Linux and macOS, whose
  sessions carry a transcript) one whose transcript never names the
  active video tier.
- `sixel` is fully playable on a real Sixel terminal. The encoder caps
  its palette at 64 colors and a frame at 2 MiB (with a smaller-palette
  retry and a cell fallback), and the tier paces at 24 Hz with
  byte-rate backpressure. Each VT340 row's whole session is 137
  transmits / 4.27 MiB.
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
  committed default-light xterm row passes with a 1.85% white playing
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
