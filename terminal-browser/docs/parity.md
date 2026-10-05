# Agent control plane: parity matrix and conformance

One dispatch serves both agent surfaces: the `tb-mcp` stdio server
and the `tb-agent` CLI execute the exact same tool functions in
`internal/agent` against the same session manager. CLI JSON equals
MCP results by construction; the conformance script only
canonicalizes run-scoped values (timings, gens, handles, file paths)
and asserts the rest is identical.

## The 12-tool core

| MCP tool | CLI twin | Envelope data |
|---|---|---|
| `navigate` | `interact` op `navigate` | `{gen, stable, url, title, refs, count}` plus `session` on implicit open |
| `snapshot` | `interact` op `snapshot` | `{gen, stable, url, title, refs, count}` |
| `click` | `interact` op `click` | `{gen, refs, url}` after re-settle |
| `type` | `interact` ops `type`, `fill` | `{gen, refs, url, typed}` after re-settle |
| `press_key` | `interact` ops `press_key`, `press` | `{gen, refs, url, pressed}` after re-settle |
| `scroll` | `interact` op `scroll` | `{dx, dy}` |
| `screenshot` | `interact` op `screenshot` | `{path, sha256, bytes, width, height}` |
| `wait_for` | `interact` ops `wait_for`, `wait` | `{cond, actual}` |
| `assert` | `interact` op `assert` | `{cond, actual}`; failure is `assert_failed` |
| `evaluate` | `interact` op `evaluate` | `{value}` (truncated past 4000 chars) |
| `console` | `interact` op `console` | `{entries, count, cleared}` |
| `dialog_handle` | `interact` ops `dialog_handle`, `dialog` | `{gen, refs, url, dialog}` after re-settle |

Ref spelling is identical on both surfaces: `e3` or `@e3` with an
optional pinned `gen`. Stale gens fail closed with `ref_stale` plus
`{want, gen, current_gen, reason, remap}` on both.

## Session and tab utilities

| MCP tool | CLI twin | Notes |
|---|---|---|
| `session_open` | `interact` first op (or `--url`) | New handle plus its own sidecar; CLI keeps one session per run |
| `session_list` | `tb-agent sessions` (registry) / op | MCP lists live handles; CLI lists recorded sessions with endpoint probes |
| `session_use` | n/a (single-session CLI run) | MCP-only; CLI runs address one session |
| `session_close` | n/a (run end closes) | MCP-only; CLI closes on exit |
| `back` / `forward` | `interact` ops `back` / `forward` | Stack move without forking; edge is `moved:false`, not an error |
| `reload` | `interact` op `reload` | Reload without duplicating history |
| `hints` | `interact` op `hints` | Current-gen refs without re-fetching |
| `network` | `interact` op `network` | HAR-1.2 entries plus in-flight count |
| `capabilities` | `tb-mcp` only | Enabled caps plus registered tool names |

## Gated capabilities

`pdf` and `trace` register only when enabled via `--caps` or
`TB_CAPS`. Disabled calls fail closed with `capability_disabled` on
both surfaces; `tools/list` omits them so agents never plan around
tools they cannot call.

| Tool | CLI twin | Envelope data |
|---|---|---|
| `pdf` | `interact` op `pdf` (needs `--caps pdf`) | `{path, bytes}` |
| `trace` | `interact` op `trace` (needs `--caps trace`) | `{path, bytes, events}` |

`extension_trigger` and `webmcp` parse as known capability names
(so scripts cannot typo them) but register no tool until the Phase 6
extension engine exists. No facade controls ship in the meantime.

## CLI-only extended ops

`hover`, `select`, `check`, `drag`, `upload`, and `cursor` stay
CLI/TUI-only until a later phase promotes them to MCP tools. They run
the same engine calls with the same settle and error shapes; they
simply have no MCP name yet.

## Canonicalization rules

The conformance script (`tests/test_agent_parity.py`) runs one task
script through both surfaces and compares per-step data after:

- dropping timings: `ms`, `cold_ms`, `total_ms`, `time_ms`, durations;
- mapping run-scoped ids to fixed tokens: snapshot `gen` values to
  `G`, MCP session handles (`s1`, ...) to `H`, CLI `handle` likewise;
- dropping server-side paths (`path`, `out`, `file`, `offloaded`)
  while keeping content hashes (`sha256`);
- dropping `started_unix`, endpoint URLs, and probe errors from
  session listings;
- comparing PDF rows on `success`/`code` only (byte counts embed
  timestamps).

Everything else (refs, roles, names, counts, conditions, actuals,
codes, warnings) must be identical. Any drift fails the matrix.

## Running conformance

```sh
python3 tests/test_agent_parity.py
```

The script serves a local two-page site, drives it once through
`tb-mcp` tool calls and once through `tb-agent interact --script`
with the equivalent ops, and reports PASS/FAIL per matrix row. It
needs the Go toolchain and Chrome; without either it skips with a
clear message instead of a false red.
