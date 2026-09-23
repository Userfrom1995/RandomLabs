# torshim M4 - macOS/Windows per-app + shell via proxy env, packaging

Date: 2026-09-23. Issue: #387 (Refs, intermediate milestone). Branch:
`opencode/issue387-tor-cli-m4`. Prior: M1 spec, M2 per-app+shell Linux,
M3 system-wide Linux (all merged to main).

## What was built and why

M4 ports per-app and shell modes to macOS and Windows behind the common
CLI, without a fake DYLD/LSP shim. Research ruled those out (SIP strips
DYLD_INSERT_LIBRARIES from system binaries, making coverage silently
partial; a WFP driver is out of scope for a lightweight wrapper), so M4
routes through `socks5h://` proxy environment with an honest, narrower
but knowable boundary. System-wide on macOS/Windows stays an honest
exit-4 pointing at the M5 tun2socks path - no facade.

## How it works (key files)

- `tor-cli/internal/perapp/proxy.go` (new): `ProxyURL` (socks5h,
  remote DNS binding), `ProxyEnv` (drops parent proxy-owned keys first
  so a stale ALL_PROXY cannot shadow the Tor value - same duplicate
  class as the M2 shim-dedup fix), `CoverageNote` (printed to stderr on
  every proxy launch), `NeedsProxy` (GOOS != linux), `RunProxy`
  (LookPath + stat, fail-closed on empty argv / empty SOCKS / missing
  binary; no ELF classification - proxy applies at app layer).
- `tor-cli/internal/perapp/perapp.go`: `Run` dispatches to `RunProxy`
  off-Linux; Linux torsocks path byte-unchanged.
- `tor-cli/internal/perapp/proxy_test.go` (new): socks5h scheme,
  shadow-key dedup, evil-extra filtering, note honesty keywords,
  NeedsProxy/GOOS consistency, RunProxy fail-closed triple.
- `tor-cli/main.go`: `cmdRun` skips the torsocks conf dir on proxy
  platforms; `cmdShell` goes straight to proxy env off-Linux (no
  misleading "torsocks not found" noise); `usage` rewritten for M4
  reality; `syswideUnsupported` names the M5 tun2socks path per OS.
  `version` prints platform + per-app mechanism + system-wide support.
- `tor-cli/internal/version/version.go`: `Wrapper 0.3.0-m4`, new
  `Platform`/`PerApp`/`Syswide` fields; torsocks reports `n/a
  (proxy-env backend ...)` off-Linux instead of misleading "unknown".
- `tor-cli/Makefile` (new): build/test/vet/cross/install/uninstall/clean.
- `tor-cli/torshim.1` (new): full man page (commands, options, exit
  codes 0/1/2/3/4, limitations, trademark).
- Docs: `limitations.md` M4 (macOS/Windows per-app real + gaps, syswide
  M5), `threat-model.md` M4 delta (proxy covers less than shim;
  mitigation is honesty + socks5h + scrubbing), `README.md` (M4 intro,
  make targets, layout, runtime deps corrected: tor everywhere,
  torsocks Linux-only).

## Verification

`go build/vet/test ./...` green; `make cross` compiles all five
targets (linux amd64+arm64, darwin amd64+arm64, windows amd64).
New proxy tests green alongside the existing M2/M3 suites (hermetic,
no root/tor needed). Live CLI smoke: `version` shows new fields.

## Notes / next (M5)

M5 (final, Closes #387): tri-OS CI matrix, edge/fuzz (stale locks,
foreign tor, env scrub), tun2socks spike or documented M5 scope cut
for system-wide off-Linux, docs complete + reproducibility.
