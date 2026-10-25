# Progress - Maze Chase: deterministic frame capture in the dynamic-layout hostile suite (issue #761)

- **Issue:** #761 (macOS RC lane: `tester_dynamic_layout_hostile` frame-close race)
- **Parent vision:** #582 (overhaul roadmap); release lane tracked by #657
- **Branch:** opencode/issue761-20261025023531
- **Status:** complete
- **Updated:** 2026-10-25
- **Scope:** terminal-crate test harness only. No production behavior change;
  the shipped binary already emitted the transmit, placement, and frame.

## Defect

`Session::wait_frame_closed()` waited for `ESC[?2026l` anywhere in the
accumulated buffer, and `pixel_reports_shape_footprint_and_raster` never
cleared the buffer before `reach_playing`. A title-screen frame close could
satisfy the wait while the playing frame was still open, so
`frame_containing()` (which requires a complete `?2026h ... ?2026l` pair)
found no frame and panicked at `first board frame` on macOS. The PNG dims
and placement assertions passed, proving the product output was correct.
This is the same pre-existing tail-only race already fixed for
`tester_render_width_hostile.rs` (`capture_frame` / `last_complete_frame`).

## Checklist

- [x] Recon: read the macOS job evidence, the failing test, and the earlier
      `capture_frame` fix in `tester_render_width_hostile.rs`
- [x] Replace the tail-only `wait_frame_closed()` with a poll that returns the
      first complete `?2026h ... ?2026l` frame carrying the awaited payload
- [x] Apply the deterministic capture to every frame-pairing site in the suite
      (storm, cards, pixel reports, sixel, trace), keeping every assertion
- [x] Verify on Linux: the exact suite 20x (100/100 green), the full terminal
      crate green (all suites), `cargo fmt -p maze-chase-terminal --check`,
      and clippy on the crate (`--no-deps -D warnings`)
- [x] Commit, push, open the PR with `Closes #761` and `Refs #657`

## Current step

Complete; the PR hands off to the Reviewer. The definitive macOS check is the
per-OS macOS tester arm on this PR and the re-dispatched RC sweep after merge.

## Next steps

1. The per-OS macOS tester arm re-runs
   `cargo test -p maze-chase-terminal --test tester_dynamic_layout_hostile`
   on this PR.
2. After merge, the Maintainer re-dispatches exactly one
   `maze-chase-release` RC sweep on the merged tip.

## Agent log

- 2026-10-25 (builder, macOS RC frame-race fix on #761): confirmed the race is
  harness-side. `capture_frame_containing` now waits for a complete
  synchronized frame that carries the awaited payload instead of a tail-only
  search, mirroring the earlier `capture_frame` repair, and the pixel-report
  PNG IHDR and placement footprint are parsed from that captured frame so the
  geometry assertions stay load-bearing. The same deterministic capture
  replaced the remaining `wait_frame_closed` call sites (storm recovery, card
  frames, both sixel tiers, and the trace storm) because they shared the same
  orphan-tail hazard. Diff: only
  `maze-chase/crates/terminal/tests/tester_dynamic_layout_hostile.rs` (46
  insertions, 29 deletions); no production code, workflow, or other test
  changed. Linux evidence: 20 consecutive runs of
  `cargo test -p maze-chase-terminal --test tester_dynamic_layout_hostile`
  all green (5/5 each), the full `cargo test -p maze-chase-terminal` suite
  green, fmt clean, clippy clean on the crate.
- Delegation ledger (2026-10-25, issue #761, fix-round independent
  verification):
  - `explore` (renderer frame-order audit): confirmed the static `a=t`
    transmit (`main.rs:736-742`) and the static `a=p` placement
    (`main.rs:761-773`) share the single `?2026h ... ?2026l` frame
    (`main.rs:926,1129`), the title path emits only image deletes, and the
    startup Kitty probe uses a distinct image id outside synchronized frames.
  - `explore` (prior-fix parity audit): compared `capture_frame` /
    `last_complete_frame`; all 11 former `wait_frame_closed` sites now use a
    payload-carrying complete frame and no assertion was weakened; only
    `plan_contract.rs:290,338` keep the tail-only wait (outside #761 scope).
  - Primary verified itself: 5x
    `cargo test -p maze-chase-terminal --test tester_dynamic_layout_hostile`
    (25/25 green), full `cargo test -p maze-chase-terminal` (32 suites, 0
    failures), `cargo fmt -p maze-chase-terminal -- --check`, and
    `cargo clippy -p maze-chase-terminal --tests --no-deps -- -D warnings`.
  - Skills note: no skill fits; `customize-opencode` covers opencode
    configuration only, not Rust PTY test-harness work.
- 2026-10-25 (fixer, reviewer findings F1/F2 on #762): recorded the missing
  delegation ledger and skills note, moved the pending macOS/RC gate out of
  the checklist into `## Next steps`, and kept `Status: complete` because the
  remaining gate is a pipeline step the Builder cannot run.
