# Maze Chase Overhaul Findings Ledger

Tracking issue: #582 (the overhaul roadmap and this ledger live here).
Blueprint: `ideas/2026-10-18-maze-chase-overhaul.md`.
Phase: 1 of the eight-phase roadmap (Product Reassessment and
Real-Terminal Truth).

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

### RT-1: Kitty graphics traffic floods the event loop and delays input
past the session (confirmed, critical)

The Owner's Kitty finding reproduces on current `main` with kitty 0.32.2.
The kitty tier transmits the board PNG every frame, and every transmit
draws a terminal reply (`ESC _ G i=1;OK ESC \`) because the transmit does
not pass `q=2`. Nothing reads or drains those replies:

- the event loop sees a non-empty stdin on every reply, so
  `event::poll(16ms)` returns immediately and the `bitmap_tick % 3`
  pacing gate fires far faster than the documented 20 fps; the reply
  stream is a feedback loop (more frames -> more replies -> faster
  loop);
- measured loop rate while playing: ~190 iterations/s (1146
  size-query `openat`/`ioctl`/`close` triples per 6 s) versus the ~61/s
  idle pace (364 size queries in 6 s; strace experiment);
- committed rows measure the loop rate and the input lag directly:
  `kitty-linux-auto` repaints 70.3-76.9 synchronized frames/s while
  playing and 390.7/s with the too-small card up; its input surfaces
  paint far behind their keys (the pause surface first paints at byte
  298,181,872 of a 400,331,543-byte session) and the quit path never
  lands, so the process was killed. `ghostty-linux-kitty` shows the
  same shape (pause surface first paints at byte 166,859,269 of
  221,000,942; killed).
- the committed per-phase `surfaces` counters prove delayed input, not
  dead input: `kitty-linux-auto` eventually paints every driven surface
  (in the tail, hundreds of megabytes behind its keys), while
  `ghostty-linux-kitty` paints its pause surface at byte 166,859,269
  (first reaching the wire during the settings checkpoint, far behind
  its key), help and scores only in the tail, and never paints the
  settings screen before the kill (an earlier
  draft of this ledger claimed zero `PAUSED` renders while the strace
  note counted them - the committed counters settle it). The identical
  choreography on the identical kitty build forced to
  `MAZE_CHASE_TIER=truecolor` completes and exits cleanly.

Evidence: `evidence/kitty-linux-auto.json` (381.8 MiB transcript, 1642
board transmits, 348.6 MiB PNG payload, killed),
`evidence/ghostty-linux-kitty.json` (921 transmits, killed),
`evidence/kitty-linux-truecolor.json` (pass),
`evidence/kitty-linux-auto/ack-spin-experiment.md` (strace transcript of
the reply bytes and the syscall rates).

Target: Phase 3 (Terminal Render Pipeline and Compatibility Proof):
bounded probe, pacing with backpressure, protocol-aware handling. The
reply-drain fix is a compatibility bugfix, not a feature.

Resolved in Phase 3 (2026-10-19): steady transmits are silent (`q=2`),
the static layer and sprite atlas transmit once per change, and every
frame moves cached placements instead of the board. The same
choreography on kitty 0.32.2 now sends 23 transmits / 174 KiB of PNG
payload for the whole session (playing 20.7 fps, 5.7 KiB mean frame)
and exits cleanly (`evidence/kitty-linux-auto.json`, refreshed). The
ledger's pre-fix figures above describe the regenerated bundle's
earlier run (git history keeps them); RT-1 is closed.

### RT-2: Ghostty is routed to truecolor cells although Ghostty speaks
the kitty graphics protocol (confirmed, overclaim)

`initial_tier` in `crates/terminal/src/backend.rs` hard-routes
`TERM_PROGRAM=ghostty` to `Tier::Truecolor` (backend.rs:151-152) before
any live check, and `docs/terminal.md:104` calls this a "genuine
capability gap" claiming Ghostty "has no image protocol". Ghostty
implements the kitty graphics protocol.

Forced-tier probe on Ghostty 1.3.1 (`MAZE_CHASE_TIER=kitty`):
`evidence/ghostty-linux-kitty.json` shows `tier_observed=kitty-graphics`,
921 board transmits, and the game painting through Ghostty's graphics
implementation. The auto row (`evidence/ghostty-linux-auto.json`)
shows `truecolor-cells` as shipped.

Target: Phase 3 (Terminal Render Pipeline and Compatibility Proof):
live probe with byte replay; plus the Phase 1 doc correction landed with
this ledger.

Resolved in Phase 3 (2026-10-19): Ghostty 1.3.1 does not answer
graphics probe commands, so the auto path identifies it from
`TERM_PROGRAM=ghostty` / `TERM=xterm-ghostty` (the bounded probe and the
Sixel DA1 probe still run on unrecognized terminals). Ghostty now
observes `kitty-graphics` and passes both its auto and forced rows at 23
transmits / 192 KiB per session. RT-2 is closed.

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

Target: Phase 2 (Dynamic Terminal Layout and Full-Window Composition):
geometry model with cell pixel size, exact-fit image rendering.

### RT-4: resize leaves stale frames and stale placements on screen
(confirmed)

After any resize the game repaints the new layout without clearing the
old one: the committed `ghostty-linux-kitty` pause capture shows the
full-size playing board with the too-small card text still painted at
the top (`evidence/ghostty-linux-kitty/screenshots/paused.png`, the
shape the earlier draft of this ledger attributed to the wrong row);
the kitty rows show the same stale composition in their resize
screenshots (`evidence/kitty-linux-auto/screenshots/*.png`; the ghost
content is painted by the app, not a terminal artifact, because it
survives every subsequent synchronized repaint until killed).

In the kitty tier the reverse also happens: shrinking below the floor
paints the too-small card while the last board placement is never
deleted, so the stale board image overlaps the card
(`evidence/kitty-linux-auto/screenshots/too-small.png`).

Target: Phase 2 (Dynamic Terminal Layout and Full-Window Composition):
resize contract with same-frame repaint and stale-placement kill.

### RT-5: the sixel path is the efficient sibling of the kitty path
(confirmed, positive)

xterm 390 in VT340 mode answers the DA1 probe with sixel support and the
sixel tier paints real pixels: 143 transmits, 3.75 MiB of payload for
the whole session on the current build. Before Phase 3 the kitty path
was far worse (1642 transmits / 348.6 MiB in `kitty-linux-auto`); after
the placement pipeline it is cheaper than full-frame sixel (23
transmits / 174 KiB), because only changed placements cross the wire. Input and exit work in both
sixel rows (the committed surface counters show the pause, help,
scores, and settings surfaces painting in their own phases; clean
exit). The forced-sixel row is fully executed:
`evidence/xterm-linux-sixel.json` (pass).

xterm requires `-ti vt340` (or the resource equivalent) before its DA1
reply advertises sixel; the default `TERM=xterm` build lands on
`legacy-cells`. Both rows are in the matrix, and the auto row
(`xterm-vt340-linux-auto`, `tier_requested=auto`) is the one that
exercises the probe itself: the game upgrades itself to sixel only when
the probe answers, so its
`tier_observed=sixel` is the probe's positive proof.

Target: Phase 3 (Terminal Render Pipeline and Compatibility Proof)
keeps this path; the encoder stays, the atlas and dirty-change work must
match its efficiency.

### RT-6: cell tiers are fully functional (confirmed, positive)

`truecolor-cells` (kitty forced, ghostty auto) and `legacy-cells`
(xterm with a dark background) complete the entire choreography: play,
steer, pause, quit to title, help, scores, settings, and a clean
process exit. Evidence: `evidence/{kitty-linux-truecolor,
ghostty-linux-auto,xterm-dark-linux-auto}.json` (all pass). This is the
baseline later phases must not regress; the kitty tier is the outlier,
not the cell paths.

The default light-background xterm row is the deliberate contrast case:
the same binary, same choreography, and a clean exit, but 7 of its 10
captures are >=98% white because the cream chrome text is unreadable on
white (`evidence/xterm-linux-auto.json`, `light_background_captures`).
The harness downgrades that row to `partial` instead of signing a pass
over white-on-white screenshots; the palette fix is overhaul work.

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
  worth handling when Phase 3: Terminal Render Pipeline and
  Compatibility Proof touches input.
- the too-small card renders over live game state without destroying
  it; after re-fit the game continues mid-run (observed in the sixel
  row): good behavior to preserve in Phase 2: Dynamic Terminal Layout
  and Full-Window Composition.

## B. Reassessment findings (engine, layers, docs)

Severity tag: `overclaim` where public text exceeds reality.

### Engine, assets, audio

1. `raster.rs` bitmap tiers draw the four wardens without facing
   direction (the pupil placement is theme-constant;
   `crates/terminal/src/raster.rs:212,237-254`); the cell tiers show
   facing, so tiers are not visually equivalent (Phase 4: Visual Identity Redesign).
2. The fright mask never consumes `theme.fright`; on low-contrast
   themes the frightened state is hard to read (Phase 4: Visual Identity Redesign).
3. Audio: the tempo constant 132 BPM is duplicated across tracks, the
   title tune plays loudly by default, and the terminal layer routes a
   chime through BEL plus a ticker by default (Phase 5: Sound Design
  Overhaul; matches the
   Owner's sound findings).
4. `reduced_flash` suppresses only one of the three flash sources used
   by the renderer (Phase 4: Visual Identity Redesign).
5. Minimum-size token mismatch: the layout floor is 62x35
   (`crates/terminal/src/layout.rs`; the too-small card text matches),
   while docs and help copy in places say 60x36 (Phase 2: Dynamic
   Terminal Layout and Full-Window Composition doc fix; the
   matrix already records the real floor). RESOLVED in Phase 2:
   no `60x36` string remains in the tree, the card reads the floor
   from `layout.min_cols/min_rows`, and PTY tests pin the exact
   62x35 boundary plus the one-short cases (`61x35`, `62x34`).

### Desktop layer

6. `crates/desktop/src/frame.rs:14` caps frames at 16.7M pixels and
   `window.rs:243-245` silently no-ops past it, so a large monitor plus
   HiDPI freezes the window with no message (Phase 6: Release
   Engineering and Multi-Platform Distribution target: honest
   error plus streaming path).
7. No `scale_factor` handling anywhere in the desktop window sizing:
   HiDPI renders at logical size (Phase 6: Release Engineering and
   Multi-Platform Distribution).
8. The desktop main loop busy-polls; CPU burns while idle (Phase 6:
   Release Engineering and Multi-Platform Distribution).
9. Packaging artifacts are dev-grade (raw binaries, no installers) and
   are oversold by the hub page (Phase 6: Release Engineering and
   Multi-Platform Distribution).

### Web layer

10. `maze-chase/index.html:30` "released and verified across Linux,
    macOS, and Windows" outruns the evidence this ledger records;
    corrected in this phase's surgical pass, full game-first rebuild is
    Phase 7.
11. `maze-chase/index.html:64` linked #582 as "(closed)" while it is
    the open tracking issue for this overhaul (corrected this phase).
12. The hub "installable package" wording exceeds the actual artifacts
    (Phase 6: Release Engineering and Phase 7: Game-First Web
    Experience).
13. The Windows E2E evidence behind the release claims was signed
    despite failing ConPTY sessions (Phase 6: Release Engineering; do
    not repeat signing
    until the harness is fixed).

### Docs

14. `docs/terminal.md:104-107` Ghostty note is factually wrong
    (overclaim in the negative: a capability gap claimed that does not
    exist). Corrected in this phase; matrix row remains `unverified`
    only for the macOS host, Linux Ghostty is executed.
15. `docs/terminal.md:80-81` "re-placed at 20 fps" does not match the
    measured 70-77 fps (RT-1). Corrected in this phase with a pointer.
16. `maze-chase/README.md:10` repeats the "released and verified"
    overclaim (corrected this phase, consistent with the hub).

## C. Sub-issues to file (through the Maintainer)

Each item below should become a linked issue, prioritized into the
named phase; Phase 1 files them, later phases close them.

1. kitty graphics reply loop: drain/suppress terminal replies, restore
   20 fps pacing and working input (Phase 3: Terminal Render Pipeline
   and Compatibility Proof, blocking).
2. Ghostty live kitty probe: route Ghostty to kitty graphics when the
   probe answers, fence with the byte-replay probe (Phase 3: Terminal
   Render Pipeline and Compatibility Proof).
3. Re-rasterize at real cell pixel size and window region (Phase 2:
   Dynamic Terminal Layout and Full-Window Composition).
4. Resize contract: full clear, stale placement deletion, same-frame
   repaint (Phase 2: Dynamic Terminal Layout and Full-Window
   Composition).
5. Continuous cell scales instead of the fixed 2/4 x 1/2 steps
   (Phase 2: Dynamic Terminal Layout and Full-Window Composition).
6. Desktop max-pixel silent freeze: bounded error + resize handling
   (Phase 6: Release Engineering and Multi-Platform Distribution).
7. Desktop HiDPI `scale_factor` support (Phase 6: Release Engineering
   and Multi-Platform Distribution).
8. Desktop idle CPU burn: event-driven loop (Phase 6: Release
   Engineering and Multi-Platform Distribution).
9. Warden facing in bitmap tiers (Phase 4: Visual Identity Redesign).
10. Fright mask must consume `theme.fright` (Phase 4: Visual Identity Redesign).
11. `reduced_flash` must cover every flash source (Phase 4: Visual Identity Redesign).
12. Audio baseline: single BPM source, quieter defaults, terminal chime
    default-off (Phase 5: Sound Design Overhaul).
13. Release-claims sweep: hub, README, and docs say only what the
    evidence ledger shows; Windows E2E re-signing only after the harness
    is fixed (Phase 6: Release Engineering and Phase 7: Game-First Web
    Experience).
14. Min-size copy alignment (60x36 -> 62x35 where it still appears)
    (Phase 2: Dynamic Terminal Layout and Full-Window Composition).
    RESOLVED in Phase 2: `maze-chase/docs/terminal.md` and the
    terminal help/card copy all name 62x35; the live-resize PTY test
    asserts the exact floor and both one-short rejections.

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
  the game process had to be killed because input painted hundreds of
  megabytes behind its keys and the quit path never landed before the
  harness timeout (RT-1). Their screenshots still document real
  defects. The light-background xterm row is `partial` for a different
  reason: its captures failed the render check (RT-6).
- Every executed row commits its `events.log` (per-event timestamps,
  measured window geometry, transcript offsets) alongside the JSON and
  screenshots, and the JSON carries per-phase `surfaces` paint counters
  with their first transcript offsets, so every count or latency quoted
  in this ledger re-derives from the committed bundle without the raw
  transcripts (which stay in the harness scratch).
- Session choreography follows `crates/terminal/src/{app,screens}.rs`
  exactly (Esc quits on title; pause menu is Down+Confirm; sub-screens
  return on Esc). Earlier drafts of the harness guessed the menus and
  produced mislabeled captures; the ledger only cites post-fix runs.
- Branch note: the workflow gate for this build binds pushes to PR
  #662's branch, so Phase 1 landed on `opencode/issue582-20261018121223`
  rather than a fresh `opencode/issue582-overhaul-phase-1-*` branch
  (documented in the PR body).
