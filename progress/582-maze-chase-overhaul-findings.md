# Maze Chase Overhaul Findings Ledger

Tracking issue: #582 (the overhaul roadmap and this ledger live here).
Blueprint: `ideas/2026-10-18-maze-chase-overhaul.md`.
Phase: 1 of 7 (Product Reassessment and Real-Terminal Truth).

Every entry names its evidence. Real-terminal findings outrank
harness results, and no entry below claims more than its capture or
measurement shows. Evidence files live in
`maze-chase/tools/compat/evidence/` (one JSON plus screenshots per run).
The harness that produced them is documented in
`maze-chase/tools/compat/README.md`; the public roll-up of executed rows
is `maze-chase/docs/terminal-compat.md`.

Disposition legend: `confirmed` (reproduced with evidence),
`overclaim` (public text claims more than reality),
`open` (observed, root cause or fix deferred to a named phase).

## A. Real-terminal findings

### RT-1: Kitty graphics traffic spins at 58-76 full PNG frames/s and
kills keyboard input (confirmed, critical)

The Owner's Kitty finding reproduces on current `main` with kitty 0.32.2.
The kitty tier transmits the full board PNG every frame, and every
transmit draws a terminal reply (`ESC _ G i=1;OK ESC \`) because the
transmit does not pass `q=2`. Nothing reads or drains those replies:

- the event loop sees a non-empty stdin on every reply, so
  `event::poll(16ms)` returns immediately and the `bitmap_tick % 3`
  pacing gate fires far faster than the documented 20 fps; the reply
  stream is a feedback loop (more frames -> more replies -> faster
  loop);
- measured loop rate while playing: ~190 iterations/s (1146
  size-query `openat`/`ioctl`/`close` triples per 6 s) versus the ~62/s
  idle pace; ~64 full-frame transmits/s sustained;
- crossterm's parser interleaves the reply bytes with real keystrokes.
  In `kitty-linux-auto` the entire driven session produced zero
  `PAUSED`, zero `Resume`, and zero `Quit to title` renders and never
  exited; the identical choreography on the identical kitty build
  forced to `MAZE_CHASE_TIER=truecolor` renders them all and exits
  cleanly.

Evidence: `evidence/kitty-linux-auto.json` (388 MiB transcript, 1756
transmits, killed), `evidence/kitty-linux-truecolor.json` (pass),
`evidence/kitty-linux-auto/ack-spin-experiment.md` (strace transcript of
the reply bytes and the syscall rates).

Target: Phase 3 (bounded probe, pacing with backpressure,
protocol-aware handling). The reply-drain fix is a compatibility bugfix,
not a feature.

### RT-2: Ghostty is routed to truecolor cells although Ghostty speaks
the kitty graphics protocol (confirmed, overclaim)

`initial_tier` in `crates/terminal/src/backend.rs` hard-routes
`TERM_PROGRAM=ghostty` to `Tier::Truecolor` (backend.rs:151-152) before
any live check, and `docs/terminal.md:104` calls this a "genuine
capability gap" claiming Ghostty "has no image protocol". Ghostty
implements the kitty graphics protocol.

Forced-tier probe on Ghostty 1.3.1 (`MAZE_CHASE_TIER=kitty`):
`evidence/ghostty-linux-kitty.json` shows `tier_observed=kitty-graphics`,
936 full raster transmits, and the game painting through Ghostty's
graphics implementation. The auto row (`evidence/ghostty-linux-auto.json`)
shows `truecolor-cells` as shipped.

Target: Phase 3 (live probe with byte replay) plus the Phase 1 doc
correction landed with this ledger.

### RT-3: the raster is a fixed 224x248 for every window size
(confirmed)

Every transmit carries the same `IHDR` size (224x248) regardless of the
window: initial 100x40, resized 143x64, and the placement rect stays
`r=31,c=56`. Layout scales are fixed at 2 or 4 columns and 1 or 2 rows
per game cell (`crates/terminal/src/layout.rs`), so larger windows
stretch a small PNG instead of re-rasterizing, and the render never
consumes real cell pixel sizes.

Evidence: `protocol_totals.kitty.first_transmit_png` in every
kitty-graphics row; screenshots across the resize phases.

Target: Phase 2 (geometry model with cell pixel size, exact-fit image
rendering).

### RT-4: resize leaves stale frames and stale placements on screen
(confirmed)

After any resize the game repaints the new layout without clearing the
old one: screenshots show the previous layout's HUD ghost, the
too-small card ghost, and a stray controls fragment persisting after
re-fit (`evidence/kitty-linux-auto/screenshots/{resized-wide,paused,
refit,title-return,help,scores,settings}.png`; the ghost content is
painted by the app, not a terminal artifact, because it survives every
subsequent synchronized repaint until killed).

In the kitty tier the reverse also happens: shrinking below the floor
paints the too-small card while the last board placement is never
deleted, so the stale board image overlaps the card
(`screenshots/too-small.png`).

Target: Phase 2 (resize contract with same-frame repaint and
stale-placement kill).

### RT-5: the sixel path is the efficient sibling of the kitty path
(confirmed, positive)

xterm 390 in VT340 mode answers the DA1 probe with sixel support and the
sixel tier paints real pixels: 178 transmits, 2.4 MiB of payload for
the whole session, versus 1756 transmits / 424 MiB of PNG payload in
kitty at the same sizes. Input and exit work (`PAUSED` renders 25
times, clean exit). The sixel row is fully executed:
`evidence/xterm-linux-sixel.json` (pass).

xterm requires `-ti vt340` (or the resource equivalent) before its DA1
reply advertises sixel; the default `TERM=xterm` build lands on
`legacy-cells`. Both rows are in the matrix.

Target: Phase 3 keeps this path; the encoder stays, the atlas/dirty
work must match its efficiency.

### RT-6: cell tiers are fully functional (confirmed, positive)

`truecolor-cells` (kitty forced, ghostty auto) and `legacy-cells`
(xterm default) complete the entire choreography: play, steer, pause,
quit to title, help, scores, settings, and a clean process exit.
Evidence: `evidence/{kitty-linux-truecolor,ghostty-linux-auto,
xterm-linux-auto}.json` (all pass). This is the baseline later phases
must not regress; the kitty tier is the outlier, not the cell paths.

### RT-7: unverified rows (honesty record)

| row | reason |
| --- | --- |
| macOS Terminal / iTerm2 / Ghostty | no macOS host in this run; `run-macos.sh` is the executor for the per-OS pass |
| Windows Terminal / conhost | no Windows host in this run; `run-windows.ps1` is the executor for the per-OS pass |
| WezTerm / foot / contour / mlterm | not installable on this runner from configured sources |

The matrix marks each `unverified` and names the executor. No row is
guessed.

### RT-8: latch observations (phase inputs, not defects yet)

- kitty sends press-and-release for every key under its keyboard
  protocol; the game's action wiring ignores key kinds. Harmless today,
  worth handling when Phase 3 touches input.
- the too-small card renders over live game state without destroying
  it; after re-fit the game continues mid-run (observed in the sixel
  row): good behavior to preserve in Phase 2.

## B. Reassessment findings (engine, layers, docs)

Severity tag: `overclaim` where public text exceeds reality.

### Engine, assets, audio

1. `raster.rs` bitmap tiers draw the four wardens without facing
   direction (the pupil placement is theme-constant;
   `crates/terminal/src/raster.rs:212,237-254`); the cell tiers show
   facing, so tiers are not visually equivalent (Phase 4).
2. The fright mask never consumes `theme.fright`; on low-contrast
   themes the frightened state is hard to read (Phase 4).
3. Audio: the tempo constant 132 BPM is duplicated across tracks, the
   title tune plays loudly by default, and the terminal layer routes a
   chime through BEL plus a ticker by default (Phase 5; matches the
   Owner's sound findings).
4. `reduced_flash` suppresses only one of the three flash sources used
   by the renderer (Phase 4).
5. Minimum-size token mismatch: the layout floor is 62x35
   (`crates/terminal/src/layout.rs`; the too-small card text matches),
   while docs and help copy in places say 60x36 (Phase 2 doc fix; the
   matrix already records the real floor).

### Desktop layer

6. `crates/desktop/src/frame.rs:14` caps frames at 16.7M pixels and
   `window.rs:243-245` silently no-ops past it, so a large monitor plus
   HiDPI freezes the window with no message (Phase 6 target: honest
   error plus streaming path).
7. No `scale_factor` handling anywhere in the desktop window sizing:
   HiDPI renders at logical size (Phase 6).
8. The desktop main loop busy-polls; CPU burns while idle (Phase 6).
9. Packaging artifacts are dev-grade (raw binaries, no installers) and
   are oversold by the hub page (Phase 6).

### Web layer

10. `maze-chase/index.html:30` "released and verified across Linux,
    macOS, and Windows" outruns the evidence this ledger records;
    corrected in this phase's surgical pass, full game-first rebuild is
    Phase 7.
11. `maze-chase/index.html:64` linked #582 as "(closed)" while it is
    the open tracking issue for this overhaul (corrected this phase).
12. The hub "installable package" wording exceeds the actual artifacts
    (Phase 6/7).
13. The Windows E2E evidence behind the release claims was signed
    despite failing ConPTY sessions (Phase 6; do not repeat signing
    until the harness is fixed).

### Docs

14. `docs/terminal.md:104-107` Ghostty note is factually wrong
    (overclaim in the negative: a capability gap claimed that does not
    exist). Corrected in this phase; matrix row remains `unverified`
    only for the macOS host, Linux Ghostty is executed.
15. `docs/terminal.md:80-81` "re-placed at 20 fps" does not match the
    measured 58-76 fps (RT-1). Corrected in this phase with a pointer.
16. `maze-chase/README.md:10` repeats the "released and verified"
    overclaim (corrected this phase, consistent with the hub).

## C. Sub-issues to file (through the Maintainer)

Each item below should become a linked issue, prioritized into the
named phase; Phase 1 files them, later phases close them.

1. kitty graphics reply loop: drain/suppress terminal replies, restore
   20 fps pacing and working input (Phase 3, blocking).
2. Ghostty live kitty probe: route Ghostty to kitty graphics when the
   probe answers, fence with the byte-replay probe (Phase 3).
3. Re-rasterize at real cell pixel size and window region (Phase 2).
4. Resize contract: full clear, stale placement deletion, same-frame
   repaint (Phase 2).
5. Continuous cell scales instead of the fixed 2/4 x 1/2 steps
   (Phase 2).
6. Desktop max-pixel silent freeze: bounded error + resize handling
   (Phase 6).
7. Desktop HiDPI `scale_factor` support (Phase 6).
8. Desktop idle CPU burn: event-driven loop (Phase 6).
9. Warden facing in bitmap tiers (Phase 4).
10. Fright mask must consume `theme.fright` (Phase 4).
11. `reduced_flash` must cover every flash source (Phase 4).
12. Audio baseline: single BPM source, quieter defaults, terminal chime
    default-off (Phase 5).
13. Release-claims sweep: hub, README, and docs say only what the
    evidence ledger shows; Windows E2E re-signing only after the harness
    is fixed (Phases 6-7).
14. Min-size copy alignment (60x36 -> 62x35 where it still appears)
    (Phase 2).

## D. Verified and unchanged

- The engine's determinism goldens (`23c17f89734e`) are untouched by
  this phase; the harness never writes to the game's data beyond its
  private config directory.
- The sixel encoder renders correctly through a real DA1 probe on
  xterm (RT-5), and the legacy/truecolor cell boards render correctly
  and glitch-free (RT-6).
- The kitty graphic raster itself displays: the 224x248 PNG arrives and
  paints; the artifacts are the fixed-size stretch (RT-3), stale
  composition (RT-4), and the reply-loop flood (RT-1), not a broken
  encoder or raster.

## E. Method notes and limitations

- Linux rows ran under Xvfb with llvmpipe (software GL). The kitty
  board artifacts are attributed to layout/composition (RT-3/RT-4)
  because they persist across every synchronized repaint and appear as
  app-drawn cell content; a hardware-GL host should be included in the
  Phase 2 proof pass.
- The kitty-linux-auto and ghostty-linux-kitty rows are `partial` by
  construction: the state machine was driven, keys were recorded, and
  the game process had to be killed because the quit keys never landed
  (RT-1). Their screenshots still document real defects.
- Session choreography follows `crates/terminal/src/{app,screens}.rs`
  exactly (Esc quits on title; pause menu is Down+Confirm; sub-screens
  return on Esc). Earlier drafts of the harness guessed the menus and
  produced mislabeled captures; the ledger only cites post-fix runs.
- Branch note: the workflow gate for this build binds pushes to PR
  #662's branch, so Phase 1 landed on `opencode/issue582-20261018121223`
  rather than a fresh `opencode/issue582-overhaul-phase-1-*` branch
  (documented in the PR body).
