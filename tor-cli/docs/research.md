# Tor CLI (torshim) - Research Specification (M1)

Status: research complete, handing off to Architect.
Scope: lightweight cross-platform Tor wrapper. Uses the existing Tor client and network; never implements Tor itself.
Issue: #387. Owner directive 2026-09-23 on #42.
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

- Dr. Mob, the Researcher
