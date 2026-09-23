# torshim - Lightweight Cross-Platform Tor Wrapper (Blueprint)

Date: 2026-09-23. Issue: #387. Research: `tor-cli/docs/research.md` (M1, Dr. Mob).
Track: End-User Product (CLI tool). Language: Go. Binary: `torshim` (fallback `tormux`).

## Summary

`torshim` makes Tor usage trivial: `torshim <app>`, `torshim shell`,
`sudo torshim connect`, `torshim disconnect`, `torshim status`, `torshim version`.
It never implements Tor itself; it automates the existing `tor` daemon:
private instance lifecycle (own vs foreign), readiness gating, per-app
isolation (torsocks on Linux, `socks5h` env elsewhere), child-shell isolation,
and system-wide routing (iptables/nft on Linux; tun2socks elsewhere).
Fail-closed everywhere; `status` never claims protected when not.

Trademark note (binding): `tor*` prefix is Tor-Project-sensitive. Every surface
carries "unofficial, not sponsored by The Tor Project", README links
torproject.org, contact trademarks@torproject.org before productizing.

## Deliverables

- Single static Go binary `torshim` (`CGO_ENABLED=0`, 5-15 ms startup),
  cross-compiled linux/darwin/windows (amd64+arm64).
- Commands: `<app>`, `shell`, `connect`, `disconnect`, `status`, `version`
  (plus `repair` helper from M3 on).
- `tor-cli/docs/`: research.md (done), threat-model.md, limitations.md,
  reproducibility.md, man page.
- `progress/387-tor-cli.md` epic tracker (this blueprint's companion).
- CI matrix linux/macos/windows.

## Why

Existing Tor tooling forces users to learn torrc, ports, control auth, DNS
leak discipline, and per-OS firewalling. torshim collapses that to one binary
with safe defaults and honest failure. No heavy runtime, no daemon to install.

## How It Works

Lifecycle state machine (binding): ABSENT -> STARTING -> BOOTSTRAPPING ->
READY -> STOPPING -> ABSENT, plus FOREIGN (reused, never owned/killed).

- Detect: probe 127.0.0.1:9050/9150 SOCKS5 handshake + 9051/9151 PROTOCOLINFO;
  pid-file check; cookie auth (`AUTHENTICATE <hex>`; 515 = foreign).
- Launch (absent): `tor -f <generated-torrc>` with private `mkdtemp`
  DataDirectory, `127.0.0.1:auto` Socks/Control/DNS ports + `*WriteToFile`,
  `CookieAuthentication 1`, `__OwningControllerProcess <pid>` then
  `TAKEOWNERSHIP` + `RESETCONF __OwningControllerProcess`. Exactly one
  owning control connection; close-first shutdown (5 s grace, SIGTERM,
  SIGKILL). Non-blocking flock pre-flight on `<dir>/lock`.
- Readiness (binding): bootstrap `PROGRESS=100` + `TAG=done` AND
  `status/circuit-established == 1` (or BUILT circuit), poll 250-500 ms,
  120 s timeout, optional live `check.torproject.org/api/ip` fetch.
  Timeout surfaces last `WARN BOOTSTRAP REASON=`.
- Per-app Linux: exec with torsocks `LD_PRELOAD` + generated conf
  (`TorAddress/Port`, `OnionAddrRange 127.42.42.0/24`, `IsolatePID 1`,
  `AllowInbound 0`, `AllowOutboundLocalhost 0`); static-binary guard:
  detect non-ELF/static targets and refuse with redirect to transparent
  mode instead of silent bypass. proxychains-ng only for explicit
  `--chain` multi-hop mode (`strict_chain`, `proxy_dns`, `remote_dns_subnet
  224`, `socks5 127.0.0.1 <port>`).
- Per-app macOS/Windows: no DYLD/LSP shims in product path; export
  `ALL_PROXY=socks5h://...`, `HTTP(S)_PROXY`, app SOCKS config;
  banner states coverage gaps.
- Shell: child `$SHELL` (else `/bin/sh`; Windows `%COMSPEC%`) with
  preload (Linux) or proxy env, `TORSHIM_ACTIVE=1`, `[torshim]` PS1,
  coverage banner; parent untouched; exit drops protection.
- System-wide: snapshot-first (timestamped backup dir), fail-closed
  ordering, verification suite gates `connect`, byte-exact restore gates
  `disconnect`. Linux: iptables/nft REDIRECT to TransPort/DNSPort with
  owner-UID exempt, filter REJECT tail, v6 mirror-or-block. macOS:
  tun2socks preferred (pf route-to+rdr documented fragile fallback).
  Windows: wintun + tun2socks to SocksPort. Idempotence keys
  (`torshim-*`, `org.torshim`, GUID snapshots); `--force` for foreign
  rules; never bare-flush; reboot-safe default (ephemeral unless
  explicit opt-in persist + `repair`).
- DNS/IPv6: DNS always via Tor (torsocks RESOLVE / DNSPort A-AAAA-PTR
  only); v6 mirrored or blocked; `dig @8.8.8.8`, AAAA, `nc -u`, `ping`
  checks gate `connect`.

## Module Breakdown

```
tor-cli/
  go.mod (stdlib only; tun/WFP deps only when M3+ needs them)
  main.go               # cobra-free flag dispatch (stdlib `flag`), exit codes
  internal/lifecycle/   # detect/probe, torrc gen, spawn, own/takeownership,
                        # readiness poll+events, stop (own vs foreign)
  internal/control/     # control-protocol v1 client: PROTOCOLINFO, AUTH,
                        # GETINFO, SIGNAL, SETEVENTS, MAPADDRESS/RESOLVE
  internal/perapp/      # torsocks conf gen + exec; static-binary guard;
                        # proxychains --chain mode; socks5h env (darwin/win)
  internal/shell/       # child shell spawn, PS1/banner, env markers
  internal/syswide/     # linux.go (iptables/nft), darwin.go (tun/pf),
                        # windows.go (wintun/tun2socks); backup/restore,
                        # idempotence, verify suite, repair
  internal/dns/         # leak checks: dig/nc/ping via helpers, AAAA
  internal/status/      # state aggregator: absent/bootstrapping/ready/
                        # foreign/stale-backup; never-unknown-as-protected
  internal/version/     # wrapper + tor + backend versions
  docs/                 # research.md + threat-model + limitations +
                        # reproducibility + torshim.1 man page
```

Data structures: `Instance{DataDir, SocksPort, ControlPort, DNSPort,
TransPort, Pid, Owned bool, CookiePath}`; `BootstrapState{Progress int,
Tag string, CircuitEstablished bool}`; `Backup{Dir, Timestamp, FirewallDump,
DNSState, ServiceState}`; `StatusReport{Running, Bootstrap, Circuit,
Mode, Ports, LeakSummary}`. State machine as explicit enum + transitions.
Complexity: control poll O(1) per tick; verify suite O(ports + checks).

Visual/CLI spec: `--help` + man page; `status` human + `--json`;
coverage banner on `shell`; `connect` prints backup dir + verify table.
No GUI; demo layer = `docs/demo.sh` scripted transcript (M4).

## Test Matrix (for Tester/Evaluator)

- Command mode: `check.torproject.org/api/ip` via instance SOCKS +
  control GETINFO; fail-closed nonzero exit when Tor down.
- Shell: child inherits env, parent unaffected, banner present.
- Lifecycle: launch-if-absent, reuse-if-present (foreign never killed),
  readiness timeout, Ctrl-C/SIGTERM cleanup (no owned tor left; foreign
  untouched), stale-lock handling.
- DNS: no leak (SOCKS resolve + DNSPort; `dig @8.8.8.8` never clearnet
  under connect; AAAA included). v6 mirrored or blocked.
- connect/disconnect: byte-exact backup/restore; double-connect and
  double-disconnect idempotent; reboot-safe default; `repair` clears stale.
- status/version accurate across absent/bootstrapping/ready/foreign/
  stale-backup.
- CI linux/macos/windows with timeouts/mocks + documented skips where
  the OS denies transparent routing.

## Milestones (Architect owns progress/387-tor-cli.md)

- M1 Research + Architecture: DONE (research.md + this blueprint). Refs #387.
- M2 Per-app + shell on Linux: lifecycle + control client, readiness,
  torsocks exec + static guard, shell + banner, status/version v1,
  fail-closed + DNS + lifecycle tests. (PR, Refs #387)
- M3 System-wide Linux connect/disconnect: iptables + nft backends,
  backup/restore, idempotence, reboot-safety, verify suite, repair.
  (PR, Refs #387)
- M4 Cross-platform + polish: darwin/windows per-app + shell + tun
  paths, limitations doc, packaging, man/help, demo script. (PR, Refs #387)
- M5 Hardening + tri-OS CI: full matrix, fuzz/edge (stale locks,
  foreign tor, scrubbed env), docs complete. Final PR Closes #387
  only on all gates green.

Anti-facade: no `connect` stub on macOS/Windows before its backend
lands; omit the flag path entirely until real. No "coming soon" buttons.

- the Architect
