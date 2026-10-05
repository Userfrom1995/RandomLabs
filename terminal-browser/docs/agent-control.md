# Agent control: MCP server and CLI reference

Anything a human can do in the shell, an agent can do through the
control plane: navigate, snapshot settled refs, click, type, press
keys, scroll, screenshot, wait, assert, evaluate JS, read console
output, answer dialogs, run installed extension page actions, and
call page-exposed tools. Both surfaces share the envelope
`{success, data, warning?, code?}` and the fail-closed codes
(`ref_stale`, `ref_not_found`, `no_session`, `bad_step`,
`capability_disabled`, `assert_failed`, `offline`, `no_media`,
`bad_ext`, ...).

## MCP server (`tb-mcp`)

Stdio JSON-RPC 2.0 (newline-delimited). Methods: `initialize`,
`tools/list`, `tools/call`, `ping`; notifications carry no `id` and
get no reply.

```json
{"jsonrpc":"2.0","id":1,"method":"initialize","params":{}}
{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}
{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{
  "name":"session_open","arguments":{"url":"https://example.com/"}}}
{"jsonrpc":"2.0","id":4,"method":"tools/call","params":{
  "name":"click","arguments":{"ref":"e2"}}}
```

Tool results arrive as one text block holding the envelope JSON;
failures set `isError: true`. Sessions are handles (`s1`, `s2`,
...), each with its own Chromium sidecar; every tool except
`session_open` runs against the active handle.

Flags: `--caps` (e.g. `pdf,trace,extension_trigger,webmcp`),
`--profile`, `--lite`, `--width`, `--dialog-policy`. `TB_CAPS`
merges with `--caps`. Unknown capability names fail the launch
instead of silently narrowing the surface.

Client configuration (Claude Code, Cursor, any MCP host):

```json
{"mcpServers": {"terminal-browser": {
  "command": "tb-mcp",
  "args": ["--caps", "pdf,trace,extension_trigger,webmcp"],
  "env": {"TB_HOME": "/home/you/.terminal-browser"}
}}}
```

The gated extension tools run installed content-script page actions
(`extension_trigger`) and page-exposed `window.__tbWebMCP` tools
(`webmcp`); both re-settle like clicks, and both list their inventory
when called with an empty name. Full detail in
[extensions](extensions.md); the tool matrix lives in
[parity](parity.md).

## Agent CLI (`tb-agent interact`)

One-shot scripts against one persistent browser per invocation:

```sh
tb-agent interact --url https://example.com/ --script steps.json
tb-agent interact --url https://example.com/ \
  --do '{"op":"snapshot"}' \
  --do '{"op":"click","ref":"@e4"}'
echo '{"op":"snapshot"}' | tb-agent interact --url URL --stdin
tb-agent interact --url URL --script big.json --outrun.json
tb-agent interact --url URL --session shop --do '{"op":"snapshot"}'
tb-agent sessions
tb-agent sessions --prune
```

`--script` takes a JSON array (or NDJSON); `--stdin` reads steps
from a pipe for jq-style producers; `--do` repeats. `--out FILE`
tees the full envelope to a 0600 file for large transcripts.
`--session NAME` names the run in the envelope and registers it for
`tb-agent sessions`, which probes each recorded sidecar endpoint live
(`alive` is measured, never cached). `--caps` enables `pdf`/`trace`
plus the extension tools (`extension_trigger`/`webmcp`);
`--dialog-policy` picks `manual`, `accept`, or `dismiss`.

Two more commands round out the surface:

```sh
tb-agent extensions --list
tb-agent extensions --check ./my-extension
tb-agent extensions --list --url https://example.com/
tb-agent media --url https://example.com/video --seconds 5
```

`extensions` inventories installs, validates manifests, and (with
`--url`) scopes page actions to a live page; `media` samples a page
media region on the governor tick and logs bandwidth. Detail in
[extensions](extensions.md).

Legacy op spellings (`fill`, `press`, `wait`, `dialog`) still parse
to their canonical tools, and the CLI keeps extended ops (`hover`,
`select`, `check`, `drag`, `upload`, `cursor`) ahead of MCP
promotion. Tool matrix and conformance rules live in
[parity](parity.md).
