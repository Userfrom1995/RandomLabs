# torshim CLI v2 - Phase 1: Diagnostics and Honesty Surface (build entry)

Date: 2026-09-24. Issue: #387 (closed epic carrying the CLI v2 workload).
Track: End-User Product (CLI tool). Language: Go, stdlib only (G1).
Blueprint: `ideas/2026-09-24-torshim-cli-v2.md` (binding).
Research: `tor-cli/docs/research.md` Part II, sections 15-16 (P0 surface).
Companion tracker: `progress/387-tor-cli.md`.

## What this phase ships

The P0 diagnostics and honesty surface, the exact capability set the
Owner named as the example ("verbose must show endpoint, mode,
connection verdict, and diagnostics"):

1. **Verbosity system** (`internal/diag`): global `-v`/`-vv`/`-vvv`/`-q`,
   `--log-level quiet|error|warn|info|debug|trace`, `--log-file FILE`.
   Leveled stage-tagged logger on stderr
   (`HH:MM:SS.mmm LEVEL stage: message`), TTY color gated on
   `NO_COLOR`, O(1) level check before any formatting (G5), the
   Owner's `-v` acceptance list (command, instance decision, endpoints,
   mechanism, bootstrap transitions, gate results, coverage notes) and
   the terminal verdict lines:
   `torshim: ready mode=... socks=... bootstrap=100% (done) circuit=established elapsed=...`
   and `torshim: NOT protected reason=... remediation=...`.
   Flag placement per research 16.4: before the command, inside every
   subcommand flag set, before `--` in run/shell; the bare form
   `torshim curl -v ...` keeps handing `-v` to curl (pre-scan stops at
   the first non-flag token). `--json` drops the level to `warn` unless
   `--log-level`/`--log-file` was given explicitly. On Linux, `-vv`
   maps torshim levels onto `TORSOCKS_LOG_LEVEL` for the child.
2. **`torshim doctor [--deep] [--json]`** (`internal/doctor`): read-only
   environment diagnostics, 10 baseline checks plus 3 `--deep` network
   probes (live IsTor through the configured SOCKS, IPv6 posture
   attempt, HTTP `Date` time sanity), per check `[ok]`/`[FAIL]` with
   detail and remediation, JSON schema
   `{overall, checks:[{id, ok, severity, detail, remediation}]}`.
   Exit 0 all pass, 1 any failed, 2 usage. Never mutates, never prints
   the word "protected".
3. **`status --verify [--check-url]`** (`internal/probe`): three-state
   verdict `protected | degraded | unverified`. `protected` requires the
   readiness gates (100% + `done` + circuit-established + SOCKS
   handshake) AND a live `{"IsTor":true}` answer through the exact
   configured socks5h endpoint; anything else names the failing check.
   Plain `status` keeps exiting 0 always; `--verify` exits 0 iff
   `protected`. JSON keys grow additively only: `verdict`, `check_url`,
   `exit_ip`, `listeners`, `uptime`, `instance`.
4. **`--help` exit fix**: every subcommand flag-set `--help` path maps
   `flag.ErrHelp` to exit 0 (was exit 2); subcommands gain real usage
   text with the exit-code table and the trademark line. A black-box
   contract test pins exit 0 on every subcommand and the test-update
   is disclosed in the PR body (research watch item).

## Why

Owner directive 2026-09-24 on #387 (research P0 row P0.1-P0.4): users
cannot see what torshim is doing, cannot prove protection, cannot
diagnose a broken environment, and scripts see exit 2 on `--help`.
The field-failure report (GUI hang with no data) is only actionable
once `-v` and `doctor` exist. This phase instruments the product
before any GUI fix is attempted (Architect ordering: instrument first).

## Key files

- `tor-cli/internal/diag/` - levels, stages, logger, flag registration,
  pre-scan, verdict lines, file tee, color.
- `tor-cli/internal/doctor/` - check engine, renderers, `--deep`.
- `tor-cli/internal/probe/` - socks5h IsTor probe, verdict engine.
- `tor-cli/main.go` - global pre-scan, `doctor` dispatch,
  `status --verify`, `--help` exit fix, `-v` instrumentation hooks.
- `tor-cli/internal/status/status.go` - additive JSON keys.
- `tor-cli/internal/lifecycle/lifecycle.go` - bootstrap transition and
  gate logging hooks, elapsed timing for the verdict line.
- `tor-cli/tests/tester_p1_diagnostics_test.go` - black-box suite:
  help contract, doctor, verify verdict table, verbose parity (G5).

## Binding gates for this phase

G1 stdlib-only; G2 static linux/amd64 binary at most +15 percent over
0.4.0 (ledger before/after); G3 wrapper overhead at most 50 ms p95
(`help`/`version` at most 50 ms); G4 `status` at most 1 s (tor absent)
/ 2 s (dead control); G5 verbosity purity (identical exit codes and
JSON with `-vv` and `--log-level trace`); G6 honesty invariants;
per-OS honest test branches (G7). No feature claims beyond what the
same PR executes.

## Notes

- Anti-facade: no doctor check that prints ok without probing; the
  platform-coverage check derives its statement from live capability
  detection (`version.Collect` + `runtime.GOOS`), not a constant.
- `--json` purity: stdout carries only the payload; all logs to stderr.
- Deferred to later phases by blueprint: `newnym`, `shellenv`,
  completion, `--isolate`, bridges, `circuits`, `--watch`, `--set`,
  system-proxy backend, the GUI launch supervisor.

- the Builder
