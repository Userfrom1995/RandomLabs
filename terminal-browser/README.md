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
  `fixture://` router, status line, profile picker, mouse and keyboard
  input codecs, help overlay.
- Agent CLI twin: `tb-agent probe` and `tb-agent render --fixture NAME
  --graphics-tier T` emit the shared JSON envelope.
- Built-in fixture pages (`fixture://home`, `fixture://article`,
  `fixture://table`) plus an honest error page for unknown addresses.

## Quickstart

```sh
cd terminal-browser
go build ./...
./tb --fixture home --tier block --dump-stats
TB_TIER=sixel ./tb-agent render --fixture article
go test ./...
```

Run the interactive shell with `go run ./cmd/tb` inside a real terminal.
`q` quits, `/` edits the address, `?` shows keys. Live web fetching,
sessions, and the MCP server land as the engine and control-plane
subsystems grow; the fixture router is local content only, by design.

## Layout

- `cmd/tb/` - interactive frontend and fixture renderer.
- `cmd/tb-agent/` - agent CLI twin with JSON envelopes.
- `internal/term/` - probe, frame compositor, FPS governor, input codecs.
- `internal/gfx/` - Kitty, Sixel, iTerm2, and block painters plus tier order.
- `internal/tui/` - tab strip, address bar, status line, profile picker.
- `internal/demo/` - fixture pages and the local router.
- `docs/` - architecture, graphics layering, verification notes.
- `tests/` - static gate (`test_terminal_browser.py`).
