# 634: Maze Chase terminal live-resize reconciliation (key + SIGWINCH same-batch race)

Status: in_progress (evaluator round 1 findings applied; review / Tester / fresh Council round pending)

## Checklist
- [x] Reproduce the defect on the unfixed binary (SIGSTOP/SIGCONT
      same-batch forcing; the original probe lost 5/5 trials, and the
      forced SIGSTOP race in the durable suite is the deterministic
      proof)
- [x] Fix: reconcile `crossterm::terminal::size()` against the applied
      layout every frame in the render loop (`reconcile_size`,
      `crates/terminal/src/main.rs`); event `Resize` arm kept
- [x] Durable PTY regression `tests/resize_race.rs` forcing the
      same-batch race (control + race, stale-free assertion window)
- [x] Unified docs: per-frame reconciliation noted in
      `maze-chase/docs/terminal.md` "Layout and resize"
- [x] fmt / clippy / terminal crate suite green
- [ ] Reviewer / Tester / Evaluator gates (pipeline)

## Scope (binding, from issue #634 triage)
- Per-frame `crossterm::terminal::size()` comparison against the app's
  last known size, calling `app.resize` on change (one cheap size query
  per frame at ~60 fps). Makes the layout self-healing regardless of
  crossterm's signal-pipe drain behavior.
- Durable PTY regression that forces the same-batch race; existing
  terminal tests never race a key against a resize.
- Pre-existing on `main`; not introduced by PR #631. The #631 lane was
  not touched.

## Defect recap (Tester report, run 39084739972)
crossterm 0.29's Unix event source (`event/source/unix/mio.rs`) registers
the TTY (token 0) and the signal-hook-mio pipe (token 1) on one
edge-triggered epoll. `try_read` processes the TTY token first, and once
the parser yields a key it returns immediately; the signal pipe byte is
left unread. Edge-triggered epoll never re-reports it, so the `Resize`
event is never delivered until the next actual size change.

## Deterministic repro (unfixed binary, before the fix)
`/tmp/opencode/race_force.py` (python PTY driver): SIGSTOP +
`waitpid(WUNTRACED)`, queue the key byte (arms the TTY edge first),
`TIOCSWINSZ`, queue SIGWINCH (pending; handler writes the pipe byte only
at SIGCONT), SIGCONT. Both fds are readable at the first post-resume
`epoll_wait`, TTY first: the key is consumed and the signal byte stays
unread forever. Results: control (plain TIOCSWINSZ + SIGWINCH) passes
every trial; the original probe lost the race 5/5 trials (the
`window 61x35 is too small` card never paints). Trial counts are
timing-flavored - the evaluator's out-of-tree run of the probe measured
4/5 - so the determinism claim rests on the forced SIGSTOP ordering
itself and the durable suite below, not on a trial tally.

## Test teeth (durable suite)
`cargo test -p maze-chase-terminal --test resize_race`:
- unfixed tree (fix patch reverted in place): control passes, race test
  fails at the 3 s deadline with the stale 100x40 playing frame in the
  tail (each of its runs in earlier rounds; the evaluator also measured
  4/5 on the probe). The SIGSTOP-forced hostile suite is the
  deterministic proof: all four of its tests fail on the unfixed tree.
- fixed tree: both pass; the card lands on the first frame after
  SIGCONT (~0.04 s per run), and the four hostile tests pass on the
  fixed head.

## Verification (this head)
- `cargo test -p maze-chase-terminal`: 133 passed / 0 failed across 20
  test targets plus doc-tests. The count grew as the branch evolved: 120
  on main, 122 with the resize suite, 125 once the rebase pulled in
  main's new macOS e2e tests, 129 with the Tester's 4 hostile tests, 131
  with this round's row-width assertion and 62x35 PTY geometry test, and
  133 after the final rebase pulled in main's `tester_retirement_record`
  (2 tests).
- Renderer teeth: both new tests fail on the pre-fix renderer (a scratch
  worktree at the reviewed head: 118 characters written to the 62-col
  board row vs the required 62) and pass on this head.
- `cargo fmt --all -- --check`: clean. `cargo clippy -p
  maze-chase-terminal --all-targets`: zero warnings in the crate (only
  the 6 pre-existing `maze-chase-engine` lints).
- Happy-path sanity: the new harness starts the shipped binary on a
  100x40 PTY, plays, resizes and re-fits in every phase.

## Files changed
- `maze-chase/crates/terminal/src/main.rs`: `reconcile_size` helper plus
  the per-frame call in the render loop (`bitmap_fresh` set on change).
- `maze-chase/crates/terminal/src/unicode.rs`: cell renderer emits
  exactly one character per terminal column (evaluator round: a tile's
  expanded glyph was emitted whole once per column, doubling every board
  row; row-width assertions pin 62x35 / 100x40 / 200x100).
- `maze-chase/crates/terminal/tests/resize_race.rs`: new PTY suite
  (control + forced race; Session RAII cleanup on panic).
- `maze-chase/crates/terminal/tests/render_geometry.rs`: PTY geometry
  regression: at 62x35 the last complete frame writes exactly 62
  characters to a corridor row and paints the right wall inside the
  window (columns 57-58).
- `maze-chase/docs/terminal.md`: resize paragraph now states the
  per-frame reconciliation.
- `progress/634-terminal-resize-reconcile.md`: this file.

## Next steps
1. Reviewer (`/oc review`), then Tester, then Evaluator; PR #635.
2. The Tester may want to re-run the live race repro against the fixed
   release binary; the durable suite covers it in-tree.

## Agent log
- 2026-10-18: Orientation (Tester report, crossterm 0.29 mio source,
  `App` layout fields, chrome markers). Deterministic SIGSTOP repro
  built and validated (control pass, race lost 5/5) on the unfixed
  binary. Fix + PTY regression authored; unfixed tree fails the race
  test 3/3, fixed tree passes 5/5; full terminal suite, fmt and clippy
  green. Scaffold PR #635 open from the first commit. No subagents
  were needed: single-crate surgical fix with a deterministic
  in-process harness; verification was executed directly.
- 2026-10-18 (fixer round, review run 39087655495): PTY child now owns
  its own session and the test PTY as controlling terminal (setsid +
  TIOCSCTTY via pre_exec), so crossterm reads the PTY under test
  instead of an inherited outer terminal; suite counts corrected to
  122/0 (120/0 without the new suite); size-query comment made
  accurate. Verified: both tests pass headless and under `script`
  (200x50 outer tty); the pre-fix spawn fails both under `script`; the
  race test still fails under `script` with the reconciler disabled,
  so the harness fix does not weaken the regression.
- 2026-10-18 (fixer round, evaluator run 39100117058): applied the
  Council's blocking visual-craft finding on this branch - the cell
  renderer emitted each tile's expanded glyph whole once per terminal
  column, doubling every board row (118 characters at the 62x35
  minimum) and clipping the right wall. `render_board` now indexes the
  expanded glyph horizontally, one output character per terminal
  column; new row-width assertions pin 62x35 / 100x40 / 200x100 and a
  new PTY geometry test proves the right wall paints inside a 62x35
  window. Both new tests fail on the pre-fix renderer (scratch worktree
  at the reviewed head: 118 vs 62 characters on the probe row); suite
  is 133/0 on the rebased head. Also refreshed the counts above and
  replaced the timing-sensitive trial tally with the forced-SIGSTOP
  proof, per the Council's secondary notes.
