# torshim - lightweight launcher for the Tor network (unofficial, not sponsored by The Tor Project)

Trademark note: `Tor` is a registered mark of The Tor Project. torshim is an
unofficial wrapper and is not sponsored or endorsed by The Tor Project. See
https://www.torproject.org/ and contact trademarks@torproject.org before
productizing anything under a `tor*` name.

## What it is

torshim automates the existing `tor` daemon. It never implements Tor itself.
What shipped (0.5.0): per-app routing and isolated
shells on Linux (torsocks shim, fail-closed), system-wide routing on
Linux (iptables/nft, snapshot-first, verify-gated), per-app + shell
on macOS and Windows via proxy environment, packaging (Makefile +
man page), hardening (session lock, torrc managed-key guard,
parser fuzz, tri-OS CI), and a control plane: `-v`/`--verbose`
session diagnostics on every verb, `newnym` circuit rotation with
rate-limit honesty, and a `doctor` health verdict (bootstrap, SOCKS,
DNSPort, exit IP, firewall, IPv6) with `--json`:

```sh
torshim run -- curl --socks5-hostname 127.0.0.1:9050 https://check.torproject.org/api/ip
torshim curl https://example.com     # bare form = run
torshim shell                        # child shell routed through Tor
torshim run -v -- curl https://example.com   # endpoints, circuit, notices tail
torshim run --detach -- firefox      # GUI browsers release the prompt at once (pid reported)
torshim run -- firefox --headless --screenshot https://example.com/  # headless stays on the wait path
torshim newnym                       # rotate circuits without restarting
torshim doctor [--json]              # full health check, exit 0 healthy / 3 not
sudo torshim connect [--backend auto|iptables|nft] [--tor-user USER]
torshim disconnect                   # byte-exact restore (needs sudo when a session exists)
torshim repair                       # clear stale rules/state (needs sudo)
torshim status [--json] [-v]         # never claims protected when not
torshim version [-v]
```

`newnym` and `doctor` address a persistent tor: `--control`, then
`TORSHIM_CONTROL` (exported into every shell child), then the system
session record, then 9051/9151. See `docs/diagnostics.md` for the full
reference and `docs/platforms.md` for the per-OS matrix.

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
  identity, daemon behavior, `Include`) are rejected up front (M5):
  bridge/pluggable-transport lines keep working.
- Readiness (binding): bootstrap `PROGRESS=100` + `TAG=done` AND
  `status/circuit-established == 1`, polled, 120 s default timeout.
- Per-app (Linux): exec under the torsocks `LD_PRELOAD` shim with a generated
  fail-closed profile (`IsolatePID 1`, `AllowInbound 0`,
  `AllowOutboundLocalhost 0`). Static binaries, non-ELF executables, and
  setuid/setgid files are refused: they would silently bypass the shim.
  Supervision splits by target: CLI tools run on the wait path (block to
  exit, signals forwarded to the child process group, exit code passed
  through); GUI browsers (firefox, falkon, chromium, chrome) must take
  the detach path (`run --detach`, optional `--log-file`): the child is
  released into a new session, a bounded alive poll rejects fast
  failures, and the parent prints the PID plus endpoints and exits 0.
  A bare GUI run is refused with detach guidance instead of hanging;
  headless browser runs stay on the wait path like CLI tools.
- Per-app (macOS/Windows, M4): exec with `socks5h://` proxy environment
  (all six `*_PROXY` keys, parent duplicates scrubbed). Only apps honoring
  proxy env are covered; every launch prints the coverage note. No DYLD
  shim by decision (SIP would strip it silently). GUI launches need
  `--detach` plus `--acknowledge-gui-risks` (explicit opt-in to the
  partial proxy contract); detached proxy children carry the same PID
  report and GUI coverage note.
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

- `main.go` - cobra-free flag dispatch, exit codes (0 ok, 1 error, 2 usage,
  3 tor-not-ready fail-closed, 4 later-milestone).
- `internal/control/` - control-protocol v1 client + readiness parsing,
  read-only diagnostics (version, circuits, streams, guards, traffic,
  listeners) + rate-limited NEWNYM.
- `internal/doctor/` - `doctor` verdict: graded pass/fail/skip checks over
  control, bootstrap, circuit, SOCKS, DNSPort, exit-IP egress, firewall,
  IPv6; stub-injectable, stdlib-only probes.
- `internal/lifecycle/` - torrc gen, launch, readiness wait, detect, stop.
  M3 adds fixed TransPort, RunAs setuid, TempParent scoping, and per-OS
  spawn/signal shims (linux/darwin/windows all compile).
- `internal/perapp/` - torsocks conf/exec + static-binary guard (Linux);
  socks5h proxy-env backend with coverage note (macOS/Windows, M4);
  GUI-aware tier (firefox, falkon, chromium, chrome with headless
  bypass) plus the wait/detach supervision split with signal
  forwarding, log-file capture, and bounded alive poll.
- `internal/shell/` - child shell + coverage banner (shim on Linux,
  proxy env elsewhere).
- `internal/syswide/` - M3 system-wide: iptables + nft backends, state,
  snapshot/restore, verify suite, connect/disconnect/repair, status probe.
- `internal/status/` - state aggregator (absent/unknown never protected;
  folds in the system session, `mode: system` only on state + rules).
- `internal/version/` - wrapper + tor + torsocks + platform backend versions.
- `docs/` - research spec, threat model, per-OS limitations, reproducibility + test matrix,
  diagnostics reference, cross-platform notes.
- `ci/` - tri-OS GitHub Actions matrix staged for Lab Engineer install (see docs/reproducibility.md).
- `Makefile`, `torshim.1` - build/cross/install + man page.

Requires `tor` at runtime (`apt install tor`). Linux per-app additionally
needs `torsocks`. System-wide additionally needs root plus
`iptables`/`ip6tables` or `nft`.
