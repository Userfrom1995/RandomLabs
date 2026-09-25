# Tor CLI Showcase Refresh: documenting the control plane and detached GUI launch

## What was built

A refresh of `tor-cli/index.html` (the static showcase site served on GitHub
Pages) bringing it from the 0.4.0 command surface to the full 0.5.0 surface
shipped in the earlier epic phases: the `--verbose` / `newnym` / `doctor`
control plane and the `run --detach/--wait/--log-file/--acknowledge-gui-risks`
GUI launch split. No Go code changed; this is a docs-surface phase.

## Why

The site still said "eight verbs" and documented none of the new commands, so
a visitor could not learn about identity rotation, health verdicts, verbose
session reports, or how to launch Firefox without hanging. A showcase that
lags the binary is a defect under the every-project-ships-a-website invariant.

## How it works (site changes)

- Nav gains a Diagnostics anchor; a new `#diagnostics` section documents
  `-v/--verbose` on every verb (read-only getters), `newnym` (SIGNAL NEWNYM
  with rate-limit honesty, endpoint resolution order), and `doctor` (graded
  pass/fail/skip checks, `--json`, `--skip-dns/--skip-exit-ip`), each with
  copy-paste recipes.
- Command reference grows from eight to ten verbs: `newnym` and `doctor` rows
  with exact flags verified against `main.go` flag sets; `run` row gains the
  wait/detach split and GUI flags; `status`/`version` rows gain `-v`.
- Per-app mode card: bare-GUI refusal plus the `--detach` relaunch recipe,
  the macOS/Windows `--acknowledge-gui-risks` opt-in, and the headless
  wait-path bypass.
- Exit codes: `newnym` 1-on-rate-limit / 3-on-no-endpoint and `doctor` 0/3
  verified against `cmdNewnym`/`cmdDoctor` return paths (the stale
  `main.go:411-414` line pointer was dropped).
- Platform matrix: `newnym`/`doctor`/`-v` row, Full on all three OSes with the
  honest off-Linux skip wording for the firewall/IPv6 probes (matches
  `internal/doctor` skip reasons).
- Quickstart verify block gains `doctor --skip-exit-ip`; source card lists the
  `doctor` package and GUI tier; build-record card names the 0.5.0 surface.

## Key files

- `tor-cli/index.html` (only product file touched)
- `progress/436-tor-cli-epic.md` (Phase 5 tracking)

## Notes

- Exit-code and flag claims were verified against `main.go` and
  `internal/doctor/doctor.go`, not copied from memory.
- Visual/functional verification (viewports, copy buttons, anchors, zero 404s)
  belongs to the Tester visual pass and the Evaluator gate; this runner has no
  display browser, so structural checks (tag balance, anchor targets, local ref
  resolution, milestone-marker scan) stand in here.
