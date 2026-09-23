# torshim - lightweight launcher for the Tor network (unofficial, not sponsored by The Tor Project)

Trademark note: `Tor` is a registered mark of The Tor Project. torshim is an
unofficial wrapper and is not sponsored or endorsed by The Tor Project. See
https://www.torproject.org/ and contact trademarks@torproject.org before
productizing anything under a `tor*` name.

## What it is

torshim automates the existing `tor` daemon. It never implements Tor itself.
M2 covers per-app routing and isolated shells on Linux; M3 (this milestone)
adds system-wide routing on Linux:

```sh
torshim run -- curl --socks5-hostname 127.0.0.1:9050 https://check.torproject.org/api/ip
torshim curl https://example.com     # bare form = run
torshim shell                        # child shell routed through Tor
sudo torshim connect [--backend auto|iptables|nft] [--tor-user USER]
torshim disconnect                   # byte-exact restore (needs sudo when a session exists)
torshim repair                       # clear stale rules/state (needs sudo)
torshim status [--json]              # never claims protected when not
torshim version
```

System-wide mode launches a private tor with a transparent proxy
(TransPort 9040) under an unprivileged user, snapshots the firewall plus
resolv.conf state, installs iptables or nft capture rules (TCP + DNS to
Tor, everything else rejected, IPv6 blocked for the session), and gates
on a five-row verify suite with automatic rollback. `disconnect` stops
tor first (redirects blackhole instead of leaking), replays the snapshot
byte-exact, and post-verifies. macOS/Windows system-wide lands in M4 and
refuses honestly until then.

## How it works

- Lifecycle: private `mkdtemp` DataDirectory, `127.0.0.1:auto` Socks/Control/
  DNS ports with `*WriteToFile` readback, cookie auth, spawn with
  `__OwningControllerProcess` then `TAKEOWNERSHIP` + `RESETCONF`, so a crash
  exits the owned tor instead of orphaning it. Shutdown is close-first, then
  SIGTERM (5 s grace), then SIGKILL. Foreign instances are reused, never killed.
- Readiness (binding): bootstrap `PROGRESS=100` + `TAG=done` AND
  `status/circuit-established == 1`, polled, 120 s default timeout.
- Per-app (Linux): exec under the torsocks `LD_PRELOAD` shim with a generated
  fail-closed profile (`IsolatePID 1`, `AllowInbound 0`,
  `AllowOutboundLocalhost 0`). Static binaries, non-ELF executables, and
  setuid/setgid files are refused: they would silently bypass the shim.
- Shell: child `$SHELL` (else `/bin/sh`) with the shim env, `TORSHIM_ACTIVE=1`,
  `[torshim]` prompt prefix, and a coverage banner. Parent shell untouched.

## Build, test, layout

```sh
cd tor-cli
go build ./...   # stdlib only, CGO_ENABLED=0 for the static binary
go test ./...
go vet ./...
```

- `main.go` - cobra-free flag dispatch, exit codes (0 ok, 1 error, 2 usage,
  3 tor-not-ready fail-closed, 4 later-milestone).
- `internal/control/` - control-protocol v1 client + readiness parsing.
- `internal/lifecycle/` - torrc gen, launch, readiness wait, detect, stop.
  M3 adds fixed TransPort, RunAs setuid, TempParent scoping, and per-OS
  spawn/signal shims (linux/darwin/windows all compile).
- `internal/perapp/` - torsocks conf/exec + static-binary guard.
- `internal/shell/` - child shell + coverage banner.
- `internal/syswide/` - M3 system-wide: iptables + nft backends, state,
  snapshot/restore, verify suite, connect/disconnect/repair, status probe.
- `internal/status/` - state aggregator (absent/unknown never protected;
  folds in the system session, `mode: system` only on state + rules).
- `internal/version/` - wrapper + tor + torsocks versions.
- `docs/` - research spec (M1), threat model (M3), limitations (M3).

Requires `tor` and `torsocks` at runtime (`apt install tor torsocks`).
System-wide additionally needs root plus `iptables`/`ip6tables` or `nft`.

Requires `tor` and `torsocks` installed at runtime (`apt install tor torsocks`).
