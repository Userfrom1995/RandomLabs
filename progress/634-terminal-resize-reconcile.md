# 634: Maze Chase terminal live-resize reconciliation (key + SIGWINCH same-batch race)

Status: in-progress

## Checklist
- [x] Reproduce the defect deterministically on the unfixed binary
      (SIGSTOP/SIGCONT same-batch forcing, 5/5 lost)
- [ ] Fix: reconcile `crossterm::terminal::size()` against the applied
      layout every frame in the render loop
- [ ] Durable PTY regression test forcing the same-batch race
      (control resize + raced resize, stale-free assertion window)
- [ ] Unified docs: note the per-frame reconciliation in
      `maze-chase/docs/terminal.md` "Layout and resize"
- [ ] fmt / clippy / terminal crate suite green
- [ ] Reviewer / Tester / Evaluator gates (pipeline)

## Scope (binding, from issue #634 triage)
- Fix direction accepted by the Maintainer: per-frame
  `crossterm::terminal::size()` comparison against the app's last known
  size, calling `app.resize` on change (one cheap ioctl per frame at
  ~60 fps). This makes the layout self-healing regardless of
  crossterm's signal-pipe drain behavior.
- Durable PTY regression that forces the same-batch race; existing
  terminal tests never race a key against a resize.
- Pre-existing on `main`; not introduced by PR #631 (test-only
  vehicle). Do not touch the #631 lane.

## Defect recap (Tester report, run 39084739972)
crossterm 0.29's Unix event source registers the TTY (token 0) and the
signal-hook-mio pipe (token 1) on one edge-triggered epoll. When a
keypress and SIGWINCH land in the same batch, `try_read` processes the
TTY token first, parses the key, and returns - the signal pipe byte is
left unread. Edge-triggered epoll never re-reports it, so the `Resize`
event is never delivered until the next actual size change; the app
keeps the stale layout.

## Deterministic repro (this run, unfixed binary)
`/tmp/opencode/race_force.py`: SIGSTOP + `waitpid(WUNTRACED)`, then
queue the key byte (arms the TTY edge first), `TIOCSWINSZ`, queue
SIGWINCH (pending until SIGCONT writes the pipe byte), SIGCONT. Both
fds are readable at the first post-resume `epoll_wait`, TTY first:
crossterm returns the key and the signal byte stays unread.
Control (plain TIOCSWINSZ + SIGWINCH, no stop) passes every time;
raced case lost 5/5 trials (card `window 61x35 is too small` never
paints). This is the forcing the durable test will use.

## Current step
Scaffold pushed; implementing the fix plus the PTY regression test.

## Next steps
1. `main.rs`: per-frame reconciliation in the event loop (before
   `app.tick`/render), `bitmap_fresh = true` on change; keep the
   event-driven `TermEvent::Resize` arm.
2. New test `tests/resize_race.rs`: PTY harness (100x40 playing ->
   too-small 61x35), control resize, then the SIGSTOP race; assert the
   size-stamped card within a bounded deadline in a stale-free output
   window.
3. Update `docs/terminal.md`; run fmt/clippy/crate suite.

## Agent log
- 2026-10-18: Orientation (Tester report, crossterm 0.29 source, app
  layout fields); deterministic repro built and validated 5/5; branch
  scaffolded.
