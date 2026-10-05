# Terminal Browser

An agent-first full browser that runs completely in the terminal, end to end.
Real pages, real sessions, real graphics in the terminal grid, with humans and
AI agents holding identical capabilities through a shared control plane.

Target: Linux and macOS fully supported, Windows hardened with extra effort.
Quality bar: thoroughly tested as a user and as an agent against real-world
scenarios, with every advertised capability executing real logic against real
pages. No facade controls, no faux browsing claims.

## Summary

Terminal Browser (`terminal-browser/`) is a Go single-binary terminal browser:
a terminal UI shell owns the grid, input, and layered graphics compositor,
while a headless Chromium sidecar (system Chrome first, `chrome-headless-shell`
fallback) owns real-web fidelity over CDP. The terminal frontend never lays
out CSS itself; it converts the accessibility tree plus DOM snapshot into
styled rows and cells, with images and video regions painted through a
detect-and-degrade graphics stack. Sessions, cookies, history, and extensions
are real persistent subsystems, not labels. An MCP server plus an agent CLI
expose the identical capability surface humans get through the keyboard, with
a published parity matrix as the conformance contract.

## Deliverables

- `terminal-browser/` Go module: `tb` binary (TUI) plus `tb-agent` CLI twin
  entrypoints sharing one engine package.
- Terminal render core: capability probe, frame compositor with synchronized
  output, layered image paint (Kitty graphics, Sixel, iTerm2 inline, half-block
  ANSI fallback), adaptive FPS with dirty rectangles.
- Web engine path: Chromium sidecar manager (system-first launch, headless
  shell fallback), CDP session, AX-tree to terminal stylesheet, lite-mode
  resource blocking, full-resource media path.
- Session subsystem: profiles with isolated contexts, persistent cookie jar
  synced from CDP storage, SQLite history plus bookmarks, restore on restart.
- Extension subsystem: manifest loader, content-script sandbox, page-action
  hooks surfaced identically to humans and agents.
- Input loop: keyboard (Kitty keyboard progressive enhancement plus legacy),
  mouse SGR, cursor control, link hinting, scroll, form fill, dialogs.
- DOM loop: snapshot refs, evaluate, wait and assert polling, console and
  network taps, screenshots (viewport, full, element, annotated) and PDF.
- Agent control plane: stdio MCP server (core 12 tools plus gated caps),
  agent CLI with `--json` envelope twins of every tool, `parity.md` matrix.
- Per-OS shells: Linux and macOS full paths, Windows ConPTY hardening
  (iTerm2 still path over Kitty, Sixel chain, keyboard remap notes).
- Pages hub `terminal-browser/index.html`: intro, quickstart, command and
  agent-protocol reference, support matrix, links into `docs/`.
- Unified docs `terminal-browser/docs/`: architecture, graphics layering,
  engine policy, agent protocol, parity matrix, verification playbook.
- Verification harness: static gate, headless engine fixtures, live
  real-site corpus runs, per-OS native reports, agent parity conformance.

## Why

The Owner commissioned a complete browser in the terminal with parity between
humans and agents: anything a human can do (settings, browsing, inspecting,
cursor control, clicks, DOM observation, screenshots, render understanding),
an agent can do too through an MCP server or agent CLI. Existing text browsers
fail the honesty invariant on the modern web (no JS, subset CSS), while pixel
streamers burn bandwidth and require rare terminal features. The engineering
depth lives in three places: a disciplined terminal graphics layer that always
paints (best fidelity where probed, half-block text where not), a real engine
sidecar so every page is genuinely browsed, and a control plane where CLI JSON
and MCP results are byte-comparable for the same action.

## How It Works

- **Process model.** One `tb` process owns the terminal (alternate screen,
  probe cache, compositor). It spawns or attaches one Chromium per profile over
  CDP pipe (Linux/macOS) or remote-debugging pipe (Windows). No bundled
  300 MB browser in the repo; the binary locates system Chrome, else
  `chrome-headless-shell` downloaded on demand. Lite mode blocks
  images, media, and trackers via `Network.setBlockedURLs` for text
  navigation; the media path re-enables them per surface.
- **Render path.** CDP `Accessibility.getFullAXTree` plus
  `DOMSnapshot.captureSnapshot` feed a terminal stylesheet: roles map to
  styles (headings, links, inputs, tables reflowed to grid width), text reflows
  to the cell grid, images become paint rects. Paint rects go to the graphics
  layer selector per surface: Kitty place with id reuse and deltas where
  probed, else Sixel quantized stills and regions, else iTerm2 inline stills
  (preferred on WezTerm for Windows and iTerm2), else half-block truecolor
  diff as the always-live baseline. Every frame opens with synchronized output
  (`CSI ? 2026 h`) where probed, else cursor-hide, and closes atomically.
  Dirty rectangles plus adaptive FPS (10 to 30 fps targets, 10 fps floor on
  Sixel and block paths) keep PTY bytes bounded. `tmux` and `screen` force
  the block path with no shared-memory shortcuts.
- **Probe once, degrade per surface.** At startup and on resize or suspend the
  shell sends DA1 plus Kitty query, DA1 Sixel check, `OSC 1337;Capabilities`
  for iTerm2, `DECRQM ? 2026`, `CSI ? u`, and mouse `1006`/`1016` checks,
  caching the result. Image selection is per surface per frame, not per
  session, so one page can mix a Kitty video rect with a Sixel screenshot and
  block text under one synchronized frame. ReGIS and Tektronix are explicitly
  out of scope.
- **State model.** Each profile maps to one persistent browser context backed
  by `--user-data-dir`. Cookies sync from CDP `Storage` into a local jar for
  inspection and offline audit; history and bookmarks live in SQLite; sessions
  save and load via storage-state JSON files. Closing and reopening a profile
  restores tabs, cookies, and history position.
- **Interaction model.** Snapshot-first, screenshot-second. `snapshot` returns
  an AX tree with stable-per-snapshot refs (`eN`, `@eN` sugar in CLI only).
  Every act tool (`click`, `type`, `press_key`, `hover`, `drag`, `scroll`,
  `form_set`, `select`, `upload`) takes a ref, performs the CDP `Input` and
  `DOM` sequence, then returns a fresh snapshot; stale refs fail closed with
  a `ref_stale` code telling the caller to re-snapshot. Screenshots verify
  visually but never act. Dialogs surface as warnings on every response with
  an explicit `dialog_handle` tool.
- **Control plane.** The same engine package serves three heads: the human TUI
  keymap, the `tb-agent` CLI (`--json` envelope `{success, data, warning?,
  code?}` on every command), and the MCP server over stdio (12 core tools
  plus gated `pdf`, `trace`, `extension`, and `webmcp` caps). The parity
  matrix (`docs/parity.md`) lists every capability across four columns
  (human key, CLI JSON, MCP tool, CDP equivalent); conformance tests assert
  CLI JSON equals MCP result per row.
- **Extensions.** A minimal manifest loader runs content scripts in an
  isolated world via `Runtime` plus `Page` script injection, with page actions
  invokable from the TUI command palette and from `extension_trigger`. No
  extension API is exposed that is not wired to real injection logic.
- **Windows hardening.** ConPTY swallows APC sequences, so the Windows chain
  prefers iTerm2 stills and Sixel over Kitty graphics, forces the block path
  inside multiplexers, documents keyboard remap limits (no full Kitty keyboard
  on Windows Terminal), and uses pipe transport with AV and path handling
  notes. Linux and macOS get the full Kitty plus Sixel plus block chains with
  shared-memory local acceleration.

## Module Breakdown

- `terminal-browser/cmd/tb/` - TUI entrypoint, alternate screen lifecycle,
  profile picker, tab strip, address bar, status line.
- `terminal-browser/cmd/tb-agent/` - agent CLI twin, `--json` envelope,
  `--session` handles, stdin JSON mode, screenshot offload flags.
- `terminal-browser/internal/term/` - probe (`probe.go`), frame compositor
  (`frame.go`), dirty-rect tracker, FPS governor, input codecs (keyboard,
  mouse SGR).
- `terminal-browser/internal/gfx/` - layer selector plus painters:
  `kitty.go` (transmit once, place, compose), `sixel.go` (quantize, region),
  `iterm2.go` (still path), `block.go` (half-block diff, 256 and 16
  quantize, ASCII fallback).
- `terminal-browser/internal/engine/` - Chromium locator and launcher,
  CDP session pool, lite-mode blocklists, AX to cell styler (`style.go`),
  reflow (`reflow.go`), dialog and download plumbing.
- `terminal-browser/internal/session/` - profiles, contexts, cookie jar sync,
  SQLite history and bookmarks, storage-state save and load.
- `terminal-browser/internal/interact/` - snapshot refs, click, type, keys,
  hover, drag, scroll, form, select, upload, wait and assert polling,
  console and network taps, screenshot and PDF capture.
- `terminal-browser/internal/mcp/` - stdio MCP server, 12 core tools plus
  gated caps, idempotency keys, task polling for long ops, prompt-injection
  output labeling.
- `terminal-browser/internal/ext/` - manifest loader, sandbox runner,
  page-action registry.
- `terminal-browser/internal/os/` - Linux, macOS, and Windows shell shims
  (launch flags, ConPTY guards, AV and signing notes).
- `terminal-browser/docs/` - unified product view: `architecture.md`,
  `graphics.md` (layering plus fallback table), `engine.md`, `agent.md`,
  `parity.md`, `verification.md`. No milestone chapters.
- `terminal-browser/index.html` - Pages hub: intro, quickstart, command and
  agent reference, support matrix, links into `docs/`.
- `terminal-browser/tests/` - static gate (`test_terminal_browser.py`),
  engine fixture harness, parity conformance script, real-site corpus list.

## Research Spikes (binding, inside epic)

- **RS-1 graphics protocols.** Compare Sixel, Kitty, iTerm2, half-block
  fallback on bandwidth, emulator matrix, and video ceiling. Decision:
  layered selector above, per-surface degrade, ReGIS and Tek rejected.
- **RS-2 media decoding in terminal.** Compare server-side frame compose with
  id reuse and deltas (Kitty) against still-resend paths (Sixel, iTerm2) and
  block diff. Decision: animated regions only on Kitty path, stills elsewhere,
  adaptive FPS governor everywhere.
- **RS-3 engine reuse vs from-scratch.** Compare Chromium CDP sidecar against
  Servo embed, from-scratch layout, and Chawan and NetSurf heritage.
  Decision: Chromium sidecar ships (only full-fidelity path), Chawan ideas
  inform the fast text fallback, Servo stays a feature-flagged spike, pure
  from-scratch CSS is rejected as the main engine.
- **RS-4 agent protocol shape.** Survey MCP leaders (Playwright MCP,
  chrome-devtools-mcp, agent-browser) for tool count, snapshot-first
  discipline, `--json` envelopes, session handles, and gated caps. Decision:
  12-tool core, snapshot refs, CLI and MCP byte-comparable, caps gated.

## Test Matrix

- Static gate: required files exist, Go module builds, no facade markers
  (disabled controls, faux-success dialogs, no-op flags, hard-coded page
  bodies outside fixtures), docs unified with no milestone headers, Pages hub
  links resolve.
- Engine fixtures: AX snapshot golden files, reflow width cases, cookie jar
  round-trip, history SQLite round-trip, probe fallback table unit tests.
- Headless corpus: cold and warm navigate timings, session survive-restart,
  offline fail-closed message, dialog pending path, stale-ref recovery.
- Live real-site corpus (minimum): Hacker News, Wikipedia article, GitHub
  login wall (honest auth boundary), one React SPA, one bot-walled page
  (honest block message, never fake success).
- Agent parity conformance: per parity-matrix row, CLI `--json` output equals
  MCP tool result for identical action; screenshot `--if-changed` dedup
  verified; long-op task polling verified.
- Per-OS native: Linux and macOS full runs, Windows ConPTY run with
  degraded-chain expectations documented; `tmux` and `screen` forced-fallback
  runs.
- Visual: Pages hub renders with no broken links or assets on desktop and
  390 px widths; terminal screenshots captured per graphics tier for docs.

## Constraints and Invariants

- Honesty invariant holds end to end: every button, flag, tool, and panel
  executes real logic against real pages. Later-phase features never appear
  as stubs in earlier phases.
- Root `docs/` untouched; project docs live under `terminal-browser/docs/`.
- No em dashes in commits, comments, docs, or code comments; use hyphens,
  colons, or parentheses.
