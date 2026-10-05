# Progress - Terminal Browser (agent-first full browser in the terminal)

- **Issue:** #532
- **Branch:** opencode/issue532-terminal-browser-phase-2
- **Status:** in-progress
- **Blueprint:** `ideas/2026-10-05-terminal-browser.md`

## Phase Roadmap

- **Active Phase:** Phase 2: Web Engine Fetch and Text Render Path
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
    `docs/architecture.md` (PR 1 target, Refs #532). Merged as PR #534.
  - Success gate (binding): paints a fixture page on Kitty, Sixel-only, and
    block-only terminals with zero tear on probed terminals; sustained fps
    at least 10 on every tier; per-frame byte budgets hold (Kitty at most
    200 KB, Sixel at most 100 KB, block at most 32 KB). Any miss fails.
  - Status: [x] complete, merged to main.
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
  - Status: [x] complete, verified, ready for review.
- **Phase 3: Session Persistence with Cookies History and Profiles:**
  - Scope: profile isolation with persistent user-data dirs; cookie jar
    synced from CDP Storage with inspect, set, clear, and storage-state
    save/load; SQLite history plus bookmarks with restore-on-restart,
    back/forward/reload semantics; session CLI surface with JSON output
    (PR 3 target, Refs #532).
  - Success gate (binding): login session survives process restart, history
    query returns real visited entries, cookie round-trip verified against
    a live echo target.
  - Status: [ ] not started.
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
  - Status: [ ] not started.
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
  - Status: [ ] not started.
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
  - Status: [ ] not started.
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
  - Status: [ ] not started.

- **Current step:** Phase 2 built and verified, phase PR ready for review
- **Next steps:** Reviewer audits the phase PR; on approval Tester runs live plus per-OS passes; then Builder starts Phase 3 (Session Persistence with Cookies History and Profiles) on a new phase branch from main

## Agent Log

- **2026-10-05, Builder (Phase 2):** Branched `opencode/issue532-terminal-browser-phase-2` from main tip (Phase 1 merged as PR #534). Adopted the tightened epic roadmap (binding fps plus byte plus timing thresholds, exact 12-tool core with canonicalization, pinned live corpus with Chrome 140 floor plus retry plus offline fallback). Scaffolded Phase 2 progress tracking; engine implementation next.
- **2026-10-05, Builder (Phase 2 complete):** Implemented Web Engine Fetch and Text Render Path: `internal/engine` (stdlib-only Chrome locator plus launcher with 140 floor and per-profile contexts, minimal WS plus CDP session for Page/Network/Runtime/Accessibility, AX parse plus flatten with ignored-container recursion, role stylesheet plus Wrap plus LayoutTable plus Rewrap, Navigate with lite blocklists and offline fail-closed codes); wired live fetch into TUI address bar (http(s) via engine, rewrap at render), `tb --url` offscreen painter, `tb-agent fetch` JSON twin; added `docs/engine.md`, offline fixtures (`tests/fixtures/hn.json`, `wiki.json` with Style-path test), hub plus README updates, static gate extended. Verified: `go build` on darwin plus linux plus windows, `go vet` clean, `go test ./...` green, static gate 7/7, tester live suite 11/11, live HN (116 rows, cold 244 ms, JS 821 nodes), Wikipedia (234 rows, cold 1075 ms), TodoMVC React SPA (44 rows, JS executed), offline paths fail closed with codes and exit 1. Success gate met: HN plus Wikipedia render live with JS probe passing, cold well under 10 s, offline shows actionable errors with no faked success.
