# torshim CLI v2 - diagnostics, GUI-safe launch, and workflow depth (Blueprint)

Date: 2026-09-24. Issue: #387 (closed epic carrying the active v2 workload).
Research: `tor-cli/docs/research.md` Part I (binding spec) and Part II
(feature/UX research, sections 12-20, PR #413; Phase 1 build starts only
after #413 merges, preserving the Owner's research -> architecture ->
build order).
Base blueprint: `ideas/2026-09-23-torshim-tor-cli.md` (shipped as 0.4.0).
Track: End-User Product (CLI tool). Language: Go, stdlib only (G1 binding).
Binary: `torshim`. Companion tracker: `progress/387-tor-cli.md`.

## Summary

torshim 0.4.0 proved the core: private Tor lifecycle, readiness gating,
torsocks per-app routing on Linux, proxy-env elsewhere, Linux system-wide
connect/disconnect, honest status. Version two turns it into the CLI the
Owner asked for: a tool that shows what it is doing (`-v` verdict lines),
proves protection (`status --verify`), diagnoses its own environment
(`doctor`), runs GUI applications without crashing or hanging (supervised
launch with per-OS desktop strategies), and grows the workflow verbs real
users need (newnym, shellenv, completion, isolation, bridges, circuits,
validated torrc overrides, system-proxy sessions on macOS/Windows).

Fail-closed honesty stays the spine: three-state verdicts
(`protected | degraded | unverified`), the exit-code contract
(0/1/2/3/4) untouched, stdout carries payloads while stderr carries logs,
and every coverage claim is measured per (browser, OS) cell before it is
written anywhere. The tool never claims what it cannot prove.

Trademark note (binding, every surface): `torshim - lightweight launcher
for the Tor network (unofficial, not sponsored by The Tor Project)` on
help, completion headers, man page, doctor footer, README, website.

## Deliverables

- New `internal/` packages: `diag`, `doctor`, `probe`, `launch`,
  `profile`, `bridge`, `observe`, `sysproxy`, `errcode`, `completion`
  (all stdlib-only).
- New/changed CLI surface: global verbosity flags, `doctor`,
  `status --verify`, `--help` exit fix, `newnym`, `shellenv`,
  `completion bash|zsh|fish`, `run --isolate`, `bridge add|list|remove`,
  `circuits`, `status --watch`, `run --set/--exit`,
  `connect --backend proxy` (macOS/Windows).
- GUI-safe launch for `torshim <app>` on Linux, macOS, Windows: no
  crashes, no unbounded hangs, real browsers verified end-to-end.
- Docs: `limitations.md` coverage matrix, `threat-model.md` deltas,
  README, `torshim.1`, `docs/demo.sh` transcript refresh, root README
  and `tor-cli/index.html` refresh in the final phase (website last,
  per Owner ordering).
- Test suites per phase (hermetic + live), performance ledger entries in
  `.github/agents/decisions/builder/`, tri-OS CI with zero new skips.

## Why

Two Owner directives on #387 (2026-09-24):

1. Make torshim significantly better by researching real tools first:
   `verbose` must show endpoint, mode, connection verdict, and
   diagnostics; then add only genuinely valuable capabilities; keep it
   lightweight, fast, reliable; run the full workflow (research ->
   architecture -> build -> per-OS real-user testing -> website) in that
   order.
2. `torshim falkon` / `torshim firefox` crash or hang indefinitely with
   no timeout. Every app a user launches must route through Tor without
   crashing or hanging, CLI or GUI, with macOS and Windows as strong as
   Linux, verified with real GUI apps by dedicated per-OS testers.

Demand evidence (research 13.2) backs the same list: silent-hang pain
(Arti #2725/#2726/#2678), leak anxiety (HN 25602260, Tor check-for-leaks
docs), aging observability (nyx issues), static-binary escape hatch (Tor
Forum 16360), and the Owner's own field report with no OS data captured
(doctor/`-v` exist to make bug reports paste-able).

### Research gap this blueprint closes

The Maintainer's #387 triage promised a `research.md` GUI addendum
(per-OS GUI matrix, detached launch, signal forwarding, browser launch
patterns); Part II shipped without any GUI section. The GUI design below
derives from the Architect's own reading of the shipped code
(`main.go`, `internal/perapp/perapp.go`, `internal/perapp/proxy.go`,
`internal/shell/shell.go`). Its root-cause hypotheses are explicit and
must be proven by a diagnosis harness before any fix is claimed; if the
harness falsifies them, the Builder dispatches a focused `/oc research`
follow-up before implementing (evidence, never guesses).

## How It Works

### Diagnostics engine

**Verbosity (research 16.3/16.4, binding).** Global flags recognized in
three positions: before the command (`torshim -v status`), inside a
subcommand's flag set (`torshim status --log-level debug`), and before
`--` in `run`/`shell`. The bare form stays pure: `torshim curl -v
https://...` gives `-v` to curl; the global pre-scan stops at the first
non-flag token. Levels: `-v` info, `-vv` debug, `-vvv` trace, `-q`
errors only, `--log-level quiet|error|warn|info|debug|trace` wins over
stacking, `--log-file FILE` tees. Format on stderr only:
`HH:MM:SS.mmm LEVEL stage: message`. Stages are research 16.3's binding
list (`cli lifecycle readiness control perapp shell status syswide
doctor verify`) extended with v2 stages (`launch profile bridge observe
sysproxy`). Color only when stderr is a TTY and `NO_COLOR` is
unset. Level check happens before any formatting (G5: disabled logging
costs zero per line).

`-v` must print the Owner's acceptance list one line each: parsed
command and flags, instance decision (private vs foreign with pid and
version), spawned tor path/data dir and every chosen endpoint (socks,
control, dns, trans), per-OS mechanism, bootstrap transitions at 25/50/
75/100 percent plus tag, each readiness gate result, coverage notes, and
a terminal verdict line:

- success: `torshim: ready mode=per-app mechanism=torsocks socks=127.0.0.1:43123 bootstrap=100% (done) circuit=established elapsed=12.4s`
- failure: `torshim: NOT protected reason=<cause> remediation=<action>` (exit code identical to the non-verbose path).

`--json` interaction: stdout carries only the JSON payload; log level
drops to `warn` unless `--log-level`/`--log-file` was given explicitly.
On Linux, `-vv` also maps torshim levels onto `TORSOCKS_LOG_LEVEL` in the
child environment so torsocks' own diagnostics join the transcript.

**`doctor` (research 16.1, binding).** Read-only, eleven checks: tor
binary/version; per-app mechanism availability; control endpoint dial +
PROTOCOLINFO + cookie auth + instance kind; bootstrap state; SOCKS
handshake; port conflicts on 9050/9150; session state under
`/run/torshim` (lock liveness, rules-vs-tor mismatch); env hygiene
(shadowed proxy keys, stale `TORSHIM_ACTIVE`); bridge preconditions (PT
binary present); platform coverage statement mirroring `limitations.md`;
`--deep` opt-in adds live IsTor probe, IPv6 posture attempt, HTTP `Date`
time sanity. Output per check `[ok]`/`[FAIL]` with `detail` and
`remediation`; `--json` renders
`{overall, checks:[{id, ok, severity, detail, remediation}]}`. Exit 0 all
pass, 1 any failed, 2 usage. Doctor never mutates and never prints the
word "protected".

**`status --verify` (research 16.2, binding).** `protected` requires ALL
of: readiness gates (100 percent + tag done + circuit-established +
SOCKS handshake) AND a live `{"IsTor":true}` response through the exact
configured socks5h endpoint. Any failure renders `degraded` (endpoint
answers, proof failed) or `unverified` (no endpoint), naming the failing
check. Probe URL injectable via `--check-url` (hermetic tests, privacy).
Exit contract: plain `status` keeps exiting 0 always (unchanged);
`status --verify` exits 0 iff verdict is `protected`, else 1 (documented
in help). JSON grows additively only: `verdict`, `check_url`,
`exit_ip`, `listeners`, `uptime`, `instance` join the pinned keys.

**`--help` exit fix.** Every flag-set `--help` path currently maps
`flag.ErrHelp` to exit 2; it must exit 0. `torshim --help` at top level
already exits 0 (main.go), so only the subcommand flag sets change. No
existing test pins subcommand `--help` to 2, so the Builder adds a
contract test asserting exit 0 on all subcommands and discloses the
exit-code table update in the PR body (research watch item).

### Launch supervisor (the GUI correctness core)

Root cause space for the Owner's hang/crash report, each with a
discriminating experiment run by the phase's diagnosis harness before
any fix lands:

| ID | Hypothesis | Discriminating experiment |
|---|---|---|
| H1 | Interrupt race: the SIGINT/SIGTERM goroutine in `ensureTor` (main.go) calls `in.Stop()` then `os.Exit(130)` while the child still runs, killing Tor under a live app so its sockets die and it hangs | Launch a child that blocks on a SOCKS connection; send SIGINT; observe tor death ordering vs child exit |
| H2 | Unhandled SIGHUP: terminal close kills torshim, `TAKEOWNERSHIP` tears down the owned tor, the orphaned GUI app hangs on dead endpoints | `setsid` the wrapper, close its terminal, watch child and tor lifetimes |
| H3 | torsocks `AllowOutboundLocalhost 0` in our generated conf denies app-internal loopback IPC (browser multi-process) | Same app, same conf, swap only that key; compare crash/hang |
| H4 | torsocks interposition crashes sandboxed/forking toolkits (seccomp, dlopen, double-fork) | `TORSOCKS_LOG_LEVEL` + `strace -f` capture on the crashing binary |
| H5 | stdio inheritance: GUI child inherits stdin and can block on it in non-interactive launches, or steals terminal input | Launch via pipe and via TTY with a stdin-reading test app |
| H6 | off-Linux: GUI apps ignore proxy env, so macOS/Windows desktop apps leak or fail without ever entering our path | Browser probe matrix (below) measuring where the request actually exits |

Supervisor design (`internal/launch`), fixes H1/H2/H5 by construction:

- Child starts in its own process group (`SysProcAttr.Setpgid` on
  Unix; `CREATE_NEW_PROCESS_GROUP` plus `CTRL_BREAK_EVENT` delivery on
  Windows, all stdlib `syscall`).
- Signals INT/TERM/HUP (Unix) and console ctrl events (Windows) are
  forwarded to the child group; torshim then reaps the child with a 5 s
  grace (SIGKILL to the group after), stops the owned tor only after the
  child is reaped, and exits with the child's code (130 on interrupt).
  No `os.Exit` from a signal goroutine before teardown completes.
- stdio policy: inherit all three streams when stdin is a TTY
  (interactive behavior unchanged); when stdin is not a TTY, the child
  gets `/dev/null` on stdin so it can never block on a silent pipe, with
  stdout/stderr still inherited. Explicit `--stdin`/`--no-stdin`
  overrides exist only if real testing shows a need; no flag ships
  without a working engine behind it.
- Bounded-wait invariant: every wait on the launch path carries a
  deadline and an actionable error (bootstrap `--timeout` already;
  added: child-start watchdog, control/SOCKS dial+read deadlines per
  G4, verify probe deadline). No code path may block forever; a stuck
  launch must end in `NOT protected reason=... remediation=...`.
- Private tor ownership stays with torshim for the child's whole
  lifetime; foreign reused instances are never stopped (unchanged).

### Desktop (GUI) launch strategies per OS

No magic auto-guessing: a deterministic rule table in
`internal/profile` resolves `platform + target family + explicit
override` into a launch profile, and every profile prints its coverage
note. Measured browser matrix first, claims second: for each
(browser, OS) cell the acceptance artifact is a live fetch of
`https://check.torproject.org/api/ip` initiated by the browser itself
returning `IsTor:true`, recorded in the PR and the test log. The probe
URL uses a hostname (never a bare IP) so the fetch exercises remote DNS
through socks5h; a numeric-IP probe would not prove DNS routing, so DNS
claims ride on the same artifact (Owner requirement: DNS and network
traffic verified, not assumed). Cells without evidence stay listed as
unsupported in `limitations.md`.

- **Linux**: torsocks remains the default mechanism for both CLI and
  desktop targets. Profile `desktop` may flip `AllowOutboundLocalhost`
  (and only that) to permit toolkit loopback IPC, iff experiment H3
  proves it necessary; the coverage note then states plainly that
  loopback peers are not torified (local-only, never an Internet
  leak). CLI profile keeps today's strict conf byte-for-byte.
  torsocks log-level mapping at `-vv` supports H4 diagnosis.
- **macOS**: app-native injection where a real mechanism exists.
  Chromium family: append `--proxy-server=socks5://host:port` (only
  when the user did not pass their own proxy flag; conflict = warn and
  respect the user). Firefox: launch through a torshim-managed profile
  directory whose `user.js` sets `network.proxy.*` to the SOCKS5
  endpoint, or the verified env mechanism if the probe matrix proves
  Firefox honors it; session state under the state dir, removed on
  exit. Unknown apps: proxy env (today's behavior) plus the honest
  coverage note. SIP stays untouched: no DYLD product path, ever.
- **Windows**: same Chromium rule; Firefox via managed profile prefs;
  other desktop apps inherit proxy env plus, in the final system-proxy
  phase, WinINET registry session scope. No LSP, no driver, ever.
- Bash/GTK/Qt terminal apps and scripts keep the exact CLI path; the
  profile only adds arguments/env, never alters argv semantics, stdin
  contract, or signal behavior for CLI targets (Owner constraint:
  normal application behavior, env, process launching, signals, and
  stdin/stdout must not break).

### Workflow verbs

- `newnym`: `SIGNAL NEWNYM` through the existing (already implemented,
  never called) control client; honest wording about rate limits,
  existing streams, and unchanged guards; last-rotation timestamp in
  the state dir; `--json`; exit 3 without verified control.
- `shellenv`: `eval "$(torshim shellenv)"` exports the active session's
  proxy env for the current shell; side-effect free (never launches
  tor); no endpoint found = exit 3 with remediation pointing at
  `torshim shell` or `sudo torshim connect`.
- `completion bash|zsh|fish`: static scripts with trademark header,
  `bash -n` tested; pwsh export shares the `shellenv` `--shell` path.
- `run --isolate`: per-session circuit separation via random SOCKS
  credentials (torsocks explicit `SOCKS5Username/Password` replacing
  `IsolatePID` on Linux; `user:pass@` inside the socks5h URL elsewhere).
  `GETCONF SocksPort` at launch confirms the endpoint configuration
  (flags on the listener), which cannot by itself prove client-side
  credential emission; when isolation cannot be confirmed end to end,
  status reports `degraded` and `run` warns instead of claiming
  isolation (honesty fallback is the primary control, not the GETCONF).
- Structured errors: shared renderer giving every failure a `code` and
  `remediation` in `--json` stderr (`E_NO_TOR`, `E_NO_CONTROL`,
  `E_SHIM_BYPASS`, `E_STALE_STATE`, `E_PLATFORM`, plus GUI codes
  `E_LAUNCH_DEADLINE`, `E_PROFILE_UNSUPPORTED`), text mode unchanged in
  shape.

### Network control and observability

- `bridge add|list|remove`: lines persisted under the state dir,
  validated against shape plus `tor --list-torrc-options` (version
  drift), `UseBridges 1` auto-added when non-empty, PT binary detection
  (`lyrebird`, `obfs4proxy`, `snowflake-client`) failing closed at
  launch with remediation when missing. Regenerate-and-restart splice
  only; never hot-mutate a live bridge list.
- `circuits`: `GETINFO circuit-status` rendered as a table (longnames
  embed `$Fingerprint~Nickname`); `status --watch`: 2 s ticker over
  `traffic/read|written` deltas plus bootstrap percent; ANSI only on
  TTY; `--json` snapshots; observer connections never
  `TAKEOWNERSHIP`.
- `run --set Key=Value` and sugar `--exit {cc}`: routed through the
  existing `managedTorrcKeys` guard (managed key = exit 2 naming the
  offending key), full rendered torrc validated with
  `tor --verify-config` before spawn; `--exit` renders
  `ExitNodes` + `StrictNodes 1` with the documented anonymity-narrowing
  warning.

### System-proxy session backend (macOS/Windows)

`connect --backend proxy` turns a session-scoped system proxy on:
snapshot-first backup under the state dir, idempotent on/off, byte-exact
restore in `disconnect`, `repair` for stale sessions, a verify step that
proves Tor answers before claiming success. macOS: `networksetup`
per active service for SOCKS plus web/secure-web; Windows: `HKCU\...\Internet
Settings` `ProxyEnable`/`ProxyServer` plus WinINET refresh. `status`
reports mode `sysproxy` (never `system-wide`) and never upgrades it to
`protected` without `--verify`. Off-Linux `connect` without
`--backend proxy` keeps today's honest exit 4; `--backend proxy` on
Linux is exit 4 with a pointer to the transparent backends. The same
session machinery is what lets the GUI profile cover system-proxy-only
apps (Safari, WinINET-respecting desktop apps) on those OSes, closing
the last cells of the browser matrix where app-native injection cannot
reach.

### Verification and public surface

Per-OS real-user passes (`test-linux`, `test-macos`, `test-windows`)
exercise every command, flag, mode, and error path natively after each
phase, with real GUI applications in the GUI phase. The final phase
unifies docs (README, `docs/`, man page, help epilogs) into one product
view and refreshes the public site (`tor-cli/index.html`, root README,
landing card) with live transcripts of `doctor`, `-v` runs,
`status --verify`, and `circuits`, only after CLI and per-OS testing are
final (Owner ordering), followed by a Curator polish pass.

## CLI surface contract (additive)

| Surface | Phase | Exit contract |
|---|---|---|
| global `-v/-vv/-vvv/-q`, `--log-level`, `--log-file` | Phase 1: Diagnostics and Honesty Surface | unchanged (verbosity purity, G5) |
| `doctor [--deep] [--json]` | Phase 1: Diagnostics and Honesty Surface | 0 pass, 1 any failed, 2 usage |
| `status --verify [--check-url]` | Phase 1: Diagnostics and Honesty Surface | 0 protected, 1 degraded/unverified (plain `status` still always 0) |
| subcommand `--help` | Phase 1: Diagnostics and Honesty Surface | 0 (flag-set paths were 2; new contract test added in-PR) |
| `torshim <gui-app>` supervised | Phase 2: GUI-Safe Application Launch | child's code; 130 interrupt; 3 not ready; bounded always |
| `newnym [--json]` | Phase 3: Workflow Verbs and Shell Integration | 0, 1 runtime, 2 usage, 3 no verified control |
| `shellenv [--shell S]` | Phase 3: Workflow Verbs and Shell Integration | 0, 2, 3 no active endpoint |
| `completion bash\|zsh\|fish` | Phase 3: Workflow Verbs and Shell Integration | 0, 2 |
| `run --isolate` | Phase 3: Workflow Verbs and Shell Integration | unchanged from `run` |
| structured error `--json` stderr | Phase 3: Workflow Verbs and Shell Integration | code preserved |
| `bridge add\|list\|remove` | Phase 4: Network Control and Observability | 0, 2, 3 at launch, 1 runtime |
| `circuits [--json]`, `status --watch [--json]` | Phase 4: Network Control and Observability | 0, 2, 3 without control |
| `run --set K=V`, `run --exit CC` | Phase 4: Network Control and Observability | 0, 2 (managed key or bad shape), plus inherited `run` codes 1 and 3 |
| `connect --backend proxy` | Phase 5: System-Proxy Session Backend | 0, 1, 2, 3 verify fail, 4 unsupported OS |

Every new surface carries the trademark line, the exit-code table in
help, an entry in the extended `isCommand` dispatch table (new verbs
must be registered there or the bare-app path would swallow them), and
per-OS honest test branches so the CI skip list never grows.

## Module breakdown

```
tor-cli/
  go.mod                  # stdlib only (G1, binding)
  main.go                 # dispatch, isCommand registry for new verbs,
                          # global flag pre-scan, exit codes
  internal/diag/          # Level/Stage/Record, leveled logger, TTY color,
                          # file tee, TORSOCKS_LOG_LEVEL mapping, verdict lines
  internal/doctor/        # 11 read-only checks, --deep, --json render
  internal/probe/         # socks5h HTTP client, IsTor verdict engine
  internal/launch/        # Supervisor: process groups, signal forwarding,
                          # stdio policy, grace teardown, bounded waits
  internal/profile/       # deterministic target profiles: cli|desktop,
                          # per-OS rules (torsocks conf, chromium flag,
                          # firefox managed profile), coverage notes
  internal/errcode/       # structured error codes + remediation renderer
  internal/bridge/        # store, validation, PT detection, torrc splice
  internal/observe/       # circuits table, --watch ticker, JSON snapshots
  internal/sysproxy/      # session snapshot/set/restore: networksetup (macOS),
                          # HKCU registry + WinINET refresh (Windows)
  internal/completion/    # static bash/zsh/fish scripts, trademark headers
  internal/control/       # existing client; Signal() now called by newnym
  internal/status/        # additive JSON keys, verdict field, watch hook
  internal/perapp/        # torsocks/proxy-env engines extended: profile-driven
                          # conf variants (desktop, isolate creds)
  internal/lifecycle/     # extended: ExtraTorrc splice for bridges/--set,
                          # verify-config pre-spawn hook, deadline plumbing
  internal/shell/         # shellenv feeds from the shell env contract
  tests/                  # per-phase black-box suites, verbose parity runs
  docs/  torshim.1        # unified docs refresh in the final phase
```

Key types: `diag.Record{Time, Level, Stage, Msg}`;
`doctor.Check{ID, OK, Severity, Detail, Remediation}`;
`probe.Verdict` in `{protected, degraded, unverified}`;
`launch.Supervisor{Grace, childPgid, done chan}`;
`profile.Profile{Kind, ExtraArgs, Conf, Stdio, Env, Coverage}`;
`errcode.Error{Code, Message, Remediation, Exit}`;
`bridge.Entry{Line, Transport, AddedAt}`;
`observe.Circuit{Fingerprint, Nick, State, Path}`;
`sysproxy.Session{Backend, StateDir, Prior}`.

Complexity: log level check O(1) before formatting; doctor O(11 bounded
dials); watch O(circuits) per tick; status bounded by G4 deadlines;
bridge validation O(lines); no hot loops, no reflection, no codegen.

## Binding gates (baselines, budgets, honesty)

Inherited verbatim from research 14 and 18: G1 stdlib-only; G2 static
linux/amd64 binary grows at most 15 percent over 0.4.0 (recorded before
and after in `.github/agents/decisions/builder/`); G3 wrapper overhead at most 50 ms
p95 pre-spawn, `help`/`version` at most 50 ms; G4 `status` at most 1 s
(tor absent) and 2 s (dead control endpoint); G5 verbosity purity (full
suite green with `-vv` and `--log-level trace` injected, byte-identical
exit codes and JSON, one documented exception: trace may add
`Log debug file` to the private torrc); G6 honesty invariants; G7 tri-OS
black-box tests with per-OS honest branches and per-OS real-user passes;
G8 Reviewer approve + Tester live-run evidence + Evaluator at least 9.8.

Baselines B1 torsocks 2.5.0, B2 proxychains-ng 4.17, B3 nyx 2.1.0, B4
mullvad CLI, B5 modern CLI conventions: every feature claim is compared
under matched budgets (same machine, same tor, same network, same
script; bootstrap excluded from overhead numbers).

Anti-gates: no "faster than X", "leak-proof", "works with every app",
or off-Linux "system-wide" claims without measured evidence. Carried
rejections (binding): no UDP/WebSocket/QUIC implications; no
LD_PRELOAD/DYLD/LSP product paths off-Linux; no "kill switch" wording
(only the honest `--require-tor` pre-flight vocabulary); no silent
fallbacks; control port never exposed to children; no auto-downloaded
tor binary; no telemetry or third-party frameworks; no implementing Tor.

## Test matrix

- Verbose parity: the entire existing suite run twice (default and
  `-vv`) asserting identical exit codes and JSON payloads; golden tests
  for log-line grammar and terminal verdict lines (timestamps excluded).
- Doctor: hermetic fake control/SOCKS listeners for pass, fail,
  timeout; `--json` schema test; state dir byte-identical after run
  (never mutates).
- `status --verify`: fake endpoint returning `IsTor:true`,
  `IsTor:false`, unreachable; verdict table test; no network in CI via
  `--check-url`.
- Supervisor: hermetic child scripts asserting process-group creation,
  INT/TERM/HUP forwarding, grace-then-KILL ordering, tor stop after
  child reap, exit-code propagation, stdin-from-/dev/null under
  non-TTY, no zombie left; Windows console-event equivalents.
- Desktop profiles: golden torsocks conf per profile; chromium flag
  injection only when absent; firefox managed-profile prefs rendered
  and cleaned up; live per-OS browser probe with `IsTor:true` evidence
  (real-user testers, recorded).
- Workflow: fake control server asserting exactly one `SIGNAL NEWNYM`;
  `shellenv` side-effect free; `completion` passes `bash -n`;
  `--isolate` creds present in conf/URL with coverage note preserved.
- Bridge: managed-key rejection, malformed line rejection, missing PT
  binary fail-closed, rendered torrc passes `tor --verify-config`.
- System proxy: snapshot/restore round-trip hermetic tests mirroring
  the Linux syswide fake-runner discipline; off-Linux default `connect`
  still exits 4; `repair` clears stale sessions.
- Performance ledger: G2 size plus G3/G4 timings before/after in
  `.github/agents/decisions/builder/`.
- Per-OS real-user: every new command, flag, mode, and error path run
  natively on ubuntu, macOS, Windows; GUI apps exercised for real.

## Phased delivery (one vertical PR per phase, `Refs #387`)

- **Phase 1: Diagnostics and Honesty Surface**: verbosity system,
  `doctor` (+`--deep`, `--json`), `status --verify`, `--help` exit
  fix. (PR 1 target, Refs #387)
- **Phase 2: GUI-Safe Application Launch**: launch supervisor (process
  groups, signal forwarding, ordered teardown), bounded-wait invariant,
  diagnosis harness proving H1-H6 with real apps, desktop torsocks
  profile on Linux, chromium/firefox injection on macOS and Windows,
  GUI test matrix + coverage docs. (PR 2 target, Refs #387)
- **Phase 3: Workflow Verbs and Shell Integration**: `newnym`,
  `shellenv`, `completion`, `--isolate`, structured errors. (PR 3
  target, Refs #387)
- **Phase 4: Network Control and Observability**: `bridge add|list|remove`,
  `circuits`, `status --watch`, `--set`/`--exit`. (PR 4 target, Refs #387)
- **Phase 5: System-Proxy Session Backend**: `internal/sysproxy` core,
  macOS and Windows backends, `connect --backend proxy` wiring,
  snapshot/restore/repair, `status` mode `sysproxy` honesty, GUI
  coverage upgrade for system-proxy-only apps. (PR 5 target, Refs #387)
- **Phase 6: Per-OS Verification and Website Refresh**: consolidated
  `test-linux`/`test-macos`/`test-windows` campaign over every command,
  flag, and workflow, tri-OS CI green with zero new skips, performance
  ledger, unified docs/man/README, `tor-cli/index.html` + landing
  refresh with live transcripts, Evaluator at least 9.8. (Final PR,
  Refs #387: the epic issue is already closed, so the final PR also
  carries `Refs #387`)

Ordering rules (binding): each phase PR is reviewed, tested, and
per-OS-verified before the next phase starts; the website is updated
only after the CLI and per-OS testing are final (Owner ordering), then
the Curator does a polish pass; no phase adds a module dependency.

Anti-facade: every flag and command above maps to a working engine in
the same PR that declares it. No placeholder browser coverage rows, no
"coming soon" help text, no `doctor` check that prints `ok` without
probing, no `--watch` that prints static data. Deferred research items
(HTTPTunnelPort, `torshim open`, tun2socks off-Linux, Arti RPC, Windows
`--service install`, nyx-style dashboard, config file) stay out of every
CLI surface until a later blueprint earns them.

- the Architect
