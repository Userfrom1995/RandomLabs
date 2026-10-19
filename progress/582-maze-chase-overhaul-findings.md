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
choreography on kitty 0.32.2 now sends 23 transmits / 170.0 KiB of PNG
payload for the whole session (playing 20.7 fps, 5.6 KiB mean frame)
and exits cleanly (`evidence/kitty-linux-auto.json`, refreshed on
2026-10-19). The
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

Resolved in Phase 3 (2026-10-19; corrected in review round 1): the
auto path identifies Ghostty from `TERM_PROGRAM=ghostty` /
`TERM=xterm-ghostty` before any probe, so its rows skip the probe
entirely (their traces carry no `probe` record). The original
resolution's sentence "Ghostty 1.3.1 does not answer graphics probe
commands" was an untested inference and is retracted: a direct pty
experiment with the game's exact probe request
(`maze-chase/tools/compat/probe-graphics.py`) recorded both replies
(`i=..;OK` and `i=..,p=..;OK`) on Ghostty 1.3.1 and on kitty 0.32.2 on
2026-10-19. The real runtime failure was equal-z image-id tie-breaking
compositing the opaque board above the sprite atlas on Ghostty (every
sprite invisible, zero palette pixels in its captures); placements now
carry explicit `z` stacking layers. Ghostty observes `kitty-graphics`
and passes both its auto and forced rows at 23 transmits / 187.2 KiB
per session with sprite visibility proven by the capture census. RT-2
is closed.

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

Resolved in Phase 2: the fixed 224x248 raster above is the Phase 1
finding; the current bundle carries dynamic sizes re-derived from the
plan and real cell pixels (`first_transmit_png` 420x465 in
`kitty-linux-auto.json`, 476x527 under Ghostty; the 1x1 entries in the
xterm rows are the bounded Kitty probe's image, not a frame).

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
sixel tier paints real pixels: 146 transmits, 3.66 MiB of payload for
the whole session on the current build (2026-10-19 regeneration).
Before Phase 3 the kitty path was far worse (1642 transmits / 348.6 MiB
in `kitty-linux-auto`); after the placement pipeline it is cheaper than
full-frame sixel (23 transmits / 170.0-187.2 KiB), because only changed
placements cross the wire. Input and exit work in both
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

`truecolor-cells` (kitty forced) and `legacy-cells` (xterm with a dark
background) complete the entire choreography: play, steer, pause, quit
to title, help, scores, settings, and a clean process exit; Ghostty
auto has since upgraded to `kitty-graphics` (RT-2). Evidence:
`evidence/{kitty-linux-truecolor, ghostty-linux-auto,
xterm-dark-linux-auto}.json` (all pass). This is the
baseline later phases must not regress; the kitty tier is the outlier,
not the cell paths.

The default light-background xterm row is the deliberate contrast case:
the same binary, same choreography, and a clean exit, but 6 of its 10
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
   Round two: the string scan had missed the numeric
   `design-tokens.json` layout token `min_terminal_cells` (60/36); the
   #656 follow-up aligned it to 62/35, so no form of the old floor
   remains anywhere.

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
- The kitty graphic raster itself displays: the 224x248 PNG (Phase 1
  size; the dynamic raster is 420x465/476x527 per RT-3's resolution)
  arrives and paints; the artifacts are the fixed-size stretch (RT-3),
  stale composition (RT-4), and the reply-loop flood (RT-1), not a
  broken encoder or raster.

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

## F. Phase 2 tester round on issue #656 (real-PTY findings)

The Linux Tester's real-PTY round on the Phase 2 build (issue #656)
returned three blocking findings; all three are resolved by the Phase 2
follow-up on this issue's own branch with committed tests.

- F1 (fixed): the solver derived `cell_rows` from the column scale
  (`ch = cw * cell_w / cell_h`), so wide-short rooms could only use
  scales on that derived diagonal: 200x60 settled on 3x1 (21.7% board
  coverage) where 7x1 reaches 50.6%, and 62x80 on 2x1 (35.0%) where 2x2
  reaches 70.0%. The solver scans the documented tile-scale grid (2..8
  x 1..4; the 2x1 compact floor is the narrowest scale, enforced on the
  pixel path after the round-2 review) with coverage-first selection
  (ties: squareness, chrome, area, width). Pinned by
  `layout::tests::golden_plans_pin_the_fixed_scale_grid` (200x60 -> 7x1
  band, 62x80 -> 2x2 band, exact board rects),
  `pixel_path_never_drops_below_the_compact_floor` (the 80x63 / 8x6
  counterexample), plus
  `coverage_sweep_never_leaves_rooms_hollow` (62..400 x 35..120 sweep,
  measured floor 280/1000).
- F2 (fixed): the Sixel raster painted at natural size from the board
  origin, so on xterm 100x40 with a 604x524 px window the raster
  overflowed its board box into the hint line, and on 142x63 it hugged
  the top-left of a much larger box. `Layout::ppt` is now additionally
  bounded by the board's pixel box (`Layout::board_px`) and the raster
  paints from the centered `Layout::image` origin. Pinned by
  `raster_always_fits_the_board_pixel_box`,
  `window_pixels_map_the_raster_onto_a_centered_footprint`, and the PTY
  test
  `tests/tester_dynamic_layout_hostile.rs::sixel_raster_paints_centered_inside_its_cell_box`.
- F3 (fixed): the Kitty image was displayed at the full board
  footprint, stretching the square raster (1.4x horizontal on 100x40
  with 7x15 cells, up to 1.75x on 143x64). The display escape now uses
  the centered `Layout::image` footprint, which maps the raster's pixel
  size through the reported window pixels and preserves its aspect.
  Pinned by `pixel_reports_shape_footprint_and_raster` (10x20 -> 56x31
  at (22,5); 8x8 -> 28x31 at (36,5), 1:1) and the golden raster-size
  assertions.
- Docs reconciliation: `maze-chase/docs/terminal.md` (Layout and
  resize), `maze-chase/docs/feature-matrix.md`, and the `layout.rs`
  module header now describe the full-grid coverage solver and the
  bounded, centered raster placement; the old derived-scales and "maps
  nearly 1:1" wording is gone. An independent stale-claim sweep then
  caught the cross-layer copies of the old contract: the terminal
  README and desktop `render.rs` "board pixels identical to the
  terminal bitmap tiers" clauses, `docs/scoreboard.md` (browser
  mirrors the shared 8-ppt reference; solver described coverage-first),
  `docs/parity.md` layer row, and the `min_terminal_cells` token. All
  reconciled in this follow-up; the layout header and terminal docs
  also gained the two precision qualifiers from adversarial review
  (the 6-ppt floor can exceed the board box only in absurdly tiny
  pixel windows and the footprint aspect rounds to within one cell
  per axis).
- Council follow-up (fixed): the terminal doc's coverage absolute
  ("never strands most of the window as dead space") is scoped to the
  measured sweep floor (280/1000 at 399x62), and the Sixel bounding
  guarantee is scoped to every window that can host the 6-ppt
  legibility floor, matching the paragraph's own documented exception.

Evidence: the committed tests plus the tester's real-PTY report on
#656, re-measured on the final tree with the Tester's committed
live-golden suite included; workspace suite 451 passed, 0 failed
across 47 test binaries plus 7 doc-test suites, fmt clean, clippy back
to the pre-existing warnings from `main` (engine style lints plus the
design-token test's suggestions) with none from this branch's files,
`maze-chase-verify` 19/19 with the `23c17f89734e` golden intact.

The earlier Phase 2 review round (recorded in the progress log) had
already tightened the resize contract (shrink-into-too-small deletes
live Kitty placements in the card's first frame) and re-scoped
`Closes #656` back to `Refs #656` until the per-OS real-emulator proof
lands; no other finding from that round remains open.

## G. macOS arm on issue #656: test-harness portability (fixed)

The macOS per-OS arm on the #691 merge (run 39199219952, `70ada902`)
returned `fix` for two committed test artifacts even though the product
passed every behavioral and contract check (Terminal.app and Ghostty,
`GAME_EXIT:0`). The fix rides the issue's own branch with a PR
referencing `Refs #656`; no production code changed.

- F1 (fixed): `geometry::tests::pty_pixel_fields_shape_the_geometry`
  opened a PTY master and set `TIOCSWINSZ` without ever opening the
  slave; macOS returns `ENOTTY` on a master with no attached slave, so
  the test panicked (`geometry.rs:273`). The test now opens the slave
  (the same discipline every integration harness follows) and wraps
  both fds in `OwnedFd` so a failing assertion cannot leak them.
- F2 (fixed): every PTY harness reaped a killed child with
  `kill(); wait()`. On macOS the SIGKILL of a child blocked writing to
  a full PTY master stays held until that write completes, so
  `Session::drop` hung `Child::wait` forever; `plan_contract`,
  `tester_dynamic_layout_hostile`, and `tester_layout_goldens_live`
  never finished. All eleven PTY harnesses now reap through a shared
  bounded helper (`reap`): drain the non-blocking master, `try_wait`,
  and a 5-second cap, so no suite can ever wedge on a reap. The three
  formerly hanging suites plus the other eight harnesses pass on Linux
  in seconds with identical behavior.

Evidence: `cargo test -p maze-chase-terminal` 165 passed / 0 failed on
this tree (the same count as before the fix), the three formerly
hanging suites terminate (0.31 s / 0.98 s / 2.83 s), `cargo fmt --all
--check` clean, clippy shows only main's pre-existing engine warnings.
The macOS arm re-run verifies the portability on the real platform.

## H. macOS arm second re-run on issue #656: live-goldens drain cadence (fixed)

The macOS per-OS arm on the #700 merge (`ff66fff3`, run 39227343194)
confirmed F1 and F2 from Section G fixed, and the product itself passed
every check (Terminal.app and Ghostty sessions, PTY sweep identical to
the Linux and Windows tables, `GAME_EXIT:0`). It filed one blocking
artifact, F3, in `tester_layout_goldens_live` only; no production code
changed.

- F3 (fixed): `live_wide_room_animates_and_steers_without_footprint_drift`
  collected output for a fixed 1500 ms with a collector that read 4 KiB
  and then slept 20 ms. A 200x60 kitty board frame is about 230800 bytes,
  and macOS PTY buffers are far smaller than Linux's, so the fixed slice
  measured the harness cadence, not the product, and the `>= 5` display
  count failed even though every display escape carried the correct
  `r=31,c=196` 7x1 footprint. The soak now waits, bounded at 30 s, until
  five pinned-footprint displays have actually arrived, and it drains
  the non-blocking master with `poll` (no fixed sleep) at wire speed.
  Matches are counted incrementally as bytes arrive (a straddling header
  is counted exactly once on the call that completes it), so the hot
  drain loop never re-scans the growing buffer. The drift check still
  walks every observed display escape, the per-frame delete is still
  asserted, and a header split across the capture tail is ignored rather
  than false-panicked.

Evidence on Linux: the goldens suite is 5/5 (the new
`count_from_counts_straddled_needles_exactly_once` pins the incremental
counter's split-boundary behavior), the animation soak settles in under
a second of collection after the steering burst, and the full
`cargo test -p maze-chase-terminal` run is 167 passed / 0 failed with
fmt clean and no clippy warning from this file. The macOS arm re-runs
the same suite on the fixed tree.
