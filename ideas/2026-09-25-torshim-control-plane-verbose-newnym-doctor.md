# torshim control plane: verbose diagnostics, newnym rotation, doctor verdict

Phase 2 of the tor-cli epic (#436): the wrapper can now answer "what is
tor doing" without restarting anything. `-v`/`--verbose` on every verb
(endpoints, mode, circuit, backend, notices tail), `torshim newnym`
circuit rotation with rate-limit honesty, and `torshim doctor` (nine
graded pass/fail/skip checks with `--json`). Wrapper 0.4.0 to 0.5.0.

## Why

The M5 wrapper launched tor and went silent: no way to see what it
decided, no way to rotate identity without a restart, no single health
verdict. Users rotated identity by killing the daemon; operators
debugged by reading raw control ports. The control plane closes those
three gaps with real control-protocol logic behind every flag, and it
does so fail-closed: unreachable control, failed auth, unready tor, and
tor's own NEWNYM rate limit are all reported, never claimed.

## How it works

- `internal/control/diagnose.go`: read-only getters over one authed
  connection (version, bootstrap, circuit/stream summaries, guards,
  traffic counters, listeners), each optional key degrading to empty on
  older tors; `Newnym()` mapping tor's 515/rate refusal to
  `ErrRateLimited` with the wait spelled out. Found and fixed a latent
  fake-server bug (double `250 OK` after data blocks) that multi-query
  collection exposed.
- `internal/lifecycle/notices.go`: `NoticesPath()` (owned instances
  only) plus a bounded `TailFile` (1 MB scan cap, partial first line
  dropped), so verbose tails never fail the command.
- `internal/doctor/`: nine checks with injectable deps (stubbed in
  tests, live by default); hand-rolled stdlib DNS-over-UDP and
  exit-IP-via-SOCKS5 probes (domain-name CONNECT, so the probe itself
  leaks nothing); firewall/IPv6 rows that skip-with-reason outside
  system mode, including the honest per-app IPv6 gap.
- `main.go`: `torSession` refactor of ensureTor (socks, control,
  cookie, notices, backend, mode), `TORSHIM_CONTROL`/`TORSHIM_COOKIE`
  session export into every shell child, shared endpoint/cookie
  resolution (`--control` to conventional ports, `--cookie` to
  conventional paths), `-v` alias on every verb.
- Verified end to end against loopback stub control/SOCKS/DNS servers:
  doctor healthy exit 0, newnym rotation exit 0, rate-limit exit 1,
  plus black-box fail-closed pins (no tor: newnym/doctor exit 3,
  status/version verbose exit 0).

## Key files

- `tor-cli/main.go` (verbs, resolution, verbose rendering)
- `tor-cli/internal/control/diagnose.go`, `tor-cli/internal/doctor/`
- `tor-cli/internal/lifecycle/notices.go`, `tor-cli/internal/shell/shell.go`
- `tor-cli/docs/diagnostics.md`, `tor-cli/docs/platforms.md`
- `tor-cli/tests/phase2_diagnostics_test.go`

## Notes

- GUI detach/wait split is Phase 3, deliberately untouched here: `run`
  still blocks on long-lived apps, documented in platforms.md.
- `doctor` exit-IP defaults to check.torproject.org/api/ip with
  `--skip-exit-ip` for offline runs; the target is a flag away from
  being configurable if operators need their own endpoint.
- Showcase site refresh (new commands, recipes) belongs to Phase 5;
  only the version chip moved (0.4.0 to 0.5.0) to stay truthful.

- the Builder
