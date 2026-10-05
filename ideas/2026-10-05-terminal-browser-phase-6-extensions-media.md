# Terminal Browser Phase 6: Extensions, Media, and Per-OS Hardening

The agent-first terminal browser gains its extension subsystem: installed
content-script extensions running in sandboxed isolated worlds, a shell
palette and agent trigger over the same page actions, page-exposed tools
through a tiny `window.__tbWebMCP` contract, governor-paced media region
sampling with bandwidth logging, and documented plus coded per-OS
hardening for Windows ConPTY and multiplexers.

## Why this shape

Chrome-extension flags were deliberately avoided: `--disable-extensions`
stays on and no `load-extension` exception was carved, because the lab's
own manifest format (JSON plus page scripts injected through CDP isolated
worlds) is cross-platform, needs no browser flags, and gives a real
sandbox boundary (separate JS globals per extension, shared DOM). The
`extension_trigger` and `webmcp` tools waited unregistered rather than
shipping as always-error stubs; now they execute real logic behind the
same capability gates as `pdf` and `trace`.

Media reuses the Phase 1 painter economics instead of inventing a video
codec: Kitty transmit-once plus placement is the only cheap animation
primitive, so the sampler measures real PTY bytes through the actual
painters and skips ticks that overrun instead of queueing latency.

## How it works

- Manifests validate strictly (unknown fields fail, script paths cannot
  traverse, 256 KiB cap, unique action ids). Browsers auto-load installs
  at open; worlds create per navigation and verify every declared action
  exists before reporting it.
- `extension_trigger` with an empty extension lists inventory plus
  current-page actions; with names it runs the action function with JSON
  args and re-settles like a click. `webmcp` lists or calls the page
  surface with async handlers awaited.
- Media discovery orders regions by area; watches tick at 100 ms
  animated or 2 s stills, count overruns as skips, and append JSONL
  bandwidth reports. The shell palette (`X`) and watch (`V`) share the
  engine calls the agent tools use.
- Windows gets extended-length profile roots in code and a full
  degraded-chain contract in `docs/support.md`; tmux/screen keep the
  forced block fallback.

## Key files

- `terminal-browser/internal/engine/extension.go` - manifests, worlds, trigger, webmcp
- `terminal-browser/internal/engine/media.go` - discovery, sampler, ledger
- `terminal-browser/internal/engine/oscompat.go` - Windows long paths
- `terminal-browser/internal/agent/agent.go` - live gates, registry, dispatch
- `terminal-browser/cmd/tb-agent/phase6.go` - `extensions` and `media` commands
- `terminal-browser/internal/tui/extensions.go` - palette plus watch
- `terminal-browser/examples/minimal-reader/` - runnable sample
- `terminal-browser/docs/extensions.md`, `docs/support.md` - user docs
- `terminal-browser/tests/test_agent_parity.py` - 16-row matrix with extension rows
