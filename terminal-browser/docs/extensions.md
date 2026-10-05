# Extensions and page tools

Extensions are small page helpers: a manifest plus content scripts
that publish page actions, running in a sandboxed isolated world per
extension. Pages can also expose their own agent-callable tools
through a tiny JavaScript contract. Humans fire page actions from the
shell palette (`X`); agents fire the identical actions through the
`extension_trigger` tool and page tools through `webmcp`. Same
engine, same results.

## Installing

Extensions live under the extensions root (`~/.terminal-browser/extensions/`,
or `$TB_HOME/.terminal-browser/extensions/`), one subdirectory per
extension holding `manifest.json` plus its scripts:

```sh
tb-agent extensions --list
tb-agent extensions --check ./my-extension
tb-agent extensions --list --url https://example.com/
```

`--list` inventories every install with warnings for broken ones;
`--check` validates a directory before installing (bad manifests fail
with `bad_ext`); `--url` opens a session and adds the page actions in
scope for that page. Every browser auto-loads all installed
extensions at open; broken installs never fail the open, they land in
the warning list the `extension_trigger` list mode reports.

## Manifest format

```json
{
  "id": "minimal-reader",
  "name": "Minimal Reader",
  "version": "1.0.0",
  "matches": ["*"],
  "scripts": ["reader.js"],
  "actions": [{"id": "summarize", "title": "Summarize page headings and links"}]
}
```

`id` (and every action `id`) is `[a-z0-9_-]`, leading alphanumeric,
max 64 chars. `matches` scopes URLs: `"*"` runs everywhere, any
other entry is a case-insensitive substring (`"example.com/form"`
scopes one section). Omitted `matches` means `["*"]`. `scripts` are
relative paths inside the extension directory (no traversal, 256 KiB
each). Every action needs a `title`; `run` names the published
function and defaults to the action id. Unknown manifest fields fail
validation so typos never ship a half-understood manifest. A runnable
sample lives in [examples/minimal-reader](../examples/minimal-reader/manifest.json).

## Content scripts and sandboxing

Each content script injects into a dedicated isolated world per
extension (`Page.createIsolatedWorld` on the main frame, world name
`tb_<id>`): extension globals never collide with page globals or with
other extensions, while the DOM stays shared so actions can read and
drive the page. Worlds die on navigation, so the browser re-creates
and re-injects them when the URL changes; injection failures surface
as errors, never silent empty lists.

A script publishes actions by assigning them inside its world:

```js
window.__tbActions = {
  summarize: function (args) {
    return {title: document.title, headings: [...]};
  }
};
```

Every declared action must exist after injection or the load fails
with the missing name. Triggering calls the named function with the
caller-supplied JSON args (validated before evaluating) and returns
its JSON value, truncated past 4000 chars like `evaluate`. Script
errors and console output land in the console tap with a
`tb-ext-<id>/<file>` source URL, so failures are debuggable through
the normal `console` tool.

## Page actions from the shell

On a live page, `X` opens the extension palette: the actions in
scope for the current URL, two rows with `j`/`k` focus, `[`/`]`
paging, `Enter` to run, `Esc` to close. Running re-settles exactly
like a ref click (fresh snapshot, chips track the new gen) and the
status line carries the `ext:N` count. Injection errors show in the
palette title instead of an empty list.

## Agent tools

Both tools are capability-gated (`--caps extension_trigger,webmcp`
or `TB_CAPS`) and ride the shared dispatch, so the CLI
(`interact` ops) and MCP results are identical:

| Tool | Args | Returns |
| --- | --- | --- |
| `extension_trigger` | `extension`, `action`, optional `args` (JSON object string) | `{extension, action, value}` after re-settle |
| `webmcp` | `tool`, optional `args` | `{tool, value}` after re-settle |

Empty `extension` lists the inventory (`extensions`, `actions`,
`warnings`, `count`); empty `tool` lists the page surface. Unknown
extensions, actions, or page tools fail closed with `bad_step`;
runtime failures carry the usual act codes. Full matrix in
[parity](parity.md); server and CLI reference in
[agent-control](agent-control.md).

## Page tool contract (`webmcp`)

A page opts in by exposing:

```js
window.__tbWebMCP = {
  tools: [{name: "echo", description: "Return the args back"}],
  call: function (name, args) { return args; }
};
```

`webmcp` with no tool lists `tools`; with a tool, the page `call`
handler runs (async handlers are awaited) and its return value comes
back as JSON. A page without the surface fails closed with an
actionable message, never an empty success.

## Media regions

Pages with `video`, `img`, or `canvas` regions sample on a
governor-paced tick: `tb-agent media --url URL` discovers regions
(largest video first, `--index N` overrides), watches `--seconds`
(clamped 1..30), and logs the bandwidth ledger (`--out`, defaulting
to the media log) with frames, PTY bytes, skipped ticks, and measured
fps. The animated path samples every 100 ms for 10 fps through a
persistent Kitty transmitter (transmit-once plus placement: identical
repeats place without re-transmit, distinct frames transmit each
tick); still
mode repaints at most every 2 s. Ticks that overrun their interval
are skipped and counted, never queued. In the shell, `V` watches the
largest video in the background (status line shows fps and bytes,
`V` again stops and logs); the loop composes the latest frame over
the grid through the same degrade chain.
