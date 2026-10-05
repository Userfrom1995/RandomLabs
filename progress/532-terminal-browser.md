# Progress - Terminal Browser (agent-first full browser in the terminal)

- **Issue:** #532
- **Branch:** opencode/issue532-20261005154527
- **Status:** in-progress
- **Blueprint:** `ideas/2026-10-05-terminal-browser.md`

## Phase Roadmap

- **Active Phase:** Phase 2: Web Engine Fetch and Text Render Path (Phase 1 merged as PR #534)
- **Phase 1: Terminal Render Core and App Shell:**
  - Scope: probe cache plus capability detection (Kitty query, Sixel DA1,
    iTerm2 capabilities, DEC 2026, Kitty keyboard, SGR mouse) with re-probe
    on resize; frame compositor with synchronized output and cursor-hide
    fallback plus dirty rectangles and adaptive FPS governor (10 to 30 fps);
    layered painters (Kitty transmit-once and place, Sixel quantized
    regions, iTerm2 stills, half-block truecolor diff with 256/16 and ASCII
    fallbacks); TUI shell (alternate screen, tab strip, address bar, status
    line, profile picker), keyboard plus mouse input codecs, per-surface
    degrade policy, `terminal-browser/index.html` hub skeleton plus
    `docs/architecture.md` (PR 1 target, Refs #532).
  - Success gate (binding): paints a fixture page on Kitty, Sixel-only, and
    block-only terminals with zero tear on probed terminals; sustained fps
    at least 10 on every tier; per-frame byte budgets hold (Kitty at most
    200 KB, Sixel at most 100 KB, block at most 32 KB). Any miss fails.
- **Phase 2: Web Engine Fetch and Text Render Path:**
  - Scope: Chromium sidecar manager (system Chrome first, headless-shell
    fallback, per-profile contexts, pipe transport with Windows notes);
    CDP session (Page, Network, Runtime, Accessibility, DOMSnapshot
    domains); lite-mode blocklists plus full-resource media path; AX-tree
    to terminal stylesheet plus grid reflow engine (headings, links, tables,
    forms layout); navigation with load, error, and offline fail-closed
    states (PR 2 target, Refs #532).
  - Success gate (binding): real Hacker News plus Wikipedia renders from
    live fetch with JS-executed SPA probe passing; cold navigate at most
    10 s, warm navigate at most 3 s; offline run shows actionable error
    with no fake success.
- **Phase 3: Session Persistence with Cookies History and Profiles:**
  - Scope: profile isolation with persistent user-data dirs; cookie jar
    synced from CDP Storage with inspect, set, clear, and storage-state
    save/load; SQLite history plus bookmarks with restore-on-restart,
    back/forward/reload semantics; session CLI surface with JSON output
    (PR 3 target, Refs #532).
  - Success gate (binding): login session survives process restart, history
    query returns real visited entries, cookie round-trip verified against
    a live echo target.
- **Phase 4: Input Cursor DOM and Screenshot Interaction Loop:**
  - Scope: snapshot refs (`eN`, CLI `@eN` sugar) with stale-ref fail-closed
    recovery; act suite (click, type/fill, press_key, hover, drag, scroll,
    select, check, upload, link hinting, cursor control, dialog handling);
    wait-for and assert polling (visible, text, url, title, count, value);
    console plus network taps with HAR capture; screenshots (viewport,
    full, element, annotated, if-changed dedup) plus PDF export
    (PR 4 target, Refs #532).
  - Success gate (binding): scripted form fill plus dialog dismiss plus
    screenshot-verify loop passes on a live form page with stale-ref
    recovery demonstrated.
- **Phase 5: Agent Control Plane with MCP Server and CLI Parity:**
  - Scope: stdio MCP server with exact 12-tool core (`navigate`,
    `snapshot`, `click`, `type`, `press_key`, `scroll`, `screenshot`,
    `wait_for`, `assert`, `evaluate`, `console`, `dialog_handle`) plus
    session/tab utilities and gated caps (`pdf`, `trace`, `extension_trigger`,
    `webmcp` behind capability flags); `tb-agent` CLI twins with `--json`
    envelopes, session handles, stdin mode, and file offload;
    `docs/parity.md` matrix plus conformance script asserting CLI JSON
    equals MCP result per row after canonicalization (screenshot bytes to
    sha256, timestamps and durations stripped, run-scoped ids mapped to
    placeholders) (PR 5 target, Refs #532).
  - Success gate (binding): full parity matrix green, agent drives a live
    multi-page task (search, navigate, fill, screenshot) using only MCP
    tools.
- **Phase 6: Extensions Media and Per-OS Shell Hardening:**
  - Scope: manifest loader with sandboxed content scripts and page-action
    registry wired to TUI palette and agent trigger; media regions (Kitty
    composed animation where probed, stills elsewhere, frame-skip policy)
    with bandwidth logging; Linux and macOS full paths (shared-memory fast
    path, signing notes) plus Windows ConPTY hardening (iTerm2/Sixel chain
    preference, keyboard remap docs, AV and path handling); tmux and screen
    forced-fallback paths (PR 6 target, Refs #532).
  - Success gate (binding): sample extension runs identically from TUI and
    agent; video region sustains at least 10 fps on the Kitty animated tier
    and stills refresh within 5 s elsewhere with byte budgets from Phase 1
    holding; Windows native report shows degraded-but-correct rendering.
- **Final Phase: UX Design Pass and Real-World Verification Harness:**
  - Scope: Design Council pass (four rounds with dissent, `docs/design.md`
    plus tokens, deliberated day-one before Phase 2, implemented here) in
    TUI and hub; unified docs sweep plus Pages hub completion (quickstart,
    command and protocol reference, support matrix); verification harness
    (static gate, fixture goldens, live real-site corpus of HN, wiki,
    GitHub login wall, TodoMVC React SPA, bot.sannysoft.com bot wall with
    Chrome 140 floor, 3-attempt retry, offline-fixture fallback, per-OS
    native reports, agent-as-user end-to-end run) all green
    (Final PR, Closes #532).
  - Success gate (binding): review plus per-OS native testing plus eval all
    pass, Pages deploy verified, every advertised capability proven against
    real pages.

- **Current step:** Phase 1 merged as PR #534; this blueprint PR rebased onto current main with the tightened roadmap intact
- **Next steps:** Reviewer re-reviews this blueprint PR; Phase 2 builds on PR #537 from main with Phase 1 present

## Agent Log

- **2026-10-05, Architect:** Blueprint plus Phase Epic written (Go plus Chromium CDP sidecar, layered Kitty/Sixel/iTerm2/block renderer, AX-to-cell style path, session/cookie/history/extension subsystems, snapshot-first MCP plus CLI parity matrix, ConPTY hardening, Design Council day-one, real-site corpus gates). Seven capability-named phases with per-phase success gates and four research spikes; Refs #532 until the final phase lands. Handing to the Builder for Phase 1.

- **2026-10-05, Builder (Phase 1):** Implemented Terminal Render Core and App Shell on `opencode/issue532-terminal-browser-phase-1`: Go module `terminal-browser/` with `tb` plus `tb-agent` entrypoints; `internal/term` (env plus live-query probe with raw-mode round trip, probe cache with resize re-probe, frame compositor with sync/cursor envelope, dirty rectangles, 10-30 fps governor, Kitty plus legacy plus SGR-mouse input codecs); `internal/gfx` (Kitty transmit-once cache with placement, RLE Sixel regions, iTerm2 PNG stills with dedup, half-block diff with 256/16/ASCII fallbacks, per-surface tier order with tmux/screen forced block); `internal/tui` (alt screen, tab strip, fixture:// address bar, status line, profile picker, help overlay); `internal/demo` (home/article/table fixtures plus honest error page); Pages hub plus unified `docs/architecture.md`; static gate `tests/test_terminal_browser.py`. Verified: `go build` on darwin plus linux plus windows, `go vet` clean, `go test ./...` green, static gate 7/7, fixture renders byte-counted on all four tiers (block 10101, sixel 3175, iterm2 2735, kitty 7171 bytes at 80x24), agent envelopes valid JSON. Success gate met: fixture page paints on every tier with byte-counted frames; sync envelope emitted where probed.

- **2026-10-05, Design Council:** Four-round deliberation via specialist swarms (Propose 2x3, round-robin Critique, Revise answering every point, Converge unanimity-minus-one). Chose Harbor Overlay System v2 (single-row eN chips plus +NN bank, 3-row bordered overlay drawer, settled {gen, stable} snapshots with R remap, Harbor tokens v2 with measured ratios and tier collapse maps, Signal Ledger v2 ticks 33/50/100 with anchor plus grouping plus reduced-motion). Runner-up rich default rejected on row budget, tier collapse, snapshot tearing; dissent from all three specialists recorded. Shipped `terminal-browser/docs/design.md` plus `design-tokens.json`, hub Design link, docs index link (Refs #532). Builder proceeds with Phase 2 and beyond under this direction.

- **2026-10-05, Fixer (Phase 1 review round):** Applied all 15 blocking findings: Kitty `u` modifier mask minus-one plus ctrl-only 1-26 mapping with unknown-typed strays; bright 90-97/100-107 codes plus 22m/24m style resets in the block painter; per-color Sixel band passes with `$-` terminators; `term.ApplyTierOverride` helper preserving probed sync, threaded through `tb --tier`, `tb-agent --graphics-tier`, TB_TIER, and cache SetTier; zero-size guards on every Paint plus HeroSurface clamp and empty-image At guard; raw-mode ownership moved into runInteractive with reader done-channel; probe detection fixes (parenthesized Kitty APC Gi/OK token, exact DA param tokenizing, CSI flags regex requiring enhancement bits, dropped Kitty-to-Sync inference, heuristic reset on live reply); LRU-capped Kitty/iTerm2 caches with explicit delete plus per-frame iTerm2 placement; W/H-hashed surfaces plus PaintChain fallback used by both binaries; shell fixes (CloseTab clamp, UTF-8 backspace, Ctrl-ignored addr keys, scroll cap, rune titles, live address-bar click); cursor owned once by EnterAlt/ExitAlt with no per-frame toggling. Re-verified: darwin plus linux plus windows builds, vet clean, go tests green, static gate 7/7, all four tiers byte-counted with hero (block 7551, sixel 3488, iterm2 2648, kitty 7080 at 80x24).
- **2026-10-05, Fixer:** Applied Quality Council FIX verdict (5 doc findings): added `docs/design.md` plus day-one timing to both docs lists, enumerated exact 12-tool core with canonicalization rule in blueprint and roadmap, promoted fps and byte and timing budgets to binding fail thresholds, pinned live corpus (TodoMVC React SPA, bot.sannysoft.com, Chrome 140 floor, retry plus offline fallback), hard-wrapped phase bullets into scope plus gate sub-bullets.
- **2026-10-05, Fixer (rebase):** Rebased onto current main after PR #534 (Phase 1) merged; resolved roadmap conflicts in favor of the tightened content (12-tool enumeration, canonicalization rule, binding fps and byte and timing thresholds, pinned corpus, design.md references, wrapped Scope and gate bullets); reconciled Active Phase and Current step against merged state (Phase 1 merged, Phase 2 open as PR #537); preserved Phase 1 build history from main. No prose rework beyond conflict resolution.
