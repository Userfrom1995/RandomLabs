# torshim M3 - system-wide Tor on Linux

Date: 2026-09-23. Issue: #387. Epic: `progress/387-tor-cli.md`.
Milestone: M3 (system-wide Linux connect/disconnect). Branch:
`opencode/issue387-tor-cli-m3`, PR references `Refs #387`.

## What was built

`sudo torshim connect` routes the whole Linux system through Tor; `torshim
disconnect` restores the exact pre-connect state; `torshim repair` clears
leftovers from crashed runs. Both firewall families are supported:
iptables/ip6tables (dedicated `torshim-nat`, `torshim-filter`,
`torshim-v6` chains jumped from OUTPUT) and nft (one `inet torshim`
table), selected with `--backend auto|iptables|nft` (`auto` prefers nft).

## How it works

- Ordering is fail-closed both ways. Connect: root gate, backend check,
  tor-user resolve (never root), TransPort free check, firewall snapshot,
  private tor launch with bootstrap wait, state write, rule apply, then a
  five-row verify suite (tor-ready, rules-present, transport-open,
  dns-alive, resolv-untouched). Any failure after mutation rolls back
  (rules out, tor killed, state dropped, backup kept) and exits nonzero.
  Disconnect: tor dies first (surviving redirects blackhole), rules for
  torshim only are removed (never a bare flush), the snapshot replays
  byte-exact, state drops, post-verify confirms no torshim rules remain.
- The system tor runs unprivileged (`tor`, `debian-tor`, `_tor`,
  `nobody`, or `--tor-user`) via setuid/setgid with a chowned
  DataDirectory under the session state dir (`/run/torshim`, tmpfs, so
  reboot equals disconnected). The owner-UID exemption therefore covers
  exactly tor. Fixed TransPort 9040 (flag-overridable); SOCKS, control,
  and DNS ports stay auto with WriteToFile readback.
- DNS is REDIRECT-only: port-53 UDP goes to the Tor DNSPort (A/AAAA/PTR
  through the circuit); `/etc/resolv.conf` is snapshotted but never
  rewritten. IPv6 is blocked for the session (REJECT, loopback and tor
  exempt): no v6 exits in M3. Filter chains carry no ESTABLISHED
  exemption, so pre-existing clearnet flows die on their next packet.
- `status` folds the session in: `mode: system` only when the session
  record and live rules agree; stale records/rules are reported as stale
  notes and never upgrade `protected`. Non-Linux `connect`/`disconnect`/
  `repair` exit 4 with an honest M4 pointer (no stubs).
- Lifecycle gained TransPort torrc lines with stream isolation flags,
  RunAs, and TempParent; spawn/signal/chown shims keep linux, darwin,
  and windows compiling (verified `go build` on all three plus arm64).

## Key files

- `tor-cli/internal/syswide/` - `syswide.go` (state, Runner),
  `iptables.go`, `nft.go`, `backup.go`, `connect.go` (orchestration +
  verify + DNS probe), `probe.go` (status view), `osutil_*.go`,
  `syswide_test.go` (15 hermetic tests: fake stateful Runner for both
  backends, real local UDP server for the DNS path).
- `tor-cli/internal/lifecycle/` - TransPort/RunAs/TempParent plus
  `os_unix.go`, `os_linux.go`, `os_darwin.go`, `os_windows.go`.
- `tor-cli/main.go` - `connect`/`disconnect`/`repair` commands, `--state-dir`
  test hook, exit 3 on verify-gate failure.
- `tor-cli/docs/threat-model.md`, `tor-cli/docs/limitations.md` (new).
- `tor-cli/tests/tester_m2_regression_test.go` - M2 exit-4 assertion
  replaced with the M3 contract (non-root connect/repair demand sudo;
  stateless disconnect is exit-0 idempotent; empty-dir status unprotected).

## Design decisions

- Fixed TransPort over auto: deterministic firewall rules and docs, and
  works on older tor builds without TransPort auto support; collisions
  fail closed with a clear message.
- REDIRECT-only DNS over resolv.conf rewrite: immune to DHCP clobber,
  zero restore risk; drift is snapshotted and warned, never fatal.
- No ESTABLISHED exemption in filter chains (deviation from the
  research sketch toward stricter fail-closed): kills pre-existing
  clearnet flows instead of grandfathering them; documented.
- Disconnect without a session needs no privilege (provably nothing to
  do); every mutating path still gates root first.
- Cross-OS shims now rather than in M4: the M2 tree did not compile on
  darwin/windows, which would have blocked M4 ports at their first build.

## Verification

- `go build`, `go vet`, `go test ./...` green on linux; `go build`
  green for darwin/amd64, windows/amd64, linux/arm64.
- 15 syswide tests + TransPort torrc test + updated black-box contract
  test, all passing with no root, no tor, no iptables required.
- Live firewall/tor coverage (root + tor + real rules + leak checks)
  is M5 CI work with timeouts and documented skips.
