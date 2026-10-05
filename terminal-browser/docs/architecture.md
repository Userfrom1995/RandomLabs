# Terminal Browser architecture

## Process model

One `tb` process owns the terminal: alternate screen, probe cache, frame
compositor. It spawns or attaches one Chromium per profile over a CDP pipe
once the engine subsystem lands; the terminal frontend never lays out CSS
itself. It converts the accessibility tree plus DOM snapshot into styled
rows and cells, and paints images and video regions through the graphics
layer below. No bundled browser ships in the repo; the binary locates
system Chrome first and falls back to `chrome-headless-shell` on demand.

## Render path

CDP `Accessibility.getFullAXTree` plus `DOMSnapshot.captureSnapshot` feed
a terminal stylesheet: roles map to styles (headings, links, inputs, tables
reflowed to grid width), text reflows to the cell grid, images become paint
rects. Paint rects go to the graphics layer selector per surface. Every
frame opens with synchronized output (`CSI ? 2026 h`) where probed, else
cursor-hide, and closes atomically. Dirty rectangles plus an adaptive FPS
governor (10 to 30 fps targets, 10 fps floor on Sixel and block paths) keep
PTY bytes bounded. `tmux` and `screen` force the block path.

## Graphics layering

Probe once at startup (and on resize or suspend): DA1 plus Kitty query,
DA1 Sixel check, `OSC 1337` capabilities for iTerm2, `DECRQM ? 2026`,
`CSI ? u` for Kitty keyboard, and mouse `1006` checks, all cached. Image
selection is per surface per frame: one page can mix a Kitty video rect
with a Sixel region and block text under one synchronized frame.

| Tier | Paint path | Motion | Cost control |
| ---- | ---------- | ------ | ------------ |
| kitty | transmit-once by content hash, place per frame | animated regions | id reuse plus deltas |
| sixel | 3-3-2 quantized regions with RLE | stills, 10 fps floor | downscale to 2x2 px per cell |
| iterm2 | inline PNG stills via OSC 1337 | stills, re-send on change | hash dedup cache |
| block | half-block diff of changed cell pairs | always live | dirty rows only, 256/16/ASCII fallbacks |

ReGIS and Tektronix are explicitly out of scope.

## State model

Each profile maps to one persistent browser context backed by the
profile root: cookies sync from CDP storage into a local jar for
inspection and offline audit; history, bookmarks, and the
back/forward stack live in atomic JSON documents under the profile
(0700 dirs, 0600 files); sessions save and load via portable state
files. Each browser open runs Chromium in a fresh per-launch instance
directory under the profile, so concurrent browsers never share a
SingletonLock and crashed runs never wedge the next launch; only
Chromium-internal state is ephemeral per instance. Closing and
reopening a profile restores tabs, cookies, and history position.
Full detail in [sessions](sessions.md).

## Interaction model

Snapshot-first, screenshot-second. `snapshot` returns an AX tree with
stable-per-snapshot refs; every act tool takes a ref, performs the CDP
input sequence, then returns a fresh snapshot; stale refs fail closed with
a `ref_stale` code telling the caller to re-snapshot. Screenshots verify
visually but never act. Dialogs surface as warnings on every response with
an explicit `dialog_handle` tool. Full loop detail (act suite, waits,
taps, screenshots, shell overlay, script runner) lives in
[interact](interact.md).

## Control plane

The same engine package serves three heads: the human TUI keymap, the
`tb-agent` CLI (envelope `{success, data, warning?, code?}` on every
command), and the `tb-mcp` server over stdio (the exact 12-tool core
plus session handles and the gated `pdf`/`trace` capabilities). All
three execute through one shared dispatch in `internal/agent`, so CLI
JSON equals MCP results by construction; the parity matrix in
[parity](parity.md) canonicalizes run-scoped ids, timings, and paths
and asserts the rest identical. `extension_trigger` and `webmcp`
register no tool until the extension engine exists. Server and CLI
reference lives in [agent-control](agent-control.md).

## Per-OS shells

Linux and macOS take the full Kitty plus Sixel plus block chains with local
acceleration. Windows goes through ConPTY hardening: iTerm2 stills and
Sixel preferred over Kitty graphics, block path forced inside multiplexers,
keyboard remap limits documented, pipe transport with AV and path handling
notes.

## Verification

Static gate (required files, module build, no facade markers, unified docs,
hub links), engine fixture goldens, live real-site corpus (news, wiki,
login wall, React SPA, bot-walled page with honest block messages), agent
parity conformance per matrix row, per-OS native reports, and terminal
screenshots per graphics tier.
