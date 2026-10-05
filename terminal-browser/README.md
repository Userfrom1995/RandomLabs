# Terminal Browser

An agent-first browser that runs completely in the terminal. One `tb`
process owns the grid, input, and layered graphics compositor; a headless
Chromium sidecar owns real-web fidelity over CDP. Humans and agents share
one control plane: anything the keyboard can do, the `tb-agent` CLI and
the MCP server can do identically.

## Current capabilities

- Terminal render core: capability probe (Kitty query, Sixel DA1, iTerm2
  capabilities, DEC 2026 sync, Kitty keyboard, SGR mouse) with re-probe
  on resize and `TB_TIER` override.
- Frame compositor with synchronized output, cursor-hide fallback, dirty
  rectangles, and an adaptive 10-30 fps governor (10 fps floor on Sixel
  and block paths).
- Layered painters with per-surface degrade: Kitty transmit-once and
  place, quantized Sixel regions, iTerm2 inline PNG stills, half-block
  truecolor diff with 256/16/ASCII fallbacks. `tmux` and `screen` force
  the block path.
- App shell: alternate screen, tab strip, address bar over the local
  `fixture://` router plus live http(s) fetch, status line, profile
  picker, mouse and keyboard input codecs, help overlay.
- Web engine: system-Chrome-first sidecar with headless fallback,
  per-profile contexts, stdlib CDP session (Page, Network, Runtime,
  Accessibility), lite-mode blocklists plus the full-resource path,
  AX-tree stylesheet with grid reflow (headings, links, tables, forms),
  cold 10 s and warm 3 s binding budgets, offline fail-closed errors.
- Agent CLI twin: `tb-agent probe`, `tb-agent render --fixture NAME
  --graphics-tier T`, and `tb-agent fetch --url URL [--lite]` emit the
  shared JSON envelope, plus the full session surface (`cookies`,
  `cookies-set`, `cookies-clear`, `history`, `history-clear`,
  `bookmark-add`, `bookmarks`, `bookmark-remove`, `session`,
  `session-back`, `session-forward`, `session-reload`, `state-save`,
  `state-load`, `sessions`) with `--profile` isolation.
- Agent control plane: `tb-mcp` stdio server with the 12-tool core
  (`navigate`, `snapshot`, `click`, `type`, `press_key`, `scroll`,
  `screenshot`, `wait_for`, `assert`, `evaluate`, `console`,
  `dialog_handle`), session handles, and gated `pdf`/`trace`
  capabilities; `tb-agent interact` runs the same tools from scripts,
  `--stdin` pipes, and `--out` offload, with parity conformance
  proving both surfaces identical.
- Sessions: per-profile cookie jar synced from CDP Storage (push
  pre-load, merge post-load), durable history with search, bookmarks,
  persisted back/forward stack with `H`/`L` and `r` reload,
  restore-on-restart, portable state files, `p` profile cycling.
- Built-in fixture pages (`fixture://home`, `fixture://article`,
  `fixture://table`) plus an honest error page for unknown addresses.

## Quickstart

```sh
cd terminal-browser
go build ./...
./tb --fixture home --tier block --dump-stats
./tb --url https://news.ycombinator.com/ --tier block --dump-stats
./tb-agent fetch --url https://news.ycombinator.com/ --lite
TB_TIER=sixel ./tb-agent render --fixture article
TB_HOME=/tmp/tb-demo ./tb-agent cookies-set --profile work --name sid --value abc --domain example.com
TB_HOME=/tmp/tb-demo ./tb-agent cookies --profile work
go test ./...
```

Run the interactive shell with `go run ./cmd/tb` inside a real terminal.
`q` quits, `/` edits the address (http(s) URLs fetch live, `fixture://`
stays local), `H`/`L` step back/forward, `r` reloads, `p` switches
profile, `:` opens the ref drawer on live pages (`eN` plus `Enter` acts,
`f` fills, `R` remaps stale refs), `?` shows keys. Full session detail
lives in `docs/sessions.md`; the interaction loop lives in
`docs/interact.md`; the MCP server and CLI reference lives in
`docs/agent-control.md` with the parity matrix in `docs/parity.md`.

## Layout

- `cmd/tb/` - interactive frontend, fixture renderer, and live URL painter.
- `cmd/tb-agent/` - agent CLI twin with JSON envelopes.
- `cmd/tb-mcp/` - stdio MCP server with the 12-tool core and session handles.
- `internal/term/` - probe, frame compositor, FPS governor, input codecs.
- `internal/gfx/` - Kitty, Sixel, iTerm2, and block painters plus tier order.
- `internal/tui/` - tab strip, address bar, status line, profile picker,
  Harbor hint chips plus ref drawer with live act bindings.
- `internal/demo/` - fixture pages and the local router.
- `internal/engine/` - Chrome locator plus launcher, CDP session, AX style
  plus reflow, navigation with lite blocklists and offline fail-closed,
  session stores (cookies, history, bookmarks, stack, state files),
  persistent interaction browser (settled refs, acts, waits, taps,
  screenshots, PDF, CDP tracing).
- `internal/agent/` - shared control-plane dispatch (12-tool core,
  session manager, capability gates, step runner, session registry).
- `docs/` - architecture, engine policy, sessions, interaction loop,
  agent control, parity matrix, verification notes.
- `tests/` - static gate (`test_terminal_browser.py`), offline fixtures.
