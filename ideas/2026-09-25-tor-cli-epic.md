# torshim Tor CLI Epic: Diagnostics, GUI Reliability, and Showcase Site

## Summary

torshim (tor-cli/) is a stdlib-only Go wrapper (CGO_ENABLED=0, no go.sum) that
automates the stock `tor` daemon: private owned instances with cookie auth,
a binding readiness gate (bootstrap 100% + live circuit), per-app routing
(torsocks shim on Linux, socks5h proxy env on macOS/Windows), an isolated
child shell, Linux-only system-wide connect/disconnect with verify-gated
rollback and byte-exact restore, and honest status/version reporting. Version
0.4.0 plus a complete static showcase site (tor-cli/index.html) already ship.

This blueprint scopes the #436 epic: a safe forward reset (no history
rewrite), a control-plane upgrade (verbose diagnostics, NEWNYM switching,
doctor health checks), a GUI launch re-architecture (Firefox/Falkon hang fix),
a website-invariant lock-in, and a showcase site refresh. The phased roadmap
lives in `progress/436-tor-cli-epic.md`. This document describes one unified
product vision.

## Deliverables

- A lab tree that preserves every pinned model (`opencode/muse-spark-1.3-contributor-free`),
  Pages deploy health, the tor-cli product, and the hermetic test suites,
  with only selective forward cleanup of circular-garbage artifacts.
- A modernized CLI surface: `--verbose` diagnostics on every verb, a `newnym`
  circuit-switching command with rate-limit honesty, and a `doctor` health
  check that proves exit-IP, DNSPort liveness, and firewall state.
- A per-app launcher that treats GUI binaries as first-class: detached launch
  with stdio detachment, process-group isolation, signal forwarding, a short
  post-launch health poll, and an honest coverage contract for what the shim
  and proxy env cannot cover (GPU/D-Bus/UDP/WebRTC, single-instance IPC).
- A locked-in every-project-ships-a-website invariant across builder, reviewer,
  curator, tester, and architect prompts, with the existing ten project sites
  re-verified.
- A refreshed tor-cli showcase site documenting every flag, exit code, and
  platform behavior with copy-paste recipes, verified by real visual inspection
  (Evaluator gate), not by HTML unit suites.

## Why

Real users route browsers and CLI tools through Tor daily with torsocks,
torify, proxychains, nyx, arti, and Tor Browser. torshim's niche is the
fail-closed middle: one static binary, no Tor reimplementation, no false
protection claims. The gaps blocking that niche are concrete: no way to see
what the wrapper decided (`--verbose`), no way to rotate identity without
restarting (`newnym`), no single health verdict (`doctor`), and a per-app path
that blocks forever on exactly the apps users care about most (Firefox,
Falkon). Fixing those four gaps with real cross-platform testing is the whole
epic. Everything else (reset hygiene, prompt hardening, site polish) exists to
protect that core from regressing.

## How It Works

One lifecycle backs every mode. Launch creates a private tor in a mkdtemp
DataDirectory with loopback Socks/Control/DNS ports, cookie auth, SafeSocks,
and `__OwningControllerProcess` plus `TAKEOWNERSHIP`, so a wrapper crash exits
the owned tor instead of orphaning it. Readiness is binding: bootstrap
PROGRESS=100/TAG=done AND `status/circuit-established == 1` within the
timeout budget (120 s default), plus a SOCKS5 handshake probe. `--reuse`
attaches to a foreign tor only when cookie auth plus the same gate succeed.

Per-app Linux execs under a generated fail-closed torsocks profile
(IsolatePID, no inbound, no localhost bypass); targets that would silently
bypass the LD_PRELOAD shim (static ELF, non-ELF, setuid/setgid) are refused
up front. macOS/Windows exec with a socks5h proxy environment and print a
coverage note on every launch. The child shell carries the same mechanism
plus a coverage banner and a `[torshim]` prompt prefix. System-wide Linux
installs iptables/nft capture rules (TCP to TransPort 9040, port-53 UDP to
the Tor DNSPort, everything else rejected, IPv6 blocked), gates on a five-row
verify suite with automatic rollback, serializes on a session lock, and
restores byte-exact on disconnect (tor stopped first so redirects blackhole).

The epic extends this core without breaking its contracts. Verbose mode reads
only (GETINFO version, listeners, bootstrap, circuit-status, torsocks
classification reason, backend detection, notices.log tail). NEWNYM sends the
standard control signal with 10 s rate-limit handling. Doctor composes the
existing probes (bootstrap, circuit, SOCKS handshake, DNSPort query,
resolv-untouched, firewall-present, IPv6-blocked) plus one exit-IP fetch over
socks5h. GUI mode splits launch into wait (CLI default, current Run with
signal forwarding and log prefixing) and detach (GUI path: Start plus
Release, new process group, stdio to null or log file, parent prints PID and
endpoints then exits 0 after a bounded alive poll). Classification gains a
GUI-aware tier by basename plus headless detection, refusing or gating with
an explicit acknowledgment flag rather than hanging.

## Module Breakdown

- `main.go` (flag dispatch, exit codes 0/1/2/3/4/130): gains global
  `--verbose` plumbing, `newnym` and `doctor` verbs, `run --detach/--wait
  --log-file/--gui` launch-mode flags, and usage text updates. GUI-aware
  classification hook before ensureTor returns.
- `internal/control` (v1 client, readiness parsing): gains read-only
  diagnostic getters (version, listeners, circuit/stream status, guards,
  traffic counters), `Signal("NEWNYM")` plus `CLEARDNSCACHE` wiring, and
  event-tail helpers for verbose output. No behavior change to the binding
  readiness gate.
- `internal/lifecycle` (torrc gen, launch, wait, detect, stop): gains
  session-cookie record for addressing the ephemeral private instance from
  `newnym`, notices.log path exposure for verbose tail, and per-OS spawn
  shims extended to detached GUI children (Setpgid/Setsid, stdio policy).
- `internal/perapp` (torsocks conf/exec/classify plus proxy backend):
  Run splits into wait (forward signals to child process group, cleanup only
  after exit) and detach (Start/Release, alive poll, PID report); classifier
  gains GUI tier (firefox, falkon, chromium, chrome) with headless bypass and
  explicit-ack gate; proxy path gains the same split with identical coverage
  notes.
- `internal/shell` (child shell, banner, environ): banner documents the GUI
  contract; environ filtering unchanged (owned-key dedup stays binding).
- `internal/syswide` (iptables/nft, snapshot/restore, verify, lock): reused
  by `doctor` for firewall-present and IPv6-blocked probes; no rule-format
  changes.
- `internal/status` plus `internal/version`: status gains verbose endpoint
  detail and doctor JSON reuse; version gains control-protocol fields for
  verbose output.
- `tor-cli/docs` (research, threat-model, limitations, reproducibility):
  updated as one unified product narrative covering diagnostics, NEWNYM rate
  limits, GUI coverage boundaries, and the per-OS test matrix.
- `tor-cli/index.html` (static showcase): refreshed in place with the new
  commands, GUI recipes, exit-code contract, platform matrix, and doc links;
  visual-only verification (1440/390 px screenshots, zero 404s, copy-button
  and anchor interaction by hand).

## Test Matrix

- Hermetic Go suites (no root, no firewall, no network): existing 30-plus
  unit tests stay green; new tests cover verbose rendering (golden), NEWNYM
  rate-limit handling against a fake control server, doctor JSON contract
  against stub probes, GUI classifier tiers (basename table, headless
  bypass, ack gate), and detach-vs-wait exit-code contracts with stub
  binaries (short-lived CLI exits with code passthrough; long-lived GUI stub
  returns promptly in detach mode).
- Control-protocol fuzz (bounded, seeded): existing parser fuzz extended to
  the new GETINFO getters; 20 s clean required.
- Cross-compile and vet: `make build`, `make vet`, `make cross`
  (linux/darwin amd64+arm64, windows amd64) plus GOOS=darwin/windows vet.
- Real 3-OS runs (Tester plus per-OS specialists, never mocks as substitute):
  CLI verbs against a live tor where available; Firefox and Falkon launched
  detached on Linux, macOS, and Windows with stopwatch proof (prompt returns,
  browser window opens, exit IP verified where the app honors the route);
  system-wide connect/disconnect only on Linux with root; off-Linux honest
  exit-4 probes.
- Site evaluation (Evaluator gate): serve tor-cli/index.html locally,
  screenshot desktop and mobile viewports, click every anchor and copy
  button by hand, confirm zero 404s on doc links; live-run evidence file
  required, no HTML unit suites.
