# torshim M2 build notes - per-app + shell on Linux

Date: 2026-09-23. Issue: #387. Blueprint: `ideas/2026-09-23-torshim-tor-cli.md`.
Track: End-User Product (CLI tool). Language: Go, stdlib only.

## What was built

M2 implements the active milestone on the existing epic branch
(`opencode/issue387-20260923193923`, PR #388): private tor lifecycle, control
client, readiness gating, torsocks per-app exec with a static-binary guard,
isolated child shells with a coverage banner, and honest status/version.

## Key files

- `tor-cli/main.go` - dispatch (`run`, bare `<app>`, `shell`, `status`,
  `version`); `connect`/`disconnect` exit 4 with an M3 pointer (no stubs).
- `tor-cli/internal/control/control.go` - PROTOCOLINFO, cookie AUTH (515 maps
  to ErrBadAuth = foreign, reuse-never-kill), GETINFO, TAKEOWNERSHIP +
  RESETCONF, bootstrap/circuit parsing (only PROGRESS numeric + TAG=done
  trusted).
- `tor-cli/internal/lifecycle/lifecycle.go` - torrc gen (loopback auto ports +
  WriteToFile, cookie auth, SafeSocks), Launch (STARTING gate requires port
  files AND cookie file, beating the listener-without-cookie race), WaitReady
  (binding gate), Detect (real SOCKS5 handshake, not TCP-open), Stop
  (close-first, SIGTERM grace, SIGKILL; foreign never signaled).
- `tor-cli/internal/perapp/perapp.go` - torsocks conf profile, libtorsocks
  discovery, ELF PT_INTERP static guard (scripts resolve to interpreter),
  fail-closed Run.
- `tor-cli/internal/shell/shell.go` - child shell, TORSHIM_ACTIVE=1, PS1
  prefix, binding coverage banner.
- `tor-cli/internal/status/status.go` - absent/unknown never protected.
- `tor-cli/README.md` - usage, layout, trademark disclaimer.

## Decisions

- Default is a private owned instance; `--reuse` reuses a foreign tor only
  when cookie auth succeeds and the readiness gate passes, else fails closed.
  Rationale: an unverifiable foreign tor must never be trusted blindly.
- `connect`/`disconnect` are explicit exit-4 errors, not omitted commands:
  discoverable and honest, claiming nothing.
- No landing-page or root README updates in M2: intermediate milestone
  (`Refs #387`); public-surface sync happens at the final milestone.

## Verification

`go build`, `go vet`, `go test ./...` all green (control fakes, ELF guard
probes, torrc/handshake/readiness/banner/status-honesty tests). Live `tor` +
`torsocks` absent in this container, so lifecycle-against-real-tor and the
M2 demo transcript stay Tester scope per the section-9 matrix.
