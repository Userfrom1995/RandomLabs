# Tor CLI (torshim) - Build Epic

Issue: #387. Research: `tor-cli/docs/research.md` (M1 done).
Blueprint: `ideas/2026-09-23-torshim-tor-cli.md`.
Status: in-progress

## Milestone roadmap

- M1 Research + Architecture: [x] survey + spec + blueprint (PR #388, Refs #387)
- M2 Per-app + shell on Linux: [ ] lifecycle + control client, [ ] readiness wait, [ ] torsocks exec + static-binary guard, [ ] shell + banner, [ ] status/version v1, [ ] fail-closed + DNS + lifecycle tests (PR 1 target, Refs #387)
- M3 System-wide Linux connect/disconnect: [ ] iptables backend, [ ] nft backend, [ ] backup/restore byte-exact, [ ] idempotence + reboot-safety, [ ] verify suite + repair (PR 2 target, Refs #387)
- M4 Cross-platform + polish: [ ] macOS per-app/shell/tun, [ ] Windows per-app/shell/tun, [ ] packaging + man/help + demo, [ ] limitations doc (PR 3 target, Refs #387)
- M5 Hardening + tri-OS CI: [ ] linux/macos/windows matrix, [ ] edge/fuzz (stale locks, foreign tor, env scrub), [ ] docs complete (Final PR, Closes #387)

Active Milestone: M1 done, M2 next.

Current step: Ready for initial build (Milestone 2)
Next steps: Builder to implement Milestone 2 with real code and zero stubs

## Binding constraints (from research)

Go static binary; private DataDirectory + auto ports + cookie auth +
`__OwningControllerProcess`/`TAKEOWNERSHIP`; readiness = bootstrap 100%
+ circuit-established (+ optional live check); torsocks default on Linux
with static-binary fail-closed; socks5h env on macOS/Windows (no DYLD/LSP
product path); DNS always via Tor (A/AAAA/PTR); v6 mirrored or blocked;
status never claims protected when not; trademark disclaimer on surfaces.
