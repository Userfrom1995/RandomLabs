# torshim M5 - hardening + tri-OS CI (final milestone)

Date: 2026-09-23. Issue: #387 (Refs, final milestone; Closes waits on
CI install, see below). Branch: `opencode/issue387-tor-cli-m5`. Prior:
M1 spec, M2 per-app+shell Linux, M3 system-wide Linux, M4
cross-platform + packaging (all merged to main, PRs #388-#390).

## What was built and why

M5 closes the three hardening gaps the epic named (stale locks,
foreign tor, env scrub were partially covered; concurrency,
config injection, and parser robustness were not) and specifies the
tri-OS CI matrix.

1. **Session lock** (`tor-cli/internal/syswide/lock.go`, wired into
   Connect/Disconnect/Repair): two racing `connect` runs used to both
   snapshot, both launch tor, and both write `active.json`, orphaning
   a tor next to a half-applied firewall. Now all three mutating entry
   points serialize on `session.lock` (pid + timestamp + random
   token). Live holder: contender fails closed naming the pid. Dead,
   ancient (>10 min), or corrupt lock: reaped. Release only deletes a
   lock holding our own token, so an outlived holder can never delete
   its successor. Pinned by `lock_test.go` (7 tests) + `edge_test.go`
   entry-point contention tests.
2. **torrc managed-key guard** (`lifecycle.go`): `ExtraTorrc`
   passthrough was verbatim, so `SocksPort 0.0.0.0:9050` or `Include
   /evil.conf` would add unsupervised listeners or pull in arbitrary
   config. `ValidateExtraTorrc` rejects 20+ managed keywords
   (listeners, WriteToFile pointers, identity, daemon behavior,
   Include); `Launch` fails closed before creating anything; render
   filters too (defense in depth). Bridge lines unaffected.
3. **Parser fuzz** (`internal/control/fuzz_test.go`): hostile seed
   corpus (NUL bytes, overflow PROGRESS, lowercase keys, 10k-repeat,
   async/event lines) asserting no-panic, determinism, and
   never-Ready-straight-from-the-parser, plus three Fuzz targets
   (20 s / 259k execs clean locally on the bootstrap target, 30 s
   each in CI).
4. **Tri-OS CI** (`tor-cli/ci/tor-cli.yml`): matrix
   (linux/macos/windows build+vet+hermetic suite+CLI honesty probes),
   5-target cross compile, bounded fuzz, best-effort live-tor with
   timeouts and documented skips, stale-state honesty sandbox. No job
   mutates a real firewall, by design.
5. **Final docs + 0.4.0**: limitations/threat-model M5 deltas, new
   `docs/reproducibility.md` (gates, deliberately-not-in-CI, manual
   root checklist), README, man page, `version` strings, root
   README + landing entries, stale "(M5)"/"M4" pointers in
   user-facing strings reworded to final ("not shipped").

## The CI install handoff (binding constraint, not a shortcut)

Builder App-token pushes are rejected for `.github/workflows/`
changes ("refusing to allow a GitHub App ... without workflows
permission"); only Lab Engineer PAT-backed pushes can carry them.
The identical workflow content is therefore staged at
`tor-cli/ci/tor-cli.yml` for `/oc lab` install, and every job in it
was executed equivalently before staging: linux
build/vet/hermetic/honesty-probes/fuzz green locally, darwin+windows
`go vet` (compiles test files) and `make cross` green. The PR uses
`Refs #387` (not Closes): the issue closes after the Lab Engineer
installs CI, CI goes green, and Tester/Evaluator sign off.

## How it works (key files)

- `tor-cli/internal/syswide/lock.go` (new): `AcquireSessionLock`
  (O_EXCL claim, staleness probe, wait budget), `Release`
  (token-checked), `LockWait` option (default 30 s).
- `tor-cli/internal/lifecycle/lifecycle.go`: `managedTorrcKeys`,
  `torrcKey`, `ValidateExtraTorrc`, render-time filter, Launch gate.
- `tor-cli/internal/control/fuzz_test.go` (new),
  `tor-cli/internal/syswide/edge_test.go` (new, incl. lock-hygiene
  and corrupt-state tests), `tor-cli/internal/syswide/lock_test.go`.
- `tor-cli/docs/reproducibility.md` (new): full matrix + manual root
  checklist. `tor-cli/ci/tor-cli.yml` (new): staged workflow.

## Verification this run

`go build/vet/test ./...` green (all 8 packages incl. Tester M2/M3/M4
black-box suites with two stale-assertion updates disclosed in the PR:
version pin 0.3.0-m4 to 0.4.0, help "M5" roadmap pointer to
"not shipped"); `make cross` 5-target green; `GOOS=darwin/windows go
vet` green; fuzz 20 s clean; live CLI probes (version/status/run exit
3/disconnect/connect-refusal) match the staged CI assertions exactly.
