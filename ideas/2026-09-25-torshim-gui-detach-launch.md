# torshim GUI Detach Launch: fixing the browser hang

## Summary

`torshim run -- <browser>` hung forever for Firefox and Falkon: the
per-app path used `cmd.Run` unconditionally, which blocks until the
child exits, and browsers never exit. This phase splits supervision
into wait (CLI default) and detach (GUI path) with zero change to
routing or environment, adds a GUI-aware classification tier with a
headless bypass and a proxy-backend acknowledgment gate, and refuses
bare GUI runs with detach guidance (exit 2) instead of hanging.

## Why

The hang was architectural, not a timeout tuning issue: no timeout
could fix "block until a never-exiting process quits" without also
killing legitimate long sessions. The split preserves both uses:
short-lived tools keep blocking semantics with signal forwarding and
exit-code passthrough, while browsers release the prompt at once with
a PID report. The pre-tor gate placement matters: refusal costs
nothing (no tor launched), and headless automation keeps working
untouched on the wait path.

## How it works

- Classification (`internal/perapp/gui.go`): exact lowercased basename
  match against nine browser names; `LooksHeadless` scans argv for
  headless/screenshot/dump verbs and drops those runs to CLI class.
  Exact-only by decision: prefix guessing would conscript unrelated
  helpers into GUI supervision, while a missed binary fails safe onto
  the wait path with an explicit `--detach` escape hatch.
- Wait path: child in its own process group, parent forwards
  SIGINT/SIGTERM to the group (Unix `kill(-pid)`; direct signal on
  Windows), `cmd.Wait`, exit code passthrough.
- Detach path: new session (setsid on Unix), stdin null, stdout/stderr
  null or `--log-file` append, `Start`, bounded alive poll (2 s
  default): early exit becomes an error naming the exit code (no stale
  PID), survival becomes `Release` plus a PID report line from main
  (`launched <app> (pid N) detached via <backend>; prompt returned`).
- Gate (`main.go gateGUILaunch`, before `ensureTor`): interactive GUI
  without `--detach` exits 2 with the exact re-run line; proxy-backend
  GUI additionally requires `--acknowledge-gui-risks`; `--detach` and
  `--wait` are mutually exclusive; `--log-file` requires `--detach`.

## Key files

- `tor-cli/internal/perapp/gui.go`, `launch.go`, `spawn_unix.go`,
  `spawn_windows.go`, `gui_test.go`, `launch_test.go`
- `tor-cli/main.go` (`parseLaunch` flags, `gateGUILaunch`,
  `printDetached`, unified `RunWithOptions`/`RunProxyWithOptions` call)
- `tor-cli/tests/tester_phase3_gui_test.go` (6 hermetic black-box)
- `tor-cli/README.md`, `tor-cli/torshim.1`, `tor-cli/docs/limitations.md`

## Notes

- Live evidence this run: real `/usr/bin/firefox` bare run exits 2
  instantly; `--detach` and headless both clear the gate (exit 3,
  tor absent on runner). Unit detach of a 30 s sleeper returns in
  0.3 s with PID; early-exit-3 child surfaces as error; log marker
  reaches `--log-file`.
- Deferred honestly: full detached-browser-under-live-tor on
  macOS/Windows and Falkon (no tor binary, no Falkon on this runner)
  belong to the Tester plus per-OS specialists with real displays.
- No ` tor` reimplementation, no new dependencies (stdlib only), all
  five cross targets compile, darwin/windows vet clean.
