# torshim cross-platform notes

Per-OS capability matrix (current, verified by `make cross` plus the
hermetic suite; live 3-OS runs are the Track's Tester gate, not a claim
made here):

| Capability | Linux | macOS | Windows |
|---|---|---|---|
| Per-app routing | torsocks `LD_PRELOAD` shim, fail-closed (static/non-ELF/setuid refused) | proxy env `socks5h` (honoring apps only) | proxy env `socks5h` (honoring apps only) |
| Child shell | shim + banner + `[torshim]` prompt | proxy env + banner + prompt | proxy env + banner + prompt |
| System-wide connect | iptables/nft, verify-gated, byte-exact restore | honest exit 4 (no backend shipped) | honest exit 4 (no backend shipped) |
| `--verbose`, `newnym`, `doctor` | full | full (firewall/v6 rows skip: no backend) | full (firewall/v6 rows skip: no backend) |
| Binary | static (`CGO_ENABLED=0`) | static, amd64+arm64 | `.exe`, amd64 |

## What already exists elsewhere

Surveyed so the wrapper complements rather than duplicates:

- **torsocks / torify**: the Linux shim torshim drives. torshim adds
  lifecycle (private tor, readiness gate), classification refusal, and
  the same mechanism on `shell`. No fork, just automation.
- **proxychains**: `LD_PRELOAD` chaining with config-file routing. More
  flexible chains, weaker fail-closed story (misconfig routes clearnet
  silently). torshim refuses instead of misrouting.
- **nyx**: control-protocol monitor (bandwidth, circuits, connections).
  Read-only observability done well; torshim's `--verbose`/`doctor` cover
  a fraction of that surface aimed at one question ("am I protected?"),
  not full monitoring. No duplication intended.
- **Arti**: Tor reimplementation in Rust (library + `arti` proxy).
  torshim deliberately does not reimplement Tor; if Arti matures into a
  embeddable daemon, a future backend could drive it, but the wrapper
  stays daemon-agnostic.
- **Tor Browser / `tor` daemon**: the thing being automated. torshim
  never competes with them; `newnym` and `doctor` work against Tor
  Browser's control port (9151) with its cookie, unmodified.

## Gaps by platform (honest)

- **Linux per-app IPv6**: the shim does not block host IPv6, so a
  v6-capable app may egress outside Tor. System mode blocks v6
  session-wide; per-app users needing v6 confinement should use system
  mode or disable host v6. `doctor` reports this as a skip-with-reason,
  never a pass.
- **macOS/Windows per-app**: only apps honoring proxy env are covered;
  the OS provides no `LD_PRELOAD` equivalent (SIP would strip a DYLD
  shim silently, which is why there is none). Every launch prints the
  coverage note; `doctor` cannot confirm per-app coverage, only that tor
  itself is healthy.
- **macOS/Windows system-wide**: needs a userspace TCP/IP capture path
  (utun/wintun + tun2socks + pf/WFP rules). Not shipped; the CLI refuses
  with exit 4 and a pointer instead of pretending. This is the correct
  next backend project if system-wide ever leaves Linux.
- **GUI apps** (Firefox, Falkon, Chromium): long-lived multiprocess
  binaries. The synchronous `run` path blocks on them; the dedicated
  detach/wait launch split is tracked separately (epic Phase 3), not
  papered over here.

## Portability rules for contributors

- Stdlib only, `CGO_ENABLED=0`, no `go.sum`: every dependency is a
  platform risk. DNS and SOCKS probes are hand-rolled (`internal/doctor`)
  for exactly this reason.
- OS-specific code lives behind build-tagged shims (`os_linux.go`,
  `os_darwin.go`, `os_windows.go`, `os_unix.go`); shared code never
  branches on `runtime.GOOS` for behavior, only for honest refusals and
  probe availability.
- `make cross` (linux/darwin amd64+arm64, windows amd64) plus
  `GOOS=darwin/windows go vet` must stay green on every change.
  Anything that cannot be verified hermetically goes to the per-OS
  tester lanes with real binaries, never to a mock passed off as proof.
