# Terminal compatibility matrix

What the shipped release binary actually does in real terminal
emulators, measured by the harness in `tools/compat/`. Every `verified`
cell names the evidence file committed alongside this document
(`tools/compat/evidence/<row>.json` plus screenshots). `unverified` rows
name their executor and the reason they have not run yet. Nothing in
this table is estimated.

Session: a fixed choreography that boots the game, plays, steers,
resizes wide, shrinks below the floor, re-fits, pauses, quits to title,
walks help/scores/settings, and quits. `pass` means the game process
exited on its own; `partial` means part of the session was blocked (for
example keys did not land) and the process was stopped.

## Executed rows (Linux, 2026-10-18, harness commit on this PR)

| terminal | version | tier requested | tier observed | disposition | notes | evidence |
| --- | --- | --- | --- | --- | --- | --- |
| kitty | 0.32.2 | auto | kitty-graphics | partial | 388 MiB transcript: terminal OK-replies spin the loop to ~64 full-frame transmits/s and swallow Esc/pause keys after gameplay starts; resize leaves stale frames | `kitty-linux-auto.json` |
| kitty (forced cells) | 0.32.2 | truecolor | truecolor-cells | pass | full session, clean exit, pause and menus work | `kitty-linux-truecolor.json` |
| Ghostty | 1.3.1 | auto | truecolor-cells | pass | full session; auto-detect routes Ghostty to cells although Ghostty speaks kitty graphics | `ghostty-linux-auto.json` |
| Ghostty (forced kitty) | 1.3.1 | kitty | kitty-graphics | partial | paints the kitty raster through Ghostty's graphics implementation; 936 transmits, 214 MiB, process killed after the flood | `ghostty-linux-kitty.json` |
| xterm | 390 | auto | legacy-cells | pass | full session in the 16-color tier | `xterm-linux-auto.json` |
| xterm (VT340 mode) | 390, `-ti vt340` | sixel | sixel | pass | DA1 probe answers; 178 sixel transmits, 2.4 MiB total; full session | `xterm-linux-sixel.json` |

## Rows awaiting their host

| terminal | OS | executor | status |
| --- | --- | --- | --- |
| Apple Terminal | macOS | `tools/compat/run-macos.sh` | unverified: no macOS host in the Linux run |
| iTerm2 | macOS | `tools/compat/run-macos.sh` | unverified: no macOS host in the Linux run |
| Ghostty | macOS | `tools/compat/run-macos.sh` | unverified: no macOS host in the Linux run |
| Windows Terminal | Windows | `tools/compat/run-windows.ps1` | unverified: no Windows host in the Linux run |
| conhost | Windows | `tools/compat/run-windows.ps1` | unverified: no Windows host in the Linux run |
| WezTerm, foot, contour, mlterm | Linux | `tools/compat/run-linux.sh --emulator <name>` | unverified: not installable on this runner from its configured sources |

## Session view of the tier ladder

- `legacy-cells` and `truecolor-cells` are fully playable today,
  including the menu surfaces, on every executed cell row.
- `sixel` is fully playable on a real sixel terminal and is the most
  bandwidth-efficient bitmap path measured (about 13 KiB per frame
  against the kitty path's ~240 KiB per full-frame PNG at the same
  sizes).
- `kitty-graphics` paints, but its reply handling (measured on kitty
  0.32.2 and observed on Ghostty 1.3.1) floods the event loop and
  breaks input; the fix and the re-proof are Phase 3 work in the #582
  overhaul.
- Ghostty's auto row is a detection defect, not a capability gap:
  Ghostty implements the kitty graphics protocol, proven by the forced
  row above.

The measured floor is 62 columns by 35 rows (the too-small card names
it); below that the game keeps running and re-fits live on the next
resize.

Findings and root causes behind this table:
`progress/582-maze-chase-overhaul-findings.md`.
