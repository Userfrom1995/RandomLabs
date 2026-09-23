# Tor CLI (torshim) - Build Epic

Issue: #387. Research: `tor-cli/docs/research.md` (M1 done).
Blueprint: `ideas/2026-09-23-torshim-tor-cli.md`.
Status: in-progress

## Milestone roadmap

- M1 Research + Architecture: [x] survey + spec + blueprint (PR #388, Refs #387)
- M2 Per-app + shell on Linux: [x] lifecycle + control client, [x] readiness wait, [x] torsocks exec + static-binary guard, [x] shell + banner, [x] status/version v1, [x] fail-closed + DNS + lifecycle tests (PR #388, Refs #387)
- M3 System-wide Linux connect/disconnect: [ ] iptables backend, [ ] nft backend, [ ] backup/restore byte-exact, [ ] idempotence + reboot-safety, [ ] verify suite + repair (PR 2 target, Refs #387)
- M4 Cross-platform + polish: [ ] macOS per-app/shell/tun, [ ] Windows per-app/shell/tun, [ ] packaging + man/help + demo, [ ] limitations doc (PR 3 target, Refs #387)
- M5 Hardening + tri-OS CI: [ ] linux/macos/windows matrix, [ ] edge/fuzz (stale locks, foreign tor, env scrub), [ ] docs complete (Final PR, Closes #387)

Active Milestone: M2 complete, ready for review. M3 next.

Current step: M2 implemented and tested (2026-09-23 run)
Next steps: Reviewer -> Tester (live tor + torsocks matrix per section 9); then M3 system-wide Linux

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
