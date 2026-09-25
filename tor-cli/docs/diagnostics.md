# torshim diagnostics: verbose, newnym, doctor

Three control-plane tools answer "what is tor doing right now" without
restarting anything. All three are read-only except `newnym` (which asks
tor to rotate circuits), all fail closed, and all resolve the same
endpoint the same way.

## Endpoint and cookie resolution

`newnym`, `doctor`, `status --verbose`, and `version --verbose` address a
**persistent** tor: the system `connect` session, a live `shell` session,
a foreign tor, or Tor Browser. Per-app private instances exit with their
command, so there is nothing to signal there.

Control endpoint order: `--control`, then `TORSHIM_CONTROL` (exported
into every `torshim shell` child alongside `TORSHIM_COOKIE`, so a second
command inside the shell just works), then the Linux system session
record, then conventional `127.0.0.1:9051` with `9151` fallback.

Cookie order: `--cookie`, `TOR_COOKIE`, `TORSHIM_COOKIE`, the system
session cookie when the endpoint came from the session record, then
`~/.tor/control.authcookie` and `/var/run/tor/control.authcookie`.
Missing files are skipped; every readable cookie is tried; total failure
names how many were tried instead of claiming anything.

## --verbose

Every verb takes `-v` / `--verbose`. It reports the session behind the
command: endpoints, mode (private owned vs reused foreign), backend,
circuit state, and the tor `notices.log` tail (owned instances only;
foreign instances say so instead of erroring). Verbose output goes to
stderr and never changes the exit code: a locked control port or a
not-yet-written log is a parenthetical, never a failure.

```sh
torshim run -v -- curl https://example.com
torshim shell -v
torshim status -v
torshim version -v
sudo torshim connect --verbose   # prints session ports after connect
```

## newnym

Rotate circuits without restarting tor (`SIGNAL NEWNYM`):

```sh
torshim newnym
torshim newnym --control 127.0.0.1:9151 --cookie ~/.tor/control_auth_cookie
torshim newnym -v
```

Fail-closed gates, in order: no control endpoint answers (exit 3), no
cookie authenticates (exit 3), tor is not bootstrapped with a live
circuit (exit 3, refusing to rotate a tor that carries nothing), tor
rate-limits the rotation to roughly one per 10 seconds (exit 1, with the
wait spelled out). Success (exit 0) means tor accepted the signal and
closed old circuits; building fresh ones is asynchronous, so confirm
with `torshim doctor`. There is deliberately no `--wait`: `doctor` is
the verification path.

Inside a shell session the loop closes itself:

```sh
torshim shell
# ... in the child shell:
torshim newnym        # TORSHIM_CONTROL/TORSHIM_COOKIE already set
torshim doctor
```

## doctor

One verdict over the whole stack (exit 0 healthy, 3 any failure):

| Check | Pass | Fail | Skip |
|---|---|---|---|
| control-reachable | endpoint answered | nothing answered | - |
| control-auth | cookie accepted | all candidates rejected | - |
| bootstrap-complete | 100% tag done | still bootstrapping / unreadable | - |
| circuit-established | live circuit | none yet | - |
| socks-handshake | real SOCKS5 handshake | not serving | - |
| dnsport-liveness | DNSPort answered an A query | listener silent | `--skip-dns`, no listener advertised, no control session |
| exit-ip-egress | fetched exit IP through SOCKS | no egress | `--skip-exit-ip` |
| firewall-present | system session + rules agree | stale state (run repair) | not in system mode |
| ipv6-blocked | v6 REJECT rules present (system mode, Linux) | session without v6 rules | per-app mode (host v6 untouched by design), off-Linux, unreadable without root |

```sh
torshim doctor
torshim doctor --json      # stable field names: healthy, checks[{name,status,detail}]
torshim doctor --skip-exit-ip --skip-dns   # offline / hermetic runs
```

Skips never fail the verdict but are always listed with the reason:
silence would read as approval. The exit-IP probe resolves the check
host exit-side (SOCKS domain-name CONNECT, no local DNS), and the IPv6
row states the per-app gap plainly: host IPv6 is untouched outside
system mode, so v6-capable apps may egress outside Tor. See
`docs/limitations.md` for the full coverage contract.
