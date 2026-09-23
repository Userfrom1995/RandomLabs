# torshim threat model (M3)

Unofficial frontend. Not sponsored by The Tor Project. `Tor` is a
registered mark of The Tor Project.

## What torshim protects against

- Clearnet leaks by local applications: per-app mode confines one app
  behind the torsocks shim; system-wide mode (`connect`) captures all
  TCP and port-53 UDP at the kernel and redirects them into a private
  tor instance. Anything that cannot be routed through Tor is rejected
  (filter tail REJECT), never silently passed.
- DNS leaks: per-app DNS goes through Tor SOCKS5 hostname resolution;
  system-wide DNS is captured by REDIRECT to the Tor DNSPort, which
  answers A/AAAA/PTR through the circuit. `/etc/resolv.conf` is never
  rewritten (REDIRECT-only), so DHCP cannot clobber the capture.
- False protection claims: every command fails closed. `run`/`shell`
  refuse to start without a bootstrapped tor (exit 3). `connect`
  applies no rule until tor reports bootstrap 100% + done + a live
  circuit, then gates on a five-row verify suite (tor-ready,
  rules-present, transport-open, dns-alive, resolv-untouched) and rolls
  back on any failure. `status` reports `protected: false` for every
  state it cannot positively confirm (absent, unknown, bootstrapping,
  stale session, foreign control without cookie).

## What torshim does NOT protect against

- A hostile local network observer still sees Tor-shaped traffic (that
  you use Tor is not hidden; use bridges/pluggable transports for that,
  via torrc passthrough).
- Malware or rootkits on the host, malicious applications that
  re-execute themselves outside the shim, and anything running before
  `connect` with live clearnet flows on IPv4 (flows die on their next
  packet once rules land, but packets already sent are sent).
- Static binaries, setuid tools, raw syscalls, `res_*` direct DNS, and
  hand-rolled UDP under per-app mode: refused up front with an error
  pointing at system-wide mode.
- Browser fingerprinting, application-layer identity (cookies, logins),
  and exit-node observation of unencrypted protocols: use Tor Browser
  and HTTPS for those.
- Traffic correlation by a global passive adversary: outside any
  client wrapper's scope.

## Trust boundaries

- The private tor daemon is trusted (stock `tor` from the distro).
  torshim never implements Tor and never patches its crypto.
- The firewall (iptables/nft) is trusted to enforce REDIRECT/REJECT
  once installed; `connect` verifies presence, not kernel integrity.
- The unprivileged tor user (`tor`, `debian-tor`, `_tor`, `nobody`)
  bounds a tor compromise: the owner-UID exemption covers exactly that
  UID, and the DataDirectory is chowned to it. torshim itself runs as
  root during connect/disconnect/repair and is therefore fully trusted.
- Backup dumps under the session state dir are trusted to be the true
  pre-connect state (written by root seconds before mutation).

## Abuse resistance

- `connect` refuses non-root, refuses a root tor identity, refuses a
  taken TransPort, and refuses unknown backends: all fail closed.
- `disconnect` stops tor before removing rules (redirects blackhole
  instead of leaking), restores the firewall byte-exact from the
  snapshot, and post-verifies that no torshim rules remain.
- `repair` only ever removes torshim-named chains/tables/jumps and
  drops dead session records; it never flushes foreign rules.
