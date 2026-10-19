# Progress - Maze Chase: terminal test-harness macOS portability (issue #656)

- **Issue:** #656 (dynamic terminal layout; macOS arm re-verification gate)
- **Parent vision:** #582 (the overhaul roadmap in `progress/582-maze-chase-overhaul.md`)
- **Branch:** opencode/issue656-20261019062816
- **Status:** in-progress
- **Updated:** 2026-10-19
- **Scope:** terminal-crate test artifacts only; no production behavior change.
  The macOS Tester's F1/F2 findings on the #691 merge are portability defects
  in the committed test suite, not product defects (product PASS on macOS).

## Checklist

- [x] Recon: read the macOS Tester findings, the affected harnesses, and the
      Maintainer's dispatch (issue #656 comments)
- [ ] F1: `geometry::tests::pty_pixel_fields_shape_the_geometry` opens the PTY
      slave before `TIOCSWINSZ` (macOS returns `ENOTTY` on a master with no
      attached slave)
- [ ] F2: every PTY harness reaps a killed child with a bounded, drain-first
      loop instead of `kill(); wait()` (macOS holds the SIGKILL of a child
      blocked writing to a full master until the master is drained, so the old
      `Session::drop` hung `plan_contract`, `tester_dynamic_layout_hostile`,
      and `tester_layout_goldens_live` forever)
- [ ] Verify on Linux: full `cargo test -p maze-chase-terminal` with per-suite
      timeouts, `cargo fmt --check`, clippy, Linux behavior byte-identical
- [ ] Update the shared ledgers (findings Section G + roadmap log)
- [ ] Push, open the PR (`Refs #656`), hand off to review

## Current step

Scaffold pushed; the geometry unit test and the eleven PTY harness reap sites
are being committed in the next steps.

## Next steps

1. Apply F1 in `crates/terminal/src/geometry.rs`.
2. Apply F2 (`reap` helper + Drop/site updates) in:
   `plan_contract.rs`, `render_geometry.rs`, `resize_race.rs`,
   `tester_dynamic_layout_hostile.rs`, `tester_layout_goldens_live.rs`,
   `tester_render_width_hostile.rs`, `tester_resize_race_hostile.rs`,
   `tester_probe.rs`, `tester_macos_probe_window.rs`, `tester_replay.rs`,
   `tier_flag_precedence.rs`.
3. Verify, commit in modules, push, open the PR.

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
