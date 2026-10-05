# Terminal Browser Phase 5: agent control plane (MCP server plus CLI parity)

## What it is

The agent-first control plane for the terminal browser: a stdio MCP
server (`tb-mcp`) and a matching `tb-agent` CLI surface that execute
the exact same tool functions through one shared dispatch
(`terminal-browser/internal/agent`), so CLI JSON equals MCP results
by construction. Twelve core tools, session handles with one
Chromium sidecar each, capability-gated `pdf`/`trace`, a parity
matrix with a canonicalizing conformance harness, and the docs to
drive it.

## Why this shape

The epic blueprint fixed the 12-tool core by name (`navigate`,
`snapshot`, `click`, `type`, `press_key`, `scroll`, `screenshot`,
`wait_for`, `assert`, `evaluate`, `console`, `dialog_handle`) plus
session/tab utilities and gated caps. The risky choice was how to
keep two surfaces identical without a translation layer drifting:
the answer is no translation layer at all. `agent.Execute` is the
only implementation; `tb-mcp` maps `tools/call` onto it and
`tb-agent interact` maps script ops onto it (with `fill`, `press`,
`wait`, `dialog` kept as aliases). The conformance script then only
canonicalizes run-scoped values (timings, gens, handles, paths,
backend node ids) instead of papering over semantic drift.

Sessions are real sidecars, not tabs in one renderer: `session_open`
launches a full browser per handle. That costs a Chrome per handle
but keeps profiles, jars, and stacks isolated with zero new
machinery, and matches how agents actually work (parallel tasks,
separate identities).

`extension_trigger` and `webmcp` deliberately register nothing: the
extension engine lands in Phase 6, and a tool that always errors
would be a facade control. They parse as known capability names so
scripts cannot typo them, and the gate framework is ready.

## How it works

- `internal/agent/agent.go`: capability parsing (`--caps` plus
  `TB_CAPS`, unknown names fail the launch), session `Manager`
  (open/use/list/close, active handle), tool `Registry` (core first,
  utilities next, gated caps only when enabled), and `Execute` with
  uniform arg coercion, pre-flight validation, re-settle after
  mutating tools, and renderer-navigation history recording.
- `internal/agent/steps.go`: the CLI op vocabulary onto tools
  (aliases, extended CLI-only ops `hover`/`select`/`check`/`drag`/
  `upload`/`cursor`, NDJSON plus array step parsing, halt codes).
- `internal/agent/sessions.go`: CLI session registry with live
  sidecar endpoint probes (`tb-agent sessions`, `--prune`).
- `internal/engine/trace.go`: CDP tracing capture behind the
  `trace` gate (clamped 1..30 s, 0600 output).
- `internal/engine/interact.go`: `NoteNavigation` (new) records
  renderer-side navigations from clicks and submits into history
  and the stack, plus an `Endpoint` accessor for the registry.
- `cmd/tb-mcp/main.go`: newline-delimited JSON-RPC 2.0
  (`initialize`, `tools/list`, `tools/call`, `ping`; notifications
  get no reply; unknown tools fail `bad_step`, disabled gates fail
  `capability_disabled`, both as `isError` tool results).
- `cmd/tb-agent`: `interact` refactored onto the dispatch with
  `--stdin`, `--out` offload (including failure envelopes),
  `--session`, `--caps`, lazy open for `session_open`/`navigate`
  first steps; new `sessions` command.
- Verification: `TestLiveMCPMultiPageTask` (agent drives index,
  link, fill, assert, screenshot, back/forward over MCP stdio),
  `TestLiveTraceCap`, hermetic framing plus registry tests,
  `tests/test_agent_parity.py` (12-row matrix green), `repro.sh`
  MCP/sessions/stdin/offload steps, static gate at 70+ tests.
- Docs: `docs/agent-control.md` (server plus CLI reference),
  `docs/parity.md` (matrix, canonicalization, conformance),
  unified updates to architecture, README, interact, index, hub.

## Key files

- `terminal-browser/cmd/tb-mcp/main.go` and `mcp_test.go`
- `terminal-browser/internal/agent/` (dispatch, steps, sessions, tests)
- `terminal-browser/internal/engine/trace.go`
- `terminal-browser/docs/parity.md` and `docs/agent-control.md`
- `terminal-browser/tests/test_agent_parity.py`

## Notes

Live verification ran against Chrome 152 on macOS (multi-page MCP
task, trace capture, full parity matrix, repro.sh). The
renderer-navigation history gap (link clicks never recorded the
stack, so `back` failed after any click) was found live and fixed
at the engine level, which also keeps the TUI consistent.
