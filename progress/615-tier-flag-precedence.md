# 615: Maze Chase terminal tier precedence (exported env must never shadow --tier)

Status: in-progress

## Checklist
- [x] Reproduce the defect on the unfixed tree (pipe + live PTY, all three
      precedence directions)
- [ ] Fix: `--tier` replaces any exported `MAZE_CHASE_TIER` in the
      collected env before the tier lookup
- [ ] Regression: shipped-binary test pinning flag > exported env >
      auto-detect, warning path preserved
- [ ] Live PTY regression: the title screen runs the flag's tier over a
      conflicting exported value
- [ ] Cosmetic: reword the overstated historical phrase in
      `tester_windows_cli.rs:11-12`
- [ ] fmt / clippy / terminal-crate + workspace suites green
- [ ] Reviewer / Tester / Evaluator gates (pipeline)

## Scope (binding, from issue #615 triage)
- Small, surgical fix: terminal crate core plus its tests.
- Expected precedence: CLI flag > exported `MAZE_CHASE_TIER` >
  auto-detect.
- Do not touch `maze-chase/docs/parity.md` or the native-arm suites.

## Current step
Pre-fix evidence captured; fix and regressions next.

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

## Next steps
- Apply the fix, add the regressions, reword the doc phrase, run the
  suites, push.

## Agent log
- 2026-10-17 (Builder): orientation done; defect reproduced pre-fix on
  both observables (warning path and live PTY title). Branch
  `opencode/issue615-tier-flag-precedence` created from `main`
  (`e5a99ec1`).
