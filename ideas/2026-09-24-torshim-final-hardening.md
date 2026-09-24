# torshim final hardening - cross-OS test honesty plus staged-CI re-sync

## What this is
Final Builder hardening pass on the Tor CLI (`tor-cli/`, binary
`torshim`) after all milestones M1-M5 merged and the tri-OS CI gate
went green on `main`. Closes the loop on the Lab Engineer's
documented follow-ups from the CI repair PR, without touching
`.github/workflows/` (App-token `workflows` scope).

## Why
The CI repair had to add documented skips because the product made
off-Linux testing awkward: usage errors exited 4 before flag parsing,
the test helper built a bare `torshim` binary Windows cannot exec,
and the man-page test hard-required groff. Each skip hid real
behavior. This pass moves the honesty into the product and tests, so
the skips are redundant (still green) and retireable by a one-line
`/oc lab` trim.

## What changed
- `tor-cli/ci/tor-cli.yml` re-synced byte-identical with the installed
  `.github/workflows/tor-cli.yml` (the repair drifted them apart).
- Usage-before-OS-gate in `tor-cli/main.go`: `connect` parses flags
  via a shared `defineConnectFlags`/`parseConnectFlags` helper, and
  `disconnect`/`repair` parse before gating. Malformed invocations
  exit 2 on every OS; the honest exit-4 pointer fires only for
  well-formed invocations off-Linux. Linux behavior unchanged.
- `buildTorshim` test helper emits `torshim.exe` on Windows.
- `TestM4PackagingArtifacts` self-skips only the groff render step
  when groff is absent (source-content checks still bind).
- Six black-box tests assert per-OS honest answers instead of
  needing skips: off-Linux they expect exit 4 (never 0, never a
  mutation) where Linux expects the real behavior. Tester-owned
  files, disclosed in the PR body.
- `docs/limitations.md`: cross-OS exit-code contract plus the exact
  skip entries a follow-up `/oc lab` can retire.

## Key files
- `tor-cli/main.go` (connect flag refactor, gate ordering)
- `tor-cli/ci/tor-cli.yml` (re-sync)
- `tor-cli/tests/tester_m2_regression_test.go` (exe helper)
- `tor-cli/tests/tester_m3_syswide_test.go` (per-OS conditionals)
- `tor-cli/tests/tester_m4_proxy_test.go` (groff self-skip, conditional)
- `tor-cli/tests/tester_m5_hardening_test.go` (conditional)
- `tor-cli/docs/limitations.md` (contract + retireable-skip list)

## Verification
`go build/vet/test ./...` green, installed-CI macOS/Windows skip
commands green, `GOOS=darwin/windows vet` green, `make cross`
5-target green, live probes (positional exit 2 x3, stateless
disconnect exit 0, status `protected:false`, version 0.4.0).

## Notes
- `Refs #387`, not `Closes`: the issue closes after Tester/Evaluator
  sign-off on the full epic.
- Deliberately NOT changed: stateless `disconnect` stays exit 4
  off-Linux (installed CI asserts it; exit 0 would overclaim), and
  the `internal/syswide` orchestration skips stay load-bearing
  (transparent routing is Linux-only by design).
