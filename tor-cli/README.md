# torshim - lightweight launcher for the Tor network (unofficial, not sponsored by The Tor Project)

Trademark note: `Tor` is a registered mark of The Tor Project. torshim is an
unofficial wrapper and is not sponsored or endorsed by The Tor Project. See
https://www.torproject.org/ and contact trademarks@torproject.org before
productizing anything under a `tor*` name.

## What it is

torshim automates the existing `tor` daemon. It never implements Tor itself.
It ships per-app routing and isolated shells on Linux (torsocks shim,
fail-closed), system-wide routing on Linux (iptables/nft, snapshot-first,
verify-gated), per-app + shell on macOS and Windows via proxy environment,
diagnostics with machine-readable proofs, packaging (Makefile + man page),
and hardening (session lock, torrc managed-key guard, parser fuzz, tri-OS CI):

```sh
torshim run -- curl --socks5-hostname 127.0.0.1:9050 https://check.torproject.org/api/ip
torshim curl https://example.com     # bare form = run
torshim shell                        # child shell routed through Tor
sudo torshim connect [--backend auto|iptables|nft] [--tor-user USER]
torshim disconnect                   # byte-exact restore (needs sudo when a session exists)
torshim repair                       # clear stale rules/state (needs sudo)
torshim status [--json] [--verify [--check-url URL]]
                                     # --verify: live egress proof; exit 0 iff verdict protected
torshim doctor [--deep] [--json]     # read-only environment diagnostics
torshim version
```

Exit codes everywhere: 0 success (for `status --verify`: verdict
`protected`), 1 runtime failure (for `status --verify`: `degraded` or
`unverified`), 2 usage error, 3 tor not ready (fail-closed), 4 feature
unavailable on this platform.

## Diagnostics

Every command takes `-v` (info), `-vv` (debug), `-vvv` (trace), `-q`
(errors only), plus `--log-level quiet|error|warn|info|debug|trace` and
`--log-file FILE`. Diagnostics go to stderr with the line grammar
`HH:MM:SS.mmm LEVEL stage: message`; stdout stays payload-only (`--json`
drops the level to warnings unless logging was configured explicitly).
With `-v`, terminal runs end in a bare verdict line: `torshim: ready
mode=... mechanism=... ...` on success, `torshim: NOT protected
reason=<cause> remediation=<action>` on failure. `doctor` runs ten
baseline checks (binary, mechanism, control, bootstrap, SOCKS, ports,
session state, environment, bridges, platform coverage); `--deep` adds a
live IsTor probe, IPv6 posture, and clock sanity. It never mutates state
and never uses the word "protected".

System-wide mode launches a private tor with a transparent proxy
(TransPort 9040) under an unprivileged user, snapshots the firewall plus
resolv.conf state, installs iptables or nft capture rules (TCP + DNS to
Tor, everything else rejected, IPv6 blocked for the session), and gates
on a five-row verify suite with automatic rollback. `disconnect` stops
tor first (redirects blackhole instead of leaking), replays the snapshot
byte-exact, and post-verifies. Concurrent connect/disconnect/repair runs serialize on a
session lock (stale locks reaped, live holders fail closed). macOS/Windows system-wide
stays an honest exit-4 refusal (no tun2socks backend shipped; per-app + shell work there).

## How it works

- Lifecycle: private `mkdtemp` DataDirectory, `127.0.0.1:auto` Socks/Control/
  DNS ports with `*WriteToFile` readback, cookie auth, spawn with
  `__OwningControllerProcess` then `TAKEOWNERSHIP` + `RESETCONF`, so a crash
  exits the owned tor instead of orphaning it. Shutdown is close-first, then
  SIGTERM (5 s grace), then SIGKILL. Foreign instances are reused, never killed.
  torrc passthrough lines overriding a torshim-managed key (listeners,
  identity, daemon behavior, `Include`) are rejected up front:
  bridge/pluggable-transport lines keep working.
- Readiness (binding): bootstrap `PROGRESS=100` + `TAG=done` AND
  `status/circuit-established == 1`, polled, 120 s default timeout.
- Verification (`status --verify`): through the exact configured
  `socks5h` endpoint - handshake, readiness gates, then a live fetch of
  `https://check.torproject.org/api/ip` (URL overridable via
  `--check-url`) - mapping to `protected`, `degraded`, or `unverified`
  with a failed-check reason. The whole report is built inside a 1.5 s
  wall-clock budget so a dead control endpoint cannot stall it past 2 s.
- Per-app (Linux): exec under the torsocks `LD_PRELOAD` shim with a generated
  fail-closed profile (`IsolatePID 1`, `AllowInbound 0`,
  `AllowOutboundLocalhost 0`). Static binaries, non-ELF executables, and
  setuid/setgid files are refused: they would silently bypass the shim.
- Per-app (macOS/Windows): exec with `socks5h://` proxy environment
  (all six `*_PROXY` keys, parent duplicates scrubbed). Only apps honoring
  proxy env are covered; every launch prints the coverage note. No DYLD
  shim by decision (SIP would strip it silently).
- Shell: child `$SHELL` (else `/bin/sh`) with the shim env, `TORSHIM_ACTIVE=1`,
  `[torshim]` prompt prefix, and a coverage banner. Parent shell untouched.

## Build, test, install

```sh
cd tor-cli
make build   # CGO_ENABLED=0 static binary ./torshim
make test    # go test ./...
make vet     # go vet ./...
make cross   # compile-check linux/darwin/windows (amd64+arm64)
sudo make install  # -> /usr/local/bin/torshim + torshim.1
```

Man page: `man ./torshim.1` (or `man torshim` after install).

## Layout

- `main.go` - cobra-free flag dispatch, exit codes (0 ok, 1 runtime
  error or verify verdict not protected, 2 usage, 3 tor-not-ready
  fail-closed, 4 platform unavailable), `--help` exits 0 with the
  exit-code table on every command.
- `internal/control/` - control-protocol v1 client + readiness parsing.
- `internal/lifecycle/` - torrc gen, launch, readiness wait, detect, stop;
  fixed TransPort, RunAs setuid, TempParent scoping, and per-OS
  spawn/signal shims (linux/darwin/windows all compile).
- `internal/perapp/` - torsocks conf/exec + static-binary guard (Linux);
  socks5h proxy-env backend with coverage note (macOS/Windows).
- `internal/shell/` - child shell + coverage banner (shim on Linux,
  proxy env elsewhere).
- `internal/syswide/` - system-wide: iptables + nft backends, state,
  snapshot/restore, verify suite, connect/disconnect/repair, status probe.
- `internal/status/` - state aggregator (absent/unknown never protected;
  folds in the system session, `mode: system` only on state + rules;
  bounded 1.5 s collect budget; additive JSON verdict fields under
  `--verify`).
- `internal/diag/` - verbosity levels, flag pre-scan, log-line grammar,
  log-file tee, `TORSOCKS_LOG_LEVEL` mapping.
- `internal/doctor/` - read-only environment diagnostics (ten baseline
  checks, three deep network checks).
- `internal/probe/` - SOCKS5 handshake/IsTor egress probe and the
  three-state verification verdict.
- `internal/platform_compat/` - platform capability, dependency, and
  sandbox facts shared by doctor and status.
- `internal/version/` - wrapper + tor + torsocks + platform backend versions.
- `docs/` - research spec, threat model, per-OS limitations, reproducibility + test matrix.
- `ci/` - tri-OS GitHub Actions matrix staged for Lab Engineer install (see docs/reproducibility.md).
- `Makefile`, `torshim.1` - build/cross/install + man page.

Requires `tor` at runtime (`apt install tor`). Linux per-app additionally
needs `torsocks`. System-wide additionally needs root plus
`iptables`/`ip6tables` or `nft`.
