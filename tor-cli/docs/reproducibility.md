# torshim reproducibility + test matrix

Unofficial frontend. Not sponsored by The Tor Project.

Version under test: `torshim 0.4.0` (`tor-cli/internal/version`).
Toolchain: Go 1.24, stdlib only (no `go.sum`; `CGO_ENABLED=0` for the
static binary). Every command below runs from `tor-cli/`.

## One-line gates

```sh
make build   # static binary ./torshim
make test    # go test ./... (hermetic; no root, no tor, no firewall)
make vet     # go vet ./...
make cross   # 5 release targets: linux amd64+arm64, darwin amd64+arm64, windows amd64
```

`GOOS=darwin go vet ./...` and `GOOS=windows go vet ./...` also
compile-check the test files for those platforms (the matrix job
runs the full suite natively there).

## What each layer proves

| Layer | Where | What it proves |
|---|---|---|
| Hermetic unit suites (`internal/*`, `tests/`) | `make test`, CI matrix | torrc shape + managed-key guard, control parsing, lifecycle state machine, torsocks classification + env scrub, proxy env + coverage notes, shell banner + env, syswide orchestration (fake iptables/nft Runner, local fake DNSPort UDP server), session lock, stale/corrupt edge cases, black-box CLI contract (exit codes, honesty, --help exits 0), verbosity grammar/thresholds/parity, doctor checks + no-mutation, status verify verdict table, G3/G4 timing bounds |
| Bounded fuzz (`internal/control/fuzz_test.go`) | CI `fuzz` job, 30 s per target | parsers never panic, deterministic, never report Ready straight from the parser (250k+ execs clean on the bootstrap target) |
| CLI honesty probes | CI matrix, no tor installed | `version` prints without tor; `status` reports absent + `protected:false` (text and `--json`); `run` with missing tor binary exits 3; stateless `disconnect` exits 0; `connect` without root (or off-Linux) refuses non-zero; every `--help` exits 0 with the exit-code table; `status --verify` and `doctor` exit codes follow their verdict/check tables |
| Live tor lifecycle | CI `live-tor` job (linux, best-effort) + manual | real `tor` bootstrap with a 90 s budget; fail-closed probes first. Restricted CI egress may force a documented SKIP (logged, gate stays green): the hermetic suite above is the binding gate, live is the bonus proof |
| Stale-state honesty | CI `live-tor` job (`TORSHIM_STATEDIR` sandbox) | corrupt `active.json` under `status --json` still parses and still reports `protected:false` |

## Deliberately NOT in CI (and why)

- **Real firewall mutation** (`connect` applying iptables/nft on a
  runner): too privileged and too environment-coupled for shared CI.
  The orchestration is covered hermetically by the fake-Runner suite
  (apply/remove/present/remove-only-ours, snapshot/restore
  round-trips, verify suite + rollback, idempotence, reboot-safety by
  construction under `/run`). Manual root matrix below covers the
  rest on maintainer hardware.
- **Transparent-routing CI on macOS/Windows**: no backend shipped
  (honest exit 4); nothing to run.
- **Full Tor-network bootstrap as a binding gate**: exit access from
  CI is unreliable; binding it would flake the gate. Bounded attempt
  + skip-with-log instead.

## Manual root checklist (maintainer hardware, Linux + tor + iptables/nft)

1. `sudo ./torshim connect` on a throwaway VM: expect the 5-row
   verify table all `ok`, then `connected`.
2. From another host/user: TCP egress fingerprint is Tor; DNS
   resolves through the circuit; `ping` and IPv6 fail (blocked by
   design, documented in `limitations.md`).
3. `sudo ./torshim connect` again: `already connected`, exit 0, no
   second tor launched (check `active.json` pid unchanged).
4. Kill the tor pid; `status` must degrade (never protected);
   `connect` without `--force` must demand repair; `--force`
   reconnects cleanly.
5. Two concurrent `sudo ./torshim connect` runs: exactly one wins,
   the other reports the session lock holder and exits non-zero.
6. `sudo ./torshim disconnect`: firewall byte-matches the
   pre-connect snapshot (`iptables-save`/`nft list ruleset` diff
   against the backup dir), tor pid gone, datadir gone.
7. Reboot: rules gone, state gone (`/run` is tmpfs), `status`
   reports absent. Reconnect explicitly.

## CI install note

The matrix above is specified in `tor-cli/ci/tor-cli.yml`, staged
verbatim for install to `.github/workflows/tor-cli.yml` by the Lab
Engineer (`/oc lab`, PAT-backed push: builder App-token pushes are
rejected for workflow files with "refusing to allow a GitHub App ...
without workflows permission"). Until installed, reproduce every job
with the one-line gates plus the honesty probes in the staged file.
