# torshim threat model (M5 final)

Unofficial frontend. Not sponsored by The Tor Project. `Tor` is a
registered mark of The Tor Project.

## M5 delta: concurrency, config injection, parser robustness

- Concurrent mutating operations (two `connect`, `connect` vs
  `disconnect`, `repair` mid-session) used to race on the state dir:
  both could snapshot, both launch tor, both write `active.json`,
  orphaning a tor next to a half-applied firewall. M5 serializes all
  three entry points on a `session.lock` lockfile (pid + timestamp +
  random token). A live holder fails the contender closed with the
  holder pid named; a dead/ancient/corrupt lock is reaped. `Release`
  only deletes a lock holding our own token, so a holder that
  outlives its staleness window can never delete its successor's
  lock. Pinned by `internal/syswide/lock_test.go` (contention,
  stale-pid, ancient, corrupt, foreign-release, goroutine handoff)
  plus entry-point tests (`edge_test.go`: failed contenders leave
  session and holder lock untouched, locks never leak on success or
  rollback).
- torrc passthrough (`ExtraTorrc`, the bridge/pluggable-transport
  path) was appended verbatim: a line like `SocksPort 0.0.0.0:9050`
  or `Include /evil.conf` would add an unsupervised listener or pull
  in arbitrary config outside wrapper supervision. M5 rejects every
  line whose keyword is torshim-managed (listeners, `WriteToFile`
  pointers, identity, daemon behavior, `Include`) in
  `ValidateExtraTorrc`, fails `Launch` closed before creating
  anything, and additionally filters at render time (defense in
  depth). Bridge lines keep working. Pinned by
  `TestValidateExtraTorrcRejectsManagedKeys`,
  `TestGenerateTorrcDropsManagedKeys`, and
  `TestLaunchRejectsManagedExtraBeforeSpawn`.
- The control-protocol parsers ingest bytes from a (possibly foreign
  or malicious) control endpoint. M5 pins them hostile-first:
  `fuzz_test.go` asserts no-panic, determinism, never-Ready-straight-
  from-the-parser, plus a 250k+ exec bounded fuzz run per target in
  CI. A parser that cannot be driven to a false `Ready()` cannot be
  driven to a false "protected".

## M4 delta: proxy-env per-app on macOS/Windows

- The proxy backend covers strictly less than the Linux torsocks
  shim: an app that ignores its environment leaks in full, and the
  wrapper cannot detect that from outside. The mitigation is honesty
  plus scheme choice: `socks5h://` (remote DNS) on all six proxy keys,
  parent-duplicate scrubbing (a stale `ALL_PROXY` would otherwise
  shadow the Tor value), and a coverage note on every launch plus the
  shell banner. `status` semantics are unchanged: a running tor means
  the endpoint is ready, never that any particular app obeys it.
- No `DYLD_INSERT_LIBRARIES` shim exists on macOS by decision, not
  omission: SIP strips it from protected binaries, so a shim would
  report success while covering an unknowable subset. The proxy
  boundary is narrower but knowable.

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
