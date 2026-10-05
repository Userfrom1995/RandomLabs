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
  shared JSON envelope.
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
go test ./...
```

Run the interactive shell with `go run ./cmd/tb` inside a real terminal.
`q` quits, `/` edits the address (http(s) URLs fetch live, `fixture://`
stays local), `?` shows keys. Sessions and the MCP server land as the
control-plane subsystems grow.

## Layout

- `cmd/tb/` - interactive frontend, fixture renderer, and live URL painter.
- `cmd/tb-agent/` - agent CLI twin with JSON envelopes.
- `internal/term/` - probe, frame compositor, FPS governor, input codecs.
- `internal/gfx/` - Kitty, Sixel, iTerm2, and block painters plus tier order.
- `internal/tui/` - tab strip, address bar, status line, profile picker.
- `internal/demo/` - fixture pages and the local router.
- `internal/engine/` - Chrome locator plus launcher, CDP session, AX style
  plus reflow, navigation with lite blocklists and offline fail-closed.
- `docs/` - architecture, engine policy, verification notes.
- `tests/` - static gate (`test_terminal_browser.py`), offline fixtures.
