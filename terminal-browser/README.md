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
  `dialog_handle`), session handles, and gated `pdf`/`trace`/
  `extension_trigger`/`webmcp` capabilities; `tb-agent interact`
  runs the same tools from scripts, `--stdin` pipes, and `--out`
  offload, with parity conformance proving both surfaces identical.
- Extensions and page tools: installed content-script extensions
  running in sandboxed isolated worlds with a shell palette (`X`)
  and agent triggers, page-exposed `window.__tbWebMCP` tools, media
  region sampling (`tb-agent media`, `V` in the shell) with a
  bandwidth ledger, and per-OS hardening (Windows ConPTY chain,
  long-path roots, multiplexer fallback).
- Sessions: per-profile cookie jar synced from CDP Storage (push
  pre-load, merge post-load), durable history with search, bookmarks,
  persisted back/forward stack with `H`/`L` and `r` reload,
  restore-on-restart, portable state files, `p` profile cycling.
- Motion and shell states: Signal Ledger v2 ticks (33/50/100 ms),
  dirty-rows-only repaint, anchored viewport cuts with strobe
  grouping, and a reduced-motion path (`--reduced-motion`,
  `REDUCED_MOTION=1`); empty new-tab card, honest error card with
  retry actions, blocked-scheme card for refused schemes, `<` `>`
  address windowing, dialog trap with `Esc` break plus `M` mute.
- Verification harness: `tb-verify` runs the five-page live corpus
  with 3-attempt retry, Chrome 140 floor check, hermetic goldens,
  offline-fixture fallback that never reports live, and an
  agent-as-user end-to-end pass; see `docs/verification.md`.
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
go run ./cmd/tb-verify --hermetic
go test ./...
```

Run the interactive shell with `go run ./cmd/tb` inside a real terminal.
`q` quits, `/` edits the address (http(s) URLs fetch live, `fixture://`
stays local), `H`/`L` step back/forward, `r` reloads, `p` switches
profile, `:` opens the ref drawer on live pages (`eN` plus `Enter` acts,
`f` fills, `R` remaps stale refs), `X` opens the extension palette,
`V` watches page video, `?` shows keys. Full session detail
lives in `docs/sessions.md`; the interaction loop lives in
`docs/interact.md`; the MCP server and CLI reference lives in
`docs/agent-control.md` with the parity matrix in `docs/parity.md`;
extensions and platform support live in `docs/extensions.md` and
`docs/support.md`.

## Layout

- `cmd/tb/` - interactive frontend, fixture renderer, and live URL painter.
- `cmd/tb-agent/` - agent CLI twin with JSON envelopes.
- `cmd/tb-mcp/` - stdio MCP server with the 12-tool core and session handles.
- `internal/term/` - probe, frame compositor, FPS governor, input codecs.
- `internal/gfx/` - Kitty, Sixel, iTerm2, and block painters plus tier order.
- `internal/tui/` - tab strip, address bar, status line, profile picker,
  Harbor hint chips plus ref drawer with live act bindings, extension
  palette, background media watch.
- `internal/demo/` - fixture pages and the local router.
- `internal/engine/` - Chrome locator plus launcher, CDP session, AX style
  plus reflow, navigation with lite blocklists and offline fail-closed,
  session stores (cookies, history, bookmarks, stack, state files),
  persistent interaction browser (settled refs, acts, waits, taps,
  screenshots, PDF, CDP tracing), content-script extensions with
  isolated worlds, page tool surface, media sampler, per-OS paths.
- `internal/agent/` - shared control-plane dispatch (12-tool core,
  session manager, capability gates, step runner, session registry).
- `cmd/tb-verify/` - live corpus runner with retry, goldens,
  offline fallback, and the agent-as-user end-to-end pass.
- `examples/` - runnable sample extension with manifest and script.
- `docs/` - architecture, engine policy, sessions, interaction loop,
  agent control, parity matrix, extensions, platform support,
  verification notes.
- `tests/` - static gate (`test_terminal_browser.py`), offline fixtures.
