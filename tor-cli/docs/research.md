# Tor CLI (torshim) - Research Specification

Status: research complete (original specification plus the 2026-09-24 feature, UX, and landscape survey), handing off to Architect.
Scope: lightweight cross-platform Tor wrapper. Uses the existing Tor client and network; never implements Tor itself.
Issue: #387. Owner directives 2026-09-23 on #42 and 2026-09-24 on #387.
Author: Dr. Mob, the Researcher.

## 0. Naming decision

Primary recommendation: **`torshim`**.

Rationale:

- Registry sweep 2026-09-23 via crates.io, npm, PyPI APIs: `torshim` returns 404 (free) on all three; apt has no hit. `torrun`, `torwrap`, `tormux`, `tor-tool` are also free, but weaker brands (see below).
- `ontor` is rejected: PyPI `ontor 0.4.11` (ontology editor on Owlready2) is a hard collision.
- `torshim` (7 chars, tor-shim) precisely signals a lightweight wrapper, is memorable, and types well.
- Fallback: `tormux` (also clean on all registries; avoids generic `wrap/run/tool`; slight risk of aural confusion with `tmux`).
- Trademark caveat (binding): `Tor` is a registered mark and the Tor Project asks that products not use `Tor` in product or domain names without written permission. Any `tor*` prefix, including `torshim`, is trademark-sensitive. Mitigation required: subtitle every surface with `torshim - lightweight launcher for the Tor network (unofficial, not sponsored by The Tor Project)`, add a README disclaimer with a link to torproject.org, and contact trademarks@torproject.org before productizing. This does not block M2 development under the placeholder name.

This document uses `torshim` as the binary name; `tor-tool` in the issue text refers to the same thing.

## 1. Implementation language recommendation

Primary: **Go**.

- `CGO_ENABLED=0 go build` yields a single static binary per OS/arch; trivial cross compile with `GOOS=linux|darwin|windows`.
- Startup 5 to 15 ms, negligible against Tor bootstrap (tens of seconds). Binary 5 to 15 MB, stdlib only (`os/exec`, `net`, `net/http`, `os/signal`, `encoding/hex`): no runtime dependency.
- Best TUN/WFP library support for the future system-wide path: `wireguard-go/tun/netstack` (userspace gVisor stack), `tailscale/tsnet`, `wintun`, `golang.org/x/sys/windows` for WFP without cgo.
- Alternatives rejected: C (memory safety cost, slow velocity; keep for Tor itself), shell+Python (50 to 150 ms startup, interpreter discovery and venv drift, Stem timeout broken on Windows, fragile on Windows), Rust (excellent but heavy builds, large std-linked binaries, immature WFP bindings, Tokio overkill for spawn-and-proxy). Rust is the alternate only if the team is already Rust-fluent and the wrapper grows into routing itself (Arti ecosystem).

## 2. Tor daemon automation surface

### 2.1 torrc options the wrapper needs

All options settable in torrc or on the CLI as `--Option Value`. CLI overrides torrc. Multi-occurrence list options: CLI entry replaces the torrc list unless prefixed with `+`.

| Option | Values | Default | Wrapper use |
|---|---|---|---|
| `SocksPort` | `[addr:]port\|unix:path\|auto\|0` plus isolation flags | 9050 (localhost-bound even if unconfigured; Tor Browser 9150) | Private instance: `127.0.0.1:auto`; read back via `SocksPortWriteToFile`. Flags: `IsolateClientAddr IsolateSOCKSAuth IsolateClientProtocol IsolateDestPort IsolateDestAddr`, `SafeSocks 1` to reject leaky literal-IP SOCKS use. |
| `DNSPort` | `[addr:]port\|auto` | 0 (disabled). Conventions 9053, 5353, 53 | `127.0.0.1:auto` for DNS-through-Tor. Answers only A, AAAA, PTR anonymously via exit. Pair with `AutomapHostsOnResolve 1` and `VirtualAddrNetworkIPv4 10.192.0.0/10`. |
| `TransPort` | `[addr:]port\|auto` | 0. Convention 9040 | Linux transparent TCP proxy only (with firewall helper). |
| `ControlPort` | `[addr:]port\|unix:path\|auto` | 0. Convention 9051 (Browser 9151) | `127.0.0.1:auto` plus `ControlPortWriteToFile`. Never expose off-loopback. |
| `CookieAuthentication` | 0\|1 | 0 (Debian family default file sets 1) | Set 1 on private instances. Controller proves `DataDirectory/control_auth_cookie` (32 bytes). Use `CookieAuthFile` override and `CookieAuthFileGroupReadable` where needed. |
| `DataDirectory` | DIR | `~/.tor`, `/var/lib/tor`, Windows `%APPDATA%\tor` | Private per-instance temp dir. Never share one DataDirectory between two tor processes (lock contention). |
| `PidFile` | FILE | none (Debian sets `/var/run/tor/tor.pid`) | Wrapper sets its own `<datadir>/tor.pid` for stale detection. |
| `RunAsDaemon` | 0\|1 | 0 | Keep 0; wrapper daemonizes or supervises itself (easier log and child management). Ignored on Windows (use `tor --service`). |
| `Log` | `notice file <path>` or `notice stdout` | none | Private instance: `Log notice stdout` (parse `Bootstrapped 100%`) or `Log notice file <datadir>/notices.log`. |
| `*WriteToFile` | PATH | none | `ControlPortWriteToFile`, `SocksPortWriteToFile`, `DNSPortWriteToFile`, `TransPortWriteToFile`: essential with `auto` ports. |

torrc default locations: `/etc/tor/torrc` else `$HOME/.torrc` (Linux); Homebrew macOS `/usr/local/etc/tor/torrc` (Apple Silicon `/opt/homebrew/etc/tor/torrc`); Windows `%APPDATA%\tor\torrc`; Tor Browser `Browser/TorBrowser/Data/Tor/torrc`.

### 2.2 Control protocol v1 (control-spec.txt)

TCP (usually 127.0.0.1:9051) or Unix socket. Line protocol, commands case-insensitive, keywords case-sensitive. Success `250 OK`; async events `650 <EVENT> ...`. Before auth only `PROTOCOLINFO`, `AUTHCHALLENGE`, `AUTHENTICATE`, `QUIT` are legal.

Discovery:

```
PROTOCOLINFO
-> 250-AUTH METHODS=COOKIE,SAFECOOKIE,HASHEDPASSWORD COOKIEFILE="/path/control_auth_cookie"
   250-VERSION Tor="0.4.8.x"
   250 OK
```

Auth: `AUTHENTICATE <hex-of-32-byte-cookie>` (or quoted password; bare `AUTHENTICATE` when no auth configured). `515` means bad auth: treat as foreign instance, never kill, spawn own.

Status queries (post-auth):

```
GETINFO status/bootstrap-phase
-> 250-status/bootstrap-phase=NOTICE BOOTSTRAP PROGRESS=100 TAG=done SUMMARY="Done"

GETINFO status/circuit-established   (expect 1 when usable)
GETINFO circuit-status               (look for a BUILT line, PURPOSE=GENERAL)
GETINFO net/listeners/socks|control|dns|trans
GETINFO process/pid version config-file
GETINFO status/enough-dir-info network-liveness traffic/read traffic/written uptime
```

Signals: `SIGNAL NEWNYM` (new circuits for new streams, rate limited about 10 s), `SIGNAL CLEARDNSCACHE`, `SIGNAL HALT/SHUTDOWN` (teardown owned instance only), plus `SETCONF/GETCONF/RESETCONF`, `MAPADDRESS`, `RESOLVE`.

Events: `SETEVENTS STATUS_CLIENT CIRC` then wait for `650 STATUS_CLIENT NOTICE BOOTSTRAP PROGRESS=100 TAG=done` and optionally `650 CIRC ... BUILT ... PURPOSE=GENERAL`. On attach, always reconcile with `GETINFO status/bootstrap-phase` (spec recommendation). Tags and percentages are not stable across versions; only `starting` and `done` are guaranteed. Parse `PROGRESS=` numerically, match `TAG=done`, never hardcode the full sequence.

### 2.3 Readiness recipe (binding)

Ready = bootstrap 100 percent AND a usable circuit. Poll every 250 to 500 ms with a hard timeout (default 120 s; first bootstrap often about 50 s), or subscribe to events with poll as fallback:

1. `GETINFO status/bootstrap-phase`: done when `PROGRESS=100` and `TAG=done`.
2. `GETINFO status/circuit-established == 1` (or `circuit-status` contains `BUILT`). Guards the edge where progress sticks at 100 with no circuit yet.
3. Optional definitive liveness: SOCKS fetch of `https://check.torproject.org/api/ip` through the instance SOCKS port.

Timeout surfaces the last `WARN BOOTSTRAP ... REASON=...` to the user. Never report protected before all gates pass.

### 2.4 Detect and reuse already-running Tor

Order cheap to authoritative:

1. Probe default SOCKS (127.0.0.1:9050; Browser 9150) with a SOCKS5 handshake, and control (127.0.0.1:9051; Browser 9151) with `PROTOCOLINFO`. TCP connect alone proves nothing; verify protocol.
2. Pid file if the wrapper set one; verify PID alive and cmdline is tor.
3. Control cookie: `<DataDirectory>/control_auth_cookie` (Debian `/var/run/tor/control.authcookie`, or `CookieAuthFile` path). If control answers and `AUTHENTICATE <cookie-hex>` gives `250 OK`, it is reusable; then `GETINFO process/pid version config-file status/bootstrap-phase`.
4. Reuse policy: reuse only if bootstrap is done and the ports offered match needs; else launch a private instance (`tor -f <generated-torrc> --DataDirectory <empty-dir> --SocksPort 127.0.0.1:auto ... --ControlPortWriteToFile <f> --CookieAuthentication 1`). Never `SIGNAL SHUTDOWN` a Tor the wrapper did not start. Never share a DataDirectory.

### 2.5 SOCKS5 hostname rule and DNSPort (binding)

Stock Tor speaks SOCKS4/4A and SOCKS5 (no BIND, no UDP ASSOCIATE, no GSSAPI). The wrapper must always use hostname form (SOCKS5 ATYP 0x03 domain, or SOCKS4A). A client that sends a literal IP has already resolved locally: that is a DNS leak. `curl --socks5-hostname` is correct; `--socks5` alone leaks. Tor extensions `RESOLVE 0xF0` and `RESOLVE_PTR 0xF1`, and control `RESOLVE`/`MAPADDRESS` with `ADDRMAP` events, keep resolution exit-side.

`DNSPort` is a UDP+TCP stub answering only A, AAAA, PTR via Tor. MX, TXT, SRV, DNSSEC get NOTIMPL or empty: never use it as a general resolver. Tor has no UDP exit transport; DNS travels as circuit traffic.

### 2.6 Lifecycle state machine (binding)

States: ABSENT -> STARTING -> BOOTSTRAPPING -> READY -> STOPPING -> ABSENT, plus FOREIGN (reused, never owned).

- ABSENT: no usable Tor found; wrapper generates torrc with isolated DataDirectory, distinct auto ports, cookie auth, `*WriteToFile` pointers.
- STARTING: spawn `tor -f <torrc>` as child (keep `RunAsDaemon 0`). Gate on listener accept AND cookie file exists AND `AUTHENTICATE` success (listener alone is insufficient; known Tor race where the listener opens before the cookie is written).
- BOOTSTRAPPING: event subscription plus poll loop per section 2.3 until READY or timeout.
- READY: hand the app or shell its Tor endpoints; hold exactly one owning control connection.
- STOPPING: close owning control connection first (lets an owned tor exit cleanly), grace about 5 s, then SIGTERM, then SIGKILL. Only signal when `pid == spawnedPid`. Foreign instances: just close the connection, never signal.
- Ownership (control-spec 3.23, after the Vidalia orphan bug): start tor with `__OwningControllerProcess <wrapper-pid>`, then after auth send `TAKEOWNERSHIP`, then `RESETCONF __OwningControllerProcess` (keeps die-on-disconnect, stops PID polling). Exactly one owning connection; any close kills the owned tor.
- Crash and signal handling: trap SIGINT, SIGTERM, SIGHUP in the wrapper; shutdown is idempotent. Starter crash with `__OwningControllerProcess` plus `TAKEOWNERSHIP` means the owned tor exits rather than orphaning.
- DataDirectory locking: tor holds `<DataDirectory>/lock`. Second tor on the same dir warns then exits. Wrapper rule: per-instance `mkdtemp` dir, pre-flight non-blocking flock on `<dir>/lock` (ooni-probe `is_tor_data_dir_usable` pattern). Locked plus holder alive: pick a new dir and ports, never steal. Holder dead: kernel already released the lock; verify no live `tor -f <same-torrc>` before reuse. Use absolute DataDirectory paths. Implement deadlines with a monotonic clock plus select loop, not SIGALRM (Stem style timeouts break on Windows and non-main threads).

Reference patterns: Tor Browser `tor-launcher` owned-daemon (Subprocess.call plus watcher distinguishing intentional stop from crash; close control conn rather than SIGNAL HALT on quit), Stem `launch_tor` (Popen plus `Bootstrapped N%` regex, `take_ownership`, kill plus temp cleanup on timeout), txtorcon explicit `launch()` (temp dir, random ports, `TAKEOWNERSHIP`, dir deleted on shutdown) versus `connect()` (attach only, never kill).

## 3. Per-app isolation mechanism per OS (binding choice)

### 3.1 Linux: torsocks by default, proxychains-ng for chains

torsocks (current, Tor Project, v2.5.0) is an ELF `LD_PRELOAD` (`libtorsocks.so`) overriding libc symbols via `dlsym(RTLD_NEXT,...)` trampolines. `torsocks CMD` sets `LD_PRELOAD` plus `TORSOCKS_CONF_FILE` and execs. Philosophy: fail closed (non-TCP denied, error returned to app).

- DNS: hooks `gethostbyname*`, `getaddrinfo`, `gethostbyaddr*` families; sends hostname through Tor SOCKS5 RESOLVE; returns fake cookie IP from `OnionAddrRange` (default `127.42.42.0/24`); later `connect()` on that cookie sends the stored hostname or `.onion` to Tor. No UDP DNS leaves the host. Not intercepted: `res_*` API (`res_query`, `res_search`, `res_send`), hand-rolled UDP to port 53, DoH or DoT over TCP (torified as TCP but defeats Tor DNS privacy if the app uses a remote resolver).
- Hooks: `connect`, `close`/`fclose`, `socket`, `listen`/`accept`/`accept4`/`bind` (inbound control via `AllowInbound`), plus `syscall` allowlist, `execve`, `poll`/`select` variants. Raw `syscall(SYS_connect)` or `int 0x80` bypasses the shim silently.
- Config (`/etc/tor/torsocks.conf`, override `TORSOCKS_CONF_FILE`): `TorAddress 127.0.0.1` (numeric only), `TorPort 9050`, `OnionAddrRange 127.42.42.0/24`, optional `SOCKS5Username`/`SOCKS5Password` (pair only; maps to `IsolateSOCKSAuth` circuit isolation), `IsolatePID 0|1` (auto per-process credentials; incompatible with explicit user/pass), `AllowInbound 0|1` (default 0; Unix sockets always allowed), `AllowOutboundLocalhost 0|1|2`. Flags mirror this: `-a/--address -P/--port -u/--user -p/--pass -i/--isolate -d/--debug`. Env: `TORSOCKS_CONF_FILE`, `TORSOCKS_LOG_LEVEL`, `TORSOCKS_USERNAME`/`TORSOCKS_PASSWORD`, `TORSOCKS_ISOLATE_PID=1`.
- Known bypasses (must be documented and, where testable, detected): static binaries and non-ELF (silent bypass; includes Go net without cgo, Rust musl static, Nim, Haskell RTS raw syscalls), setuid/setgid (loader ignores `LD_PRELOAD`; conf not honored), UDP/ICMP/raw (denied; app may crash, hang, or fall back), QUIC/HTTP3 over UDP (fails closed under torsocks, which is correct for anonymity), `dlopen` modules and forked daemons, env scrub (`sudo`, `env -i`, setuid) dropping the preload.

proxychains-ng (v4.17, rofl0r) is the same `LD_PRELOAD` family (`libproxychains.so.4` via `proxychains4`) plus a `close`/`close_range` hook, TCP only, self-described HACK on scripts, daemons, `dlopen` modules. Config search: `$PROXYCHAINS_CONF_FILE` or `-f file`, `./proxychains.conf`, `~/.proxychains/proxychains.conf`, `/etc/proxychains.conf`. Exactly one chain type uncommented (last wins): `dynamic_chain` (skip dead, need at least 1 alive), `strict_chain` (all must be alive else `EINTR` to app), `random_chain`/`round_robin_chain` (pick `chain_len`). DNS safety only with a proxy_dns method enabled: `proxy_dns` (threaded fake-DNS 224.x, fastest, supports `.onion`, can crash complex apps), `proxy_dns_old` (proxyresolv plus dig, slow, no `.onion`), `proxy_dns_daemon 127.0.0.1:1053` (external daemon, must run or hang). `remote_dns_subnet 224` must not collide with local or real targets. `[ProxyList]` entries are numeric IPv4: use `socks5 127.0.0.1 9050` for Tor (remote resolve, auth, IPv6); the shipped default `socks4 127.0.0.1 9050` works but is weaker. `localnet` bypass only applies to literal IPs. Dead-proxy behavior returns `EINTR`; without proxy_dns, DNS leaks clearnet.

tsocks is obsolete (last release 1.8beta5 2002; Tor removed the tsocks fallback from `torify` in 2012 as known to leak DNS and UDP). Never use; any guide referencing `/etc/tsocks.conf` is stale.

Head-to-head for Tor: torsocks is single-Tor enforcement with safe DNS, `.onion`, and fail-closed UDP deny. proxychains-ng is a generic multi-hop TCP proxifier that can point at Tor. torsocks has correct DNS by default; proxychains is safe only with proxy_dns enabled and a non-colliding subnet. torsocks offers `-i/IsolatePID` and user/pass circuit isolation; proxychains per-proxy user/pass with no PID auto-isolation (`random_chain` spreads, does not isolate). torsocks denies UDP loudly (auditable); proxychains may let UDP bypass opaquely (worse). Both silently bypass static and raw-syscall binaries.

Binding choice: default to torsocks on Linux for `torshim <app>` and `torshim shell` (fail-closed, correct DNS, minimal config). Use proxychains-ng only for chaining, HTTP upstreams, or per-destination `localnet`/`dnat` rules, always with `strict_chain` (or explicit `dynamic_chain`), `proxy_dns`, `remote_dns_subnet 224`, `socks5 127.0.0.1 9050`. Neither shim covers static binaries: for Go-static or Rust-musl targets use app-native `socks5h` proxy env, network-namespace isolation, or transparent proxy (TransPort plus DNSPort) instead, and fail closed with a clear error when a shim would silently bypass. Minimal torsocks profile: `TorAddress 127.0.0.1`, `TorPort <instance>`, `OnionAddrRange 127.42.42.0/24`, `IsolatePID 1`, `AllowInbound 0`, `AllowOutboundLocalhost 0`.

### 3.2 macOS: no DYLD shims in production

There is no `LD_PRELOAD` on macOS; the analog `DYLD_INSERT_LIBRARIES` is stripped by dyld plus System Integrity Protection for protected system binaries, setuid/setgid, `__RESTRICT` section binaries, hardened-runtime binaries without `allow-dyld-environment-variables`, and libraries failing validation. Effect: `DYLD_INSERT_LIBRARIES=libtorsocks.dylib curl` is silently ignored for signed curl and system tools; proxychains-ng fat-binary workarounds only cover self-built unsigned binaries; disabling SIP is dev-only and never shippable.

Binding choice for macOS per-app: explicit `socks5h://127.0.0.1:<port>` app config and env (`ALL_PROXY`, `HTTP_PROXY`/`HTTPS_PROXY` with hostname form), `networksetup -setsocksfirewallproxy`, or utun/NetworkExtension transparent proxy. DYLD shims only for unsigned test binaries, never as the product path.

### 3.3 Windows: no LD_PRELOAD equivalent

Per-app capture needs Winsock or kernel filtering. Legacy LSP/NSP (Proxifier v3) is deprecated since Windows 8 and misses Store/WSL; modern is Windows Filtering Platform (Proxifier v4 engine, open `proxyroute`): `ALE_CONNECT_REDIRECT` plus `ALE_AUTH_CONNECT` per-app rules via a signed driver plus Base Filtering Engine service. WSA-hook tools are fragile (32/64-bit split). WSL2 plus Linux shims covers Linux binaries inside WSL only, not Win32 apps.

Binding choice for Windows per-app: app `HTTP(S)_PROXY`/`ALL_PROXY=socks5h://127.0.0.1:<port>`, `tor.exe` plus app SOCKS support, or a WFP per-exe rule tool. Never ship an LSP-only path.

### 3.4 Shell isolation design (binding)

`torshim shell` spawns a child shell (default `$SHELL` else `/bin/sh`; Windows: `%COMSPEC%`) with Tor-forcing environment, while the parent shell is untouched:

- Linux: `LD_PRELOAD=<libtorsocks.so>` plus `TORSOCKS_CONF_FILE=<generated per-shell conf>` plus `TORSOCKS_ISOLATE_PID=1`, `TOR_SOCKS_PORT`/`TOR_CONTROL_PORT` markers, shell prompt hook (`TORSHIM_ACTIVE=1`, PS1 suffix `[torshim]`). Children inherit; exiting the shell drops the preload. Document the static-binary and env-scrub (`sudo`, `env -i`) limits in the shell banner.
- macOS and Windows: no preload; export proxy env (`ALL_PROXY=socks5h://...`, `HTTP_PROXY`/`HTTPS_PROXY`, plus `TORSHIM_ACTIVE=1`) and print the coverage banner (only proxy-aware apps are covered; use transparent mode for the rest).
- Every shell prints a short coverage banner on entry (mechanism, Tor endpoints, what is NOT covered). `torshim status` inside the shell reports the shell mode.

## 4. System-wide connect/disconnect backends

Common contract (all OSes): `sudo torshim connect` snapshots before mutating (firewall dump, DNS state, Tor service state under one timestamped backup dir), installs fail-closed rules (filter or block before redirect where possible), verifies (Tor exit check plus DNS-leak check plus non-TCP-DNS blocked check), and aborts on any unexpected clearnet success. `torshim disconnect` deletes only owned rules, restores DNS byte-for-byte (symlink versus file, `Empty` versus explicit list, metric values), flushes caches, and post-verifies (clearnet IP back, no owned rules left). Idempotence: pre-flight existence checks with dedicated names (`torshim-*` chains, `org.torshim` anchor, tun routes); `--force` required to overwrite foreign rules. Never bare-flush user or system rules (`iptables -F` bare, global `pfctl -F all`, `netsh winsock reset` are forbidden). Reboot is safe default on Linux and macOS (ephemeral rules vanish: reboot equals disconnected); do not auto-persist without an explicit opt-in LaunchDaemon, systemd unit, or persistent WFP filter plus documented fail-open versus fail-closed crash semantics, plus `torshim status` (active/inactive/stale-backup) and `torshim repair` (flush stale anchors and routes, restore DNS).

### 4.1 Linux (primary, fully supported)

Tor side: `SocksPort 127.0.0.1:<p>`, `TransPort 127.0.0.1:9040` with isolation flags, `DNSPort 127.0.0.1:<p>`, `VirtualAddrNetworkIPv4 10.192.0.0/10`, `AutomapHostsOnResolve 1`. Original dst recovered via `SO_ORIGINAL_DST` (conntrack).

- iptables legacy pattern (`nat/OUTPUT`): exemptions first, then redirect, then filter-drop. Exempt Tor UID (`-m owner --uid-owner $TOR_UID -j RETURN`; resolve UID dynamically: `debian-tor` vs `tor` vs `toranon`) or Tor loops into itself; exempt loopback; optional LAN bypass (leak tradeoff; strict mode omits it); `REDIRECT udp --dport 53 -> DNSPort`; `REDIRECT tcp SYN -> TransPort`. Filter table fail-closed: accept established, loopback, Tor UID, loopback to TransPort/DNSPort, optional LAN; tail `REJECT` (non-DNS UDP and ICMP die here: no silent leak). `owner` match works only in `OUTPUT`, never `PREROUTING`/`FORWARD`; middlebox variant uses `PREROUTING -i $LAN_IF` without `owner`.
- nftables native equivalent with `skuid "tor"`/`skuid "debian-tor"` return, `redirect to :9040`/`:5353`, interval set for unrouteables; `nft -c -f` check, `nft -f`, `nft list ruleset`, flush by table.
- `ip rule/route` policy routing is complementary, not a substitute (Tor cannot consume raw IP): used for split-routing Tor's own traffic clearnet or steering default into a tun device. `uidrange` needs kernel plus iproute2 5.x; prefer netfilter `owner` plus filter DROP for the CLI.
- systemd: `systemctl enable --now tor`, `is-active`, `restart` after torrc TransPort/DNSPort change, `journalctl -u tor`. Record prior `is-enabled`/`is-active`; never `disable` a user-enabled service on disconnect; stop or restart only what the CLI started.
- resolv.conf: prefer REDIRECT-only (no file touch; DHCP cannot clobber the redirect). If writing, snapshot the file plus symlink target first; restore symlink with `ln -sf` (a `mv` follows the link); never leave `chattr +i`; restart `systemd-resolved`/`NetworkManager` only if touched.
- IPv6: mirror rules in `ip6tables`/nft `ip6`, or block all IPv6 for the session (`ip6tables -A OUTPUT -j REJECT`, document `disable_ipv6` option). Unmirrored IPv6 is a leak.

### 4.2 macOS (partial: SOCKS plus DNS plus tun preferred over pf)

In-box transparent mechanism is pf only (`ipfw` removed since 10.10). Never overwrite `/etc/pf.conf` (SIP-protected, system-owned); use anchors. pf is disabled on every reboot (reboot equals disconnected).

- Anchor pattern: `rdr pass on lo0 inet proto tcp from any to any -> 127.0.0.1 port 9040` plus `rdr ... udp ... port 53 -> 127.0.0.1 port 5353`, but bare `rdr on lo0` never fires for locally generated packets (they leave via `en0`/`utunX`, never `lo0`). Required two-step: `pass out route-to (lo0 127.0.0.1) inet proto tcp ... flags S/SA keep state` (plus UDP 53 variant) diverts outbound to loopback, then the `rdr on lo0` rewrites to TransPort/DNSPort; original dst via `DIOCNATLOOK` on `/dev/pf`. Needs root, a companion `pass out ... to 127.0.0.1`, and interface handling for `utun` VPNs (omit `on <if>` or enumerate the default interface at connect time; detect Tailscale/WireGuard default-route races via `route -n get default` and refuse or nest explicitly). No reliable pf UID match exists on recent macOS, so Tor self-exemption is fragile.
- Verdict: pf plus Tor on macOS is second-class and version-fragile across releases. Prefer tun2socks on macOS (own `utun`, `route add default -interface utunX`, scoped DNS: cleaner than pf wrestling).
- DNS: never edit `/etc/resolv.conf` (generated by `mDNSResponder`). Snapshot `scutil --dns` and per-service `networksetup -getdnsservers`; override per active service with `networksetup -setdnsservers "<svc>" 127.0.0.1`; restore per-service (`Empty` restores DHCP; explicit prior IPs restored verbatim); `dscacheutil -flushcache; killall -HUP mDNSResponder`. Re-assert on sleep/wake/VPN flap.
- pf verbs: `-n -f` syntax check before load, `-a org.torshim -f <anchor>`, `-E` enable once (remember token), `-s info|rules|nat|states` plus `-v` counters for verification, `-a org.torshim -F all` on disconnect (never global), `-X <token>` disable only if the CLI enabled it; restore `/etc/pf.conf` from backup if anchor lines were added, then `pfctl -f /etc/pf.conf`.

### 4.3 Windows (tun2socks path; no in-box redirect)

- WFP is the correct primitive (`ALE_AUTH_CONNECT_V4/V6` allow/block plus `ALE_CONNECT_REDIRECT_V4/V6` rewrite to local proxy) but needs a signed kernel driver plus user service; `netsh advfirewall` only allows or blocks, never redirects. Shipping a driver means EV signing and install prompts: out of scope for a lightweight CLI; depend on an existing driver or use TAP mode.
- `netsh interface portproxy` is a static listen-to-connect forwarder (TCP only, no wildcard capture, no original-dst recovery): useless for system-wide Tor-ification except single-port tests. Document as non-option.
- Practical path: virtual L3 NIC (`wintun`/TAP-Windows6) plus userspace `tun2socks` translating L3 to SOCKS5 at `127.0.0.1:9050` (not TransPort). Assign private IP, point default route plus DNS at it with metric 1, add more-specific `/32` bypass routes for guard IPs via the physical gateway (or bind Tor to the physical interface) so Tor itself bypasses the tun, needs Administrator plus `wintun.dll` in PATH. Variants: `badvpn-tun2socks`, `xjasonlyu/tun2socks`, `hev-socks5-tunnel` (YAML config). Handles TCP plus DNS; UDP non-DNS drops (Tor has no UDP exit: correct fail-closed, breaks VoIP/QUIC/Games loudly); ICMP always drops (no SOCKS encoding).
- DNS backup: `netsh interface ipv4 dump`, per-GUID registry export (`HKLM\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters\Interfaces\{GUID}`), global versus per-GUID `NameServer` precedence; per-interface static to tun DNS with metric 1 and physical interfaces raised; `ipconfig /flushdns` both ways; restore via `netsh exec` plus `reg import` plus metric restore. DHCP and VPN clients rewrite spontaneously: GUID-keyed snapshots are mandatory.
- Admin: elevation required for driver install, `netsh`, `route add`, firewall, `sc.exe` Tor service control. Store backups under `%ProgramData%\TorShim\`. No UAC bypass tricks.

### 4.4 tun2socks/badvpn architecture (cross-platform fallback)

Userspace L3-to-SOCKS5 translator fronting a TUN device: OS routes `0.0.0.0/0` (and `::/0`) to virtual NIC (`tun0` Linux, `utunX` macOS, `wintun` Windows); `tun2socks` reads raw IP packets, terminates TCP locally with an embedded stack (badvpn lwip-derived; `xjasonlyu`/`hev` gVisor netstack or lwIP: SYN/ACK, reassembly), opens per-connection SOCKS5 `CONNECT <orig-dst>:<port>` to Tor, relays bidirectionally; DNS captured as UDP/53 and forwarded over TCP/SOCKS to Tor DNSPort (spoofed UDP reply) when `--dns` style handling is on. Ceiling identical to TransPort: TCP plus DNS only; UDP non-DNS dropped, ICMP always dropped. Overhead is double stack traversal (kernel to TUN to user stack to SOCKS to Tor); MTU typically 1500 (wintun) to 8500 (hev). Choose tun2socks on macOS (avoids pf fragility), Windows (avoids WFP driver), and Linux VPN coexistence; on pure Linux prefer `iptables REDIRECT` to TransPort (lighter, preserves `SO_ORIGINAL_DST` and Tor stream isolation flags). Isolation note: all tun connections typically share one SOCKS circuit pool unless split across upstream instances.

## 5. DNS and IPv6 plan (binding)

- DNS must go through Tor. Per-app Linux: torsocks RESOLVE path (hostname never resolved locally). System-wide Linux: `REDIRECT udp --dport 53 -> DNSPort` (plus optional `nameserver 127.0.0.1`). macOS: per-service `networksetup` DNS override plus pf UDP/53 route-to/rdr (or tun DNS capture). Windows: tun DNS plus metric 1.
- `DNSPort` answers only A/AAAA/PTR; everything else gets NOTIMPL or empty. The CLI must never present it as a general resolver.
- IPv4/IPv6: handle explicitly per OS. Linux mirrors v6 rules or blocks v6 for the session; macOS `inet6 rdr` plus `route-to` v6 set or `networksetup -setv6off`; Windows v6 firewall block or `::/0` via tun. Unmirrored IPv6 is a release-blocking leak.
- Verification (binding): `dig @8.8.8.8 example.com` must resolve via Tor or fail, never via a clearnet path; AAAA checks included; `nc -u 8.8.8.8 443` and `ping 8.8.8.8` must fail under `connect`. Any unexpected clearnet success aborts `connect`.

## 6. Failure semantics: fail closed, never falsely claim protection (binding)

- If Tor is not ready, not bootstrapped, or any route leaks, the CLI fails closed with a clear error; it never reports protected when not.
- `torshim <app>`: pre-flight readiness gates (section 2.3) before exec; torsocks deny on UDP surfaces as app error (auditable, correct); static-binary or raw-syscall targets that would silently bypass the shim must be refused or routed via transparent mode with a clear message, never silently torified-in-name-only.
- `torshim shell`: banner states coverage and gaps; children that scrub env (`sudo`, `env -i`) lose protection; document in banner and `status`.
- `torshim connect`: fail-closed ordering (filter or block before redirect where possible); verification suite gates success; abort on leak.
- `torshim disconnect`: must never leave system networking broken; post-verification gates success; `repair` handles stale anchors, routes, and DNS.
- `torshim status`: reports Tor running state, bootstrap percent and tag, circuit-established boolean, active mode (none, per-app, shell, system), endpoint ports, and leak-check summary. Must be accurate; unknown states render as unknown, never as protected.

## 7. Threat model and non-goals

Adversary: local network observer and remote destination trying to link the user to traffic; malicious or misconfigured local apps trying to bypass the proxy; OS services (DHCP, VPN clients, mDNS, SSDP) racing DNS and routes. Out of scope (documented, not promised): malware with root that flushes firewall rules (Tails/Whonix style isolation is stronger), browser fingerprinting (use Tor Browser for that), UDP-heavy apps (VoIP, games, QUIC without TCP fallback: they fail closed by design), full DNS QTYPE coverage beyond A/AAAA/PTR, censorship circumvention (bridges and pluggable transports are future work; torrc already supports `Bridge`/`UseBridges` passthrough), and Windows/macOS kernel-driver development.

## 8. Per-OS capability matrix (binding snapshot)

| Capability | Linux | macOS | Windows |
|---|---|---|---|
| Per-app `torshim <app>` | YES: torsocks default; proxychains-ng for chains; fail-closed DNS | PARTIAL: explicit `socks5h` env plus app SOCKS config; DYLD shims dev-only | PARTIAL: app `socks5h` proxy env; WFP per-exe tool; WSL shims cover WSL only |
| `torshim shell` | YES: LD_PRELOAD torsocks env; banner plus gaps | PARTIAL: proxy env; banner (proxy-aware apps only) | PARTIAL: proxy env; banner (proxy-aware apps only) |
| System-wide `connect` | YES: iptables/nft REDIRECT to TransPort plus DNSPort; owner exempt; filter REJECT tail | PARTIAL: pf route-to plus rdr (fragile) or tun2socks (preferred) plus per-service DNS | PARTIAL: wintun plus tun2socks to SocksPort plus route and DNS; no in-box redirect |
| DNS through Tor | YES: REDIRECT udp/53 to DNSPort | YES: per-service DNS override plus pf/tun DNS | YES: tun DNS plus metric 1; registry backup |
| UDP non-DNS / ICMP | BLOCK (REJECT): Tor-incapable | BLOCK (pf block): Tor-incapable | BLOCK (firewall): Tor-incapable |
| IPv6 | Mirror ip6/nft ip6 or disable v6 | inet6 rdr plus route-to or setv6off | v6 block or ::/0 via tun |
| Tor self-exempt | owner/skuid RETURN (robust) | No reliable pf UID match (fragile) | WFP app-path/SID or guard-/32 bypass routes |
| Reboot | Ephemeral rules vanish (safe) | pf disabled on reboot (safe) | WFP persistent filters may survive (must scrub); tun routes/DNS per config |
| Idempotence keys | `torshim-*` chains; `iptables -C`/`nft list` pre-check | `org.torshim` anchor; `pfctl -a` pre-check; per-service DNS snapshot | GUID-keyed backups; `netsh show`/`route print` pre-check |
| Exact tools | iptables, ip6tables, iptables-restore/save, nft, ip rule/route, systemctl, resolvectl, nmcli, ss, curl --socks5-hostname | pfctl -E/-X/-F/-f/-s/-v/-n, ifconfig, route -n get, scutil --dns, networksetup, dscacheutil, launchctl | netsh interface/firewall, route print/add/delete, reg export/import, ipconfig /flushdns, sc.exe, Get-NetFirewallRule, wintun.dll, tun2socks/hev |

## 9. Test matrix for Tester and Evaluator (binding expectations)

- Command mode: route proof via `check.torproject.org/api/ip` and control `GETINFO`; fail-closed when Tor down (nonzero exit, clear error, no protected claim).
- Shell mode: child inherits Tor env; parent unaffected after exit; coverage banner present.
- Tor lifecycle: launch-if-absent, reuse-if-present (never kills foreign Tor), readiness wait with timeout, cleanup on exit and Ctrl-C (no owned tor left behind; foreign tor untouched), stale lock handling.
- DNS: no leak (SOCKS resolve and DNSPort paths; `dig @8.8.8.8` never clearnet under connect; AAAA included).
- IPv4/IPv6: v6 mirrored or blocked; leak test fails the run if clearnet v6 succeeds.
- connect/disconnect: backup/restore byte-exact (resolv.conf plus symlink, per-service DNS, registry plus metrics, firewall dumps, service states); idempotent double-connect and double-disconnect; reboot-safe default; `repair` clears stale state.
- status/version: accurate across absent, bootstrapping, ready, foreign, stale-backup states; version prints wrapper plus Tor plus backend.
- CI matrix `linux / macos / windows`: command mode, shell mode, lifecycle, cleanup, restoration, error handling, actual Tor connectivity where testable (timeouts and mocks where Tor is unavailable in CI; documented skips where the OS denies transparent routing in CI).

## 10. Architecture handoff notes (for the Architect)

- Milestone order stands: M2 per-app plus shell on Linux primary (torsocks default, static-binary guard, readiness wait, reuse/cleanup, Ctrl-C, DNS plus v4/v6 tests); M3 system-wide Linux `connect`/`disconnect` (iptables plus nft backends, backup/restore, idempotence, reboot-safety) with macOS/Windows backends plus limitations doc; M4 macOS plus Windows ports with `status`/`version`, packaging, man/help; M5 hardening plus tri-OS CI.
- `progress/387-tor-cli.md` epic owned by Architect next.
- Packaging: single static Go binary plus vendored or depended `torsocks`/`proxychains-ng`/`tun2socks` helpers per OS (document which are bundled versus apt/brew/choco deps); man page plus `--help`; `status`/`version` contract per section 6.
- Docs deliverables: `tor-cli/docs/` with this research, threat model (section 7), per-OS limitations (section 8 plus 4.2/4.3), reproducibility notes (commands, versions, registry check dates).

## 11. Sources surveyed

tor daemon manpage and control-spec v1; torsocks 2.5.0 source and conf; proxychains-ng 4.17 conf and docs; tsocks history and torify removal; badvpn-tun2socks, xjasonlyu/tun2socks, hev-socks5-tunnel; Linux iptables/nft/iproute2/systemd/resolvectl/NetworkManager; macOS pf/pfctl/scutil/networksetup/utun/SIP; Windows WFP/netsh/registry/wintun; Tor Browser tor-launcher, Stem launch_tor, txtorcon launch versus connect; Tor trademark FAQ; crates.io/npm/PyPI registry checks 2026-09-23.

---

# Part II: Feature, UX, and landscape research (2026-09-24)

Owner directive 2026-09-24 on #387: survey existing Tor, proxy, and network
CLI tools; identify genuinely useful features, usage cases, and UX
improvements users actually need (a `verbose` mode was named as an
example); research first, prioritize real value, document the reasoning,
and keep the tool lightweight, fast, reliable, and easy to use. Ordered
workflow: CLI research and improvement first, per-OS real-user testing
second, website refresh third.

Method: two parallel subagent surveys (competitive landscape and UX
conventions; Tor control-port and lifecycle capability depth), both
grounded against the shipped 0.4.0 code in this repository, plus
issue-tracker, forum, and support-documentation evidence. The sections
below are binding input to the Architect's next epic.

## 12. Baseline inventory: what 0.4.0 ships today

Grounded in `tor-cli/main.go`, `internal/control`, `internal/lifecycle`,
`internal/status`, `internal/perapp`.

- Commands: `run`, bare `torshim <app> [args]`, `shell`, `status`,
  `version`, `connect`, `disconnect`, `repair`, `help` (main.go:56-78).
- Flags: `run`/`shell` take `--tor`, `--timeout`, `--reuse`; `status`
  takes `--json`, `--control`, `--socks`, `--state-dir`; `connect` takes
  `--backend`, `--tor-user`, `--state-dir`, `--tor`, `--timeout`,
  `--force`, `--trans-port`. **There is no verbosity flag anywhere in
  the source** (zero matches for verbose or log-level in `.go` files).
- Exit codes: 0 ok, 1 runtime/app failure, 2 usage, 3 tor not ready
  (fail-closed), 4 platform unsupported (main.go:32-38).
- Control client (`internal/control`): `PROTOCOLINFO`, cookie
  `AUTHENTICATE`, `GetInfo`/`GetOne`, `TakeOwnership`, and an implemented
  but **never called** `Signal(name)` method. Async `650` events are
  tolerated and dropped: readiness is polling only, no `SETEVENTS`.
  Exactly four GETINFO keys are queried in production:
  `status/bootstrap-phase`, `status/circuit-established`,
  `circuit-status` (BUILT fallback), `version`.
- Lifecycle (`internal/lifecycle`): generated torrc with wrapper-picked
  free `SocksPort`/`DNSPort` (real tor rejects `SocksPortWriteToFile`/
  `DNSPortWriteToFile`; only `ControlPortWriteToFile` exists),
  `ControlPort auto`, cookie auth, `SafeSocks 1`, `AutomapHostsOnResolve 1`,
  optional `TransPort` isolation flags, `ExtraTorrc` passthrough guarded
  by `managedTorrcKeys`. Readiness = 100 percent + `TAG=done` +
  `circuit-established` + real SOCKS5 handshake probe.
- Status (`internal/status`): running/state/bootstrap/circuit/mode/
  endpoints/tor_version/protected plus `--json`. `protected=true` only
  when ready and the SOCKS probe succeeds.
- Per-app: Linux torsocks conf with `IsolatePID 1` (perapp.go:25);
  macOS/Windows `socks5h://` on all six proxy keys with shadow-key scrub
  and a mandatory coverage note (perapp/proxy.go).
- Known cosmetic wart (Auditor 2026-09-24): subcommand `--help` exits 2
  instead of 0 (`flag.ContinueOnError` returns `flag.ErrHelp`, which the
  command handlers map to `exitUsage`).

## 13. Competitive and UX landscape survey

### 13.1 Tool landscape

| Tool | What it is | What torshim learns from it | Gap torshim exploits |
|---|---|---|---|
| torsocks 2.5.0 | LD_PRELOAD wrapper, fail-closed UDP deny, `IsolatePID`, `-u/-p/-i` isolation, `-d` debug levels via `TORSOCKS_LOG_LEVEL` | Level-based library logging; isolation flags as first-class UX | No Windows, no macOS SIP path, static-binary bypass, no status/JSON |
| proxychains-ng 4.17 | Multi-hop LD_PRELOAD proxifier, chain modes, `proxy_dns` | Config search order; chain semantics | Open macOS/ARM issues (#357 #453 #481), DNS safety only when configured, TCP-only |
| tsocks / torify | Obsolete / thin torify wrapper | What never to ship: torify's leaky silent fallback is a documented hazard (HN 25602260) | Both are footguns; torshim's fail-closed stance is the counter-position |
| socksify (Dante) | `socksify cmd` with `SOCKS5_SERVER` env knobs | Env-var configuration of a wrapper is idiomatic | Single-vendor, not Tor-aware |
| torghost | System-wide iptables redirect CLI (`-s` start, `-r` switch, `-x` stop) | Short verb names for identity operations (`switch` = newnym) | Linux only, no readiness gating, no per-app mode, no JSON |
| nyx 2.1.0 | Python/Stem Tor monitor TUI (bandwidth graph, circuits, logs, config) | The observability users expect: circuits, bandwidth, log tail, `n` = new identity | Aging: Stem unmaintained (#68), Python 3.11 breakage (#63), RAM leak (#52), high CPU (#65), Windows request (#53), no JSON machine surface |
| tor daemon CLI | `--verify-config`, `--dump-config`, `--list-torrc-options`, `--hash-password`, `--service install` (Windows) | Self-inspection verbs and vocabulary to reuse | Raw internals; torshim's value is wrapping them honestly |
| Arti CLI | `arti proxy -l <level> -o key=value -p socks-port`, config.toml | Single log-level flag; `--set` override syntax; log-level UX | Only `help` and `proxy` subcommands; issues #2725/#2726/#2678: bootstrap silently hangs with no retry, no error, no timeout - exactly the UX torshim must beat |
| Whonix onion-grater | Control-port filter proxy, deny-by-default allowlist | Binding security model: the wrapper is the only control-port client; children never get control access; `GETINFO address` must never leak | Whitelist grammar we should adopt for our own control use |
| Tails / uwt / onioncircuits | Stream-isolated curl wrappers; circuit viewer | Isolation wrappers per app; circuit inspection as a lightweight verb | Not a general CLI |
| torbrowser-launcher | Download, verify, launch, `--settings` | Verify-then-run plus a settings verb is familiar Tor UX | Desktop-scoped |
| onionshare CLI | `--receive/--website/--chat/--persistent` | Failure UX under real network conditions (71 open issues) | Server-side, different problem |
| mullvad CLI | `status [-v]`, `connect`, `disconnect`, `relay set location`, `problem-report collect`, documented exit codes | **Closest UX north star**: short verbs, idempotent connect/disconnect, problem-report diagnostics | VPN not Tor; no per-app shim, no bootstrap surface |
| gh / kubectl / curl / ssh | `--json`/`-o` field selection, `-v` stacking, `kubectl -v=0..8`, documented exit codes, `completion -s` | The modern CLI bar (section 13.3) | Generic, not Tor-aware |
| gost / cloudflared | Forwarders/tunnels; issues: cloudflared #23 DNS stops resolving (90 comments), #917 reconnect loops | Daemon resilience and honest degradation expectations | Wrong direction (expose, not privacy) |

### 13.2 What real users actually ask for (demand evidence)

| Source | Demand or pain | Implication for torshim |
|---|---|---|
| Tor Forum thread 16360 | Go and other static binaries escape LD_PRELOAD; correct answers are transproxy, Whonix, Tails, oniux | Validates the non-LD_PRELOAD design; proxy-env plus transparent backends are the right bet |
| HN 25602260 (Using Tor from the Command Line) | torify can fall back to leaky tunneling; trust in wrappers is low | Fail-closed defaults and a `status --verify` proof are differentiators |
| nyx issues #52 #63 #65 #68 #80 | Memory leak, Python breakage, CPU burn, unmaintained Stem, "is this even safe anymore?" | A static Go `circuits`/`status --watch` subset is credible competition |
| Arti #2725 #2726 #2678 | Bootstrap hangs silently: no retry, no error, no timeout | Surfacing `WARN BOOTSTRAP REASON=...` on timeout and a `doctor` command are must-haves |
| Arti #2569 | SOCKS port conflicts with Tor Browser | `doctor` port-conflict detection (9050 vs 9150) |
| proxychains-ng #357 #453 #481 | macOS and Apple Silicon breakage | Cross-platform static story stays central |
| Tor support docs (check-for-leaks, kill switch) | Users want leak proof and a kill switch | `status --verify` plus honest pre-flight (`--require-tor` style), never an oversold "kill switch" label |
| Owner field report 2026-09-24 on #387 | "It doesn't work on my system" with no OS/version/command data captured | The tool must make diagnosis effortless: `doctor`, `-v`, machine-readable errors |

Synthesized demand: (a) work where torsocks fails (static, macOS,
Windows); (b) honest leak reporting; (c) machine-readable status;
(d) per-app isolation; (e) resilient bootstrap with timeouts and
actionable errors; (f) diagnostics a user can paste into a bug report;
(g) bridges from the CLI; (h) a new-identity verb; (i) observability
without Python.

### 13.3 The modern CLI UX bar (binding conventions)

1. **Verbosity models surveyed**: `curl -v`/`-vv`/`-vvv` progressive
   stacking; `ssh -v`..`-vvv`; `kubectl -v=0..8`; Arti
   `-l trace|debug|info|warn|error`; Ubuntu `--verbosity=` enum; nyx
   `-d file` plus `-l events` (two orthogonal knobs). **Binding
   choice**: stackable `-v` (info) / `-vv` (debug) / `-vvv` (trace),
   `-q` quiet, plus an explicit `--log-level` enum for scripts and
   `--log-file` for capture. Design in section 15.
2. **Machine output**: every command grows `--json` with a stable,
   documented schema (gh `--json`, kubectl `-o`). stdout carries only
   the payload; human logs stay on stderr.
3. **Exit codes**: keep the shipped contract (0/1/2/3/4) untouched;
   document it in `--help`. New commands must map failures onto it
   deliberately (section 14).
4. **Completion, man, help**: `completion bash|zsh|fish` (gh pattern),
   man page already ships (`torshim.1`), help epilogs carry examples.
5. **Idempotence**: connect when connected and disconnect when not are
   successes (already true for system mode; keep it for new verbs).
6. **Structured errors**: message plus `code` plus `remediation`
   (clig.dev pattern), rendered in text and `--json`.
7. **Three-state verdicts**: `protected | degraded | unverified`,
   never a bare "connected"; any failed probe degrades the verdict.

## 14. Baselines, matched budgets, and performance gates (binding)

Established baselines for any feature claim (fair comparison: same
machine, same tor version, same network, same evaluation script;
bootstrap time excluded from wrapper-overhead measurements because it is
network-dominated):

- **B1 torsocks 2.5.0**: per-app routing and DNS correctness on Linux.
- **B2 proxychains-ng 4.17**: generic proxifier behavior and config UX.
- **B3 nyx 2.1.0**: observability (circuits, bandwidth, log tail).
- **B4 mullvad CLI**: verbs, status, diagnostics, exit-code honesty.
- **B5 modern CLI conventions** (section 13.3): output, completion,
  errors.

Quantitative gates for the improvement epic:

- **G1 (deps)**: `go.mod` stays stdlib-only. Zero new module
  dependencies for any feature in sections 15 and 16.
- **G2 (size)**: static linux/amd64 binary grows no more than 15
  percent over the 0.4.0 baseline (recorded by the Builder before and
  after).
- **G3 (startup)**: wrapper overhead before tor spawn at most 50 ms
  p95 (measured excluding tor bootstrap); `version` and `help` return
  in at most 50 ms.
- **G4 (latency)**: `status` without `--verify` completes in at most
  1 s when tor is absent and at most 2 s when a control endpoint is
  unresponsive (bounded dial and read deadlines).
- **G5 (observability purity)**: verbosity flags never change control
  flow: every existing test must pass identically with `-vv` and
  `--log-level trace` injected, and exit codes must be byte-identical.
  With logging disabled, no per-line formatting cost is paid (level
  check first). The one documented exception: `trace` may add
  `Log debug file` to the private-instance torrc (observability only,
  section 15.5).
- **G6 (honesty invariants)**: `status` never reports `protected:true`
  unless the readiness gates plus the live probe pass; new commands get
  the same never-lying tests; fail-closed exit 3 semantics are
  preserved for launch paths.
- **G7 (tri-OS)**: every new command ships black-box tests with per-OS
  honest branches (no new CI skips), and the per-OS real-user testers
  (`test-linux`, `test-macos`, `test-windows`) exercise every new
  command, flag, and error path natively.
- **G8 (pipeline)**: Reviewer approve, Tester `approve-test` with live
  run evidence, Evaluator `approve-eval` at least 9.8 before merge.

Anti-gates (claims that require measured evidence before they may be
written anywhere): "faster than X", "leak-proof", "works with every
app", "system-wide" off-Linux. Each must be phrased per the measured
scope or dropped.

## 15. Prioritized capability roadmap (binding recommendation)

Priorities are justified by the demand evidence in 13.2, the gaps in
13.1, and the lightweight constraint. Nothing ships because it is
novel; each item names its user and its proof.

### P0 - the diagnostics and honesty surface (answers the Owner's named example and the field-failure report)

| ID | Capability | User and value | Evidence | Implementation sketch | Fail-closed risk |
|---|---|---|---|---|---|
| P0.1 | **Verbosity system** (`-v`/`-vv`/`-vvv`, `-q`, `--log-level`, `--log-file`) | Everyone: shows what torshim is doing, endpoint, mode, connected verdict, timings (Owner's explicit example) | Arti `-l`, curl/ssh stacking, Ubuntu enum; Arti silent-hang issues | `internal/diag` leveled logger to stderr (design section 15.x below) | Low: observability only, G5 gate |
| P0.2 | **`torshim doctor`** read-only environment diagnostics with `--json` | The user whose system fails: answers "why" without a bug report; paste-able report | mullvad `problem-report`; Arti #2569 port conflicts; Owner field report | Check list in section 16.1; per-check `ok`/`detail`/`remediation`; exit 0 all pass, 1 any check failed, 2 usage | Low: never mutates, never claims protection |
| P0.3 | **`status --verify`** live protection proof plus enriched fields | Anyone scripting or doubting: proves egress is Tor through the exact configured SOCKS | HN leak anxiety; Tor check-for-leaks docs; `check.torproject.org/api/ip` returns `{"IsTor":bool,"IP":"..."}` | Through the configured socks5h endpoint: IsTor probe (URL overridable for tests), report exit IP, verdict `protected\|degraded\|unverified`; add `listeners`, `uptime`, `instance` (private/foreign) to the report, additive-only JSON keys | Medium if overclaimed: any probe failure renders `unverified`, cached results never reused |
| P0.4 | **`--help` exit-code wart** | Scripts parse exit codes; `cmd --help` must exit 0 | Auditor 2026-09-24 finding | Map `flag.ErrHelp` to `exitOK` in command handlers; update the pinned contract test | None (test update disclosed) |

### P1 - real-world workflow features (high value, contained effort, all stdlib)

| ID | Capability | User and value | Evidence | Implementation sketch | Fail-closed risk |
|---|---|---|---|---|---|
| P1.1 | **`torshim newnym`** | Rotate circuits between sensitive sessions | torghost `-r`; nyx `n` keybind; `Signal()` already implemented and unused | `SIGNAL NEWNYM` via existing client; honest wording: "new circuits for new connections; existing streams keep their circuits; guards unchanged; tor rate-limits about 10 s"; track last rotation in state dir; `--json`; exit 3 without verified control | Low if wording is honest: never say "new identity" |
| P1.2 | **Shell integration**: `torshim shellenv` + `completion bash\|zsh\|fish` | `eval "$(torshim shellenv)"` for current shell; tab completion | direnv/Homebrew `shellenv` convention; gh `completion -s` | `shellenv` resolves an endpoint from an active system session or verifiable foreign instance (side-effect free: never launches); if none, exit 3 with the remediation "use `torshim shell` or `sudo torshim connect`". Completion emits static scripts, `bash -n` tested | Low: side-effect free by binding |
| P1.3 | **`--isolate`** per-session circuit separation | Separate apps' traffic onto distinct circuits | Proposal 171; torsocks `-i`; Tor Browser uses SOCKS-auth isolation instead of NEWNYM | Linux: swap the generated conf from `IsolatePID 1` to random explicit `SOCKS5Username/Password` (they are mutually exclusive in torsocks); proxy-env: embed random `user:pass@` in the socks5h URL. Verify at launch with `GETCONF SocksPort` rather than assuming isolation defaults; if isolation cannot be confirmed, report `degraded` (status) or warn (run), never silently claim it | Medium: some apps choke on SOCKS auth (tor ships `PreferSOCKSNoAuth` for this); coverage note must survive |
| P1.4 | **Bridge management**: `torshim bridge add\|list\|remove` | Censorship-circumvention users get bridges without editing torrc | research.md explicitly deferred bridges as future work while `ExtraTorrc` already accepts `Bridge`/`UseBridges`/`ClientTransportPlugin` (pinned by tests); lyrebird ships obfs4/meek/snowflake/webtunnel | Persist lines under the state dir; validate shape plus `tor --list-torrc-options` (catches version drift); auto-add `UseBridges 1` when the set is non-empty; detect the PT binary (`lyrebird`, `obfs4proxy`, `snowflake-client`) and fail closed at launch with remediation if missing; splice at `Launch` (regenerate-and-restart semantics documented; live `SETCONF Bridge` replaces the whole list, so we never hot-mutate) | Medium: bridge bootstrap failures surface `WARN` reasons and stay exit 3 |
| P1.5 | **Observability subset**: `torshim circuits` + `status --watch` | nyx replacement without Python: circuit table, live bootstrap and bandwidth deltas | nyx aging issues #52 #65 #68 #80 | `circuits` = `GETINFO circuit-status` table (longnames embed `$FP~Nick`); `--watch` = 2 s ticker over `traffic/read`/`traffic/written` deltas plus bootstrap percent; plain `fmt`, ANSI only on TTY, `--json` for snapshots; observer connections never `TAKEOWNERSHIP` | Low: display only; verdict still comes from readiness gates |
| P1.6 | **`--set Key=Value` torrc overrides** (validated) | Real requests: `EntryNodes`/`ExitNodes` country steering, `StrictNodes`, `ClientOnionBindAddr` without hand-editing torrc | Arti `-o key=value`; tor `--option value` passthrough | Route through the existing `managedTorrcKeys` guard (managed keys rejected, exit 2 with the offending key), validate the full rendered torrc with `tor --verify-config` before spawn. Optional sugar `--exit {cc}` renders `ExitNodes {cc}` + `StrictNodes 1` with the documented warning that exit selection narrows anonymity | Low: existing guard plus verify-config |
| P1.7 | **System-proxy mode on macOS/Windows** behind `connect --backend proxy` | The largest real cross-platform gap without a tun2socks binary: browsers and system-proxy-honoring apps go through Tor | macOS `networksetup -setsocksfirewallproxy` (+ web/secure web proxy); Windows `HKCU\...\Internet Settings` `ProxyEnable`/`ProxyServer` (`http=;https=;socks=`) plus WinINET refresh; mullvad-style snapshot/restore verbs | Same session shape as the Linux backend: session lock, snapshot-first backup under the state dir, idempotent on/off, byte-exact restore in `disconnect`, `repair` for stale sessions, verify step that Tor answers before claiming success. Off-Linux `connect` without `--backend proxy` keeps today's honest exit 4, so existing contract tests stay valid. `status` reports mode `sysproxy`, never `system-wide` | Medium-high naming risk: mode label and coverage notes must say "apps honoring the system proxy", DNS posture stated per OS; `status` must never upgrade `sysproxy` to `protected` without `--verify` |
| P1.8 | **Structured errors** (`code` + `remediation` in `--json` stderr) | Bug reports become machine-readable; consistent UX | clig.dev pattern; HN JSON-output thread | Shared error renderer; codes like `E_NO_TOR`, `E_NO_CONTROL`, `E_SHIM_BYPASS`, `E_STALE_STATE`, `E_PLATFORM` | None |

### P2 - differentiating but deferred (revisit after P0/P1 evidence)

- **`HTTPTunnelPort`** HTTP CONNECT listener for Java and legacy tools
  that speak HTTP proxies but not SOCKS (one torrc line plus a status
  probe).
- **`torshim open <url>`** (including `.onion`): readiness-gated launch
  of the right browser with per-browser proxy config; must verify the
  browser actually honors it before claiming coverage.
- **tun2socks system-wide on macOS/Windows**: remains rejected for the
  lightweight constraint (bundled third-party binary, kernel surface)
  unless P1.7 proves insufficient in real-user testing.
- **Arti interop**: `doctor` and `--reuse` already probe 9050/9150
  foreign instances; deeper Arti support waits for stable Arti RPC.
- **Windows `--service install`** vocabulary (mirrors `tor --service`).
- **`monitor`** full nyx-style dashboard; **problem-report zip export**;
  a config file under `~/.config/torshim/` (add only if the flag
  surface demands it; the state dir already stores bridges and session
  state).

### Rejected features and non-goals (binding)

- **UDP/WebSocket/QUIC claims**: Tor has no UDP exit; torsocks and
  proxychains deny UDP. Never imply support.
- **LD_PRELOAD/DYLD shims as product paths** on macOS or Windows
  (SIP and the LSP deprecation make them silently partial).
- **"Kill switch" wording without a real outbound-block mechanism**:
  name the honest feature `--require-tor` (pre-flight refuses to launch
  unless verified). Linux system mode's REJECT tail is the only real
  kill-switch-shaped mechanism we ship, and it is already documented.
- **Silent fallbacks** (the torify hazard): any degradation is visible
  in `status`, in the exit code, and in `-v` output.
- **Exposing the control port to child apps**: the wrapper stays the
  sole controller (onion-grater lesson); children get SOCKS only.
- **Auto-downloading a tor binary**: supply-chain trust and packaging
  policy forbid it; detect and instruct instead.
- **Telemetry, third-party TUI/logging frameworks, implementing Tor
  itself**: out of scope by charter.

## 16. Design details for the P0 surface (binding)

### 16.1 `doctor` check list (read-only)

1. tor binary present, executable, version parse (warn below 0.4.x).
2. Per-app mechanism availability: torsocks library on Linux; proxy-env
   statement on macOS/Windows (mechanism reported by `version`).
3. Control endpoint: dial, `PROTOCOLINFO`, cookie auth, instance kind
   (private state dir vs foreign 9051/9151).
4. Bootstrap state via `GETINFO status/bootstrap-phase` and
   `status/circuit-established`.
5. SOCKS handshake probe.
6. Port conflicts: listeners on 9050/9150 that fail control
   verification (Arti/Tor Browser overlap).
7. Session state: `/run/torshim` (or `TORSHIM_STATEDIR`) presence,
   lock holder liveness, firewall rules present but tor dead (the
   critical mismatch), rules absent but state claims connected.
8. Env hygiene: pre-existing `HTTP_PROXY`/`ALL_PROXY` shadows,
   stale `TORSHIM_ACTIVE`.
9. Bridge preconditions: configured bridges plus PT binary present.
10. Platform coverage statement: what this OS can and cannot cover
    (mirrors `limitations.md`).
11. `--deep` opt-in adds network checks: live IsTor probe, IPv6
    posture attempt, and time sanity against an HTTP `Date` header.

Output: per-check `[ok]`/`[FAIL]` lines with `detail` and
`remediation`; `--json` renders
`{overall, checks:[{id, ok, severity, detail, remediation}]}`. Exit 0
all pass, 1 any failed, 2 usage. Doctor never mutates state and never
uses the word "protected".

### 16.2 `status --verify` verdict rule (binding)

`protected` requires ALL of: readiness gates (100 percent + `done` +
circuit-established + SOCKS handshake) AND a live `IsTor:true` response
through the exact configured socks5h endpoint. Any failure, timeout, or
override mismatch renders `degraded` (endpoint answers but proof
failed) or `unverified` (no endpoint), with the failing check named.
The probe URL is injectable (`--check-url`) so tests and privacy
paranoids can point it elsewhere; the response shape is
`{"IsTor":bool,"IP":"..."}`.

### 16.3 Verbosity system (binding, answers the Owner's example)

**Flags** (recognized globally, section 16.4 for placement rules):

- `-v` (info): every step, timing, endpoint, and mode.
- `-vv` (debug): adds control request/response lines (cookie hex
  redacted), tor log tail, environment exports (`user:***@` redacted),
  retry loops.
- `-vvv` (trace): adds per-iteration poll timestamps and permits
  `Log debug file` in the private-instance torrc (the single documented
  behavior touch, G5 exception).
- `-q` (error): errors only.
- `--log-level quiet|error|warn|info|debug|trace`: explicit level for
  scripts; wins over stacking.
- `--log-file FILE`: tee all log lines to a file (for bug reports).

**Format** (stderr only): `HH:MM:SS.mmm LEVEL stage: message` with
stages `cli`, `lifecycle`, `readiness`, `control`, `perapp`, `shell`,
`status`, `syswide`, `doctor`, `verify`. Color only when stderr is a
TTY and `NO_COLOR` is unset. Timestamps are wall clock; durations use a
monotonic clock.

**What `-v` must show** (the Owner's acceptance list, one line each):
command and flags parsed; instance decision (private launch vs foreign
reuse with pid/version); spawned tor path, data dir, and every chosen
endpoint (socks, control, dns, trans); mechanism per OS (torsocks vs
proxy-env vs system backend); bootstrap transitions (at least 25/50/75/
100 percent plus tag); each readiness gate result; coverage notes;
and a terminal verdict line on every run:

- success: `torshim: ready mode=per-app mechanism=torsocks socks=127.0.0.1:43123 bootstrap=100% (done) circuit=established elapsed=12.4s`
- failure: `torshim: NOT protected reason=<cause> remediation=<action>` (exit code unchanged from the non-verbose path).

**Interaction with `--json`**: stdout carries only the JSON payload;
log level drops to `warn` unless `--log-level`/`--log-file` was given
explicitly.

### 16.4 Flag placement rules (binding, avoids the bare-app ambiguity)

- Global flags are recognized (a) before the command name
  (`torshim -v status`), (b) inside a torshim subcommand's flag set
  (`torshim status --log-level debug`), and (c) before `--` in
  `run`/`shell`.
- The bare form passes everything after the app name to the app:
  `torshim curl -v https://...` gives `-v` to curl, never to torshim.
  The global pre-scan stops at the first non-flag token.
- This rule is documented in `help` and pinned by black-box tests on
  all three OSes.

## 17. Per-OS feasibility matrix for the new capabilities

| Capability | Linux | macOS | Windows |
|---|---|---|---|
| Verbosity system | identical | identical | identical (stderr handles ANSI; guard for legacy consoles) |
| `doctor` checks | torsocks + firewall-rule checks + `/run/torshim` | proxy-env statement, networksetup read-back for sysproxy | registry read-back for sysproxy, `torshim.exe` aware |
| `status --verify` | identical (socks5h probe) | identical | identical |
| `newnym` | control client (same on all) | same | same |
| `shellenv` / `completion` | bash/zsh/fish | bash/zsh/fish | bash (Git Bash), pwsh export via `--shell` |
| `--isolate` | torsocks explicit creds (replaces `IsolatePID`) | creds in socks5h URL | creds in socks5h URL |
| `bridge` | identical (PT binary detection on PATH) | brew-installed lyrebird paths | Tor Browser `lyrebird.exe` path discovery |
| `circuits` / `--watch` | identical | identical | identical |
| `--set` / `--exit` | identical (`tor --verify-config` gate) | same | same |
| System-proxy backend | not needed (transparent backend exists) | `networksetup` per active service, snapshot/restore | HKCU registry snapshot/export, WinINET refresh |

## 18. Acceptance gates and test matrix for this pass

Inherits the full section 9 matrix; adds:

- **Verbose parity**: run the entire existing suite twice (default and
  with `-vv`) asserting identical exit codes and JSON payloads (G5).
- **Format stability**: golden tests for the log line grammar and the
  terminal verdict line (not timestamps).
- **`doctor`**: hermetic checks against fake control/SOCKS listeners
  (pass, fail, and timeout paths); `--json` schema test; never
  mutates (assert state dir untouched after run).
- **`status --verify`**: fake SOCKS endpoint returning `IsTor:true`,
  `IsTor:false`, and unreachable; verdict mapping table test; no
  network in hermetic CI (probe URL injection).
- **`newnym`**: fake control server asserts `SIGNAL NEWNYM` is sent
  exactly once, rate-limit warning path, exit 3 without auth.
- **`bridge`**: managed-key rejection, malformed line rejection,
  missing PT binary fail-closed at launch, rendered torrc passes
  `tor --verify-config`.
- **`--isolate`**: generated conf and URL carry per-session creds;
  coverage note preserved; isolation-unconfirmable path warns.
- **`shellenv`**: no side effects (no tor spawned), exit 3 with
  remediation when no persistent instance exists.
- **Completion**: emitted scripts pass `bash -n`; man page still
  renders.
- **`connect --backend proxy`** (if scheduled): snapshot/restore
  round-trip hermetic tests mirroring the Linux syswide fake-runner
  discipline; off-Linux default `connect` still exits 4.
- **Per-OS real-user passes**: `test-linux`, `test-macos`,
  `test-windows` execute every command, flag, mode, and error path
  natively and report per platform (Owner's ordered workflow).
- **Performance ledger**: Builder records G2 binary size and G3/G4
  timings before and after in `decisions/builder/` (empirical ledger).

## 19. Handoff notes to the Architect

- Suggested phase slicing (capability-driven names, numeric prefixes
  for order): (1) Diagnostics and honesty surface: verbosity system,
  `doctor`, `status --verify`, `--help` exit-code fix; (2) Workflow
  verbs: `newnym`, `shellenv`, completions, `--isolate`, structured
  errors; (3) Network features: `bridge`, `circuits`/`--watch`,
  `--set`/`--exit`; (4) Platform system-proxy backend behind
  `connect --backend proxy`. Each phase references `Refs #387`; the
  epic closes only after per-OS real-user passes, green tri-OS CI,
  Evaluator at least 9.8, and the website refresh.
- **Ordering is binding**: website updates happen after the CLI and
  per-OS testing are final (Owner directive), then the Curator keeps
  `tor-cli/index.html`, README, and `docs/` in one consistent view.
- Extend, never rename, the existing `status --json` keys (Tester
  contract tests pin them); new fields are additive.
- Keep the exit-code table and the trademark subtitle on every new
  surface (help, completion headers, man page, doctor output footer).
- New tests must carry per-OS honest branches so the CI skip list does
  not grow (load-bearing skips stay exactly as documented in
  `limitations.md`).
- Watch item: `--help` exit-code fix (P0.4) touches a pinned Tester
  contract; disclose the test update in the PR body.
- Budget realism: P0 is small (days), P1 items are independent and can
  land as separate phase PRs; reject any phase that adds a dependency.

## 20. Sources for this pass

Tor control-spec (commands, events, isolation flags) and tor man page
(`SocksPort` isolation, `TestSocks`, `SafeSocks`, `--list-torrc-options`,
`--verify-config`); proposal 171 (stream isolation); torsocks 2.5.0 and
proxychains-ng 4.17 man pages and issue trackers; nyx site and GitHub
issues; Arti CLI reference and GitLab issues #2725 #2726 #2678 #2569
#735 #1581; Whonix onion-grater documentation; Tails/uwt and
onioncircuits; torbrowser-launcher; onionshare CLI; mullvad CLI docs;
gh CLI manual (exit codes, formatting, completion); clig.dev guidelines;
curl/ssh/kubectl verbosity conventions; gost and cloudflared issues;
HN items 25602260 and 40098606; Reddit r/TOR threads; Tor Forum thread
16360; Tor support docs (check-for-leaks, kill switch); check.torproject
API (`/api/ip`); `limitations.md` and `threat-model.md` in this
repository; Auditor field report 2026-09-24.

- Dr. Mob, the Researcher
