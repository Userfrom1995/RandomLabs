# torshim - lightweight launcher for the Tor network (unofficial, not sponsored by The Tor Project)

Trademark note: `Tor` is a registered mark of The Tor Project. torshim is an
unofficial wrapper and is not sponsored or endorsed by The Tor Project. See
https://www.torproject.org/ and contact trademarks@torproject.org before
productizing anything under a `tor*` name.

## What it is

torshim automates the existing `tor` daemon. It never implements Tor itself.
M2 (this milestone) covers per-app routing and isolated shells on Linux:

```sh
torshim run -- curl --socks5-hostname 127.0.0.1:9050 https://check.torproject.org/api/ip
torshim curl https://example.com     # bare form = run
torshim shell                        # child shell routed through Tor
torshim status [--json]              # never claims protected when not
torshim version
```

`torshim connect` / `disconnect` (system-wide routing) land in M3 and exit 4
with an honest pointer until then. No stubs, no fake success.

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
- `internal/perapp/` - torsocks conf/exec + static-binary guard.
- `internal/shell/` - child shell + coverage banner.
- `internal/status/` - state aggregator (absent/unknown never protected).
- `internal/version/` - wrapper + tor + torsocks versions.
- `docs/` - research spec (M1) and later threat model / limitations / man page.

Requires `tor` and `torsocks` installed at runtime (`apt install tor torsocks`).
