# Maze-Chase Overhaul - Architectural Blueprint

- **Issue:** #582 (parent vision; the migration epic is complete and archived in
  `progress/582-maze-chase-rust-migration.md`; this is the owner-ordered overhaul wave)
- **Workstream issues:** #655 real-terminal compatibility matrix, #656 dynamic
  terminal layout, #657 release engineering, #658 visual redesign, #659 sound
  overhaul, #660 game-first Pages, #661 reassessment and final verification
- **Date:** 2026-10-18
- **Track:** Product (one shared engine, three full publication layers)
- **Stack:** unchanged at the core: Rust stable Cargo workspace, pure engine,
  crossterm terminal layer, winit plus softbuffer desktop, zero-dependency WASM
  bridge. This wave rewrites layout and render architecture inside the layers,
  the asset/audio data systems, packaging, and the web surface; the engine
  simulates exactly as before through its existing public API.
- **Evidence baseline (binding):** the Owner's firsthand findings are the
  primary defect report: Ghostty does not work properly; the Kitty experience is
  poor; the terminal layout appears fixed-size; visuals are placeholder-grade;
  the sound is annoying; distribution and the web surface are developer-grade.
  The released `docs/scoreboard.md` numbers (0.2-0.8 us/tick, 407/0 tests, 19/19
  verify) are the performance floor to hold or beat. After this wave no
  compatibility, quality, or distribution claim may exceed its verified
  evidence, and every row of every matrix names the run, trace, or capture that
  proves it.
- **Clean-room rules stay binding** (`maze-chase/docs/legal.md`): original code,
  names, mazes, art, audio, and branding only; public behavioral research and
  the Owner's reports are input, never copied assets or tables.

## Summary

The previous wave shipped a mechanically complete maze-chase game: one
deterministic engine and three playable layers, verified by unit, golden,
hostile, PTY, and native per-OS suites. It is not yet the product the Owner
asked for. Real terminals expose architecture-level problems a PTY harness
cannot: the layout is a two-scale letterbox that leaves most large windows
empty, the image tiers stretch one fixed 224x248 bitmap regardless of the
window, Ghostty is routed to the text tier by name and no live Kitty probe
exists, the Kitty transmit path spends about 217 KB of base64 per frame at a
modest 20 Hz, and there are no distributable packages, installers, release
pipeline, or release page at all. The art and audio are first-pass data, not an
identity.

This overhaul turns that release into a genuinely polished, properly
distributed, real-terminal-verified product in eight sequential phases. Every
phase is a vertical increment with its own PR, real code, and real evidence;
every merge leaves the repository and the shipped layers functional; the parent
#582 closes only when the final verification ledger is complete.

The seven confirmed defect classes from reconnaissance (all seeds for Phase 1,
all file-referenced):

1. Layout is a two-scale fit (`layout.rs`: 2x1 and 4x2 cells per tile, magnify
   only at 144x66), so a 143x64 window uses 56 of 143 columns and all residual
   space is dead letterbox.
2. Image tiers never consult real pixel geometry; `DEFAULT_PPT = 8` rasterizes
   224x248 and Kitty stretches it into the board cells.
3. Ghostty (`TERM_PROGRAM=ghostty`) is hard-routed to the truecolor text tier
   (`backend.rs` initial-tier table) and there is no live Kitty graphics probe;
   `docs/terminal.md` even claims Ghostty has no image protocol. Any graphics
   support Ghostty actually has is unreachable today.
4. Kitty frame cost: stored-block PNG plus base64 of a fixed bitmap (about
   217 KB of escape text per frame, about 4.3 MB/s nominal), scalar CRC32 and
   adler32 loops, no placement reuse (`a=p` unused), no ACK/ERR reading.
5. Bitmap repaint is paced by a modulo-3 loop counter, not wall-clock; a resize
   frame can leave the pre-resize Kitty placement on screen for one frame; the
   Sixel arm has no delete or erase mechanism at all.
6. The public surface overstates verified state in places (hub "released and
   verified" prose; the raw-markdown docs on Pages; tokens `min_terminal_cells
   60x36` versus the code's 62x35).
7. Distribution is developer-grade: only tarball/zip/app-bundle scripts exist,
   `dist/` is scratch, there is no deb, rpm, installer, dmg, pipeline, tag, or
   GitHub Release, version literals are scattered, and `macos-app.sh` hardcodes
   0.1.0 in `Info.plist`.

## Deliverables

- A real-terminal evidence pipeline: in-repo harness scripts that drive real
  Kitty, Ghostty, and conventional emulators on Linux and macOS, capture
  screenshots plus protocol/timing traces, and write per-row evidence files.
- A genuinely dynamic terminal layout: a pure solver over a geometry model that
  includes real cell pixel size, continuous board scaling, adaptive chrome
  blocks (side panels, top and bottom bands chosen by proportion), exact-fit
  image rendering at the region's pixel size, live resize with same-frame
  repaint, and a tier-aware too-small card.
- A render pipeline with capability truth: a bounded live Kitty probe (with
  safe byte replay), atlas-plus-placement composition with a full-frame
  fallback, dirty-change detection, wall-clock pacing with backpressure, a
  hardened watchdog that reads protocol replies, and a JSONL trace mode that
  the compatibility matrix cites as evidence.
- A published terminal compatibility matrix under `maze-chase/docs/` with a
  per-row evidence reference, signed Kitty and Ghostty rows on Linux and macOS,
  conventional-terminal rows on all three operating systems, and every
  limitation named rather than hidden.
- A redesigned visual identity implemented in all three layers from one shared
  source: resolution-aware character art (cell art, low-density glyphs,
  high-density glyphs), environment styling, effects, animation, and refreshed
  themes, with real captures per layer and the Design Council craft gate.
- A reworked sound system: an original musical score, soft short effects, a
  documented mix architecture with fades and peak-safe defaults, a terminal
  chime policy that defaults to visual-only, and music/effects/mute controls
  that round-trip through the shared settings on every audio-capable layer.
- Real distributable releases: terminal and desktop artifacts for Windows,
  macOS, and Linux including `.deb` and `.rpm` packages, a Windows installer, a
  macOS `.app` plus `.dmg`, tarballs, checksums, an automated reproducible
  release pipeline, install/upgrade/uninstall documentation, and artifacts on
  the project's official GitHub Releases page.
- A game-first GitHub Pages surface: `/maze-chase/` boots directly into the
  complete playable game with no distribution or development clutter, plus
  dedicated downloads, installation, documentation, compatibility, and release
  subpages.
- A reassessment ledger: every gap found is a linked sub-issue; every finding
  is resolved, or documented as a verified limitation with rationale, before
  the parent closes.

## Why

A terminal game is only real when it works in a real terminal. The previous
wave's verification was honest about what it measured (PTY bytes, forced
tiers), but it never measured what the Owner experiences: a real Kitty or
Ghostty window at a real size with real resize events. The Owner's report is
empirical evidence that outranks harness green. The layout and renderer must be
rebuilt around real geometry first, because everything else (compatibility
claims, visual identity, release packaging) sits on top of a product that must
look and feel right in the target environment. Distribution and the web
surface are equally product-critical: a game a player cannot install in one
command, or a game page buried under development prose, fails the End-User
Perspective standard. The wave is ordered so the riskiest architectural work
(layout and rendering) is proven on real emulators before the identity, audio,
and packaging waves build on it.

## How It Works

### Real-terminal evidence pipeline

`maze-chase/tools/compat/` holds durable harnesses (`run-linux.sh`,
`run-macos.sh`, a shared `drive.sh` and `collect.py`), each of which: verifies
or installs the emulator (kitty and ghostty where the OS supports them, plus
the conventional set: GNOME Terminal or Konsole or xterm on Linux,
Terminal.app on macOS, Windows Terminal and conhost on Windows), launches the
shipped `--release` binary in it with a scripted session (boot, play, pause,
resize sequence, help, scores, settings, quit), drives keys through the
emulator's native automation (kitty remote control socket where available,
xdotool under X11, osascript under Aqua), captures screenshots at named
checkpoints, and collects the game's own `MAZE_CHASE_TRACE` JSONL. Each run
writes `evidence/<emulator>-<os>-<tier>.json` summarizing checkpoints, trace
excerpts, frame timings, bytes/sec, and pass or fail per matrix row. A run that
cannot execute an emulator natively records that honestly; it never
masquerades as a pass. The harness is evidence tooling, not a layer: it never
changes gameplay and is exercised by the per-OS testers as their vehicle.

`MAZE_CHASE_TRACE=<path>` (terminal crate, Phase 2) writes one JSON object per
line: tier decisions with their source (`flag`, `env`, `probe`), resize events
with cols/rows/pixel geometry, per-frame encode milliseconds and output bytes,
pacing skips, and watchdog transitions. This is the machine evidence the
matrix rows cite, alongside captures.

### Dynamic layout solver

The current `layout.rs` computes a `Layout` from `(cols, rows)` alone with two
hardcoded cell scales. Phase 2 replaces it with a three-stage pipeline, all
pure and fully unit-testable:

1. **Geometry.** `Geometry { cols, rows, cell_w_px: Option<u16>,
   cell_h_px: Option<u16>, tier }`. Cell pixel size comes from `TIOCGWINSZ`
   `ws_xpixel`/`ws_ypixel` on Unix when nonzero and the Windows console API on
   Windows; `None` means unknown and the solver falls back to a nominal cell
   aspect constant. Neither failure is fatal; both are tested.
2. **Solve.** `solve(geometry, blocks) -> LayoutPlan`. The solver enumerates
   candidate board scales (cell tiers: `cell_cols` x `cell_rows` cells per tile,
   with half-block vertical resolution available in the renderer; image tiers:
   `ppt` pixels per tile clamped to a documented range), dresses the remaining
   space with chrome slots in a fixed proportion-driven preference order (wide
   windows prefer right and left panels, tall windows prefer top and bottom
   bands, balanced windows prefer a top band plus a hint strip; very large
   windows get both), reflows chrome blocks into slots by priority, and scores
   the candidates deterministically: largest board scale first, then coverage
   (fewest unused cells), then block fit. Block renderers are pure
   `rect -> Vec<Line>` functions that pad or truncate and can never overflow
   their slot.
3. **Plan.** `LayoutPlan { board, chrome: Vec<ChromeSlot>, hint, overlays,
   too_small, coverage }`. `BoardKind` is either `Cells { cell_cols, cell_rows }`
   or `Image { px_w, px_h, ppt }`. The plan is `PartialEq` and stable for a
   given geometry, so the main loop can compare old and new plans cheaply.

Minimum playable size becomes tier-aware instead of the hardcoded 62x35: cell
tiers need the smallest readable cell scale plus one chrome or hint row; image
tiers can play down to a documented pixel floor and render an exact-fit tiny
board. Below the floor the too-small card states the current size, the minimum
for the active tier, and that the game re-fits live. The solver also absorbs
the last-cell remainders: no margin band wider than a bounded number of cells,
no dead corner blocks, and residual cells become spacing inside slots.

### Terminal render pipeline

Phase 3 rebuilds frame production around the plan:

- **Capability truth.** A bounded (about 200 ms) live Kitty probe: send a
  small query transmit and parse its `OK`/`ENOENT` reply, reusing the bounded
  capture plus byte-replay machinery from the Sixel DA1 probe so no keypress is
  ever swallowed. On `OK` the tier rises to Kitty regardless of environment
  heuristics (this is what enables Ghostty if its probe passes); on timeout the
  existing env heuristics remain the fallback. Protocol replies (`OK`, `E`,
  `ENOENT`) from real transmits feed the watchdog, not just write errors.
- **Composition.** For Kitty, a static-layer atlas (walls, crumbs, sunseeds,
  gate, relish) transmitted once per change plus per-entity placements with
  source rectangles (`a=p`, `x/y/w/h`, `c/r`) each frame; a full-frame
  transmit only when the static layer changed (a crumb eaten, a level clear)
  or when the probe says placements are unsupported. Sixel keeps a full-frame
  path with palette and rate caps. Cell tiers repaint rows built from the same
  `raster` state, at the solver's continuous scale with half-block vertical
  detail.
- **Pacing.** Wall-clock budgets replace the modulo-3 gate: a documented
  per-tier frame rate (cell tiers up to 60 Hz; image tiers adaptive 15-30 Hz),
  skip when nothing changed, and backpressure that skips a frame when the
  previous write exceeded its budget. The output handler tracks bytes per
  second and degrades pacing before degrading tiers.
- **Resize contract.** Any geometry change (including pixel-only changes)
  recomputes the plan and emits one synchronized-output frame that deletes all
  prior image placements, clears shrunken regions, and repaints everything:
  grow and shrink, key plus SIGWINCH races, and resize-while-paused are all
  covered by the existing hostile PTY suites plus real-emulator checkpoints.

### Resolution-aware identity system

Phase 4 (after the Design Council direction ships) raises the asset system
from one 11x11 glyph set to a resolution ladder, all authored as data in
`crates/assets`:

- Cell art: a dedicated glyph set for the cell tiers designed for half-block
  rendering at 1-2 cells per tile, consistent with the image art.
- Low-density glyphs: the current 11x11 class for `ppt` 6-8.
- High-density glyphs: a larger class (about 21x21) with per-density animation
  frames for `ppt` 12-16, selected by the plan's `ppt` so large terminals get
  real detail instead of stretched pixels.
- Effects and animation: fright morph, chomp cycle, warden eye tracking,
  pickup sparkle, gate exit, death sequence, level transition wipe, and the
  title animation, with timing centralized in `anim.rs` and mirrored by the
  render loops (the renderer stops re-deriving thresholds like the 1.5 s
  fright flash locally).
- Themes: refreshed palette work while keeping the enforced WCAG contrast,
  warden hue-plus-shape separation, and tokens-mirror tests green;
  `docs/design.md` and `design-tokens.json` are rewritten as one identity and
  the three layers present it at their own fidelity.

### Sound architecture

The `Audio` trait already exposes `set_master/set_music/set_sfx/set_muted`
with getters, settings persist all four, and every layer wires them; Phase 5
keeps that contract and rebuilds the content and mix:

- Score: a calm play loop, a distinct fright loop, a title loop, clear and
  death and game-over stings, an extra-life flourish, and a time-warning cue,
  all original note data in `crates/audio/src/score.rs`, with one BPM source
  exposed to the layers (removing the 132 BPM duplication in three places).
- Effects: short (<= 150 ms typical), soft-attack, peak-normalized recipes;
  the warden-chain pitch ladder and UI cues survive with gentler voicing.
- Mix: documented channel defaults (starting point: master 0.7, music 0.5,
  effects 0.8), 150-300 ms fades on music transitions, and a per-layer output
  stage that cannot clip when channels sum.
- Terminal policy: visual ticker by default with the BEL opt-in as a
  `terminal_chime` setting (off by default, rate-limited when on); no music in
  the terminal. The web unlock path, visibility resume, and a compressor node
  are reviewed; the desktop synth gains the same score data.

### Release engineering

Phase 6 (a single versioned product, not three pipelines):

- **Version single source:** `maze-chase/Cargo.toml` gains
  `[workspace.package] version`, every member inherits it, `packaging` scripts
  read it (including the macOS `Info.plist`), and the pipeline fails closed if
  a `maze-chase-vX.Y.Z` tag does not match the workspace version.
- **Artifacts:** terminal (Linux tarball plus deb plus rpm, macOS tarball,
  Windows zip) and desktop (Linux tarball plus deb plus rpm, Windows zip plus
  an Inno Setup installer following the Desktop Pet precedent, macOS `.app`
  plus `.dmg`), each staged with its docs and a `SHA256SUMS.txt`.
- **Pipeline:** `maze-chase-release.yml` (Lab Engineer: workflow changes route
  through `/oc lab`), trigger on `maze-chase-v*` tags plus dispatch; per-OS
  jobs build, run `cargo test --workspace` and `maze-chase-verify`, run the
  packaging smoke (install to a scratch prefix or container, launch, probe,
  uninstall), upload artifacts, and a publish job creates or updates the
  GitHub Release with checksums. `maintainer.yml` allowlists gain the new
  workflow (Lab Engineer). Release candidates publish as prereleases; the
  stable release is cut in the final phase.
- **Docs:** one install/upgrade/uninstall section per artifact in
  `docs/release.md` plus the layer guides, with checksum verification and the
  unsigned-binary first-run notes.

### Web information architecture

Phase 7 restructures the deployed site:

- `maze-chase/index.html` becomes the game itself: it boots directly into the
  playable WASM build with a minimal in-page loading treatment (title plus a
  hairline progress indicator), no test statistics, no commands, no matrix
  prose. `play.html` stays as a compatibility redirect.
- Subpages, each a real page under `maze-chase/` (the Pages staging copies the
  whole project directory): `downloads/` (artifacts and checksums per OS),
  `install/` (per-OS setup, upgrade, uninstall), `docs/` (a rendered docs hub
  linking real HTML guides, replacing today's raw-markdown links on Pages),
  `compatibility/` (the terminal matrix from #655), and `releases/` (release
  notes and history). Shared inline tokens mirror the identity; a link checker
  test fails on dead internal links.
- Root README and root landing entries gain download and release links in the
  same unification pass the Curator and Reviewer enforce.

### Verification and gates

Every phase PR passes the standard chain (Reviewer, Tester, Evaluator) plus,
where a real platform is involved, the per-OS testers: macOS and Windows arms
for native proof and the Linux arm on the ubuntu runner; the real-emulator
harnesses run inside those arms. The Design Council's craft gate scores visual
and audio work on real captures, not descriptions. The final phase re-verifies
every acceptance criterion on the released artifacts and reopens anything that
regressed. The reassessment ledger in `progress/582-maze-chase-overhaul-findings.md`
tracks every gap from discovery to resolution.

## Module Breakdown

- `maze-chase/tools/compat/` (new): real-emulator drivers, evidence schema,
  README with the evidence rules; OS-specific runners reused by the testers.
- `maze-chase/crates/terminal/src/layout.rs` rewritten as a solver (geometry
  model, candidate enumeration, chrome slots, coverage metrics) with pure
  sweeps; `geom.rs` (new) for cell pixel queries per platform; `chrome.rs`
  becomes block renderers (`block -> Vec<Line>`) plus the too-small card;
  `app.rs` owns the plan and the resize comparison.
- `maze-chase/crates/terminal/src/` additions: `pipeline.rs` (frame ops,
  pacing, backpressure, bytes accounting), `atlas.rs` (Kitty atlas and
  placement planning), `trace.rs` (JSONL evidence log); `kitty.rs` gains the
  live probe and placement syntax; `sixel.rs` keeps its encoder with caps;
  `unicode.rs` generalizes to arbitrary cell scales and half-block detail.
- `maze-chase/crates/assets/src/`: `sprites.rs` grows the density ladder and
  effect frames; `anim.rs` becomes the single timing source; `themes.rs`
  palettes refresh behind the existing tests; `docs/design-tokens.json` and
  `docs/design.md` are rewritten with the Council.
- `maze-chase/crates/audio/src/`: `score.rs` (new tunes, one BPM source),
  `cue.rs` (same event map, gentle recipes), `sink.rs` unchanged contract.
- `maze-chase/crates/config/src/settings.rs`: adds the terminal chime flag
  (default off) and any new mix defaults; persistence format stays
  human-readable and backward compatible.
- `maze-chase/packaging/`: per-OS build scripts for both layers (deb, rpm,
  zip plus Inno, app plus dmg, tarballs) and smoke scripts (install, launch,
  uninstall) following the Desktop Pet packaging conventions.
- `.github/workflows/maze-chase-release.yml` (new, Lab Engineer): tag and
  dispatch release pipeline; `maintainer.yml` allowlist updates (Lab
  Engineer).
- `maze-chase/index.html` restructured; `maze-chase/{downloads,install,docs,
  compatibility,releases}/index.html` new; `maze-chase/play.html` redirect;
  docs renderer or hand-authored HTML with a link checker.
- Docs: `maze-chase/docs/terminal-compat.md` (matrix), `docs/terminal.md`
  (dynamic layout and tiers), `docs/design.md`, `docs/audio.md` (new) or the
  audio section inside `design.md`, `docs/release.md` (pipeline and per-OS
  install/upgrade/uninstall), `docs/web.md` (site structure), `README.md`, and
  the hub, all kept as one unified product view.

## Key Data Structures and Algorithms

- `Geometry { cols, rows, cell_w_px, cell_h_px, tier }`; solver input, pure.
- `LayoutPlan { board: BoardPlan, chrome: Vec<ChromeSlot>, hint, overlays,
  too_small, coverage }`; `BoardKind::Cells { cell_cols, cell_rows }` or
  `BoardKind::Image { px_w, px_h, ppt }`; `PartialEq` for change detection.
- `BlockId` priority list (score, best, lives, level, mode, clock, relish,
  tune, video, controls, legend) with pure `render(rect) -> Vec<Line>`
  functions; slot assignment is greedy by priority with a hard no-overflow
  invariant asserted in debug builds.
- Candidate scoring is deterministic: maximize `(board_scale, coverage, block
  count)` lexicographically, tie-broken by the fixed preference order, so the
  same geometry always yields the same plan.
- Kitty placement planning: `Placement { image_id, src: (x, y, w, h), dst_cells,
  z }`; the atlas plan diffs against the previous frame and emits only changed
  placements; static-layer retransmit is coalesced to at most one per frame.
- Pacing: `FrameBudget { target_hz, max_encode_ms, max_bytes_per_s }` with
  adaptive backoff; the trace records every skip and degrade with its reason.
- Coverage metric for tests: `used_cells / (cols * rows)` plus per-side margin
  bands; assertions bound both for every size at or above the playable floor.
- Version single source: `[workspace.package] version` inherited by every
  crate; tag parity checked fail-closed in the release workflow.

## Test Matrix

- Solver sweeps: cols 20..400 x rows 10..120 with and without pixel geometry,
  square, wide, tall, and awkward ratios; invariants: board fits, slots never
  overlap, blocks never clip, coverage bounds hold, growing the window never
  shrinks the board (monotonicity), recompute is stable (idempotence), and
  golden plans for a fixed awkward set (62x35, 80x24 too-small, 100x40,
  143x64, 144x66, 200x60, 62x80, 300x100).
- Resize suites: the existing PTY hostile races extended to geometry changes,
  plus real-emulator resize checkpoints in kitty and ghostty on Linux and
  macOS with trace evidence.
- Pipeline tests: op serialization goldens, dirty-change detection (no bytes
  when nothing moved), pacing skip reasons, backpressure thresholds, probe
  accept/reject matrix (OK, ENOENT, timeout, garbage, keys typed during the
  probe window), and watchdog transitions on protocol errors.
- Assets: density validation (every glyph rectangular and in bounds at every
  density), silhouette parity across densities, animation timing single-source
  tests, theme contrast plus warden separation plus tokens mirror kept green.
- Audio: data shape tests, peak and sum-clipping checks, fade timing,
  settings round-trip per layer, terminal chime default-off behavior.
- Packaging: per-artifact install, launch, `--version`, and uninstall smokes
  on native OSes and compatible containers; `SHA256SUMS.txt` verification;
  tag-to-version parity; pipeline reproducibility from a clean checkout.
- Web: node smokes and CDP browser E2E against the deployed game page and each
  subpage, mobile viewport retained, link checker green, no console errors.
- Final ledger: every acceptance criterion of every workstream issue mapped to
  its evidence (run, trace, capture, checksum) in the release sign-off.

## Phase Roadmap (binding order and dependencies)

- **Phase 1: Product Reassessment and Real-Terminal Truth** (Refs #582,
  Refs #655, Refs #661). Real-terminal harness, reproduced Owner findings on
  current main, critical reassessment of engine and layers and docs claims,
  findings ledger `progress/582-maze-chase-overhaul-findings.md`, honesty matrix
  scaffold `maze-chase/docs/terminal-compat.md`, new sub-issues filed through
  the Maintainer. No product fixes in this phase. PR target: reassessment and
  harness. Depends on: nothing.
- **Phase 2: Dynamic Terminal Layout and Full-Window Composition** (Closes
  #656). Geometry model, solver, adaptive chrome blocks, exact-fit image
  rendering, continuous cell scales, resize contract, tier-aware too-small
  card, real-emulator resize proof on Linux plus macOS. PR 2. Depends on
  Phase 1 evidence.
- **Phase 3: Terminal Render Pipeline and Compatibility Proof** (Refs #655).
  Live Kitty probe with Ghostty enablement, atlas plus placement composition,
  pacing and backpressure, protocol-aware watchdog, Sixel hardening, trace
  mode, matrix rows signed for kitty and ghostty on Linux and macOS plus
  conventional terminals, defect fixes from Phase 1 evidence. PR 3. Depends on
  Phase 2.
- **Design Council pass (reserved):** the Maintainer dispatches `/oc design`
  (with the visual and audio specialists as needed) after the roadmap lands,
  timed to complete before Phase 4 build; its `<project>/docs/design.md` plus
  tokens are the binding direction for Phases 4 and 5. The Builder implements,
  never re-authors the direction.
- **Phase 4: Visual Identity Redesign** (Closes #658). Resolution-aware
  character and environment art, effect and animation system, refreshed
  themes, all three layers integrated, real captures per layer through the
  Design Council craft gate. PR 4. Depends on the Council pass and Phases 2-3
  rendering context.
- **Phase 5: Sound Design Overhaul** (Closes #659). New score, soft effects,
  mix with fades and safe defaults, terminal chime policy, per-layer
  real-host review. PR 5. Depends on the Council direction and Phase 4 (shared
  docs and settings churn kept sequential).
- **Phase 6: Release Engineering and Multi-Platform Distribution** (Closes
  #657). Version single source, per-OS packages and installers, smoke scripts,
  release pipeline via the Lab Engineer, release candidate artifacts on the
  official Releases page, install/upgrade/uninstall docs. PR 6. Depends on
  Phases 2-5 (artifacts carry the final product).
- **Phase 7: Game-First Web Experience and Subpages** (Closes #660). Game-first
  hub, downloads, install, rendered docs, compatibility, and releases
  subpages, deployed-URL browser E2E. PR 7. Depends on Phase 3 (matrix
  content), Phase 6 (downloads and release content), and Phase 4 (identity).
- **Final Phase: Full-Product Verification and Release Sign-Off** (Closes #655,
  Closes #661, Closes #582). Full terminal matrix re-signed on the released
  artifacts (kitty, ghostty, conventional across the three OSes with honest
  gaps), per-OS install/upgrade/uninstall from release artifacts, deployed
  Pages E2E, audio and visual craft evaluated on real captures, reassessment
  ledger fully resolved or documented, stable `maze-chase-v1.0.0` release cut
  with final artifacts, hub and README and docs unified. Final PR. Depends on
  all previous phases.

Sequencing rules: one phase per PR on its own branch
(`opencode/issue582-overhaul-phase-<n>-<slug>`), `Refs #582` everywhere, and
the closing keywords exactly as listed above. Each phase ends with its
evidence in the progress tracker; the Maintainer merges on `approve-eval` and
chains the next phase.

## Risks and Mitigations

- Real Ghostty in CI: a headless Linux runner may not render Ghostty under
  software GL; the macOS Aqua arm and the Owner's own environment are the
  honest fallbacks, and any unexecuted row is marked `unverified` with the
  reason, never guessed.
- Terminal graphics variance (tmux, SSH, GPU differences): the probe decides,
  the watchdog degrades, and the matrix documents per-emulator limits.
- Performance of high-density art: the frame budget and byte caps govern the
  chosen `ppt`; the solver and the atlas planner respect the budget, and the
  scoreboard records measured numbers per tier.
- Packaging toolchains on runners (rpmbuild, dpkg-deb, iscc, hdiutil):
  each is exercised natively in the per-OS arms with documented fallbacks for
  genuinely unavailable tooling; install verification uses compatible
  containers where the runner OS differs (Fedora container for rpm).
- Workflow changes cannot merge via `GITHUB_TOKEN`: the release pipeline lands
  through the Lab Engineer with the PAT-backed path, per lab rules.
- Scope and rework: the phase order puts the riskiest architecture first and
  the identity after it, so later phases never invalidate earlier proofs; the
  final phase re-verifies everything on the shipped artifacts regardless.
- Version and docs churn: one workspace version, one pipeline, one unified
  documentation rewrite in each phase, with the language guards kept green.

## Delegation ledger

- General subagent (terminal recon): read all 14 terminal crate sources, all
  test files, and docs; produced the layout, resize, tier, chrome, and API
  findings (`layout.rs`, `raster.rs`, `kitty.rs`, `sixel.rs`, `backend.rs`,
  `main.rs` line references), including the #634 resize-reconcile history and
  the remaining unhandled resize classes. Primary used it to anchor the solver
  and pipeline specifications.
- General subagent (release/packaging recon): read all maze-chase packaging
  scripts, `docs/release.md`, the full Desktop Pet packaging suite and
  `pet-release.yml`, the workflow inventory, live release state, and version
  surfaces; produced the gap list and the pipeline precedents the Phase 6
  specification follows.
- General subagent (assets/audio/config recon): read the assets, audio, and
  config crates, design docs, and the layer consumption sites; produced the
  density, cue, settings, and settings-screen facts including the existing
  volume API and the three-place BPM duplication.
- General subagent (web/pages recon): read the hub, `play.html`, the JS
  surface, docs, and `pages.yml`; produced the Pages staging rules, the
  rendered-docs precedent inventory, and the exact clutter list the game-first
  restructure removes.
- Skills note: no skill fits this Rust product architecture work (only
  `customize-opencode` exists and it covers opencode configuration, not game
  code).

- the Architect
