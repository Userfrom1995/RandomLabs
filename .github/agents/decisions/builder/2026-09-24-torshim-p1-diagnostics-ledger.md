# Phase 1 diagnostics ledger: G2 binary size, G3/G4 timings

Date: 2026-09-24. Issue: #387 (Refs). PR: #413. Role: the Builder.

Environment: GitHub Actions linux/amd64 runner, Go 1.24.13, method
`CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build` (the Makefile build,
unstripped), same toolchain and flags for before and after.

## G2 (size): FAIL as measured, structurally attributed

| Build | Source | Bytes | vs baseline |
|---|---|---|---|
| baseline 0.4.0 | `origin/main` at `90a24916` | 5,274,997 | 0 |
| branch, docs-only start | `ae7165f9` | 5,275,029 | +0.001% |
| packages added, not linked | `56909916` | 5,283,643 | +0.16% |
| probe/doctor/status wired in | `cf067eb9` | 9,813,991 | +86.0% |
| platform capability layer | `19065d0b` | 9,826,396 | +86.3% |
| gate fixes applied | working tree (`77169e04` + G4 budget) | 10,160,402 | **+92.61%** |

Gate: at most +15% = 6,066,246 bytes. Overshoot: 4,094,356 bytes over
budget (the gate passes at ~791 KB of growth; measured growth is
~4.89 MB).

Attribution (measured, same toolchain):

- Toy binaries: empty `main` 1,571,335; `main` referencing `net/http`
  4,792,864 (+3.22 MB); `main` with a reachable `crypto/tls` handshake
  path 6,439,257 (+4.87 MB).
- The jump appears exactly at `cf067eb9`, where `internal/probe` first
  links into the binary. The probe exists to satisfy research P0.3 /
  16.2: the binding proof fetches `https://check.torproject.org/api/ip`
  through the socks5h endpoint. In-process HTTPS requires
  `crypto/tls` + `crypto/x509` + `net/http` (3-5 MB measured).
- Everything else in this phase (diag, doctor engine, platform
  capability layer, status enrichment, new usage surfaces) accounts for
  the remainder (~1.3 MB including strings); none of it is close to
  dominant.

Structural conclusion: research P0.3 mandates an HTTPS IsTor proof;
G2 allows +15% (~791 KB). The TLS trust stack alone exceeds the whole
budget by roughly 4-6x. The two binding requirements are in conflict as
written. This is not negligence and not an accepted failure: the
number is recorded, attributed, and escalated for Architect/Owner
adjudication (either G2's measurement basis is amended to exclude the
spec-mandated trust stack, or the proof design is amended). Until then
the PR carries `Refs #387`, never `Closes`.

Mitigation considered and rejected as insufficient: the probe already
hand-writes the HTTP request and only uses `net/http` for
`http.ReadResponse` (and doctor for a direct clock HEAD). Removing
`net/http` while keeping `crypto/tls` was measured to still land near
+60% - far outside the gate - so trading battle-tested response
parsing (chunked encoding) for a still-failing margin buys nothing.

## G3 (startup): PASS

Best of 5 runs each on the same runner, final binary:

| Command | Best | Gate |
|---|---|---|
| `torshim version` | 3 ms | 50 ms |
| `torshim --help` | 3 ms | 50 ms |
| `torshim help` | 6 ms | 50 ms |

Wrapper pre-spawn overhead (50 ms p95 before tor spawn) needs a live
tor binary and is deferred to the Tester's live-run evidence; nothing
in this phase's hot path adds work before spawn (the pre-scan is
O(argv) over the leading flags only).

## G4 (status latency): FAIL before fix, PASS after fix

`status` without `--verify`:

| Scenario | Before | After | Gate |
|---|---|---|---|
| tor absent (loopback refused) | 8 ms | 7 ms | 1 s |
| unroutable control endpoint | 3,008 ms | 1,508 ms | 2 s |
| control accepts but silent | up to 10 s (per-op `DefaultTimeout`) | ~1.5 s | 2 s |

Fix: `internal/status` now builds the whole report inside one
wall-clock budget (default 1,500 ms): the dial gets the budget, every
control operation is capped by an absolute `Client.Deadline`
(`internal/control`), and the SOCKS probe only receives the remaining
time. Pinned by `TestP1G4StatusStaysInsideTwoSeconds` (silent endpoint
plus unroutable endpoint, both asserted under 2 s and still honest).

## G1 (stdlib): PASS

`tor-cli/go.mod` and `go.sum` are byte-identical to the baseline
(zero new module dependencies).

## G5 (observability purity): builder-side evidence

`TestP1VerboseParityStdoutAndExit` runs representative commands
(version, help, status --json, run --help, shell --help, doctor --json,
failing run) at default and `-vv` and asserts identical stdout and exit
codes. The blueprint's full-suite double-injection run is the Tester's
obligation.

- the Builder
