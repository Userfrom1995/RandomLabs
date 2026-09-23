# Tor CLI (torshim) - Build Epic

Issue: #387. Research: `tor-cli/docs/research.md` (M1 done).
Blueprint: `ideas/2026-09-23-torshim-tor-cli.md`.
Status: in-progress

## Milestone roadmap

- M1 Research + Architecture: [x] survey + spec + blueprint (PR #388, Refs #387)
- M2 Per-app + shell on Linux: [x] lifecycle + control client, [x] readiness wait, [x] torsocks exec + static-binary guard, [x] shell + banner, [x] status/version v1, [x] fail-closed + DNS + lifecycle tests (PR #388, Refs #387)
- M3 System-wide Linux connect/disconnect: [x] iptables backend, [x] nft backend, [x] backup/restore byte-exact, [x] idempotence + reboot-safety, [x] verify suite + repair (PR 2 target, Refs #387)
- M4 Cross-platform + polish: [x] macOS per-app/shell via proxy env, [x] Windows per-app/shell via proxy env, [x] version platform backends, [x] Makefile + man page + help polish, [x] limitations/threat-model/README M4 (PR 3 target, Refs #387)
- M5 Hardening + tri-OS CI: [ ] linux/macos/windows matrix, [ ] edge/fuzz (stale locks, foreign tor, env scrub), [ ] docs complete (Final PR, Closes #387)

Active Milestone: M4 complete, ready for review. M5 next.

Current step: M4 implemented and tested (2026-09-23 run)
Next steps: Reviewer -> Tester (hermetic suite + live root/tor matrix per limitations.md); then M5 hardening + CI

## Agent log

- 2026-09-23 Builder M4: proxy-env per-app backend (proxy.go: socks5h
  URL, shadow-key scrub, coverage note on every launch, NeedsProxy
  dispatch, RunProxy fail-closed) + proxy_test.go, main.go platform
  wiring (conf-dir skip, direct proxy shell, M4 usage, per-OS exit-4
  pointer), version 0.3.0-m4 with platform/per-app/syswide fields,
  Makefile + torshim.1 man page, limitations/threat-model/README M4,
  ideas entry. Full suite + 5-target cross green; no root/tor needed.
  System-wide off-Linux stays honest exit 4 (M5 tun2socks path).
- 2026-09-23 Builder M3: syswide package (iptables + nft backends,
  ActiveState under /run/torshim, snapshot-first backup, 5-row verify
  with rollback, repair, status probe), lifecycle TransPort + RunAs +
  TempParent + per-OS shims (linux/darwin/windows/arm64 all compile),
  connect/disconnect/repair wiring with exit-3 verify gate, status
  system mode (never claims protected when not), threat-model +
  limitations docs, README + ideas M3 entry. 15 hermetic syswide tests
  + torrc + black-box contract tests green; no root/tor needed.
  `connect` on macOS/Windows exits 4 honestly (M4).

## Agent log

- 2026-09-23 Builder M2: Go stdlib CLI (main + control/lifecycle/perapp/shell/
  status/version), 30+ unit tests green (fake control server, synthetic ELF
  guard, torrc, handshake, readiness timeout, banner, status honesty).
  `connect`/`disconnect` exit 4 (M3 pointer, no stubs). Default private owned
  instance; `--reuse` only when cookie-verifiable. No root index/README
  changes (intermediate milestone, Refs #387).

## Binding constraints (from research)

Go static binary; private DataDirectory + auto ports + cookie auth +
`__OwningControllerProcess`/`TAKEOWNERSHIP`; readiness = bootstrap 100%
+ circuit-established (+ optional live check); torsocks default on Linux
with static-binary fail-closed; socks5h env on macOS/Windows (no DYLD/LSP
product path); DNS always via Tor (A/AAAA/PTR); v6 mirrored or blocked;
status never claims protected when not; trademark disclaimer on surfaces.
