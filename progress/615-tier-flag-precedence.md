# 615: Maze Chase terminal tier precedence (exported env must never shadow --tier)

Status: in-progress

## Checklist
- [x] Reproduce the defect on the unfixed tree (pipe + live PTY, all three
      precedence directions)
- [x] Fix: `--tier` replaces any exported `MAZE_CHASE_TIER` in the
      collected env before the tier lookup
- [x] Regression: shipped-binary test pinning flag > exported env >
      auto-detect, warning path preserved (fails pre-fix, passes post-fix)
- [x] Live PTY regression: the title screen runs the flag's tier over a
      conflicting exported value (fails pre-fix, passes post-fix)
- [x] Cosmetic: reword the overstated historical phrase in
      `tester_windows_cli.rs:11-12`
- [ ] fmt / clippy / workspace suite green
- [ ] Reviewer / Tester / Evaluator gates (pipeline)

## Scope (binding, from issue #615 triage)
- Small, surgical fix: terminal crate core plus its tests.
- Expected precedence: CLI flag > exported `MAZE_CHASE_TIER` >
  auto-detect.
- Do not touch `maze-chase/docs/parity.md` or the native-arm suites.

## Current step
Fix, regressions, and the cosmetic reword are committed; post-fix live
evidence captured; running the workspace suite next.

## Pre-fix evidence (unfixed tree, 2026-10-17)
Pipe (no TTY), exit 1 in every run:
- `MAZE_CHASE_TIER=bogus ... --tier kitty`: warning names `bogus` even
  though a valid flag was given (flag silently ignored).
- `MAZE_CHASE_TIER=legacy ... --tier bogus`: no warning at all (the flag
  value was never read).

Live PTY title screen (`video tier:` line), pre-fix:
- ambient `legacy` + `--tier sixel` -> `video tier: legacy-cells`
- ambient `bogus` + `--tier kitty` -> `video tier: legacy-cells`
- ambient `kitty` + `--tier legacy` -> `video tier: kitty-graphics`

## Post-fix evidence (2026-10-17)
Same live PTY probe, fixed binary:
- ambient `legacy` + `--tier sixel` -> `video tier: sixel`
- ambient `bogus` + `--tier kitty` -> `video tier: kitty-graphics`
- ambient `kitty` + `--tier legacy` -> `video tier: legacy-cells`

Regression proof: with the `main.rs` fix stashed, both tests in
`tests/tier_flag_precedence.rs` fail (`the flag must shadow the exported
MAZE_CHASE_TIER=bogus`; PTY title never reaches `kitty-graphics`); with
the fix they pass.

## Next steps
- Workspace suite, fmt, clippy; push; hand off to the Reviewer.

## Agent log
- 2026-10-17 (Builder): orientation done; defect reproduced pre-fix on
  both observables (warning path and live PTY title); fix + regressions +
  cosmetic reword implemented; pre/post-fix evidence captured.
