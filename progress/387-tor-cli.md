# Tor CLI (torshim) - Build Epic

Issue: #387 (closed epic carrying the active CLI v2 workload).
Research: `tor-cli/docs/research.md` Part I (original spec) + Part II
(feature/UX roadmap, PR #413; the Phase 1 build lands on the same PR
branch, the pipeline's verified push target).
Blueprints: `ideas/2026-09-23-torshim-tor-cli.md` (v1, shipped 0.4.0),
`ideas/2026-09-24-torshim-cli-v2.md` (v2, this roadmap).
Status: in-progress

## Milestone roadmap (v1, shipped)

- M1 Research + Architecture: [x] survey + spec + blueprint (PR #388, Refs #387)
- M2 Per-app + shell on Linux: [x] lifecycle + control client, [x] readiness wait, [x] torsocks exec + static-binary guard, [x] shell + banner, [x] status/version v1, [x] fail-closed + DNS + lifecycle tests (PR #388, Refs #387)
- M3 System-wide Linux connect/disconnect: [x] iptables backend, [x] nft backend, [x] backup/restore byte-exact, [x] idempotence + reboot-safety, [x] verify suite + repair (PR 2 target, Refs #387)
- M4 Cross-platform + polish: [x] macOS per-app/shell via proxy env, [x] Windows per-app/shell via proxy env, [x] version platform backends, [x] Makefile + man page + help polish, [x] limitations/threat-model/README M4 (PR 3 target, Refs #387)
- M5 Hardening + tri-OS CI: [x] torrc managed-key guard, [x] syswide session lock, [x] control-parser fuzz + syswide edge tests, [x] linux/macos/windows matrix (staged at tor-cli/ci/tor-cli.yml for /oc lab install: builder pushes cannot carry workflow files), [x] docs complete (Final PR, Refs #387: Closes waits on lab CI install + green + Tester/Evaluator)

Active Milestone (v1): M5 complete and merged; #387 closed, epic kept
open for the Owner's 2026-09-24 v2 directives (verbose diagnostics,
feature/UX depth, GUI applications).

## Phase roadmap: CLI v2 (2026-09-24 Owner directives)

- Phase 1: Diagnostics and Honesty Surface: [x] verbosity system
  (-v/-vv/-vvv/-q, --log-level, --log-file, verdict lines, flag
  placement), [x] `doctor` (+--deep, --json), [x] `status --verify`
  (three-state verdict, --check-url, additive JSON), [x] `--help`
  exit-0 fix with pinned contract test disclosed, [x] performance
  ledger (G2 recorded as a structural conflict for Architect/Owner
  adjudication; G3 pass; G4 fixed 3.0s -> 1.5s and pinned by test)
  (PR 1 target, Refs #387)
- Phase 2: GUI-Safe Application Launch: [ ] diagnosis harness proving
  H1-H6 with real apps (firefox/falkon/chromium), [ ] launch supervisor
  (process groups, INT/TERM/HUP forwarding, ordered teardown, exit-code
  propagation), [ ] bounded-wait invariant + NOT-protected failure
  lines, [ ] desktop torsocks profile on Linux, [ ] chromium/firefox
  injection profiles on macOS/Windows, [ ] GUI matrix + coverage docs
  (PR 2 target, Refs #387)
- Phase 3: Workflow Verbs and Shell Integration: [ ] `newnym`, [ ]
  `shellenv`, [ ] `completion bash|zsh|fish`, [ ] `--isolate`, [ ]
  structured errors (code + remediation) (PR 3 target, Refs #387)
- Phase 4: Network Control and Observability: [ ] `bridge
  add|list|remove` with PT detection, [ ] `circuits`, [ ]
  `status --watch`, [ ] `--set`/`--exit` with verify-config gate
  (PR 4 target, Refs #387)
- Phase 5: System-Proxy Session Backend: [ ] `internal/sysproxy`
  snapshot core, [ ] macOS networksetup backend, [ ] Windows HKCU/WinINET
  backend, [ ] `connect --backend proxy` wiring, [ ] `status` mode
  `sysproxy` honesty, [ ] GUI coverage upgrade for system-proxy-only
  apps (PR 5 target, Refs #387)
- Phase 6: Per-OS Verification and Website Refresh: [ ] consolidated
  test-linux/test-macos/test-windows campaign, [ ] tri-OS CI zero new
  skips, [ ] performance ledger G2/G3/G4, [ ] unified docs/man/README,
  [ ] tor-cli/index.html + landing refresh with live transcripts,
  [ ] Evaluator at least 9.8 (Final PR, Refs #387: issue already
  closed, so the final PR carries Refs, not Closes)

Active Phase: Phase 1: Diagnostics and Honesty Surface (Complete,
ready for review)

Current step: Phase 1 handed to the Reviewer on PR #413. All features,
unit + black-box suites, README/man/reproducibility updates, and the
performance ledger (`.github/agents/decisions/builder/2026-09-24-
torshim-p1-diagnostics-ledger.md`) are pushed.

Next steps: Reviewer -> Tester -> Evaluator -> Maintainer on PR #413.
Open adjudication carried into review: G2 (+92.61% vs +15% cap) is
structurally in conflict with the mandated HTTPS IsTor proof (research
P0.3); measured and attributed in the ledger, `Refs #387` stands.
Phase 2 (GUI-Safe Application Launch) starts only after Phase 1 merges
(website refresh stays in the final phase per Owner ordering).

## Agent log

- 2026-09-24 Builder Phase 1 run 1: oriented on the Architect blueprint
  (cherry-picked `ideas/2026-09-24-torshim-cli-v2.md` + this tracker
  onto PR #413's branch, the pipeline's verified push target), wrote
  `ideas/2026-09-24-torshim-cli-v2-phase1-diagnostics.md` build entry;
  research Part II (PR #413) is the binding P0 spec. No product code
  yet. Refs #387.

- 2026-09-24 Builder sync: copied `.github/workflows/tor-cli.yml`
  (Lab-trimmed: shared else branch, single load-bearing skip
  `TestConnectDisconnect`) over `tor-cli/ci/tor-cli.yml`; `diff` clean,
  YAML parses (4 jobs: matrix/cross/fuzz/live-tor), no em dashes.
  Full `go build/vet/test ./...` green, `GOOS=darwin/windows vet`
  green, `make cross` 5-target green, installed-CI off-Linux skip
  commands green on Linux. No product code touched. Refs #387.

## Agent log

- 2026-09-24 Builder Phase 1 complete: shipped the diagnostics surface
  (`internal/diag`: level table quiet..trace, argv pre-scan + in-flagset
  `-v/-vv/-vvv/-q/--log-level/--log-file`, single-space grammar
  `HH:MM:SS.mmm LEVEL stage: message`, JSON drop-to-warn, log-file tee,
  `TORSOCKS_LOG_LEVEL` at debug+; `internal/doctor`: 10 baseline + 3
  deep checks, `--json` schema, never-"protected", never-mutates;
  `internal/probe`: hand-rolled SOCKS5 + socks5h IsTor fetch and the
  protected/degraded/unverified verdict rule; `status --verify` with
  additive JSON keys and cookie best-effort auth; `--help` exits 0 on
  every flag set while malformed usage stays 2; terminal verdict lines
  at info; `internal/platform_compat` capability layer feeding doctor;
  lifecycle spawn/milestone/gate instrumentation). Gate work: G3
  version/help 3-6 ms (pass); G4 dead-control 3,008 ms -> 1,508 ms via
  a whole-collect 1.5 s budget with an absolute control deadline (pinned
  by `TestP1G4StatusStaysInsideTwoSeconds`); G2 recorded at +92.61%
  against the +15% cap with full attribution (the spec-mandated HTTPS
  IsTor trust stack alone is 3-5 MB vs a 791 KB budget) - ledger at
  `.github/agents/decisions/builder/2026-09-24-torshim-p1-diagnostics-ledger.md`,
  escalated for Architect/Owner adjudication, `Refs #387` stands.
  Tests: diag/probe/doctor/platform_compat units + black-box contract
  suite (help/usage/grammar/parity/verdict table/doctor/G3/G4).
  Docs: README + man + reproducibility integrated as one product view
  (milestone markers stripped from touched docs). Full `go test ./...`,
  `go vet`, `go build` green. Refs #387 (review handoff).
- 2026-09-24 Builder final: re-synced staged `tor-cli/ci/tor-cli.yml`
  byte-identical with the installed workflow (repair drift closed);
  usage-before-OS-gate in main.go (shared connect flag helper,
  disconnect/repair parse before gate: exit 2 for usage on all OSes,
  honest exit 4 only for well-formed off-Linux calls, Linux behavior
  unchanged); `buildTorshim` emits `.exe` on Windows; groff render
  self-skips when absent; six black-box tests assert per-OS honest
  answers (off-Linux exit 4, never 0/never mutate) instead of needing
  skips; limitations.md cross-OS contract + retireable-skip list for
  a follow-up /oc lab trim. Full suite + skip-command equivalence +
  darwin/windows vet + 5-target cross + live probes green.
  Tester-owned test edits disclosed in PR. Refs #387 (Closes waits
  on Tester/Evaluator sign-off).

## Agent log

- 2026-09-23 Builder M5: session lock (lock.go + Connect/Disconnect/
  Repair wiring + LockWait, 7 lock tests + contention/hygiene edge
  tests), torrc managed-key guard (ValidateExtraTorrc + Launch gate +
  render filter, 3 tests), control fuzz (seed corpus + 3 targets, 20 s
  / 259k execs clean), tri-OS CI staged at tor-cli/ci/tor-cli.yml
  (App-token workflow push rejected; /oc lab install recorded in
  decisions/builder/2026-09-23T23-45-00-torshim-m5-ci-staged-refs.md),
  docs (limitations/threat-model M5, reproducibility.md new, README,
  man 0.4.0, version 0.4.0, final user-facing strings), root README +
  landing entries, ideas M5 entry. Full suite + 5-target cross +
  darwin/windows vet green. Refs #387 (Closes after lab CI + eval).
- 2026-09-23 Builder M4: proxy-env per-app backend (proxy.go: socks5h
  URL, shadow-key scrub, coverage note on every launch, NeedsProxy
  dispatch, RunProxy fail-closed) + proxy_test.go, main.go platform
  wiring (conf-dir skip, direct proxy shell, M4 usage, per-OS exit-4
  pointer), version 0.3.0-m4 with platform/per-app/syswide fields,
  Makefile + torshim.1 man page, limitations/threat-model/README M4,
  ideas entry. Full suite + 5-target cross green; no root/tor needed.
  System-wide off-Linux stays honest exit 4 (M5 tun2socks path).
- 2026-09-23 Builder M3: syswide package (iptables + nft backends,
  ActiveState under /run/torshim, snapshot-first backup, 5-row verify
  with rollback, repair, status probe), lifecycle TransPort + RunAs +
  TempParent + per-OS shims (linux/darwin/windows/arm64 all compile),
  connect/disconnect/repair wiring with exit-3 verify gate, status
  system mode (never claims protected when not), threat-model +
  limitations docs, README + ideas M3 entry. 15 hermetic syswide tests
  + torrc + black-box contract tests green; no root/tor needed.
  `connect` on macOS/Windows exits 4 honestly (M4).

## Agent log

- 2026-09-23 Builder M2: Go stdlib CLI (main + control/lifecycle/perapp/shell/
  status/version), 30+ unit tests green (fake control server, synthetic ELF
  guard, torrc, handshake, readiness timeout, banner, status honesty).
  `connect`/`disconnect` exit 4 (M3 pointer, no stubs). Default private owned
  instance; `--reuse` only when cookie-verifiable. No root index/README
  changes (intermediate milestone, Refs #387).

## Binding constraints (from research)

Go static binary; private DataDirectory + auto ports + cookie auth +
`__OwningControllerProcess`/`TAKEOWNERSHIP`; readiness = bootstrap 100%
+ circuit-established (+ optional live check); torsocks default on Linux
with static-binary fail-closed; socks5h env on macOS/Windows (no DYLD/LSP
product path); DNS always via Tor (A/AAAA/PTR); v6 mirrored or blocked;
status never claims protected when not; trademark disclaimer on surfaces.
