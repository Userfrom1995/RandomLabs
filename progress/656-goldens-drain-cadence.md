# Progress - Maze Chase: live-goldens drain cadence (issue #656, macOS F3)

- **Issue:** #656 (dynamic terminal layout; macOS arm re-verification gate)
- **Parent vision:** #582 (the overhaul roadmap in `progress/582-maze-chase-overhaul.md`)
- **Branch:** opencode/issue656-20261019105121
- **Status:** complete
- **Updated:** 2026-10-19
- **Scope:** `maze-chase/crates/terminal/tests/tester_layout_goldens_live.rs`
  only. The macOS tester's F3 is a harness defect: the assertion counts
  display escapes inside a fixed 1500 ms window while the collector drains
  4 KiB per read and then sleeps 20 ms, so macOS's small PTY buffers cannot
  transfer five 230800-byte board frames inside the window. The product
  renders the correct 7x1 footprint at every observed frame.
- **No product logic change.**

## Checklist

- [x] Recon: read the macOS F3 finding, the failing test, and the game's
      frame loop (bitmap repaint at ~20 fps; each frame is a delete + a
      fresh kitty display escape)
- [x] Replace the fixed-span `collect_for` (4 KiB per read, 20 ms sleep)
      with a wire-speed drain: poll on the master and read until EAGAIN with
      no artificial sleep
- [x] Make the assertion portable: wait, bounded at 30 s, until five display
      escapes for the pinned 7x1 footprint have actually arrived instead of
      requiring them inside a wall-clock slice sized for Linux PTY buffers
- [x] Keep the drift check meaningful: every observed display escape (not a
      sample) must still carry `r=31,c=196`, the delete cycle must still be
      on the wire, and a partial trailing header must not false-panic
- [x] Verify on Linux: the goldens suite passes with the new cadence, the
      rest of `cargo test -p maze-chase-terminal` stays green, fmt and
      clippy clean for this file
- [x] Update the shared findings ledger with the F3 fix
- [x] Push, open the PR (`Refs #656`), hand off to review

## Current step

Done; the PR is open and the review handoff follows.

## Next steps

1. The Reviewer verifies the diff; the macOS arm re-runs the suite after
   the merge.

## Agent log

- 2026-10-19 (builder, macOS F3 drain-cadence round on #656): started the
  scoped harness-only fix dispatched by the Maintainer. The failing
  assertion is a frame-count proxy tied to a 1500 ms window and a 4 KiB /
  20 ms collector; on macOS the PTY buffer is small, so the board frame
  transfer never catches up with the fixed window even though the layout
  footprint is correct. The fix drains with poll (no fixed sleep) and waits
  for the five re-displays with a generous bounded deadline, counting
  incrementally so the hot drain loop never re-scans the growing buffer.

- 2026-10-19 (builder, same round, completion entry): the goldens suite is
  5/5 on Linux (the new `count_from_counts_straddled_needles_exactly_once`
  pins the incremental counter's split-boundary behavior), the full
  `cargo test -p maze-chase-terminal` run is 167 passed / 0 failed, fmt is
  clean, and clippy reports nothing from this file. Findings ledger
  Section H records the fix. `wait_displays` waits for five observed
  pinned-footprint displays with a 30 s bound and polls the master instead
  of sleeping, so the assertion measures the product, not the harness.

- 2026-10-19 (builder, same round, evidence entry): delegation ledger: no
  subagents launched; this was a scoped single-file harness fix (the soak test
  plus the frame emission it counts), verified by the primary with the
  targeted suite, the full crate suite, fmt, and clippy. Skills note: no
  available skill matches Rust PTY harness work.
