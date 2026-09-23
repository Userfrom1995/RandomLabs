# torshim per-OS limitations (M4)

Unofficial frontend. Not sponsored by The Tor Project.

## Linux (M3 fully implemented)

- Requires root for `connect` / `disconnect` / `repair`, plus a stock
  `tor` binary and either `iptables`+`ip6tables` or `nft` on PATH
  (`--backend` selects, `auto` prefers nft).
- Needs an unprivileged tor user (`tor`, `debian-tor`, `_tor`, or
  `nobody`, overridable with `--tor-user`). There is no root fallback:
  exempting uid 0 from the redirect would exempt everything.
- While connected: all TCP exits through Tor; DNS (A/AAAA/PTR) resolves
  through Tor; all other UDP, ICMP, and IPv6 are blocked for the
  session. Expect breakage of: VoIP/gaming (UDP), `ping`/`traceroute`
  (ICMP), IPv6-only services, LAN printers/shares by IP, DHCP renewal
  on long sessions, NTP over UDP. This blocking is the fail-closed
  design, not a bug.
- No IPv6 exits in M3: v6 is REJECTed (loopback and tor exempt), never
  routed. v6-capable exits are M4+ work.
- Pre-existing clearnet flows at connect time die on their next packet
  (no ESTABLISHED exemption); packets already sent cannot be unsent.
  Quit sensitive apps before connecting.
- `connect` takes over OUTPUT (jump at position 1). Custom firewall
  managers (firewalld, ufw, docker) may rewrite rules mid-session; the
  verify suite catches a missing jump at connect time, and `repair`
  cleans up afterwards, but mid-session external rewrites are detected
  only on the next `status`/`disconnect`. Stop such managers first.
- Reboot equals disconnected (rules are in-memory, state is under
  `/run`). Reconnect explicitly after boot; nothing persists unless the
  operator builds their own unit file (out of scope for M3).
- Tor DNSPort answers only A/AAAA/PTR. Exotic record types get NOTIMPL
  or empty: correct Tor behavior, documented so it is not filed as a bug.

## macOS (M4: per-app + shell work via proxy env)

- `run` / `<app>` and `shell` work: proxy environment
  (`ALL_PROXY`/`all_proxy`/`HTTP(S)_PROXY` as `socks5h://`, DNS
  resolves exit-side when the app honors it). Every launch prints an
  honest coverage note; the shell prints its coverage banner.
- Coverage gaps (by design, stated on every launch): only apps that
  honor proxy env are covered. GUI apps that ignore the environment,
  raw syscalls, UDP/ICMP, and children that scrub the environment
  (`sudo`, `env -i`) leak. There is deliberately no
  `DYLD_INSERT_LIBRARIES` shim: SIP strips it from system binaries,
  which would make coverage silently partial - worse than an honest
  proxy boundary.
- `torshim version` reports `torsocks: n/a (proxy-env backend ...)`
  instead of a misleading "unknown".
- `connect` / `disconnect` / `repair` exit 4 with an honest pointer:
  system-wide needs a utun + tun2socks path plus per-service DNS
  overrides (fragile `pf route-to` fallback documented in research).
  Tracked for M5.

## Windows (M4: per-app + shell work via proxy env)

- `run` / `<app>` and `shell` work via the same `socks5h` proxy
  environment (PowerShell and most CLI tools honor it; WinINET apps
  pick up the process env). Same coverage gaps as macOS above.
- `connect` / `disconnect` / `repair` exit 4 with an honest pointer:
  system-wide needs a wintun + tun2socks path or an existing WFP
  driver; `netsh advfirewall` cannot redirect, only allow/block.
  Tracked for M5.

## Reproducibility

- `go build ./...` (stdlib only, `CGO_ENABLED=0` for the static
  binary), `go test ./...`, `go vet ./...`, plus
  `GOOS=darwin go build ./...` and `GOOS=windows go build ./...`.
- The syswide suite (`internal/syswide`) is hermetic: a fake Runner
  emulates iptables/nft statefully and a local UDP server stands in
  for the Tor DNSPort. Live firewall/tor coverage needs root + tor and
  runs in M5 CI with timeouts and documented skips.
