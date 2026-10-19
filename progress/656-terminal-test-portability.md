# Progress - Maze Chase: terminal test-harness macOS portability (issue #656)

- **Issue:** #656 (dynamic terminal layout; macOS arm re-verification gate)
- **Parent vision:** #582 (the overhaul roadmap in `progress/582-maze-chase-overhaul.md`)
- **Branch:** opencode/issue656-20261019062816
- **Status:** complete
- **Updated:** 2026-10-19
- **Scope:** terminal-crate test artifacts only; no production behavior change.
  The macOS Tester's F1/F2 findings on the #691 merge are portability defects
  in the committed test suite, not product defects (product PASS on macOS).

## Checklist

- [x] Recon: read the macOS Tester findings, the affected harnesses, and the
      Maintainer's dispatch (issue #656 comments)
- [x] F1: `geometry::tests::pty_pixel_fields_shape_the_geometry` opens the PTY
      slave before `TIOCSWINSZ` (macOS returns `ENOTTY` on a master with no
      attached slave); both fds are `OwnedFd` so a failing assertion cannot
      leak them
- [x] F2: every PTY harness reaps a killed child with a bounded, drain-first
      `reap` helper instead of `kill(); wait()` (macOS holds the SIGKILL of a
      child blocked writing to a full master until the master is drained, so
      the old `Session::drop` hung `plan_contract`,
      `tester_dynamic_layout_hostile`, and `tester_layout_goldens_live`
      forever). Applied to the seven `Drop` harnesses and the four
      probe/replay suites with loose kill sites
- [x] Verify on Linux: full `cargo test -p maze-chase-terminal` with per-suite
      timeouts, `cargo fmt --check`, clippy, Linux behavior byte-identical
- [x] Update the shared ledgers (findings Section G + roadmap log)
- [x] Push, open the PR (`Refs #656`), hand off to review (PR #700)

## Current step

Complete; PR #700 is open and the review handoff follows.

## Next steps

1. The Reviewer verifies the diff; the macOS arm re-runs the portability check
   after the merge.

## Agent log

- 2026-10-19 (builder, macOS test-portability round on #656): started the
  scoped fix dispatched after the macOS arm reported the #691 head failing its
  own suite. F1 is the `ENOTTY` witness in the new geometry unit test (open
  the slave, the same discipline every integration harness already uses). F2
  is `Session::drop`'s unbounded `kill(); wait()`: on macOS a child killed
  mid-write to a full PTY master is unreapable until the master drains, so the
  reap becomes a bounded drain-first loop (and the same fix is applied to the
  loose `kill(); wait()` sites in the four probe/replay suites that carry the
  shape without a `Drop`). Linux behavior stays byte-identical: `try_wait`
  reaps immediately in the normal case.
- 2026-10-19 (builder, same round, completion entry): committed the fix in
  five modular commits (scaffold, F1, the seven `Drop` harnesses, the four
  probe/replay suites, the ledgers) and opened PR #700 with `Refs #656`.
  Verification on this tree: `cargo test -p maze-chase-terminal` 165 passed /
  0 failed (identical count to the pre-fix tree), the three formerly hanging
  suites terminate in 0.31 s / 0.98 s / 2.83 s, `cargo fmt --all --check`
  clean, clippy reports only main's pre-existing engine warnings. One `general`
  verification subagent re-audited the diff read-only: it enumerated all 16
  reap sites (each preceded by `kill()`), confirmed the only two remaining
  `.wait()` sites are safe (the continuously draining reader thread in
  `tester_macos_e2e` and the Windows piped-stdio harness), proved the helper
  cannot block (O_NONBLOCK masters, bounded loop, no panicking path), and
  found no weakened assertion or discarded exit status. It also noted one
  pre-existing, untouched `ptsname` lock omission in three harnesses (left
  as-is, out of scope).
